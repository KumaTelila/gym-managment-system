"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  PlusCircle,
  MoreVertical,
  LogOut,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SessionUser } from "@/lib/session";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  badge?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "OPERATIONS",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
        roles: ["ADMIN", "FINANCE_OWNER", "RECEPTIONIST"],
      },
      {
        title: "Check-in Desk",
        url: "/dashboard/checkin",
        icon: UserCheck,
        roles: ["ADMIN", "FINANCE_OWNER", "RECEPTIONIST"],
      },
      {
        title: "Members & Cards",
        url: "/dashboard/members",
        icon: Users,
        roles: ["ADMIN", "FINANCE_OWNER", "RECEPTIONIST"],
      },
      {
        title: "Locker Grid",
        url: "/dashboard/lockers",
        icon: Grid3X3,
        roles: ["ADMIN", "FINANCE_OWNER", "RECEPTIONIST"],
      },
    ],
  },
  {
    label: "COMMERCE & SERVICES",
    items: [
      {
        title: "POS / Store",
        url: "/dashboard/pos",
        icon: ShoppingBag,
        roles: ["ADMIN", "FINANCE_OWNER", "RECEPTIONIST"],
      },
      {
        title: "Subscriptions",
        url: "/dashboard/subscriptions",
        icon: CreditCard,
        roles: ["ADMIN", "FINANCE_OWNER", "RECEPTIONIST"],
      },
      {
        title: "Online Approvals",
        url: "/dashboard/approvals",
        icon: ShieldCheck,
        roles: ["ADMIN", "FINANCE_OWNER", "RECEPTIONIST"],
      },
      {
        title: "Locker Rentals",
        url: "/dashboard/rentals",
        icon: KeyRound,
        roles: ["ADMIN", "FINANCE_OWNER", "RECEPTIONIST"],
      },
    ],
  },
  {
    label: "MANAGEMENT & AUDIT",
    items: [
      {
        title: "Reports & Cash",
        url: "/dashboard/reports",
        icon: FileBarChart,
        roles: ["ADMIN", "FINANCE_OWNER", "RECEPTIONIST"],
      },
      {
        title: "Master Data",
        url: "/dashboard/master-data",
        icon: Database,
        roles: ["ADMIN", "FINANCE_OWNER"],
      },
      {
        title: "Staff Accounts",
        url: "/dashboard/users",
        icon: ShieldCheck,
        roles: ["ADMIN"],
      },
      {
        title: "Audit Trail",
        url: "/dashboard/audit",
        icon: ShieldAlert,
        roles: ["ADMIN", "FINANCE_OWNER"],
      },
      {
        title: "Settings",
        url: "/dashboard/settings",
        icon: Settings,
        roles: ["ADMIN", "FINANCE_OWNER"],
      },
    ],
  },
];

interface SidebarProps {
  user?: SessionUser | null;
  role?: string;
  isMobile?: boolean;
  onNavigate?: () => void;
}

export function Sidebar({
  user,
  role,
  isMobile = false,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const effectiveRole = user?.role || role;
  const [logoUrl, setLogoUrl] = React.useState<string>("");
  const [facilityName, setFacilityName] = React.useState<string>("Blow Fitness");

  React.useEffect(() => {
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
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const getInitials = (name?: string) => {
    if (!name) return "ST";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <aside
      className={cn(
        "flex flex-col bg-white border-r border-slate-200/90 text-slate-800 select-none",
        isMobile
          ? "w-full h-full p-3"
          : "w-60 shrink-0 h-full p-3"
      )}
    >
      {/* Brand Header (dashboard-01 style) */}
      <div className="flex items-center gap-3 px-2 py-2 mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200/80 shadow-xs overflow-hidden shrink-0">
          <img
            src={logoUrl || "/blow.png"}
            alt={facilityName}
            className="h-full w-full object-contain p-0.5"
          />
        </div>
        <div className="grid flex-1 leading-tight min-w-0">
          <span className="truncate text-xs font-bold tracking-tight text-slate-900">
            {facilityName}
          </span>
          <span className="truncate text-[10px] font-medium text-slate-400">
            System Terminal
          </span>
        </div>
      </div>

      {/* Quick Action Button (matches dashboard-01 PlusCircle / Quick Create) */}
      <div className="px-1 mb-4">
        <Link
          href="/dashboard/checkin"
          onClick={onNavigate}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1e3a8a] px-3 py-2 text-xs font-medium text-white shadow-xs hover:bg-[#1e40af] transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Quick Check-In</span>
        </Link>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 space-y-4 overflow-y-auto px-1 py-1">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !effectiveRole || item.roles.includes(effectiveRole)
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label} className="space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive =
                    pathname === item.url ||
                    (item.url !== "/dashboard" && pathname.startsWith(item.url));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.url}
                      href={item.url}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all group",
                        isActive
                          ? "bg-slate-100 text-[#1e3a8a] font-semibold"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isActive
                              ? "text-[#1e3a8a]"
                              : "text-slate-400 group-hover:text-slate-600"
                          )}
                        />
                        <span className="truncate">{item.title}</span>
                      </div>
                      {item.badge && (
                        <span className="rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer: NavUser Component */}
      {user && (
        <div className="mt-auto border-t border-slate-100 pt-2 px-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left text-xs hover:bg-slate-100 transition-all focus:outline-none cursor-pointer border border-transparent hover:border-slate-200"
              >
                <Avatar className="h-8 w-8 rounded-lg border border-slate-200 shrink-0">
                  <AvatarFallback className="rounded-lg bg-slate-100 text-[11px] font-bold text-slate-700">
                    {getInitials(user.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 leading-tight min-w-0">
                  <span className="truncate font-semibold text-slate-800">
                    {user.fullName}
                  </span>
                  <span className="truncate text-[10px] font-medium text-slate-400 uppercase">
                    {user.role.replace("_", " ")}
                  </span>
                </div>
                <MoreVertical className="h-4 w-4 text-slate-400 shrink-0 hover:text-slate-600" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56 rounded-lg p-1.5 shadow-xl border-slate-200 bg-white"
              side="top"
              align="start"
              sideOffset={10}
            >
              <DropdownMenuLabel className="p-1 font-normal">
                <div className="flex items-center gap-2.5 px-1 py-1">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-[#1e3a8a] text-white font-bold text-xs">
                      {getInitials(user.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid leading-tight min-w-0">
                    <span className="font-semibold text-xs text-slate-900 truncate">
                      {user.fullName}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate">
                      @{user.username} &bull; {user.role.replace("_", " ")}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => router.push("/dashboard/settings")}
                className="gap-2 text-xs text-slate-700 cursor-pointer rounded-md"
              >
                <User className="h-3.5 w-3.5 text-slate-500" />
                <span>Account Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="gap-2 text-xs text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer font-medium rounded-md"
              >
                <LogOut className="h-3.5 w-3.5 text-red-500" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </aside>
  );
}
