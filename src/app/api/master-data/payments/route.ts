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

    const { code, name, accountNumber, accountHolder, instructions } = await request.json();

    if (!code || !name) {
      return NextResponse.json({ error: "Account code and name are required." }, { status: 400 });
    }

    const formattedCode = code.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, "_");

    const account = await prisma.paymentAccount.create({
      data: {
        code: formattedCode,
        name: name.trim(),
        accountNumber: accountNumber?.trim() || null,
        accountHolder: accountHolder?.trim() || null,
        instructions: instructions?.trim() || null,
        isActive: true,
      },
    });

    await logAudit({
      userId: session.id,
      action: "PAYMENT_ACCOUNT_CREATED",
      entityType: "PaymentAccount",
      entityId: account.id,
      details: { code: account.code, name: account.name, accountNumber: account.accountNumber },
    });

    return NextResponse.json({ success: true, account });
  } catch (error) {
    console.error("Payment account create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create payment account" },
      { status: 500 }
    );
  }
}
