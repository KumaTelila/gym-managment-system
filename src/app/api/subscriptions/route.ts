import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/session";
import { logAudit, getClientIp } from "@/lib/audit";

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
      { error: "Error fetching subscriptions." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRole("ADMIN", "RECEPTIONIST");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const session = auth.user;

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

    if (!plan || !plan.isActive) {
      return NextResponse.json({ error: "Selected plan is invalid or inactive." }, { status: 404 });
    }

    // F-02: Server-side authoritative pricing. Disallow arbitrary client-submitted overrides.
    const expectedPriceETB = Number(plan.priceETB);
    if (amountPaidETB !== undefined && Number(amountPaidETB) !== expectedPriceETB) {
      return NextResponse.json(
        {
          error: `Price mismatch: plan fee is ${expectedPriceETB} ETB. Client-submitted price (${amountPaidETB} ETB) is not permitted without explicit authorization.`,
        },
        { status: 400 }
      );
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
        amountPaidETB: plan.priceETB, // Server-side authoritative fee
        paymentMethod,
        paymentRef: paymentRef?.trim() || null,
        processedById: session.id,
      },
      include: {
        member: true,
        plan: true,
      },
    });

    // F-12: Write audit log with client IP
    await logAudit({
      userId: session.id,
      action: "SUBSCRIPTION_ACTIVATED",
      entityType: "Subscription",
      entityId: subscription.id,
      details: {
        memberCode: subscription.member.memberCode,
        memberName: subscription.member.fullName,
        planName: plan.name,
        durationDays: plan.durationDays,
        priceETB: expectedPriceETB,
        paymentMethod,
        paymentRef: paymentRef?.trim() || null,
      },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, subscription });
  } catch (error) {
    console.error("Subscription create error:", error);
    return NextResponse.json(
      { error: "Failed to create subscription. Please verify input data and try again." },
      { status: 500 }
    );
  }
}
