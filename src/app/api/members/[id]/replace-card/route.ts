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
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || "Lost physical card";
    const replacementFeeETB = 100;

    const updated = await prisma.$transaction(async (tx) => {
      const member = await tx.member.findUnique({ where: { id } });
      if (!member) throw new Error("Member not found");

      const newVersion = member.cardVersion + 1;

      // Update version
      const m = await tx.member.update({
        where: { id },
        data: { cardVersion: newVersion },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: session.id,
          action: "CARD_REPLACED",
          entityType: "Member",
          entityId: id,
          detailsJson: JSON.stringify({
            previousVersion: member.cardVersion,
            newVersion,
            reason,
            feeETB: replacementFeeETB,
          }),
        },
      });

      return m;
    });

    return NextResponse.json({ success: true, member: updated });
  } catch (error) {
    console.error("Card replacement error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error replacing card" },
      { status: 500 }
    );
  }
}
