"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, UserCheck, KeyRound } from "lucide-react";

interface LoginFormProps extends React.ComponentPropsWithoutRef<"div"> {
  facilityName?: string;
}

export function LoginForm({
  className,
  facilityName = "Blow Fitness",
  ...props
}: LoginFormProps) {
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
    setError(null);
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-slate-200/80 shadow-sm bg-white">
        <CardHeader className="text-center pb-4 pt-6">
          <CardTitle className="text-xl font-bold tracking-tight text-slate-900">
            Welcome back
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-1">
            Sign in with your staff account to access the system
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-0">
          <form onSubmit={handleSubmit}>
            <div className="grid gap-5">
              {/* Quick Demo Staff Logins (development / test only) */}
              {process.env.NODE_ENV !== "production" && (
                <>
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-medium text-slate-400 text-center">
                      Quick demo login (Dev environment):
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickLogin("admin", "admin123")}
                        className="h-8 text-xs font-medium border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center justify-center gap-1.5"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-red-500" />
                        Admin
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickLogin("manager", "mgr123")}
                        className="h-8 text-xs font-medium border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center justify-center gap-1.5"
                      >
                        <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                        Manager
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickLogin("reception", "rec123")}
                        className="h-8 text-xs font-medium border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center justify-center gap-1.5"
                      >
                        <KeyRound className="h-3.5 w-3.5 text-emerald-600" />
                        Reception
                      </Button>
                    </div>
                  </div>

                  {/* Separator */}
                  <div className="relative text-center text-xs after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-slate-200">
                    <span className="relative z-10 bg-white px-2 text-[11px] font-medium text-slate-400">
                      Or enter credentials
                    </span>
                  </div>
                </>
              )}

              {/* Error Alert */}
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 font-medium">
                  {error}
                </div>
              )}

              {/* Inputs */}
              <div className="grid gap-4">
                <div className="grid gap-1.5 text-left">
                  <Label htmlFor="username" className="text-xs font-medium text-slate-700">
                    Username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="e.g. manager"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    className="h-9 text-xs bg-slate-50/50 border-slate-200 focus:bg-white"
                  />
                </div>

                <div className="grid gap-1.5 text-left">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-medium text-slate-700">
                      Password
                    </Label>
                    <span className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer transition-colors">
                      Forgot password?
                    </span>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="h-9 text-xs bg-slate-50/50 border-slate-200 focus:bg-white"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1e3a8a] hover:bg-[#1e40af] text-white h-9 text-xs font-medium shadow-xs transition-colors"
                >
                  {loading ? "Authenticating..." : "Sign in"}
                </Button>
              </div>

              {/* Bottom Support Link */}
              <div className="text-center text-xs text-slate-500">
                Staff without credentials?{" "}
                <span className="font-medium text-[#1e3a8a] hover:underline cursor-pointer">
                  Contact administrator
                </span>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Footer Disclaimer */}
      <div className="text-balance text-center text-xs text-slate-400 [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-slate-700">
        {facilityName} Management System &bull; Authorized Personnel Only
      </div>
    </div>
  );
}
