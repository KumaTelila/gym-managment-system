import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { logAudit, getClientIp } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clientIp = getClientIp(request) || "127.0.0.1";
    const auth = await requireRole("ADMIN", "FINANCE_OWNER", "RECEPTIONIST");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const sessionUser = auth.user;
    const { id } = await params;

    const body = await request.json();
    const reason = body.reason?.trim();

    if (!reason) {
      return NextResponse.json(
        { error: "A rejection reason is required (e.g. invalid Telebirr SMS code or payment not received)." },
        { status: 400 }
      );
    }

    const reg = await prisma.registrationRequest.findUnique({
      where: { id },
    });

    if (!reg) {
      return NextResponse.json({ error: "Registration request not found." }, { status: 404 });
    }

    if (reg.status !== "PENDING") {
      return NextResponse.json(
        { error: `This registration request is already ${reg.status}.` },
        { status: 400 }
      );
    }

    const updated = await prisma.registrationRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: reason,
        approvedById: sessionUser.id,
      },
    });

    await logAudit({
      userId: sessionUser.id,
      action: "ONLINE_REGISTRATION_REJECTED",
      entityType: "RegistrationRequest",
      entityId: reg.id,
      details: {
        requestNumber: reg.requestNumber,
        fullName: reg.fullName,
        phone: reg.phone,
        reason,
        rejectedBy: sessionUser.fullName,
      },
      ipAddress: clientIp,
    });

    return NextResponse.json({
      success: true,
      message: "Registration request rejected.",
      registration: updated,
    });
  } catch (error) {
    console.error("Registration rejection error:", error);
    return NextResponse.json(
      { error: "Failed to reject registration request." },
      { status: 500 }
    );
  }
}
