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

    // 1. Sales orders from today
    const orders = await prisma.salesOrder.findMany({
      where: {
        createdAt: { gte: today },
        status: "COMPLETED",
      },
      include: { cashier: true },
    });

    // 2. Subscriptions from today (exclude cancelled / refunded)
    const subscriptions = await prisma.subscription.findMany({
      where: {
        createdAt: { gte: today },
        status: { not: "CANCELLED" },
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

    // Grouping by Payment Method
    const breakdown: Record<string, { count: number; totalETB: number }> = {
      CASH: { count: 0, totalETB: 0 },
      TELEBIRR: { count: 0, totalETB: 0 },
      CBE_TRANSFER: { count: 0, totalETB: 0 },
      OTHER: { count: 0, totalETB: 0 },
    };

    orders.forEach((o) => {
      const method = o.paymentMethod in breakdown ? o.paymentMethod : "OTHER";
      breakdown[method].count += 1;
      breakdown[method].totalETB += Number(o.totalAmountETB);
    });

    subscriptions.forEach((s) => {
      const method = s.paymentMethod in breakdown ? s.paymentMethod : "OTHER";
      breakdown[method].count += 1;
      breakdown[method].totalETB += Number(s.amountPaidETB);
    });

    rentals.forEach((r) => {
      const method = r.paymentMethod in breakdown ? r.paymentMethod : "OTHER";
      breakdown[method].count += 1;
      breakdown[method].totalETB += Number(r.priceETB);
    });

    const grandTotalETB = Object.values(breakdown).reduce(
      (sum, item) => sum + item.totalETB,
      0
    );

    return NextResponse.json({
      breakdown,
      grandTotalETB,
      ordersCount: orders.length,
      subscriptionsCount: subscriptions.length,
      rentalsCount: rentals.length,
    });
  } catch (error) {
    console.error("Cash report error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error generating report" },
      { status: 500 }
    );
  }
}
