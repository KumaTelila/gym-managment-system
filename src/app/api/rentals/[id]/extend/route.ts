import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { logAudit, getClientIp } from "@/lib/audit";

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
    const body = await request.json();
    const { addDays = 30, paymentMethod = "CASH", paymentRef, priceETB } = body;

    const rental = await prisma.lockerRental.findUnique({
      where: { id },
      include: { locker: true, member: true },
    });

    if (!rental) {
      return NextResponse.json({ error: "Rental not found" }, { status: 404 });
    }

    const days = Math.max(1, parseInt(String(addDays), 10) || 30);
    // F-02: Authoritative rate computation (500 ETB per 30-day block, nearest 50)
    const authoritativeFeeETB = Math.max(100, Math.round((days / 30) * 500 / 50) * 50);

    if (priceETB !== undefined && Number(priceETB) !== authoritativeFeeETB) {
      return NextResponse.json(
        {
          error: `Price mismatch: extension fee for ${days} days is ${authoritativeFeeETB} ETB. Client-submitted price (${priceETB} ETB) is not permitted without explicit override.`,
        },
        { status: 400 }
      );
    }

    // Base date: if already expired, start from today; else add to current endDate
    const currentEnd = new Date(rental.endDate);
    const baseDate = currentEnd < new Date() ? new Date() : currentEnd;
    const newEndDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update rental deadline
      const updatedRental = await tx.lockerRental.update({
        where: { id },
        data: {
          endDate: newEndDate,
          isActive: true,
        },
        include: { locker: true, member: true },
      });

      // 2. Ensure locker status remains RESERVED
      await tx.locker.update({
        where: { id: rental.lockerId },
        data: { status: "RESERVED" },
      });

      // 3. F-08: Generate SalesOrder for daily cash reconciliation
      const orderCount = await tx.salesOrder.count();
      const entropy = Math.random().toString(36).substring(2, 6).toUpperCase();
      const orderNumber = `SO-${new Date().getFullYear()}-${String(orderCount + 1).padStart(4, "0")}-${entropy}`;

      const order = await tx.salesOrder.create({
        data: {
          orderNumber,
          memberId: rental.memberId,
          totalAmountETB: authoritativeFeeETB,
          paymentMethod,
          paymentRef: paymentRef?.trim() || null,
          cashierId: session.id,
          status: "COMPLETED",
        },
      });

      return { updatedRental, order };
    });

    await logAudit({
      userId: session.id,
      action: "LOCKER_RENTAL_EXTENDED",
      entityType: "LockerRental",
      entityId: id,
      details: {
        memberCode: rental.member.memberCode,
        memberName: rental.member.fullName,
        lockerNumber: rental.locker.lockerNumber,
        previousDeadline: rental.endDate.toISOString(),
        newDeadline: newEndDate.toISOString(),
        addDays: days,
        feeETB: authoritativeFeeETB,
        orderNumber: result.order.orderNumber,
        paymentMethod,
        paymentRef: paymentRef || null,
      },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, rental: result.updatedRental, order: result.order });
  } catch (error: any) {
    console.error("Locker extension error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to extend locker rental." },
      { status: 500 }
    );
  }
}
