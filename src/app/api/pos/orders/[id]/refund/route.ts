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
    const reason = body?.reason?.trim() || "Accidental sale / Admin rollback";

    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        member: true,
        cashier: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Sales order not found." }, { status: 404 });
    }

    if (order.status === "REFUNDED" || order.status === "VOIDED") {
      return NextResponse.json(
        { error: `Order #${order.orderNumber} is already ${order.status.toLowerCase()}.` },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // 1. Mark order as REFUNDED
      await tx.salesOrder.update({
        where: { id },
        data: { status: "REFUNDED" },
      });

      // 2. Return inventory stock and log stock movements
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: { increment: item.quantity },
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: "RESTOCK",
            quantity: item.quantity,
            reason: `Refund Order #${order.orderNumber}: ${reason}`,
            referenceId: order.id,
            createdById: session.id,
          },
        });
      }
    });

    await logAudit({
      userId: session.id,
      action: "SALES_ORDER_REFUNDED",
      entityType: "SalesOrder",
      entityId: id,
      details: {
        orderNumber: order.orderNumber,
        totalAmountETB: Number(order.totalAmountETB),
        paymentMethod: order.paymentMethod,
        paymentRef: order.paymentRef,
        itemCount: order.items.length,
        customerName: order.member?.fullName || "Walk-in Customer",
        refundReason: reason,
        refundedBy: session.fullName,
      },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      success: true,
      message: `Order #${order.orderNumber} was refunded and inventory was restocked.`,
    });
  } catch (error: unknown) {
    console.error("POS order refund error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to refund sales order." },
      { status: 500 }
    );
  }
}
