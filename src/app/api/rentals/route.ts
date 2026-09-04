import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rentals = await prisma.lockerRental.findMany({
      include: {
        member: true,
        locker: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const availableLockers = await prisma.locker.findMany({
      where: { status: "AVAILABLE" },
      orderBy: { lockerNumber: "asc" },
    });

    return NextResponse.json({ rentals, availableLockers });
  } catch (error) {
    console.error("Rentals error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error fetching rentals" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { memberId, lockerId, durationDays = 30, priceETB = 500, paymentMethod, paymentRef } =
      await request.json();

    if (!memberId || !lockerId) {
      return NextResponse.json({ error: "Member and locker are required." }, { status: 400 });
    }

    const locker = await prisma.locker.findUnique({ where: { id: lockerId } });
    if (!locker || locker.status !== "AVAILABLE") {
      return NextResponse.json(
        { error: `Locker ${locker?.lockerNumber || ""} is not available for rental.` },
        { status: 400 }
      );
    }

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const rental = await prisma.$transaction(async (tx) => {
      // 1. Mark locker RESERVED
      await tx.locker.update({
        where: { id: lockerId },
        data: { status: "RESERVED" },
      });

      // 2. Create rental
      return await tx.lockerRental.create({
        data: {
          lockerId,
          memberId,
          startDate,
          endDate,
          priceETB,
          paymentMethod: paymentMethod || "CASH",
          paymentRef: paymentRef?.trim() || null,
          isActive: true,
        },
        include: {
          locker: true,
          member: true,
        },
      });
    });

    return NextResponse.json({ success: true, rental });
  } catch (error) {
    console.error("Rental create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create rental" },
      { status: 500 }
    );
  }
}
