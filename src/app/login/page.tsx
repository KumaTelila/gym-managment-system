import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ensureDefaultSettings } from "@/lib/settings";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const branding: Record<string, string> = {
    facility_name: "Blow Fitness",
    facility_logo_url: "/blow.png",
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

  const logoUrl = branding.facility_logo_url || "/blow.png";
  const facilityName = branding.facility_name || "Blow Fitness";

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-slate-50 p-6 md:p-10 text-slate-900">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link
          href="/"
          className="flex items-center gap-3 self-center font-medium transition-opacity hover:opacity-90"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-slate-200 p-1 shadow-xs overflow-hidden shrink-0">
            <img
              src={logoUrl}
              alt={facilityName}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="leading-tight">
            <span className="font-black text-lg tracking-tight text-slate-900 block">
              BLOW <span className="text-[#dc2626]">FITNESS</span>
            </span>
            <span className="text-[10px] text-amber-600 font-bold tracking-wider uppercase block">
              Access Terminal
            </span>
          </div>
        </Link>
        <LoginForm facilityName={facilityName} />
      </div>
    </div>
  );
}
