import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

interface CartItemInput {
  productId: string;
  quantity: number;
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { items, paymentMethod, paymentRef, memberId, status = "COMPLETED" } =
      await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart cannot be empty" }, { status: 400 });
    }

    if (status === "OPEN_TAB" && !memberId) {
      return NextResponse.json(
        { error: "A member must be selected to open a gym tab (pay on leave)." },
        { status: 400 }
      );
    }

    // Process order inside transaction
    const order = await prisma.$transaction(async (tx) => {
      // 1. Fetch products & verify stock
      const productIds = items.map((i: CartItemInput) => i.productId);
      const dbProducts = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      let totalAmountETB = 0;
      const orderItemsData = [];

      for (const item of items) {
        const product = dbProducts.find((p) => p.id === item.productId);
        if (!product) throw new Error(`Product ${item.productId} not found`);

        if (product.currentStock < item.quantity) {
          throw new Error(
            `Insufficient stock for ${product.name} (Only ${product.currentStock} available).`
          );
        }

        const subtotal = Number(product.sellingPriceETB) * item.quantity;
        totalAmountETB += subtotal;

        orderItemsData.push({
          productId: product.id,
          quantity: item.quantity,
          unitPriceETB: product.sellingPriceETB,
          costPriceETB: product.costPriceETB,
          subtotalETB: subtotal,
        });

        // 2. Decrement stock immediately (whether paid now or placed on tab)
        await tx.product.update({
          where: { id: product.id },
          data: { currentStock: { decrement: item.quantity } },
        });

        // 3. Log Stock Movement audit ledger
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: "SALE",
            quantity: -item.quantity,
            unitCostETB: product.costPriceETB,
            reason:
              status === "OPEN_TAB"
                ? "POS item taken on gym tab (pay on leave)"
                : "POS retail checkout",
            createdById: session.id,
          },
        });
      }

      // 4. Generate order number
      const orderCount = await tx.salesOrder.count();
      const orderNumber = `SO-${new Date().getFullYear()}-${String(orderCount + 1).padStart(5, "0")}`;

      // 5. Create Order
      const newOrder = await tx.salesOrder.create({
        data: {
          orderNumber,
          memberId: memberId || null,
          totalAmountETB,
          paymentMethod: paymentMethod || "CASH",
          paymentRef: paymentRef?.trim() || null,
          cashierId: session.id,
          status: status === "OPEN_TAB" ? "OPEN_TAB" : "COMPLETED",
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: {
            include: { product: true },
          },
          member: true,
          cashier: true,
        },
      });

      return newOrder;
    });

    await logAudit({
      userId: session.id,
      action: status === "OPEN_TAB" ? "POS_TAB_OPENED" : "POS_SALE_COMPLETED",
      entityType: "SalesOrder",
      entityId: order.id,
      details: {
        orderNumber: order.orderNumber,
        status: order.status,
        memberCode: order.member?.memberCode || "WALK_IN",
        memberName: order.member?.fullName || "Walk-in Customer",
        totalAmountETB: order.totalAmountETB,
        paymentMethod: order.paymentMethod,
        itemCount: order.items.length,
      },
    });

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("POS checkout error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error processing sale" },
      { status: 500 }
    );
  }
}
