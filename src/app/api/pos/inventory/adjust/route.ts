import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { logAudit, getClientIp } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { productId, mode = "ADD", quantity, type = "RESTOCK", reason } = body;

    if (!productId) {
      return NextResponse.json({ error: "Product ID is required." }, { status: 400 });
    }

    const qtyNumber = parseInt(String(quantity), 10);
    if (isNaN(qtyNumber) || qtyNumber <= 0) {
      return NextResponse.json({ error: "Quantity must be a positive integer." }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    let newStock = product.currentStock;
    let movementQty = qtyNumber;

    if (mode === "ADD") {
      newStock = product.currentStock + qtyNumber;
      movementQty = qtyNumber;
    } else if (mode === "SET") {
      newStock = qtyNumber;
      movementQty = qtyNumber - product.currentStock;
    } else {
      return NextResponse.json({ error: "Invalid adjustment mode. Use ADD or SET." }, { status: 400 });
    }

    // Execute atomic update and stock movement
    const result = await prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { currentStock: newStock },
        include: { category: true },
      });

      const movement = await tx.stockMovement.create({
        data: {
          productId,
          type: type === "DAMAGE_WRITEOFF" ? "DAMAGE_WRITEOFF" : type === "AUDIT_CORRECTION" ? "AUDIT_CORRECTION" : "RESTOCK",
          quantity: movementQty,
          unitCostETB: product.costPriceETB,
          reason: reason?.trim() || (mode === "ADD" ? "Restock / Inventory intake" : "Inventory count adjustment"),
          createdById: session.id,
        },
      });

      return { updatedProduct, movement };
    });

    await logAudit({
      userId: session.id,
      action: "INVENTORY_ADJUSTED",
      entityType: "Product",
      entityId: productId,
      details: {
        productName: product.name,
        previousStock: product.currentStock,
        newStock,
        mode,
        quantityAdjusted: movementQty,
        type,
        reason: reason?.trim() || null,
      },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      success: true,
      message: `Stock updated for ${product.name}: ${newStock} units now available.`,
      product: result.updatedProduct,
    });
  } catch (error) {
    console.error("Inventory adjust error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to adjust inventory." },
      { status: 500 }
    );
  }
}
