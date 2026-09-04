import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

    const tabs = await prisma.salesOrder.findMany({
      where: {
        status: "OPEN_TAB",
        memberId: memberId || undefined,
      },
      orderBy: { createdAt: "desc" },
      include: {
        member: true,
        items: {
          include: { product: true },
        },
        cashier: {
          select: { fullName: true, username: true },
        },
      },
    });

    const totalUnpaidETB = tabs.reduce(
      (sum, tab) => sum + Number(tab.totalAmountETB),
      0
    );

    return NextResponse.json({ tabs, totalUnpaidETB });
  } catch (error) {
    console.error("Fetch open tabs error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch open tabs" },
      { status: 500 }
    );
  }
}
