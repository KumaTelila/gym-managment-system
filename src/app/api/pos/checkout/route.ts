import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { logAudit, getClientIp } from "@/lib/audit";

interface CartItemInput {
  productId: string;
  quantity: number;
}

export async function POST(request: Request) {
  try {
    const auth = await requireRole("ADMIN", "RECEPTIONIST", "FINANCE_OWNER");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const session = auth.user;

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

        // 2. Decrement stock atomically (AUD-012)
        const updateRes = await tx.product.updateMany({
          where: {
            id: product.id,
            currentStock: { gte: item.quantity },
          },
          data: { currentStock: { decrement: item.quantity } },
        });

        if (updateRes.count === 0) {
          throw new Error(
            `Insufficient stock for ${product.name} (another sale occurred concurrently).`
          );
        }

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

      // 4. Generate collision-resistant order number (F-06)
      const orderCount = await tx.salesOrder.count();
      const entropy = Math.random().toString(36).substring(2, 6).toUpperCase();
      const orderNumber = `SO-${new Date().getFullYear()}-${String(orderCount + 1).padStart(4, "0")}-${entropy}`;

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
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error("POS checkout error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process sale. Please check stock and try again." },
      { status: 500 }
    );
  }
}
