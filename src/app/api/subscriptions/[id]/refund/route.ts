import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { logAudit, getClientIp } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole("ADMIN");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const session = auth.user;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = body?.reason?.trim() || "Accidentally registered / Admin rollback";

    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        member: true,
        plan: true,
        processedBy: true,
      },
    });

    if (!subscription) {
      return NextResponse.json({ error: "Subscription record not found." }, { status: 404 });
    }

    if (subscription.status === "CANCELLED") {
      return NextResponse.json(
        { error: "This subscription has already been cancelled / refunded." },
        { status: 400 }
      );
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: {
        status: "CANCELLED",
      },
      include: {
        member: true,
        plan: true,
      },
    });

    await logAudit({
      userId: session.id,
      action: "SUBSCRIPTION_REFUNDED",
      entityType: "Subscription",
      entityId: id,
      details: {
        memberCode: subscription.member.memberCode,
        memberName: subscription.member.fullName,
        planName: subscription.plan.name,
        amountETB: Number(subscription.amountPaidETB),
        paymentMethod: subscription.paymentMethod,
        paymentRef: subscription.paymentRef,
        originalProcessedBy: subscription.processedBy?.fullName || "Staff",
        refundReason: reason,
        refundedBy: session.fullName,
      },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      success: true,
      message: `Subscription for ${subscription.member.fullName} was refunded and marked CANCELLED.`,
      subscription: updated,
    });
  } catch (error: unknown) {
    console.error("Subscription refund error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to refund subscription." },
      { status: 500 }
    );
  }
}
