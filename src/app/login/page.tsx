"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dumbbell } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] p-4 text-slate-900">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-7 shadow-xs">
        {/* Brand Header */}
        <div className="mb-6 flex flex-col items-start">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-200">
            <Dumbbell className="h-4 w-4" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            BLOW FITNESS SYSTEM
          </span>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
            Sign in
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Use your staff account to access the gym management system.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              Username <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. manager"
              disabled={loading}
              className="text-xs h-9 bg-slate-50/80 border-slate-200 focus:bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              Password <span className="text-red-500">*</span>
            </label>
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              className="text-xs h-9 bg-slate-50/80 border-slate-200 focus:bg-white"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1e3a8a] text-xs font-medium text-white hover:bg-[#1e40af] h-9 transition-colors"
          >
            {loading ? "Connecting to your account..." : "Sign in"}
          </Button>
        </form>

        {/* Quick Demo Credentials */}
        <div className="mt-6 border-t border-slate-100 pt-4">
          <span className="text-[11px] font-medium text-slate-400 block mb-2">
            Demo quick-fill:
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickLogin("manager", "mgr123")}
              className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Manager
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin("reception", "rec123")}
              className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Receptionist
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin("admin", "admin123")}
              className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Admin
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-[11px] text-slate-400">
          Staff without credentials?{" "}
          <span className="text-[#1e3a8a] font-medium cursor-pointer hover:underline">
            Contact system administrator
          </span>
        </div>
      </div>
    </div>
  );
}
