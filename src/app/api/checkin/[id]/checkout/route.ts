import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole("ADMIN", "RECEPTIONIST");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const session = auth.user;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { settleOpenTabs, paymentMethod = "CASH", paymentRef } = body;

    const checkin = await prisma.checkinSession.findUnique({
      where: { id },
      include: { locker: true, member: true },
    });

    if (!checkin) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (checkin.sessionStatus !== "ACTIVE") {
      return NextResponse.json(
        { error: "Session is already completed or closed" },
        { status: 400 }
      );
    }

    // Check for unpaid gym tabs (e.g. took water, protein shake during workout)
    const openTabs = await prisma.salesOrder.findMany({
      where: {
        memberId: checkin.memberId,
        status: "OPEN_TAB",
      },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    // If athlete has open tabs and front desk has not confirmed settlement
    if (openTabs.length > 0 && !settleOpenTabs) {
      const totalDueETB = openTabs.reduce(
        (sum, t) => sum + Number(t.totalAmountETB),
        0
      );

      return NextResponse.json(
        {
          hasOpenTabs: true,
          error: `Unpaid Gym Tab: ${checkin.member.fullName} has ${openTabs.length} unpaid item(s) totaling ${totalDueETB.toLocaleString()} ETB. Please settle the tab before completing exit.`,
          totalDueETB,
          openTabs,
        },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // 1. If athlete had open tabs and staff settles them on exit
      if (openTabs.length > 0 && settleOpenTabs) {
        const tabIds = openTabs.map((t) => t.id);
        await tx.salesOrder.updateMany({
          where: { id: { in: tabIds } },
          data: {
            status: "COMPLETED",
            paymentMethod,
            paymentRef: paymentRef?.trim() || null,
            updatedAt: new Date(),
          },
        });

        for (const tab of openTabs) {
          await tx.auditLog.create({
            data: {
              userId: session.id,
              action: "POS_TAB_SETTLED_ON_EXIT",
              entityType: "SalesOrder",
              entityId: tab.id,
              detailsJson: JSON.stringify({
                memberCode: checkin.member.memberCode,
                memberName: checkin.member.fullName,
                orderNumber: tab.orderNumber,
                totalAmountETB: tab.totalAmountETB,
                paymentMethod,
                settledAtExit: true,
              }),
            },
          });
        }
      }

      // 2. Release Locker
      if (checkin.lockerId) {
        await tx.locker.update({
          where: { id: checkin.lockerId },
          data: { status: "AVAILABLE" },
        });
      }

      // 3. Mark Session Completed atomically
      const updateResult = await tx.checkinSession.updateMany({
        where: { id, sessionStatus: "ACTIVE" },
        data: {
          sessionStatus: "COMPLETED",
          checkoutTime: new Date(),
        },
      });

      if (updateResult.count === 0) {
        throw new Error("Session is already completed or closed.");
      }

      // 4. Audit log
      await tx.auditLog.create({
        data: {
          userId: session.id,
          action: "SESSION_COMPLETED",
          entityType: "CheckinSession",
          entityId: id,
          detailsJson: JSON.stringify({
            lockerNumber: checkin.locker?.lockerNumber || "None",
            memberId: checkin.memberId,
            memberCode: checkin.member.memberCode,
            settledTabsCount: openTabs.length,
            durationMins: Math.round(
              (new Date().getTime() - new Date(checkin.checkinTime).getTime()) / (1000 * 60)
            ),
          }),
        },
      });
    });

    return NextResponse.json({
      success: true,
      settledTabsCount: openTabs.length,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process checkout" },
      { status: 500 }
    );
  }
}
