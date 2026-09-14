import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDefaultSettings } from "@/lib/settings";

export async function GET() {
  try {
    await ensureDefaultSettings();
    const branding = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            "facility_name",
            "facility_logo_url",
            "facility_tagline",
            "facility_address",
            "facility_phone",
            "facility_email",
            "registration_fee",
            "dedicated_locker_fee",
            "day_pass_fee",
            "card_replacement_fee",
            "currency_code",
          ],
        },
      },
    });

    const config: Record<string, string> = {
      facility_name: "Blow Fitness",
      facility_logo_url: "/logo.png",
      facility_tagline: "Premier Athletic & Performance Center",
      facility_address: "Bole Medhanialem, Camoros St, Addis Ababa, Ethiopia",
      facility_phone: "+251 91 100 2233",
      facility_email: "desk@blowfitness.et",
      registration_fee: "100",
      dedicated_locker_fee: "500",
      day_pass_fee: "200",
      card_replacement_fee: "100",
      currency_code: "ETB",
    };

    for (const s of branding) {
      config[s.key] = s.value;
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error("Public branding fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch public branding" },
      { status: 500 }
    );
  }
}
