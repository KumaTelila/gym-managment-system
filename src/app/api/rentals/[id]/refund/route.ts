import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { logAudit, getClientIp } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole("ADMIN");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const session = auth.user;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = body?.reason?.trim() || "Accidental rental / Admin rollback";

    const rental = await prisma.lockerRental.findUnique({
      where: { id },
      include: {
        locker: true,
        member: true,
      },
    });

    if (!rental) {
      return NextResponse.json({ error: "Locker rental record not found." }, { status: 404 });
    }

    if (!rental.isActive) {
      return NextResponse.json(
        { error: "This locker rental has already been terminated or refunded." },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // 1. Deactivate rental contract
      await tx.lockerRental.update({
        where: { id },
        data: { isActive: false },
      });

      // 2. Check if a member is currently actively checked into this locker
      const activeSession = await tx.checkinSession.findFirst({
        where: { lockerId: rental.lockerId, sessionStatus: "ACTIVE" },
      });

      // 3. Revert locker status back to AVAILABLE if not actively occupied
      await tx.locker.update({
        where: { id: rental.lockerId },
        data: { status: activeSession ? "OCCUPIED" : "AVAILABLE" },
      });
    });

    await logAudit({
      userId: session.id,
      action: "LOCKER_RENTAL_REFUNDED",
      entityType: "LockerRental",
      entityId: id,
      details: {
        memberCode: rental.member.memberCode,
        memberName: rental.member.fullName,
        lockerNumber: rental.locker.lockerNumber,
        priceETB: Number(rental.priceETB),
        paymentMethod: rental.paymentMethod,
        paymentRef: rental.paymentRef,
        refundReason: reason,
        refundedBy: session.fullName,
      },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      success: true,
      message: `Rental for Locker #${rental.locker.lockerNumber} (${rental.member.fullName}) was refunded and rolled back.`,
    });
  } catch (error: unknown) {
    console.error("Rental refund error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to refund locker rental." },
      { status: 500 }
    );
  }
}
