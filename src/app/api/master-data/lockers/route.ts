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

    const body = await request.json();
    const { mode, lockerNumber, section, prefix, startNum, endNum } = body;

    // Single Locker Mode
    if (mode === "SINGLE") {
      if (!lockerNumber || !section) {
        return NextResponse.json({ error: "Locker number and section required" }, { status: 400 });
      }

      const formattedNum = lockerNumber.trim().toUpperCase();
      const existing = await prisma.locker.findUnique({ where: { lockerNumber: formattedNum } });
      if (existing) {
        return NextResponse.json({ error: `Locker ${formattedNum} already exists` }, { status: 400 });
      }

      const locker = await prisma.locker.create({
        data: {
          lockerNumber: formattedNum,
          section: section.trim().toUpperCase(),
          status: "AVAILABLE",
        },
      });

      await logAudit({
        userId: session.id,
        action: "LOCKER_CREATED",
        entityType: "Locker",
        entityId: locker.id,
        details: { lockerNumber: locker.lockerNumber, section: locker.section },
      });

      return NextResponse.json({ success: true, locker });
    }

    // Batch Generation Mode (e.g. prefix "M-", start 17, end 25)
    if (mode === "BATCH") {
      if (!prefix || !section || startNum === undefined || endNum === undefined) {
        return NextResponse.json({ error: "Prefix, section, start number, and end number required" }, { status: 400 });
      }

      const start = parseInt(startNum, 10);
      const end = parseInt(endNum, 10);

      if (start > end || end - start > 100) {
        return NextResponse.json({ error: "Invalid range (max 100 per batch)" }, { status: 400 });
      }

      const createdLockers = [];
      for (let i = start; i <= end; i++) {
        const num = `${prefix.trim().toUpperCase()}${String(i).padStart(2, "0")}`;
        const existing = await prisma.locker.findUnique({ where: { lockerNumber: num } });
        if (!existing) {
          const l = await prisma.locker.create({
            data: {
              lockerNumber: num,
              section: section.trim().toUpperCase(),
              status: "AVAILABLE",
            },
          });
          createdLockers.push(l);
        }
      }

      await logAudit({
        userId: session.id,
        action: "LOCKERS_BATCH_CREATED",
        entityType: "Locker",
        entityId: `${prefix}${start}-${end}`,
        details: { count: createdLockers.length, section, prefix, start, end },
      });

      return NextResponse.json({ success: true, count: createdLockers.length });
    }

    return NextResponse.json({ error: "Invalid mode (choose SINGLE or BATCH)" }, { status: 400 });
  } catch (error) {
    console.error("Locker master data create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create lockers" },
      { status: 500 }
    );
  }
}
