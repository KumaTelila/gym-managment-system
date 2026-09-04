import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "FINANCE_OWNER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const locker = await prisma.locker.update({
      where: { id },
      data: {
        lockerNumber: body.lockerNumber !== undefined ? body.lockerNumber.trim().toUpperCase() : undefined,
        section: body.section !== undefined ? body.section.trim().toUpperCase() : undefined,
        status: body.status !== undefined ? body.status : undefined,
        notes: body.notes !== undefined ? body.notes?.trim() || null : undefined,
      },
    });

    await logAudit({
      userId: session.id,
      action: "LOCKER_UPDATED",
      entityType: "Locker",
      entityId: id,
      details: body,
    });

    return NextResponse.json({ success: true, locker });
  } catch (error) {
    console.error("Locker update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update locker" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Only administrators can delete lockers" }, { status: 403 });
    }

    const { id } = await params;

    // Check if locker has active check-ins or rentals
    const active = await prisma.checkinSession.findFirst({
      where: { lockerId: id, sessionStatus: "ACTIVE" },
    });
    if (active) {
      return NextResponse.json({ error: "Cannot delete locker with an active gym session" }, { status: 400 });
    }

    const rental = await prisma.lockerRental.findFirst({
      where: { lockerId: id, isActive: true },
    });
    if (rental) {
      return NextResponse.json({ error: "Cannot delete locker with an active monthly rental contract" }, { status: 400 });
    }

    await prisma.locker.delete({ where: { id } });

    await logAudit({
      userId: session.id,
      action: "LOCKER_DELETED",
      entityType: "Locker",
      entityId: id,
      details: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Locker delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete locker" },
      { status: 500 }
    );
  }
}
