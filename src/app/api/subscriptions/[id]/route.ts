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
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { addDays, newEndDate, status, reason } = body;

    const existing = await prisma.subscription.findUnique({
      where: { id },
      include: { member: true, plan: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    let calculatedEndDate = new Date(existing.endDate);

    if (addDays && typeof addDays === "number") {
      // If currently expired, start extension from today, otherwise add to existing endDate
      const baseDate = calculatedEndDate < new Date() ? new Date() : calculatedEndDate;
      calculatedEndDate = new Date(baseDate.getTime() + addDays * 24 * 60 * 60 * 1000);
    } else if (newEndDate) {
      calculatedEndDate = new Date(newEndDate);
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: {
        endDate: calculatedEndDate,
        status: status || (calculatedEndDate > new Date() ? "ACTIVE" : existing.status),
      },
      include: { member: true, plan: true },
    });

    await logAudit({
      userId: session.id,
      action: "SUBSCRIPTION_EXPIRY_ADJUSTED",
      entityType: "Subscription",
      entityId: id,
      details: {
        memberCode: existing.member.memberCode,
        memberName: existing.member.fullName,
        planName: existing.plan.name,
        previousEndDate: existing.endDate.toISOString(),
        newEndDate: calculatedEndDate.toISOString(),
        addDays: addDays || null,
        reason: reason || "Manual front-desk adjustment",
      },
    });

    return NextResponse.json({ success: true, subscription: updated });
  } catch (error) {
    console.error("Subscription adjust error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to adjust subscription" },
      { status: 500 }
    );
  }
}
