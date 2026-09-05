"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  Wrench,
  RefreshCw,
  Search,
  UserCheck,
  LogIn,
} from "lucide-react";
import { toast } from "@/components/ui/toaster";
import { MemberLookupAutocomplete } from "@/components/MemberLookupAutocomplete";
import { PaymentConfirmationDialog, PaymentConfirmationDetails } from "@/components/PaymentConfirmationDialog";

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

  // Rent Locker Modal State
  const [isRentModalOpen, setIsRentModalOpen] = useState(false);
  const [rentLocker, setRentLocker] = useState<LockerData | null>(null);
  const [rentMemberCode, setRentMemberCode] = useState("");
  const [rentResolvedMember, setRentResolvedMember] = useState<{
    id: string;
    fullName: string;
    memberCode: string;
  } | null>(null);
  const [rentDurationDays, setRentDurationDays] = useState(30);
  const [rentPriceETB, setRentPriceETB] = useState(500);
  const [rentPaymentMethod, setRentPaymentMethod] = useState<"CASH" | "TELEBIRR" | "CBE_TRANSFER">("TELEBIRR");
  const [rentPaymentRef, setRentPaymentRef] = useState("");
  const [rentSubmitting, setRentSubmitting] = useState(false);
  const [rentLookupError, setRentLookupError] = useState<string | null>(null);

  // Payment Confirmation Dialog state
  const [isConfirmRentOpen, setIsConfirmRentOpen] = useState(false);
  const [pendingRentConfirmation, setPendingRentConfirmation] = useState<PaymentConfirmationDetails | null>(null);

  const handleOpenRentModal = (locker: LockerData) => {
    setRentLocker(locker);
    setRentResolvedMember(null);
    setRentMemberCode("");
    setRentLookupError(null);
    setIsRentModalOpen(true);
  };

  const handleLookupRentMember = async (code: string) => {
    if (!code.trim()) return;
    setRentLookupError(null);
    try {
      const res = await fetch(`/api/members/lookup?code=${encodeURIComponent(code.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Member not found");
      setRentResolvedMember({
        id: data.member.id,
        fullName: data.member.fullName,
        memberCode: data.member.memberCode,
      });
    } catch (err: unknown) {
      setRentLookupError(err instanceof Error ? err.message : "Member not found");
      setRentResolvedMember(null);
    }
  };

  const handleSubmitRent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rentResolvedMember || !rentLocker) {
      toast.error("Validation Error", "Please select a member and locker.");
      return;
    }

    setPendingRentConfirmation({
      title: "Confirm Dedicated Locker Payment",
      description: "Carefully verify member details, locker assignment, and payment details before saving.",
      customerName: rentResolvedMember.fullName,
      customerCode: rentResolvedMember.memberCode,
      itemDescription: `Dedicated Locker #${rentLocker.lockerNumber} (${rentLocker.section} Room)`,
      amountETB: rentPriceETB,
      paymentMethod: rentPaymentMethod,
      paymentRef: rentPaymentRef?.trim() || null,
      extraDetails: {
        "Rental Duration": `${rentDurationDays} Days`,
        "Locker Section": `${rentLocker.section} Locker Room`,
      },
    });
    setIsConfirmRentOpen(true);
  };

  const handleConfirmSaveRent = async () => {
    if (!rentResolvedMember || !rentLocker) return;

    setRentSubmitting(true);
    try {
      const res = await fetch("/api/rentals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: rentResolvedMember.id,
          lockerId: rentLocker.id,
          durationDays: rentDurationDays,
          priceETB: rentPriceETB,
          paymentMethod: rentPaymentMethod,
          paymentRef: rentPaymentRef?.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create rental contract");

      toast.success(
        "Locker Rented Successfully",
        `Locker ${rentLocker.lockerNumber} reserved for ${rentResolvedMember.fullName} (${rentDurationDays} days).`
      );

      setIsConfirmRentOpen(false);
      setIsRentModalOpen(false);
      setRentLocker(null);
      setRentResolvedMember(null);
      setRentMemberCode("");
      loadLockers();
    } catch (err: unknown) {
      toast.error("Rental Error", err instanceof Error ? err.message : "Failed to rent locker");
    } finally {
      setRentSubmitting(false);
    }
  };

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
                  <div className="w-full space-y-2">
                    <div className="grid grid-cols-2 gap-1.5">
                      <Button
                        size="sm"
                        onClick={() => router.push("/dashboard/checkin")}
                        className="h-7 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-1.5 shadow-2xs"
                      >
                        <UserCheck className="h-3 w-3 mr-1" />
                        Assign
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleOpenRentModal(locker)}
                        className="h-7 text-[11px] font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 px-1.5 shadow-2xs"
                      >
                        <KeyRound className="h-3 w-3 mr-1" />
                        Rent
                      </Button>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleUpdateStatus(locker.id, "MAINTENANCE", locker.lockerNumber)}
                        className="text-[10px] text-slate-400 hover:text-slate-700 underline"
                      >
                        Report Defect
                      </button>
                    </div>
                  </div>
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

      {/* Rent Locker (Monthly Contract) Modal */}
      <Dialog open={isRentModalOpen} onOpenChange={setIsRentModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <div className="h-7 w-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center">
                <KeyRound className="h-4 w-4" />
              </div>
              <span>Rent Dedicated Locker</span>
            </DialogTitle>
            <DialogDescription>
              Assign a dedicated monthly locker to a member. The locker status will become Reserved.
            </DialogDescription>
          </DialogHeader>

          {rentLocker && (
            <form onSubmit={handleSubmitRent} className="space-y-4 pt-1">
              {/* Locker Banner */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded bg-[#1e3a8a] text-white flex items-center justify-center font-mono font-bold text-sm">
                    {rentLocker.lockerNumber}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900">
                      Locker #{rentLocker.lockerNumber}
                    </div>
                    <div className="text-xs text-slate-500">
                      {rentLocker.section} Locker Room (Available)
                    </div>
                  </div>
                </div>
                <Badge variant="warning" className="text-[10px]">
                  Reserved Contract
                </Badge>
              </div>

              {/* Member Lookup */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Member</label>
                <MemberLookupAutocomplete
                  placeholder="Member code (e.g. BF-1001), phone, or name..."
                  value={rentMemberCode}
                  onChange={(val) => {
                    setRentMemberCode(val);
                    setRentLookupError(null);
                  }}
                  selectedMember={rentResolvedMember}
                  showSelectedCard={true}
                  onClearSelected={() => {
                    setRentResolvedMember(null);
                    setRentMemberCode("");
                    setRentLookupError(null);
                  }}
                  onSelectMember={(m) => {
                    setRentResolvedMember({
                      id: m.id,
                      fullName: m.fullName,
                      memberCode: m.memberCode,
                    });
                    setRentLookupError(null);
                  }}
                  showLookupButton={true}
                  lookupButtonLabel="Lookup"
                  onManualLookup={(code) => handleLookupRentMember(code)}
                  errorMessage={rentLookupError}
                />
              </div>

              {/* Rental Duration Preset & Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Rental Duration (Days)
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: "1 Mo (30d)", days: 30 },
                    { label: "2 Mo (60d)", days: 60 },
                    { label: "3 Mo (90d)", days: 90 },
                    { label: "1 Yr (365d)", days: 365 },
                  ].map((opt) => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => setRentDurationDays(opt.days)}
                      className={`py-1.5 text-xs font-medium rounded border transition-colors ${
                        rentDurationDays === opt.days
                          ? "bg-[#1e3a8a] text-white border-[#1e3a8a] font-bold"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <Input
                  type="number"
                  min="1"
                  value={rentDurationDays}
                  onChange={(e) => setRentDurationDays(Number(e.target.value))}
                  className="h-8 text-xs font-mono mt-1"
                  placeholder="Custom days"
                />
              </div>

              {/* Fee (ETB) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Rental Fee (ETB)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="50"
                  value={rentPriceETB}
                  onChange={(e) => setRentPriceETB(Number(e.target.value))}
                  className="h-8 text-xs font-mono"
                  placeholder="e.g. 500"
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Payment Method</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["TELEBIRR", "CASH", "CBE_TRANSFER"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setRentPaymentMethod(m)}
                      className={`py-1.5 text-xs font-semibold rounded border transition-colors ${
                        rentPaymentMethod === m
                          ? "bg-[#1e3a8a] text-white border-[#1e3a8a]"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {m === "CBE_TRANSFER" ? "CBE Birr" : m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Reference (for digital) */}
              {rentPaymentMethod !== "CASH" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Transaction Slip / Ref #
                  </label>
                  <Input
                    value={rentPaymentRef}
                    onChange={(e) => setRentPaymentRef(e.target.value)}
                    placeholder="e.g. Telebirr / CBE transaction reference"
                    className="h-8 text-xs font-mono"
                  />
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRentModalOpen(false)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={rentSubmitting || !rentResolvedMember}
                  className="h-8 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  Review & Confirm ({rentPriceETB} ETB)
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Pre-Flight Confirmation Safeguard Dialog */}
      <PaymentConfirmationDialog
        open={isConfirmRentOpen}
        onOpenChange={setIsConfirmRentOpen}
        details={pendingRentConfirmation}
        onConfirm={handleConfirmSaveRent}
        loading={rentSubmitting}
      />
    </div>
  );
}
