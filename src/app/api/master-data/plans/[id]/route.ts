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

    const plan = await prisma.subscriptionPlan.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name.trim() : undefined,
        durationDays: body.durationDays !== undefined ? parseInt(body.durationDays, 10) : undefined,
        priceETB: body.priceETB !== undefined ? parseFloat(body.priceETB) : undefined,
        description: body.description !== undefined ? body.description.trim() : undefined,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
      },
    });

    await logAudit({
      userId: session.id,
      action: "PLAN_UPDATED",
      entityType: "SubscriptionPlan",
      entityId: id,
      details: body,
    });

    return NextResponse.json({ success: true, plan });
  } catch (error) {
    console.error("Plan update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update plan" },
      { status: 500 }
    );
  }
}
