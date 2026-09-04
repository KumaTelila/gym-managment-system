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

    const account = await prisma.paymentAccount.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name.trim() : undefined,
        accountNumber: body.accountNumber !== undefined ? body.accountNumber.trim() : undefined,
        accountHolder: body.accountHolder !== undefined ? body.accountHolder.trim() : undefined,
        instructions: body.instructions !== undefined ? body.instructions.trim() : undefined,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
      },
    });

    await logAudit({
      userId: session.id,
      action: "PAYMENT_ACCOUNT_UPDATED",
      entityType: "PaymentAccount",
      entityId: id,
      details: body,
    });

    return NextResponse.json({ success: true, account });
  } catch (error) {
    console.error("Payment account update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update payment account" },
      { status: 500 }
    );
  }
}
