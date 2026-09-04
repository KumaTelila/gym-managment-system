import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const rental = await prisma.lockerRental.findUnique({ where: { id } });
    if (!rental) {
      return NextResponse.json({ error: "Rental record not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.lockerRental.update({
        where: { id },
        data: { isActive: false },
      });

      await tx.locker.update({
        where: { id: rental.lockerId },
        data: { status: "AVAILABLE" },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Rental termination error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to terminate rental" },
      { status: 500 }
    );
  }
}
