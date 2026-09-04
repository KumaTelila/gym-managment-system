"use client";

import { useRouter } from "next/navigation";
import { Dumbbell, LogOut } from "lucide-react";
import { SessionUser } from "@/lib/session";

interface HeaderProps {
  user: SessionUser | null;
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white px-6">
      {/* Brand & Section Indicator */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-red-600 text-white shadow-2xs">
            <Dumbbell className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold leading-none tracking-tight text-slate-900">
              Blow Fitness
            </span>
            <span className="text-[10px] text-slate-400">Gym Management</span>
          </div>
        </div>
      </div>

      {/* User Info & Sign Out */}
      <div className="flex items-center space-x-3">
        {user && (
          <div className="text-right">
            <div className="text-xs font-semibold text-slate-900">
              {user.fullName}
            </div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              {user.role.replace("_", " ")}
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center space-x-1.5 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
        >
          <LogOut className="h-3 w-3 text-slate-500" />
          <span>Sign out</span>
        </button>
      </div>
    </header>
  );
}
