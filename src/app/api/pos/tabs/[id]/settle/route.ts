import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function POST(
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
    const { paymentMethod = "CASH", paymentRef } = body;

    const existingOrder = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        member: true,
        items: { include: { product: true } },
      },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Order tab not found" }, { status: 404 });
    }

    if (existingOrder.status !== "OPEN_TAB") {
      return NextResponse.json(
        { error: `This tab is already settled (${existingOrder.status})` },
        { status: 400 }
      );
    }

    const settledOrder = await prisma.salesOrder.update({
      where: { id },
      data: {
        status: "COMPLETED",
        paymentMethod,
        paymentRef: paymentRef?.trim() || null,
        updatedAt: new Date(),
      },
      include: {
        member: true,
        items: { include: { product: true } },
        cashier: true,
      },
    });

    await logAudit({
      userId: session.id,
      action: "POS_TAB_SETTLED",
      entityType: "SalesOrder",
      entityId: id,
      details: {
        orderNumber: settledOrder.orderNumber,
        memberCode: settledOrder.member?.memberCode,
        memberName: settledOrder.member?.fullName,
        totalAmountETB: settledOrder.totalAmountETB,
        paymentMethod,
        paymentRef: paymentRef || null,
        settledBy: session.username,
      },
    });

    return NextResponse.json({ success: true, order: settledOrder });
  } catch (error) {
    console.error("Settle tab error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to settle tab" },
      { status: 500 }
    );
  }
}
