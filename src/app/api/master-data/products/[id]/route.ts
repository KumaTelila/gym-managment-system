import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "FINANCE_OWNER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const current = await prisma.product.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name.trim() : undefined,
        categoryId: body.categoryId !== undefined ? body.categoryId : undefined,
        barcode: body.barcode !== undefined ? body.barcode.trim() || null : undefined,
        costPriceETB: body.costPriceETB !== undefined ? parseFloat(body.costPriceETB) : undefined,
        sellingPriceETB: body.sellingPriceETB !== undefined ? parseFloat(body.sellingPriceETB) : undefined,
        currentStock: body.currentStock !== undefined ? parseInt(body.currentStock, 10) : undefined,
        reorderLevel: body.reorderLevel !== undefined ? parseInt(body.reorderLevel, 10) : undefined,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
      },
      include: { category: true },
    });

    // If stock changed manually, log stock movement
    if (body.currentStock !== undefined && parseInt(body.currentStock, 10) !== current.currentStock) {
      const diff = parseInt(body.currentStock, 10) - current.currentStock;
      await prisma.stockMovement.create({
        data: {
          productId: id,
          type: "AUDIT_CORRECTION",
          quantity: diff,
          unitCostETB: product.costPriceETB,
          reason: body.reason || "Manual stock edit in master data",
          createdById: session.id,
        },
      });
    }

    await logAudit({
      userId: session.id,
      action: "PRODUCT_UPDATED",
      entityType: "Product",
      entityId: id,
      details: body,
    });

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error("Product update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update product" },
      { status: 500 }
    );
  }
}
