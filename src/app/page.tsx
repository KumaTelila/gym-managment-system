import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { ensureDefaultSettings } from "@/lib/settings";
import { LandingPageClient } from "@/components/LandingPageClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();

  // Load branding
  const branding: Record<string, string> = {
    facility_name: "Blow Fitness",
    facility_tagline: "Premier Athletic & Performance Center",
    facility_address: "Bole Medhanialem, Camoros St, Addis Ababa, Ethiopia",
    facility_phone: "+251 91 100 2233",
    facility_email: "desk@blowfitness.et",
    facility_logo_url: "/blow.png",
  };

  try {
    await ensureDefaultSettings();
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            "facility_name",
            "facility_tagline",
            "facility_address",
            "facility_phone",
            "facility_email",
            "facility_logo_url",
          ],
        },
      },
    });
    for (const s of settings) {
      branding[s.key] = s.value;
    }
  } catch (error) {
    console.warn("Could not load facility settings, using defaults:", error);
  }

  // Load active subscription plans
  let plans: any[] = [];
  try {
    plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { durationDays: "asc" },
    });
  } catch (error) {
    console.error("Could not load subscription plans:", error);
  }

  // If no plans in database, supply attractive defaults for display
  if (plans.length === 0) {
    plans = [
      {
        id: "plan-monthly",
        name: "Monthly Standard",
        durationDays: 30,
        priceETB: "1700",
        description: "Full unrestricted access to strength and cardio floors.",
      },
      {
        id: "plan-quarterly",
        name: "Quarterly Pro",
        durationDays: 90,
        priceETB: "4800",
        description: "Best for committed lifters with 1 free trainer consultation.",
      },
      {
        id: "plan-annual",
        name: "Annual VIP Pass",
        durationDays: 365,
        priceETB: "16500",
        description: "VIP year-round access, dedicated locker privilege, and gym merchandise.",
      },
    ];
  }

  return (
    <LandingPageClient
      plans={plans.map((p) => ({
        id: p.id,
        name: p.name,
        durationDays: p.durationDays,
        priceETB: Number(p.priceETB),
        description: p.description,
      }))}
      branding={branding as any}
      session={session}
    />
  );
}
