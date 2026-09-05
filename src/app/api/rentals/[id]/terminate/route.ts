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

    const rental = await prisma.lockerRental.findUnique({
      where: { id },
      include: { locker: true, member: true },
    });

    if (!rental) {
      return NextResponse.json({ error: "Rental record not found." }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.lockerRental.update({
        where: { id },
        data: { isActive: false },
      });

      // Check if there is an active checkin session currently using this locker
      const activeSession = await tx.checkinSession.findFirst({
        where: { lockerId: rental.lockerId, sessionStatus: "ACTIVE" },
      });

      await tx.locker.update({
        where: { id: rental.lockerId },
        data: { status: activeSession ? "OCCUPIED" : "AVAILABLE" },
      });
    });

    await logAudit({
      userId: session.id,
      action: "LOCKER_RENTAL_TERMINATED",
      entityType: "LockerRental",
      entityId: id,
      details: {
        memberCode: rental.member.memberCode,
        memberName: rental.member.fullName,
        lockerNumber: rental.locker.lockerNumber,
      },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Rental termination error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to terminate rental." },
      { status: 500 }
    );
  }
}
