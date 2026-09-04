"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UserCheck,
  Users,
  Grid3X3,
  CreditCard,
  KeyRound,
  ShoppingBag,
  FileBarChart,
  Database,
  ShieldCheck,
  ShieldAlert,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles: string[];
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "OPERATIONS",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ["ADMIN", "FINANCE_OWNER", "RECEPTIONIST"],
      },
      {
        label: "Check-in Desk",
        href: "/dashboard/checkin",
        icon: UserCheck,
        roles: ["ADMIN", "FINANCE_OWNER", "RECEPTIONIST"],
      },
      {
        label: "Members & Cards",
        href: "/dashboard/members",
        icon: Users,
        roles: ["ADMIN", "FINANCE_OWNER", "RECEPTIONIST"],
      },
      {
        label: "Locker Grid",
        href: "/dashboard/lockers",
        icon: Grid3X3,
        roles: ["ADMIN", "FINANCE_OWNER", "RECEPTIONIST"],
      },
    ],
  },
  {
    title: "SERVICES & COMMERCE",
    items: [
      {
        label: "Subscriptions",
        href: "/dashboard/subscriptions",
        icon: CreditCard,
        roles: ["ADMIN", "FINANCE_OWNER", "RECEPTIONIST"],
      },
      {
        label: "Locker Rentals",
        href: "/dashboard/rentals",
        icon: KeyRound,
        roles: ["ADMIN", "FINANCE_OWNER", "RECEPTIONIST"],
      },
      {
        label: "POS / Store",
        href: "/dashboard/pos",
        icon: ShoppingBag,
        roles: ["ADMIN", "FINANCE_OWNER", "RECEPTIONIST"],
      },
    ],
  },
  {
    title: "FINANCE & REPORTING",
    items: [
      {
        label: "Reports & Cash",
        href: "/dashboard/reports",
        icon: FileBarChart,
        roles: ["ADMIN", "FINANCE_OWNER", "RECEPTIONIST"],
      },
    ],
  },
  {
    title: "ADMINISTRATION",
    items: [
      {
        label: "Master Data",
        href: "/dashboard/master-data",
        icon: Database,
        roles: ["ADMIN", "FINANCE_OWNER"],
      },
      {
        label: "Staff Accounts",
        href: "/dashboard/users",
        icon: ShieldCheck,
        roles: ["ADMIN"],
      },
      {
        label: "Audit Trail",
        href: "/dashboard/audit",
        icon: ShieldAlert,
        roles: ["ADMIN", "FINANCE_OWNER"],
      },
      {
        label: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
        roles: ["ADMIN", "FINANCE_OWNER"],
      },
    ],
  },
];

export function Sidebar({ role }: { role?: string }) {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-slate-200 bg-white min-h-[calc(100vh-3.5rem)] py-3 px-2">
      <nav className="space-y-4">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter(
            (item) => !role || item.roles.includes(role)
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="space-y-1">
              <div className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center justify-between rounded-md px-3 py-1.5 text-xs font-medium transition-all group",
                        isActive
                          ? "bg-[#1e3a8a] text-white shadow-2xs font-semibold"
                          : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                      )}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isActive
                              ? "text-white"
                              : "text-slate-400 group-hover:text-slate-600"
                          )}
                        />
                        <span>{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
