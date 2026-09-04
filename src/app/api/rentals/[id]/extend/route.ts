import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { addDays = 30, priceETB = 0, paymentMethod = "CASH", paymentRef } = body;

    const rental = await prisma.lockerRental.findUnique({
      where: { id },
      include: { locker: true, member: true },
    });

    if (!rental) {
      return NextResponse.json({ error: "Rental not found" }, { status: 404 });
    }

    // Base date: if already expired, start from today; else add to current endDate
    const currentEnd = new Date(rental.endDate);
    const baseDate = currentEnd < new Date() ? new Date() : currentEnd;
    const newEndDate = new Date(baseDate.getTime() + addDays * 24 * 60 * 60 * 1000);

    const updatedRental = await prisma.lockerRental.update({
      where: { id },
      data: {
        endDate: newEndDate,
        isActive: true,
      },
      include: { locker: true, member: true },
    });

    // Ensure locker status remains RESERVED
    await prisma.locker.update({
      where: { id: rental.lockerId },
      data: { status: "RESERVED" },
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
        addDays,
        priceETB,
        paymentMethod,
        paymentRef: paymentRef || null,
      },
    });

    return NextResponse.json({ success: true, rental: updatedRental });
  } catch (error) {
    console.error("Locker extension error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to extend locker rental" },
      { status: 500 }
    );
  }
}
