import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Only administrators can edit staff accounts" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const dataToUpdate: Record<string, unknown> = {};
    if (body.fullName !== undefined) dataToUpdate.fullName = body.fullName.trim();
    if (body.role !== undefined) dataToUpdate.role = body.role;
    if (body.isActive !== undefined) dataToUpdate.isActive = Boolean(body.isActive);
    if (body.password) {
      dataToUpdate.passwordHash = await bcrypt.hash(body.password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
      },
    });

    await logAudit({
      userId: session.id,
      action: "STAFF_UPDATED",
      entityType: "User",
      entityId: id,
      details: { fullName: user.fullName, role: user.role, isActive: user.isActive },
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Staff edit error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update staff account" },
      { status: 500 }
    );
  }
}
