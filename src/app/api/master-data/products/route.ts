import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "FINANCE_OWNER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    // 1. Create Category
    if (action === "CREATE_CATEGORY") {
      const { name } = body;
      if (!name) return NextResponse.json({ error: "Category name required" }, { status: 400 });

      const category = await prisma.productCategory.create({
        data: { name: name.trim() },
      });

      await logAudit({
        userId: session.id,
        action: "CATEGORY_CREATED",
        entityType: "ProductCategory",
        entityId: category.id,
        details: { name: category.name },
      });

      return NextResponse.json({ success: true, category });
    }

    // 2. Create Product
    const { name, categoryId, barcode, costPriceETB, sellingPriceETB, currentStock, reorderLevel } = body;

    if (!name || !categoryId || sellingPriceETB === undefined) {
      return NextResponse.json(
        { error: "Product name, category, and selling price required." },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        categoryId,
        barcode: barcode?.trim() || null,
        costPriceETB: parseFloat(costPriceETB || 0),
        sellingPriceETB: parseFloat(sellingPriceETB),
        currentStock: parseInt(currentStock || 0, 10),
        reorderLevel: parseInt(reorderLevel || 5, 10),
        isActive: true,
      },
      include: { category: true },
    });

    if (parseInt(currentStock || 0, 10) > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: "RESTOCK",
          quantity: parseInt(currentStock, 10),
          unitCostETB: parseFloat(costPriceETB || 0),
          reason: "Initial master data stock setup",
          createdById: session.id,
        },
      });
    }

    await logAudit({
      userId: session.id,
      action: "PRODUCT_CREATED",
      entityType: "Product",
      entityId: product.id,
      details: { name: product.name, sellingPriceETB: product.sellingPriceETB },
    });

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error("Product master data error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create product" },
      { status: 500 }
    );
  }
}
