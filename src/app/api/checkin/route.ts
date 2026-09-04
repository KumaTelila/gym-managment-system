import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeSessions = await prisma.checkinSession.findMany({
      where: { sessionStatus: "ACTIVE" },
      orderBy: { checkinTime: "desc" },
      include: {
        member: true,
        locker: true,
      },
    });

    return NextResponse.json({ activeSessions });
  } catch (err: unknown) {
    console.error("Fetch active check-in sessions error:", err);
    return NextResponse.json({ error: "Failed to fetch active sessions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { memberCode, cardVersion, lockerId } = await request.json();

    if (!memberCode) {
      return NextResponse.json({ error: "Member code is required." }, { status: 400 });
    }

    // 1. Find member
    const member = await prisma.member.findUnique({
      where: { memberCode: memberCode.trim().toUpperCase() },
      include: {
        subscriptions: {
          orderBy: { endDate: "desc" },
          take: 1,
        },
      },
    });

    if (!member || !member.isActive) {
      return NextResponse.json({ error: "Member not found or account is deactivated." }, { status: 404 });
    }

    // 2. Validate Card Version (invalidates older cards after replacement)
    if (cardVersion !== undefined && cardVersion !== null && cardVersion !== member.cardVersion) {
      return NextResponse.json({
        error: `Inactive card presented (v${cardVersion}). A replacement card (v${member.cardVersion}) was previously issued.`,
      }, { status: 400 });
    }

    // 3. Check for existing active check-in
    const activeSession = await prisma.checkinSession.findFirst({
      where: {
        memberId: member.id,
        sessionStatus: "ACTIVE",
      },
      include: { locker: true },
    });

    if (activeSession) {
      return NextResponse.json({
        error: `Member already checked in at locker ${activeSession.locker?.lockerNumber || "None"}.`,
        activeSession,
      }, { status: 400 });
    }

    // 4. Validate Subscription status
    const latestSub = member.subscriptions[0];
    const isExpired = !latestSub || latestSub.status !== "ACTIVE" || new Date(latestSub.endDate) < new Date();

    if (isExpired) {
      return NextResponse.json({
        error: "Subscription expired. Please renew membership before checking in.",
        isExpired: true,
        member,
      }, { status: 402 });
    }

    // 5. Verify Locker if provided
    let locker = null;
    if (lockerId) {
      locker = await prisma.locker.findUnique({ where: { id: lockerId } });
      if (!locker || locker.status !== "AVAILABLE") {
        return NextResponse.json({
          error: `Locker ${locker?.lockerNumber || ""} is not available (currently ${locker?.status || "unavailable"}).`,
        }, { status: 400 });
      }
    }

    // 6. Transactional Check-in creation with DB-level partial unique protection
    const newSession = await prisma.$transaction(async (tx) => {
      if (lockerId) {
        await tx.locker.update({
          where: { id: lockerId },
          data: { status: "OCCUPIED" },
        });
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
          action: "SESSION_STARTED",
          entityType: "CheckinSession",
          entityId: createdSession.id,
          detailsJson: JSON.stringify({
            memberCode: member.memberCode,
            memberName: member.fullName,
            lockerNumber: locker?.lockerNumber || "None",
            cardVersion: member.cardVersion,
          }),
        },
      });

      return createdSession;
    });

    return NextResponse.json({ success: true, session: newSession });
  } catch (err: unknown) {
    console.error("Check-in error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process check-in" },
      { status: 500 }
    );
  }
}
