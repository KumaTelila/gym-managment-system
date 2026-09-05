"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { SessionUser } from "@/lib/session";
import { Separator } from "@/components/ui/separator";

interface HeaderProps {
  user?: SessionUser | null;
  mobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
}

export function Header({ mobileMenuOpen, onToggleMobileMenu }: HeaderProps) {
  const pathname = usePathname();
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [facilityName, setFacilityName] = useState<string>("Blow Fitness");

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
    <header className="sticky top-0 z-30 flex h-14 w-full items-center border-b border-slate-200 bg-white/95 backdrop-blur-xs px-3 sm:px-6 transition-all">
      {/* Left: Mobile trigger, brand, separator, breadcrumb title (dashboard-01 style) */}
      <div className="flex items-center gap-2 sm:gap-3">
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
          <span className="text-xs font-bold tracking-tight text-slate-900">
            {facilityName}
          </span>
        </div>

        <Separator orientation="vertical" className="hidden lg:block h-5 mx-1" />

        {/* Breadcrumb / Page Title */}
        <div className="hidden lg:flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400">{facilityName}</span>
          <span className="text-slate-300 text-xs">/</span>
          <h1 className="text-xs font-semibold text-slate-800">
            {getPageTitle(pathname)}
          </h1>
        </div>
      </div>
    </header>
  );
}
