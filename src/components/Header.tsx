"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LogOut, Loader2 } from "lucide-react";
import { SessionUser } from "@/lib/session";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  user?: SessionUser | null;
  mobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
}

export function Header({ user, mobileMenuOpen, onToggleMobileMenu }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [facilityName, setFacilityName] = useState<string>("Blow Fitness");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    fetch("/api/settings/public")
      .then((res) => res.json())
      .then((data) => {
        if (data.config?.facility_logo_url) {
          setLogoUrl(data.config.facility_logo_url);
        }
        if (data.config?.facility_name) {
          setFacilityName(data.config.facility_name);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      setIsLoggingOut(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "ST";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getPageTitle = (path: string) => {
    if (path === "/dashboard") return "Dashboard Overview";
    if (path.startsWith("/dashboard/checkin")) return "Front Desk Check-In";
    if (path.startsWith("/dashboard/members")) return "Members & Access Cards";
    if (path.startsWith("/dashboard/lockers")) return "Locker Bay Grid";
    if (path.startsWith("/dashboard/subscriptions")) return "Subscription Management";
    if (path.startsWith("/dashboard/rentals")) return "Locker Contracts & Rentals";
    if (path.startsWith("/dashboard/pos")) return "POS Store & Quick Register";
    if (path.startsWith("/dashboard/reports")) return "Financial Reports & Cash";
    if (path.startsWith("/dashboard/master-data")) return "Master Data Configuration";
    if (path.startsWith("/dashboard/users")) return "Staff Account Directory";
    if (path.startsWith("/dashboard/audit")) return "System Audit Trail";
    if (path.startsWith("/dashboard/settings")) return "System Settings";
    return "Operations Terminal";
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-xs px-3 sm:px-6 transition-all">
      {/* Left: Mobile trigger, brand, separator, breadcrumb title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Sidebar Trigger */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          aria-label="Toggle Navigation Menu"
          className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Mobile Brand */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white border border-slate-200/80 shadow-2xs overflow-hidden shrink-0">
            <img
              src={logoUrl || "/blow.png"}
              alt={facilityName}
              className="h-full w-full object-contain p-0.5"
            />
          </div>
          <span className="text-xs font-bold tracking-tight text-slate-900 truncate">
            {facilityName}
          </span>
        </div>

        <Separator orientation="vertical" className="hidden lg:block h-5 mx-1" />

        {/* Breadcrumb / Page Title */}
        <div className="hidden lg:flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-slate-400 shrink-0">{facilityName}</span>
          <span className="text-slate-300 text-xs shrink-0">/</span>
          <h1 className="text-xs font-semibold text-slate-800 truncate">
            {getPageTitle(pathname)}
          </h1>
        </div>
      </div>

      {/* Right: Shadcn Logout Action */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          disabled={isLoggingOut}
          title="Sign out of account"
          className="h-8 gap-1.5 border-slate-200 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-all shadow-2xs font-medium cursor-pointer rounded-lg px-2.5 sm:px-3"
        >
          {isLoggingOut ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-red-500" />
          ) : (
            <LogOut className="h-3.5 w-3.5 text-slate-500 group-hover:text-red-600 transition-colors" />
          )}
          <span className="hidden sm:inline text-xs font-semibold">Sign Out</span>
        </Button>
      </div>
    </header>
  );
}

