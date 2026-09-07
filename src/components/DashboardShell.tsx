"use client";

import React, { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { SessionUser } from "@/lib/session";

interface DashboardShellProps {
  user: SessionUser;
  children: React.ReactNode;
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="h-screen bg-[#f8fafc] text-slate-900 flex flex-col overflow-hidden">
      <Header
        user={user}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      <div className="flex flex-1 overflow-hidden relative min-h-0">
        {/* Desktop Sidebar (fixed, non-scrolling with inner content) */}
        <div className="hidden lg:flex shrink-0 h-full overflow-hidden">
          <Sidebar user={user} role={user.role} />
        </div>

        {/* Mobile & Tablet Drawer with Backdrop */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in"
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Slide-in Drawer */}
            <div className="relative z-50 w-64 max-w-[80vw] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
              <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                <div className="text-xs font-bold text-slate-800">Blow Fitness Menu</div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-400 hover:text-slate-700 p-1 text-xs"
                >
                  ✕
                </button>
              </div>
              <Sidebar
                user={user}
                role={user.role}
                isMobile
                onNavigate={() => setMobileMenuOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Main Content Area: Independently scrollable inner content */}
        <main className="flex-1 h-full overflow-y-auto p-3 sm:p-5 lg:p-6 max-w-7xl mx-auto w-full min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
