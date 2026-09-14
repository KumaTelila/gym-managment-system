import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Today's start in UTC
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Sales orders from today (including COMPLETED and REFUNDED)
    const orders = await prisma.salesOrder.findMany({
      where: {
        createdAt: { gte: today },
      },
      include: { cashier: true },
    });

    // 2. Subscriptions from today
    const subscriptions = await prisma.subscription.findMany({
      where: {
        createdAt: { gte: today },
      },
      include: { plan: true, member: true },
    });

    // 3. Locker rentals from today
    const rentals = await prisma.lockerRental.findMany({
      where: {
        createdAt: { gte: today },
      },
      include: { locker: true, member: true },
    });

    // Query locker rental refund audit logs
    const rentAuditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: "LockerRental",
        action: "LOCKER_RENTAL_REFUNDED",
      },
      select: { entityId: true },
    });
    const refundedRentalIds = new Set(rentAuditLogs.map((l) => l.entityId));

    // Grouping by Payment Method
    const breakdown: Record<
      string,
      { count: number; grossETB: number; refundsETB: number; netETB: number; totalETB: number }
    > = {
      CASH: { count: 0, grossETB: 0, refundsETB: 0, netETB: 0, totalETB: 0 },
      TELEBIRR: { count: 0, grossETB: 0, refundsETB: 0, netETB: 0, totalETB: 0 },
      CBE_TRANSFER: { count: 0, grossETB: 0, refundsETB: 0, netETB: 0, totalETB: 0 },
      OTHER: { count: 0, grossETB: 0, refundsETB: 0, netETB: 0, totalETB: 0 },
    };

    let totalGrossETB = 0;
    let totalRefundsETB = 0;
    let refundsCount = 0;

    orders.forEach((o) => {
      const method = o.paymentMethod in breakdown ? o.paymentMethod : "OTHER";
      const amount = Number(o.totalAmountETB);
      if (o.status === "REFUNDED" || o.status === "VOIDED") {
        totalRefundsETB += amount;
        refundsCount += 1;
        breakdown[method].refundsETB += amount;
        breakdown[method].netETB -= amount;
        breakdown[method].totalETB -= amount;
      } else if (o.status === "COMPLETED") {
        totalGrossETB += amount;
        breakdown[method].count += 1;
        breakdown[method].grossETB += amount;
        breakdown[method].netETB += amount;
        breakdown[method].totalETB += amount;
      }
    });

    subscriptions.forEach((s) => {
      const method = s.paymentMethod in breakdown ? s.paymentMethod : "OTHER";
      const amount = Number(s.amountPaidETB);
      if (s.status === "CANCELLED") {
        totalRefundsETB += amount;
        refundsCount += 1;
        breakdown[method].refundsETB += amount;
        breakdown[method].netETB -= amount;
        breakdown[method].totalETB -= amount;
      } else {
        totalGrossETB += amount;
        breakdown[method].count += 1;
        breakdown[method].grossETB += amount;
        breakdown[method].netETB += amount;
        breakdown[method].totalETB += amount;
      }
    });

    rentals.forEach((r) => {
      const method = r.paymentMethod in breakdown ? r.paymentMethod : "OTHER";
      const amount = Number(r.priceETB);
      const isRefunded = refundedRentalIds.has(r.id);

      if (isRefunded) {
        totalRefundsETB += amount;
        refundsCount += 1;
        breakdown[method].refundsETB += amount;
        breakdown[method].netETB -= amount;
        breakdown[method].totalETB -= amount;
      } else {
        totalGrossETB += amount;
        breakdown[method].count += 1;
        breakdown[method].grossETB += amount;
        breakdown[method].netETB += amount;
        breakdown[method].totalETB += amount;
      }
    });

    const grandTotalETB = totalGrossETB - totalRefundsETB;

    return NextResponse.json({
      breakdown,
      grandTotalETB,
      totalGrossETB,
      totalRefundsETB,
      refundsCount,
      ordersCount: orders.filter((o) => o.status === "COMPLETED").length,
      subscriptionsCount: subscriptions.filter((s) => s.status !== "CANCELLED").length,
      rentalsCount: rentals.filter((r) => !refundedRentalIds.has(r.id)).length,
    });
  } catch (error) {
    console.error("Cash report error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error generating report" },
      { status: 500 }
    );
  }
}
