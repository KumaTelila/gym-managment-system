import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { getClientIp } from "@/lib/audit";

export async function GET() {
  try {
    const auth = await requireRole("ADMIN", "RECEPTIONIST");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const activeSessions = await prisma.checkinSession.findMany({
      where: { sessionStatus: "ACTIVE" },
      orderBy: { checkinTime: "desc" },
      include: {
        member: true,
        locker: true,
      },
      take: 100,
    });

    return NextResponse.json({ activeSessions });
  } catch (err: unknown) {
    console.error("Fetch active check-in sessions error:", err);
    return NextResponse.json({ error: "Failed to fetch active sessions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRole("ADMIN", "RECEPTIONIST");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const session = auth.user;

    const { memberCode, cardVersion, lockerId, isManualOverride, overrideReason } = await request.json();

    if (!memberCode) {
      return NextResponse.json({ error: "Member code is required." }, { status: 400 });
    }

    const cleanCode = memberCode.trim().toUpperCase();
    const now = new Date();

    // 1. Find member and verify current active subscription window
    const member = await prisma.member.findUnique({
      where: { memberCode: cleanCode },
      include: {
        subscriptions: {
          where: {
            status: "ACTIVE",
            startDate: { lte: now },
            endDate: { gte: now },
          },
          orderBy: { endDate: "desc" },
          take: 1,
        },
      },
    });

    if (!member || !member.isActive) {
      return NextResponse.json({ error: "Member not found or account is deactivated." }, { status: 404 });
    }

    // 2. Validate Card Version (F-05)
    if (!isManualOverride) {
      if (cardVersion === undefined || cardVersion === null) {
        return NextResponse.json({
          error: "Physical card version is required. For manual override without card, specify manual override.",
        }, { status: 400 });
      }

      if (Number(cardVersion) !== member.cardVersion) {
        return NextResponse.json({
          error: `Inactive card presented (v${cardVersion}). A replacement card (v${member.cardVersion}) was previously issued.`,
        }, { status: 400 });
      }
    }

    // 3. Validate Subscription validity window
    const activeSub = member.subscriptions[0];
    if (!activeSub) {
      // Find latest subscription to give informative message
      const latestSub = await prisma.subscription.findFirst({
        where: { memberId: member.id },
        orderBy: { endDate: "desc" },
      });

      let message = "No active membership subscription found. Please register or activate a plan before checking in.";
      let isFutureStart = false;

      if (latestSub) {
        if (new Date(latestSub.startDate) > now) {
          isFutureStart = true;
          message = `Membership is scheduled to start on ${new Date(latestSub.startDate).toLocaleDateString()}. Access will become active on that date.`;
        } else {
          message = `Membership expired on ${new Date(latestSub.endDate).toLocaleDateString()}. Please renew subscription before checking in.`;
        }
      }

      return NextResponse.json({
        error: message,
        isExpired: !isFutureStart,
        isFutureStart,
        member,
      }, { status: 402 });
    }

    // 4. Concurrency-Safe Transaction (F-03, F-04)
    const newSession = await prisma.$transaction(async (tx) => {
      // Check for existing active check-in inside the transaction (F-03)
      const existingActive = await tx.checkinSession.findFirst({
        where: {
          memberId: member.id,
          sessionStatus: "ACTIVE",
        },
        include: { locker: true },
      });

      if (existingActive) {
        const error = new Error(
          `Member is already checked in at locker ${existingActive.locker?.lockerNumber || "None"}.`
        );
        (error as any).statusCode = 409;
        (error as any).activeSession = existingActive;
        throw error;
      }

      let assignedLocker = null;

      // Atomic conditional locker allocation
      if (lockerId) {
        const lockerUpdate = await tx.locker.updateMany({
          where: {
            id: lockerId,
            status: "AVAILABLE",
          },
          data: { status: "OCCUPIED" },
        });

        if (lockerUpdate.count === 0) {
          const currentLocker = await tx.locker.findUnique({ where: { id: lockerId } });
          const error = new Error(
            `Locker ${currentLocker?.lockerNumber || ""} is no longer available (currently ${currentLocker?.status || "unavailable"}).`
          );
          (error as any).statusCode = 409;
          throw error;
        }

        assignedLocker = await tx.locker.findUnique({ where: { id: lockerId } });
      }

      const createdSession = await tx.checkinSession.create({
        data: {
          memberId: member.id,
          lockerId: lockerId || null,
          receptionistId: session.id,
          sessionStatus: "ACTIVE",
        },
        include: {
          member: true,
          locker: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.id,
          action: isManualOverride ? "SESSION_STARTED_MANUAL_OVERRIDE" : "SESSION_STARTED",
          entityType: "CheckinSession",
          entityId: createdSession.id,
          ipAddress: getClientIp(request),
          detailsJson: JSON.stringify({
            memberCode: member.memberCode,
            memberName: member.fullName,
            lockerNumber: assignedLocker?.lockerNumber || "None",
            cardVersion: member.cardVersion,
            manualOverride: Boolean(isManualOverride),
            overrideReason: overrideReason || null,
          }),
        },
      });

      return createdSession;
    });

    return NextResponse.json({ success: true, session: newSession });
  } catch (err: any) {
    console.error("Check-in error:", err);

    // Handle unique constraint conflict (e.g. concurrent active session creation)
    if (err?.code === "P2002") {
      return NextResponse.json(
        { error: "Member is already checked in (active session conflict)." },
        { status: 409 }
      );
    }

    const statusCode = err?.statusCode || 500;
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to process check-in.",
        activeSession: err?.activeSession,
      },
      { status: statusCode }
    );
  }
}
