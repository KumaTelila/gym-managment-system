import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getAllSettings, updateSetting } from "@/lib/settings";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "FINANCE_OWNER")) {
      return NextResponse.json({ error: "Forbidden: Only administrators and managers can view configuration" }, { status: 403 });
    }

    const settings = await getAllSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Settings error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "ADMIN" && session.role !== "FINANCE_OWNER") {
      return NextResponse.json(
        { error: "Forbidden: Only Admin and Managers can modify system configurations" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { settings } = body; // Array of { key: string, value: string }

    if (!Array.isArray(settings)) {
      return NextResponse.json(
        { error: "Expected 'settings' array with key-value pairs" },
        { status: 400 }
      );
    }

    const updated = [];
    for (const item of settings) {
      if (item.key && item.value !== undefined) {
        const res = await updateSetting(item.key, String(item.value), session.id);
        updated.push(res);
      }
    }

    return NextResponse.json({ success: true, updatedCount: updated.length });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update settings" },
      { status: 500 }
    );
  }
}
