import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { getClientIp } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole("ADMIN", "RECEPTIONIST");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const session = auth.user;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || "Lost physical card";
    const paymentMethod = body.paymentMethod || "CASH";
    const paymentRef = body.paymentRef?.trim() || null;
    const replacementFeeETB = 100;

    const result = await prisma.$transaction(async (tx) => {
      const member = await tx.member.findUnique({ where: { id } });
      if (!member) throw new Error("Member not found");

      const newVersion = member.cardVersion + 1;

      // 1. Update version
      const updatedMember = await tx.member.update({
        where: { id },
        data: { cardVersion: newVersion },
      });

      // 2. F-08: Create official SalesOrder so replacement fee is tracked in daily cash drawer
      const orderCount = await tx.salesOrder.count();
      const entropy = Math.random().toString(36).substring(2, 6).toUpperCase();
      const orderNumber = `SO-${new Date().getFullYear()}-${String(orderCount + 1).padStart(4, "0")}-${entropy}`;

      const order = await tx.salesOrder.create({
        data: {
          orderNumber,
          memberId: id,
          totalAmountETB: replacementFeeETB,
          paymentMethod,
          paymentRef,
          cashierId: session.id,
          status: "COMPLETED",
        },
      });

      // 3. Audit log
      await tx.auditLog.create({
        data: {
          userId: session.id,
          action: "CARD_REPLACED",
          entityType: "Member",
          entityId: id,
          ipAddress: getClientIp(request),
          detailsJson: JSON.stringify({
            previousVersion: member.cardVersion,
            newVersion,
            reason,
            feeETB: replacementFeeETB,
            orderNumber: order.orderNumber,
            paymentMethod,
          }),
        },
      });

      return { member: updatedMember, order };
    });

    return NextResponse.json({ success: true, member: result.member, order: result.order });
  } catch (error: any) {
    console.error("Card replacement error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to replace card and process fee." },
      { status: 500 }
    );
  }
}
