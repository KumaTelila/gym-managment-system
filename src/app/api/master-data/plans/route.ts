import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "FINANCE_OWNER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { name, durationDays, priceETB, description } = await request.json();

    if (!name || !durationDays || priceETB === undefined) {
      return NextResponse.json(
        { error: "Plan name, duration (days), and price (ETB) are required." },
        { status: 400 }
      );
    }

    const planId = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const plan = await prisma.subscriptionPlan.create({
      data: {
        id: `${planId}-${Date.now().toString().slice(-4)}`,
        name: name.trim(),
        durationDays: parseInt(durationDays, 10),
        priceETB: parseFloat(priceETB),
        description: description?.trim() || null,
        isActive: true,
      },
    });

    await logAudit({
      userId: session.id,
      action: "PLAN_CREATED",
      entityType: "SubscriptionPlan",
      entityId: plan.id,
      details: { name: plan.name, priceETB: plan.priceETB, durationDays: plan.durationDays },
    });

    return NextResponse.json({ success: true, plan });
  } catch (error) {
    console.error("Plan create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create plan" },
      { status: 500 }
    );
  }
}
