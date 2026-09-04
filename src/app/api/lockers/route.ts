import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lockers = await prisma.locker.findMany({
      orderBy: [{ section: "desc" }, { lockerNumber: "asc" }],
      include: {
        checkinSessions: {
          where: { sessionStatus: "ACTIVE" },
          include: { member: true },
          take: 1,
        },
        lockerRentals: {
          where: { isActive: true },
          include: { member: true },
          take: 1,
        },
      },
    });

    return NextResponse.json({ lockers });
  } catch (error) {
    console.error("Lockers fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error fetching lockers" },
      { status: 500 }
    );
  }
}
