import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await request.json();

    if (!["AVAILABLE", "MAINTENANCE"].includes(status)) {
      return NextResponse.json({ error: "Invalid manual status transition" }, { status: 400 });
    }

    const locker = await prisma.locker.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ success: true, locker });
  } catch (error) {
    console.error("Locker update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error updating locker" },
      { status: 500 }
    );
  }
}
