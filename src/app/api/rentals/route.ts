import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/session";
import { logAudit, getClientIp } from "@/lib/audit";

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
      { error: "Error fetching rentals." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRole("ADMIN", "RECEPTIONIST");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const session = auth.user;

    const { memberId, lockerId, durationDays = 30, paymentMethod, paymentRef, priceETB } =
      await request.json();

    if (!memberId || !lockerId) {
      return NextResponse.json({ error: "Member and locker are required." }, { status: 400 });
    }

    const duration = Math.max(1, parseInt(String(durationDays), 10) || 30);

    // F-02: Authoritative server-side pricing (500 ETB per 30-day block, rounded to nearest 50 ETB)
    const authoritativePriceETB = Math.max(100, Math.round((duration / 30) * 500 / 50) * 50);

    if (priceETB !== undefined && Number(priceETB) !== authoritativePriceETB) {
      return NextResponse.json(
        {
          error: `Price mismatch: standard rental rate for ${duration} days is ${authoritativePriceETB} ETB. Client-submitted price (${priceETB} ETB) is not permitted without manager override.`,
        },
        { status: 400 }
      );
    }

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000);

    const rental = await prisma.$transaction(async (tx) => {
      // F-04: Atomic conditional locker reservation (mirrors check-in atomic pattern)
      const lockerUpdate = await tx.locker.updateMany({
        where: { id: lockerId, status: "AVAILABLE" },
        data: { status: "RESERVED" },
      });

      if (lockerUpdate.count === 0) {
        const error = new Error("Locker is no longer available for reservation.");
        (error as any).statusCode = 409;
        throw error;
      }

      // Create rental record
      const createdRental = await tx.lockerRental.create({
        data: {
          lockerId,
          memberId,
          startDate,
          endDate,
          priceETB: authoritativePriceETB,
          paymentMethod: paymentMethod || "CASH",
          paymentRef: paymentRef?.trim() || null,
          isActive: true,
        },
        include: {
          locker: true,
          member: true,
        },
      });

      return createdRental;
    });

    // F-12: Write audit log with IP address
    await logAudit({
      userId: session.id,
      action: "LOCKER_RENTED",
      entityType: "LockerRental",
      entityId: rental.id,
      details: {
        memberCode: rental.member.memberCode,
        memberName: rental.member.fullName,
        lockerNumber: rental.locker.lockerNumber,
        durationDays: duration,
        priceETB: authoritativePriceETB,
        paymentMethod: paymentMethod || "CASH",
        paymentRef: paymentRef?.trim() || null,
      },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, rental });
  } catch (error: any) {
    console.error("Rental create error:", error);
    const status = error?.statusCode || 500;
    return NextResponse.json(
      { error: error?.message || "Failed to create rental reservation." },
      { status }
    );
  }
}
