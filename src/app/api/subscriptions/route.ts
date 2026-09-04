import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberCode = searchParams.get("memberCode");

    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { durationDays: "asc" },
    });

    const subscriptions = await prisma.subscription.findMany({
      where: memberCode
        ? { member: { memberCode: memberCode.toUpperCase() } }
        : undefined,
      include: {
        member: true,
        plan: true,
        processedBy: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ plans, subscriptions });
  } catch (error) {
    console.error("Subscription error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error fetching subscriptions" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { memberId, planId, paymentMethod, paymentRef, amountPaidETB } =
      await request.json();

    if (!memberId || !planId || !paymentMethod) {
      return NextResponse.json(
        { error: "Member, plan, and payment method are required." },
        { status: 400 }
      );
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Check existing active subscription to extend if needed
    const currentActive = await prisma.subscription.findFirst({
      where: {
        memberId,
        status: "ACTIVE",
        endDate: { gt: new Date() },
      },
      orderBy: { endDate: "desc" },
    });

    const startDate = currentActive ? new Date(currentActive.endDate) : new Date();
    const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    const subscription = await prisma.subscription.create({
      data: {
        memberId,
        planId,
        startDate,
        endDate,
        status: "ACTIVE",
        amountPaidETB: amountPaidETB !== undefined ? amountPaidETB : plan.priceETB,
        paymentMethod,
        paymentRef: paymentRef?.trim() || null,
        processedById: session.id,
      },
      include: {
        member: true,
        plan: true,
      },
    });

    return NextResponse.json({ success: true, subscription });
  } catch (error) {
    console.error("Subscription create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error creating subscription" },
      { status: 500 }
    );
  }
}
