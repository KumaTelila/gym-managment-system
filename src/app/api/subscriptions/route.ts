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

    const {
      memberId,
      planId,
      paymentMethod,
      paymentRef,
      amountPaidETB,
      startDate: customStartDate,
      includeRegistrationFee,
      isSponsored,
      sponsorReason,
    } = await request.json();

    if (!memberId || !planId) {
      return NextResponse.json(
        { error: "Member and plan are required." },
        { status: 400 }
      );
    }

    if (!isSponsored && !paymentMethod) {
      return NextResponse.json(
        { error: "Payment method is required for non-sponsored memberships." },
        { status: 400 }
      );
    }

    if (isSponsored && (!sponsorReason || !sponsorReason.trim())) {
      return NextResponse.json(
        { error: "A valid sponsorship or giveaway reason is required when waiving fees." },
        { status: 400 }
      );
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.isActive) {
      return NextResponse.json({ error: "Selected plan is invalid or inactive." }, { status: 404 });
    }

    // Determine registration fee if applicable
    let finalRegFee = 0;
    if (!isSponsored && includeRegistrationFee) {
      const regSetting = await prisma.systemSetting.findUnique({
        where: { key: "registration_fee" },
      });
      finalRegFee = regSetting ? parseFloat(regSetting.value) || 100 : 100;
    }

    // Authoritative pricing: 0 for sponsored, otherwise plan rate + optional registration fee
    const expectedPriceETB = isSponsored ? 0 : Number(plan.priceETB) + finalRegFee;

    if (amountPaidETB !== undefined && Number(amountPaidETB) !== expectedPriceETB) {
      return NextResponse.json(
        {
          error: `Price mismatch: calculated fee is ${expectedPriceETB} ETB. Client-submitted price (${amountPaidETB} ETB) is not permitted without explicit authorization.`,
        },
        { status: 400 }
      );
    }

    // Check existing active subscription to extend if needed, or use custom start date
    let startDate: Date;
    if (customStartDate) {
      startDate = new Date(customStartDate);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json({ error: "Invalid custom start date provided." }, { status: 400 });
      }
    } else {
      const currentActive = await prisma.subscription.findFirst({
        where: {
          memberId,
          status: "ACTIVE",
          endDate: { gt: new Date() },
        },
        orderBy: { endDate: "desc" },
      });
      startDate = currentActive ? new Date(currentActive.endDate) : new Date();
    }

    const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    const subscription = await prisma.subscription.create({
      data: {
        memberId,
        planId,
        startDate,
        endDate,
        status: "ACTIVE",
        amountPaidETB: expectedPriceETB,
        registrationFeeETB: finalRegFee,
        isSponsored: Boolean(isSponsored),
        sponsorReason: isSponsored ? sponsorReason.trim() : null,
        paymentMethod: isSponsored ? (paymentMethod || "OTHER") : paymentMethod,
        paymentRef: isSponsored
          ? (paymentRef?.trim() || "SPONSORED_GIVEAWAY")
          : (paymentRef?.trim() || null),
        processedById: session.id,
      },
      include: {
        member: true,
        plan: true,
      },
    });

    // Write audit log with client IP
    await logAudit({
      userId: session.id,
      action: isSponsored ? "SUBSCRIPTION_SPONSORED_ISSUED" : "SUBSCRIPTION_ACTIVATED",
      entityType: "Subscription",
      entityId: subscription.id,
      details: {
        memberCode: subscription.member.memberCode,
        memberName: subscription.member.fullName,
        planName: plan.name,
        durationDays: plan.durationDays,
        priceETB: expectedPriceETB,
        registrationFeeETB: finalRegFee,
        isSponsored: Boolean(isSponsored),
        sponsorReason: isSponsored ? sponsorReason.trim() : null,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        paymentMethod: subscription.paymentMethod,
        paymentRef: subscription.paymentRef,
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
