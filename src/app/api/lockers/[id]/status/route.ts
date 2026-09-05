import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { logAudit, getClientIp } from "@/lib/audit";

export async function PATCH(
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
    const { status } = await request.json();

    if (!["AVAILABLE", "MAINTENANCE"].includes(status)) {
      return NextResponse.json({ error: "Invalid manual status transition. Only AVAILABLE or MAINTENANCE are permitted." }, { status: 400 });
    }

    const previousLocker = await prisma.locker.findUnique({ where: { id } });
    if (!previousLocker) {
      return NextResponse.json({ error: "Locker not found." }, { status: 404 });
    }

    // F-13: Validate that locker is not in active use before manual override
    const activeSession = await prisma.checkinSession.findFirst({
      where: { lockerId: id, sessionStatus: "ACTIVE" },
      include: { member: true },
    });
    if (activeSession) {
      return NextResponse.json(
        {
          error: `Cannot override locker status: Member ${activeSession.member.fullName} (${activeSession.member.memberCode}) is currently checked in using this locker. Check the member out first.`,
        },
        { status: 409 }
      );
    }

    const activeRental = await prisma.lockerRental.findFirst({
      where: { lockerId: id, isActive: true, endDate: { gte: new Date() } },
      include: { member: true },
    });
    if (activeRental && status === "AVAILABLE") {
      return NextResponse.json(
        {
          error: `Cannot set locker to AVAILABLE: Member ${activeRental.member.fullName} (${activeRental.member.memberCode}) has an active rental reservation until ${new Date(activeRental.endDate).toLocaleDateString()}. Please terminate the rental contract first.`,
        },
        { status: 409 }
      );
    }

    const locker = await prisma.locker.update({
      where: { id },
      data: { status },
    });

    await logAudit({
      userId: session.id,
      action: "LOCKER_STATUS_MANUAL_OVERRIDE",
      entityType: "Locker",
      entityId: id,
      details: {
        lockerNumber: locker.lockerNumber,
        previousStatus: previousLocker.status,
        newStatus: status,
      },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, locker });
  } catch (error: any) {
    console.error("Locker update error:", error);
    return NextResponse.json(
      { error: error?.message || "Error updating locker status." },
      { status: 500 }
    );
  }
}
