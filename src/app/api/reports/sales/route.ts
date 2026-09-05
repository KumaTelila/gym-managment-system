import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export interface UnifiedSaleTransaction {
  id: string;
  timestamp: string;
  stream: "POS" | "SUBSCRIPTION" | "RENTAL";
  referenceNumber: string;
  customerName: string;
  customerCode: string;
  description: string;
  amountETB: number;
  paymentMethod: string;
  paymentRef: string | null;
  staffName: string;
  status: string;
}

export async function GET(request: Request) {
  try {
    const auth = await requireRole("ADMIN", "FINANCE_OWNER", "RECEPTIONIST");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get("timeframe") || "today";
    const stream = searchParams.get("stream") || "ALL";
    const paymentMethod = searchParams.get("paymentMethod") || "ALL";
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const customStartDate = searchParams.get("startDate");
    const customEndDate = searchParams.get("endDate");

    // Calculate Date Range
    const now = new Date();
    let start: Date | undefined;
    let end: Date | undefined;

    if (timeframe === "today") {
      start = new Date();
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    } else if (timeframe === "yesterday") {
      start = new Date();
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
    } else if (timeframe === "week") {
      start = new Date();
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    } else if (timeframe === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    } else if (timeframe === "year") {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    } else if (timeframe === "custom" && customStartDate) {
      start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      if (customEndDate) {
        end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
      } else {
        end = new Date();
        end.setHours(23, 59, 59, 999);
      }
    }

    const dateFilter = start || end ? {
      ...(start ? { gte: start } : {}),
      ...(end ? { lte: end } : {}),
    } : undefined;

    const transactions: UnifiedSaleTransaction[] = [];

    // 1. POS Retail Sales Orders
    if (stream === "ALL" || stream === "POS") {
      const posWhere: any = {};
      if (dateFilter) posWhere.createdAt = dateFilter;
      if (paymentMethod !== "ALL") posWhere.paymentMethod = paymentMethod;

      const orders = await prisma.salesOrder.findMany({
        where: posWhere,
        include: {
          member: true,
          cashier: true,
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      for (const order of orders) {
        const itemSummaries = order.items
          .map((i) => `${i.product.name}${i.quantity > 1 ? ` (x${i.quantity})` : ""}`)
          .join(", ");

        transactions.push({
          id: `POS-${order.id}`,
          timestamp: order.createdAt.toISOString(),
          stream: "POS",
          referenceNumber: order.orderNumber,
          customerName: order.member?.fullName || "Walk-in Customer",
          customerCode: order.member?.memberCode || "WALK_IN",
          description: itemSummaries || "Retail Merchandise",
          amountETB: Number(order.totalAmountETB),
          paymentMethod: order.paymentMethod,
          paymentRef: order.paymentRef,
          staffName: order.cashier?.fullName || order.cashier?.username || "Cashier",
          status: order.status,
        });
      }
    }

    // 2. Membership Subscriptions
    if (stream === "ALL" || stream === "SUBSCRIPTION") {
      const subWhere: any = {};
      if (dateFilter) subWhere.createdAt = dateFilter;
      if (paymentMethod !== "ALL") subWhere.paymentMethod = paymentMethod;

      const subscriptions = await prisma.subscription.findMany({
        where: subWhere,
        include: {
          member: true,
          plan: true,
          processedBy: true,
        },
        orderBy: { createdAt: "desc" },
      });

      for (const sub of subscriptions) {
        let desc = `${sub.plan.name} (${sub.plan.durationDays} Days)`;
        if (sub.isSponsored) {
          desc += ` [🎁 Sponsored: ${sub.sponsorReason || "Giveaway"}]`;
        } else if (Number(sub.registrationFeeETB) > 0) {
          desc += ` (+${Number(sub.registrationFeeETB)} ETB Reg Fee)`;
        }

        transactions.push({
          id: `SUB-${sub.id}`,
          timestamp: sub.createdAt.toISOString(),
          stream: "SUBSCRIPTION",
          referenceNumber: `SUB-${sub.id.slice(0, 8).toUpperCase()}`,
          customerName: sub.member.fullName,
          customerCode: sub.member.memberCode,
          description: desc,
          amountETB: Number(sub.amountPaidETB),
          paymentMethod: sub.paymentMethod,
          paymentRef: sub.paymentRef,
          staffName: sub.processedBy?.fullName || sub.processedBy?.username || "Front Desk",
          status: sub.status,
        });
      }
    }

    // 3. Locker Rentals
    if (stream === "ALL" || stream === "RENTAL") {
      const rentWhere: any = {};
      if (dateFilter) rentWhere.createdAt = dateFilter;
      if (paymentMethod !== "ALL") rentWhere.paymentMethod = paymentMethod;

      const rentals = await prisma.lockerRental.findMany({
        where: rentWhere,
        include: {
          member: true,
          locker: true,
        },
        orderBy: { createdAt: "desc" },
      });

      for (const rent of rentals) {
        transactions.push({
          id: `RENT-${rent.id}`,
          timestamp: rent.createdAt.toISOString(),
          stream: "RENTAL",
          referenceNumber: `RENT-${rent.id.slice(0, 8).toUpperCase()}`,
          customerName: rent.member.fullName,
          customerCode: rent.member.memberCode,
          description: `Locker ${rent.locker.lockerNumber} Rental (${rent.locker.section})`,
          amountETB: Number(rent.priceETB),
          paymentMethod: rent.paymentMethod,
          paymentRef: rent.paymentRef,
          staffName: "Front Desk",
          status: rent.isActive ? "ACTIVE" : "COMPLETED",
        });
      }
    }

    // Sort all transactions chronologically descending
    transactions.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Apply Search Filter
    const filteredTransactions = search
      ? transactions.filter((t) => {
          return (
            t.customerName.toLowerCase().includes(search) ||
            t.customerCode.toLowerCase().includes(search) ||
            t.referenceNumber.toLowerCase().includes(search) ||
            t.description.toLowerCase().includes(search) ||
            (t.paymentRef && t.paymentRef.toLowerCase().includes(search)) ||
            t.staffName.toLowerCase().includes(search)
          );
        })
      : transactions;

    // Calculate Summary Totals
    let totalGrossETB = 0;
    let totalRefundsETB = 0;
    let refundsCount = 0;
    let posSalesTotalETB = 0;
    let posSalesCount = 0;
    let subscriptionsTotalETB = 0;
    let subscriptionsCount = 0;
    let rentalsTotalETB = 0;
    let rentalsCount = 0;

    const channelSummary: Record<string, { count: number; totalETB: number }> = {
      CASH: { count: 0, totalETB: 0 },
      TELEBIRR: { count: 0, totalETB: 0 },
      CBE_TRANSFER: { count: 0, totalETB: 0 },
      OTHER: { count: 0, totalETB: 0 },
    };

    for (const t of filteredTransactions) {
      const isRefunded =
        t.status === "REFUNDED" ||
        t.status === "CANCELLED" ||
        t.status === "VOIDED";

      if (isRefunded) {
        totalRefundsETB += t.amountETB;
        refundsCount += 1;
      } else {
        totalGrossETB += t.amountETB;

        if (t.stream === "POS") {
          posSalesTotalETB += t.amountETB;
          posSalesCount += 1;
        } else if (t.stream === "SUBSCRIPTION") {
          subscriptionsTotalETB += t.amountETB;
          subscriptionsCount += 1;
        } else if (t.stream === "RENTAL") {
          rentalsTotalETB += t.amountETB;
          rentalsCount += 1;
        }

        const methodKey = t.paymentMethod in channelSummary ? t.paymentMethod : "OTHER";
        channelSummary[methodKey].count += 1;
        channelSummary[methodKey].totalETB += t.amountETB;
      }
    }

    return NextResponse.json({
      timeframe,
      dateRange: {
        start: start ? start.toISOString() : null,
        end: end ? end.toISOString() : null,
      },
      summary: {
        totalGrossETB,
        totalRefundsETB,
        refundsCount,
        totalTransactionsCount: filteredTransactions.length,
        posSalesTotalETB,
        posSalesCount,
        subscriptionsTotalETB,
        subscriptionsCount,
        rentalsTotalETB,
        rentalsCount,
        channelSummary,
      },
      transactions: filteredTransactions,
    });
  } catch (error) {
    console.error("Sales report error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate sales report" },
      { status: 500 }
    );
  }
}
