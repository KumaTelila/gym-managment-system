import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getMasterDataSummary } from "@/lib/master-data";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "FINANCE_OWNER")) {
      return NextResponse.json({ error: "Forbidden: Only administrators and managers can view master data" }, { status: 403 });
    }

    const data = await getMasterDataSummary();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Master data fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch master data" },
      { status: 500 }
    );
  }
}
