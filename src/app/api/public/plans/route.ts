import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDefaultPaymentAccounts } from "@/lib/master-data";
import { getSettingValue } from "@/lib/settings";

export async function GET() {
  try {
    await ensureDefaultPaymentAccounts();

    const [plans, paymentAccounts, registrationFeeStr] = await Promise.all([
      prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { durationDays: "asc" },
      }),
      prisma.paymentAccount.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      getSettingValue("registration_fee", "100"),
    ]);

    return NextResponse.json({
      plans,
      paymentAccounts,
      registrationFeeETB: Number(registrationFeeStr) || 100,
    });
  } catch (error) {
    console.error("Public plans fetch error:", error);
    return NextResponse.json(
      { error: "Failed to load membership plans." },
      { status: 500 }
    );
  }
}
