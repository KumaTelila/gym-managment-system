"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, KeyRound, Wrench, RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/toaster";

interface LockerData {
  id: string;
  lockerNumber: string;
  section: string;
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";
  checkinSessions: Array<{
    id: string;
    checkinTime: string;
    member: { fullName: string; memberCode: string };
  }>;
  lockerRentals: Array<{
    id: string;
    endDate: string;
    member: { fullName: string; memberCode: string };
  }>;
}

export default function LockersPage() {
  const router = useRouter();
  const [lockers, setLockers] = useState<LockerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "MALE" | "FEMALE">("ALL");

  const loadLockers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lockers");
      if (res.ok) {
        const data = await res.json();
        setLockers(data.lockers || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLockers();
  }, []);

  const handleCheckoutSession = (sessionId: string, lockerNum: string) => {
    toast.confirm(
      `Force Checkout Locker ${lockerNum}?`,
      "This will end the active member session and immediately make this locker available.",
      {
        confirmText: "Release Locker",
        cancelText: "Cancel",
        onConfirm: async () => {
          try {
            const res = await fetch(`/api/checkin/${sessionId}/checkout`, {
              method: "POST",
            });
            if (res.ok) {
              toast.success("Locker Released", `Locker ${lockerNum} is now available.`);
              loadLockers();
              router.refresh();
            } else {
              const data = await res.json();
              toast.error("Checkout Failed", data.error || "Failed to release locker");
            }
          } catch (err: unknown) {
            toast.error("Error", err instanceof Error ? err.message : "Error checking out session");
          }
        },
      }
    );
  };

  const handleUpdateStatus = async (lockerId: string, status: string, lockerNum?: string) => {
    try {
      const res = await fetch(`/api/lockers/${lockerId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success("Locker Status Updated", `Locker ${lockerNum || ""} marked as ${status.toLowerCase()}.`);
        loadLockers();
      } else {
        const data = await res.json();
        toast.error("Update Failed", data.error || "Failed to update locker status");
      }
    } catch (err: unknown) {
      toast.error("Status Update Error", err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const filtered = lockers.filter((l) => {
    if (activeFilter === "ALL") return true;
    return l.section === activeFilter;
  });

  const availableCount = lockers.filter((l) => l.status === "AVAILABLE").length;
  const occupiedCount = lockers.filter((l) => l.status === "OCCUPIED").length;
  const reservedCount = lockers.filter((l) => l.status === "RESERVED").length;
  const maintenanceCount = lockers.filter((l) => l.status === "MAINTENANCE").length;

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Locker Grid & Key Management
          </h1>
          <p className="text-xs text-slate-500">
            Real-time physical asset tracking across Male and Female locker rooms.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadLockers}
          className="h-8 text-xs border-slate-300"
        >
          <RefreshCw className="h-3 w-3 mr-1.5" />
          Refresh Status
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-xs text-slate-500 font-medium">Available</div>
          <div className="text-xl font-bold text-emerald-600 mt-0.5">{availableCount}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-slate-500 font-medium">Occupied (Sessions)</div>
          <div className="text-xl font-bold text-blue-900 mt-0.5">{occupiedCount}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-slate-500 font-medium">Dedicated (Monthly)</div>
          <div className="text-xl font-bold text-amber-600 mt-0.5">{reservedCount}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-slate-500 font-medium">Under Maintenance</div>
          <div className="text-xl font-bold text-red-500 mt-0.5">{maintenanceCount}</div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
        {(["ALL", "MALE", "FEMALE"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded transition-colors ${
              activeFilter === tab
                ? "bg-[#1e3a8a] text-white shadow-2xs"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {tab === "ALL" ? "All Lockers" : `${tab} Locker Room`}
          </button>
        ))}
      </div>

      {/* Grid of Lockers */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {filtered.map((locker) => {
          const activeSession = locker.checkinSessions[0];
          const activeRental = locker.lockerRentals[0];

          return (
            <Card
              key={locker.id}
              className={`p-3 transition-all flex flex-col justify-between ${
                locker.status === "AVAILABLE"
                  ? "border-slate-200 bg-white"
                  : locker.status === "OCCUPIED"
                  ? "border-blue-900/30 bg-blue-50/40"
                  : locker.status === "RESERVED"
                  ? "border-amber-400 bg-amber-50/40"
                  : "border-red-300 bg-red-50/40"
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className="font-mono text-base font-bold text-slate-900">
                    {locker.lockerNumber}
                  </span>
                  <Badge
                    variant={
                      locker.status === "AVAILABLE"
                        ? "success"
                        : locker.status === "OCCUPIED"
                        ? "default"
                        : locker.status === "RESERVED"
                        ? "warning"
                        : "destructive"
                    }
                    className="text-[10px] px-1.5 py-0"
                  >
                    {locker.status === "AVAILABLE"
                      ? "Free"
                      : locker.status === "OCCUPIED"
                      ? "In Use"
                      : locker.status === "RESERVED"
                      ? "Reserved"
                      : "Broken"}
                  </Badge>
                </div>

                <div className="text-[10px] text-slate-400 mt-0.5">
                  Section: {locker.section}
                </div>

                {activeSession && (
                  <div className="mt-2 text-[11px] text-slate-800 rounded bg-white p-1.5 border border-slate-200">
                    <div className="font-semibold truncate">{activeSession.member.fullName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      In: {new Date(activeSession.checkinTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                )}

                {activeRental && (
                  <div className="mt-2 text-[11px] text-amber-900 rounded bg-white p-1.5 border border-amber-200">
                    <div className="font-semibold truncate">{activeRental.member.fullName}</div>
                    <div className="text-[10px] text-amber-700">Monthly Contract</div>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                {activeSession ? (
                  <button
                    onClick={() => handleCheckoutSession(activeSession.id, locker.lockerNumber)}
                    className="text-[10px] font-semibold text-red-600 hover:underline"
                  >
                    Release Key
                  </button>
                ) : locker.status === "AVAILABLE" ? (
                  <button
                    onClick={() => handleUpdateStatus(locker.id, "MAINTENANCE", locker.lockerNumber)}
                    className="text-[10px] text-slate-500 hover:text-slate-900"
                  >
                    Report Defect
                  </button>
                ) : locker.status === "MAINTENANCE" ? (
                  <button
                    onClick={() => handleUpdateStatus(locker.id, "AVAILABLE", locker.lockerNumber)}
                    className="text-[10px] font-semibold text-emerald-600 hover:underline"
                  >
                    Mark Fixed
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400">—</span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
