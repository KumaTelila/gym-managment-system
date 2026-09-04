import { Dumbbell } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ensureDefaultSettings } from "@/lib/settings";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const branding: Record<string, string> = {
    facility_name: "Blow Fitness",
    facility_logo_url: "",
    facility_tagline: "Premier Athletic & Performance Center",
  };

  try {
    await ensureDefaultSettings();

    const settings = await prisma.systemSetting.findMany({
      where: {
        key: { in: ["facility_name", "facility_logo_url", "facility_tagline"] },
      },
    });

    for (const s of settings) {
      branding[s.key] = s.value;
    }
  } catch (error) {
    console.warn("Could not query facility settings from database, using defaults:", error);
  }

  const logoUrl = branding.facility_logo_url;
  const facilityName = branding.facility_name || "Blow Fitness";

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-slate-50/70 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 self-center font-medium text-slate-900 transition-opacity hover:opacity-90"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200/90 shadow-xs overflow-hidden shrink-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={facilityName}
                className="h-full w-full object-contain p-1"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#1e3a8a] text-white">
                <Dumbbell className="h-4 w-4" />
              </div>
            )}
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-900">
            {facilityName}
          </span>
        </Link>
        <LoginForm facilityName={facilityName} />
      </div>
    </div>
  );
}
