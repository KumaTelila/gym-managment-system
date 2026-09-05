"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PlusCircle, Search, CheckCircle2, Undo2 } from "lucide-react";
import { formatDualDate } from "@/lib/ethiopian-calendar";
import { toast } from "@/components/ui/toaster";
import { MemberLookupAutocomplete } from "@/components/MemberLookupAutocomplete";
import { PaymentConfirmationDialog, PaymentConfirmationDetails } from "@/components/PaymentConfirmationDialog";
import { RefundConfirmationDialog } from "@/components/RefundConfirmationDialog";

interface Plan {
  id: string;
  name: string;
  durationDays: number;
  priceETB: number;
  description: string | null;
}

interface Subscription {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  amountPaidETB: number;
  registrationFeeETB?: number;
  isSponsored?: boolean;
  sponsorReason?: string | null;
  paymentMethod: string;
  paymentRef: string | null;
  createdAt: string;
  member: {
    id: string;
    fullName: string;
    memberCode: string;
    phone: string;
  };
  plan: {
    name: string;
  };
  processedBy: {
    fullName: string;
  };
}

export default function SubscriptionsPage() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("memberCode") || "";

  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCode, setFilterCode] = useState(initialCode);
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);

  // Renewal dialog
  const [isDialogOpen, setIsDialogOpen] = useState(!!initialCode);
  const [targetMemberCode, setTargetMemberCode] = useState(initialCode);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("TELEBIRR");
  const [paymentRef, setPaymentRef] = useState<string>("");
  const [resolvedMember, setResolvedMember] = useState<{
    id: string;
    fullName: string;
    memberCode?: string;
    isFirstRegistration?: boolean;
  } | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // New fields: Custom Start Date, Registration Fee, Sponsored
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [includeRegistrationFee, setIncludeRegistrationFee] = useState(false);
  const [registrationFeeAmount, setRegistrationFeeAmount] = useState(100);
  const [isSponsored, setIsSponsored] = useState(false);
  const [sponsorReason, setSponsorReason] = useState("");

  // Payment Confirmation Dialog state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<PaymentConfirmationDetails | null>(null);

  // Admin Refund Dialog state
  const [refundTarget, setRefundTarget] = useState<Subscription | null>(null);
  const [refundLoading, setRefundLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setCurrentUser(data.user);
      })
      .catch(() => {});

    fetch("/api/settings/public")
      .then((res) => res.json())
      .then((data) => {
        if (data.config?.registration_fee) {
          setRegistrationFeeAmount(parseFloat(data.config.registration_fee) || 100);
        }
      })
      .catch(() => {});
  }, []);

  const loadData = async () => {
    try {
      const res = await fetch(`/api/subscriptions?memberCode=${encodeURIComponent(filterCode)}`);
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
        setSubscriptions(data.subscriptions || []);
        if (data.plans?.length > 0 && !selectedPlanId) {
          setSelectedPlanId(data.plans[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLookupMember = async (code: string) => {
    if (!code) return;
    setLookupError(null);
    try {
      const res = await fetch(`/api/members/lookup?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Member not found");
      setResolvedMember({
        id: data.member.id,
        fullName: data.member.fullName,
        memberCode: data.member.memberCode,
        isFirstRegistration: data.member.isFirstRegistration,
      });
      if (data.member.isFirstRegistration) {
        setIncludeRegistrationFee(true);
      } else {
        setIncludeRegistrationFee(false);
      }
    } catch (err: unknown) {
      setLookupError(err instanceof Error ? err.message : "Member not found");
      setResolvedMember(null);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function fetchData() {
      try {
        const res = await fetch(`/api/subscriptions?memberCode=${encodeURIComponent(filterCode)}`);
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            setPlans(data.plans || []);
            setSubscriptions(data.subscriptions || []);
            if (data.plans?.length > 0 && !selectedPlanId) {
              setSelectedPlanId(data.plans[0].id);
            }
          }
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    fetchData();
    return () => {
      ignore = true;
    };
  }, [filterCode, selectedPlanId]);

  useEffect(() => {
    if (initialCode) {
      const timer = setTimeout(() => {
        handleLookupMember(initialCode);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialCode]);

  const handleCreateSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedMember) {
      toast.error("Verification Required", "Please verify member code before issuing subscription.");
      return;
    }

    const plan = plans.find((p) => p.id === selectedPlanId);
    if (!plan) return;

    if (isSponsored && !sponsorReason.trim()) {
      toast.error("Reason Required", "Please enter a valid justification or reason for this sponsored membership.");
      return;
    }

    const regFee = !isSponsored && includeRegistrationFee ? registrationFeeAmount : 0;
    const totalAmount = isSponsored ? 0 : Number(plan.priceETB) + regFee;

    const start = new Date(startDate);
    const end = new Date(start.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
    const endDateStr = isNaN(end.getTime()) ? "—" : end.toISOString().split("T")[0];

    setPendingConfirmation({
      title: isSponsored ? "Confirm Sponsored Membership (0 ETB)" : "Confirm Membership Payment",
      description: isSponsored
        ? "Carefully verify member information, approval justification, and access period before granting sponsored access."
        : "Carefully verify subscriber details, plan duration, registration fees, and payment channel before recording this transaction.",
      customerName: resolvedMember.fullName,
      customerCode: resolvedMember.memberCode || "",
      itemDescription: `${plan.name} (${plan.durationDays} Days)`,
      amountETB: totalAmount,
      paymentMethod: isSponsored ? "OTHER" : paymentMethod,
      paymentRef: isSponsored ? (paymentRef.trim() || "SPONSORED_GIVEAWAY") : (paymentRef.trim() || undefined),
      extraDetails: {
        "Membership Plan": `${plan.name} (${Number(plan.priceETB).toLocaleString()} ETB)`,
        "Starting Date": startDate,
        "Ending Date": endDateStr,
        "Duration": `${plan.durationDays} Days`,
        ...(!isSponsored && includeRegistrationFee ? { "Registration Fee": `+${regFee} ETB (One-time)` } : {}),
        ...(isSponsored ? { "Sponsorship Justification": sponsorReason.trim() } : {}),
      },
    });
    setIsConfirmOpen(true);
  };

  const handleConfirmSaveSubscription = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: resolvedMember?.id,
          planId: selectedPlanId,
          startDate,
          includeRegistrationFee: !isSponsored && includeRegistrationFee,
          registrationFeeETB: !isSponsored && includeRegistrationFee ? registrationFeeAmount : 0,
          isSponsored,
          sponsorReason: isSponsored ? sponsorReason.trim() : undefined,
          paymentMethod: isSponsored ? (paymentMethod || "OTHER") : paymentMethod,
          paymentRef: isSponsored ? (paymentRef.trim() || "SPONSORED") : (paymentRef.trim() || undefined),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create subscription");

      toast.success(
        isSponsored ? "Sponsored Membership Issued" : "Membership Activated",
        isSponsored
          ? `Sponsored access granted to ${data.subscription.member.fullName} at 0 ETB.`
          : `Payment of ${Number(data.subscription.amountPaidETB).toLocaleString()} ETB recorded for ${data.subscription.member.fullName}.`
      );

      setIsConfirmOpen(false);
      setIsDialogOpen(false);
      setResolvedMember(null);
      setTargetMemberCode("");
      setPaymentRef("");
      setIsSponsored(false);
      setSponsorReason("");
      setIncludeRegistrationFee(false);
      loadData();
    } catch (err: unknown) {
      toast.error("Subscription Error", err instanceof Error ? err.message : "Failed to create subscription");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmRefund = async (reason: string) => {
    if (!refundTarget) return;
    setRefundLoading(true);
    try {
      const res = await fetch(`/api/subscriptions/${refundTarget.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to refund subscription");

      toast.success("Subscription Refunded", data.message || "Subscription was refunded and cancelled.");
      setRefundTarget(null);
      loadData();
    } catch (err: unknown) {
      toast.error("Refund Error", err instanceof Error ? err.message : "Failed to refund subscription");
    } finally {
      setRefundLoading(false);
    }
  };

  const currentPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];
  const calculatedEndDateStr = (() => {
    if (!startDate || !currentPlan) return "—";
    const st = new Date(startDate);
    if (isNaN(st.getTime())) return "—";
    const en = new Date(st.getTime() + currentPlan.durationDays * 24 * 60 * 60 * 1000);
    return en.toISOString().split("T")[0];
  })();

  const currentTotalETB = isSponsored
    ? 0
    : (currentPlan ? Number(currentPlan.priceETB) : 0) + (includeRegistrationFee ? registrationFeeAmount : 0);

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Subscriptions & Membership Plans
          </h1>
          <p className="text-xs text-slate-500">
            Manage membership tiers, process renewals, and track payment slips (Cash, Telebirr, CBE).
          </p>
        </div>

        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-[#1e3a8a] text-white hover:bg-[#1e40af] h-8 text-xs font-semibold shadow-2xs"
        >
          <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
          Renew / Issue Subscription
        </Button>
      </div>

      {successMessage && (
        <div className="flex items-center space-x-2 rounded border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Plans Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {plans.map((plan) => (
          <Card key={plan.id} className="p-4 border-slate-200 bg-white">
            <div className="text-xs font-bold text-slate-900">{plan.name}</div>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-xl font-extrabold text-[#1e3a8a]">
                {Number(plan.priceETB).toLocaleString()}
              </span>
              <span className="text-xs font-medium text-slate-500">ETB</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Duration: {plan.durationDays} days
            </div>
          </Card>
        ))}
      </div>

      {/* Search Filter */}
      <Card>
        <CardContent className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Filter by member code (e.g. BF-1001)..."
              value={filterCode}
              onChange={(e) => setFilterCode(e.target.value)}
              className="pl-9 h-8 text-xs bg-slate-50 border-slate-200"
            />
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions History Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Subscription Records</CardTitle>
          <CardDescription className="text-xs">
            Recent payments and membership extensions with Gregorian & Ethiopian dates
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expiration (GC & EC)</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Ref #</TableHead>
                <TableHead>Cashier</TableHead>
                {currentUser?.role === "ADMIN" && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={currentUser?.role === "ADMIN" ? 10 : 9} className="text-center py-8 text-xs text-slate-400">
                    {loading ? "Loading subscriptions..." : "No records found."}
                  </TableCell>
                </TableRow>
              ) : (
                subscriptions.map((s) => {
                  const now = new Date();
                  const isExpired = new Date(s.endDate) < now;
                  const isFutureStart = new Date(s.startDate) > now;
                  const isCancelled = s.status === "CANCELLED";
                  return (
                    <TableRow key={s.id} className={isCancelled ? "opacity-60 bg-slate-50/50" : ""}>
                      <TableCell className="font-semibold text-slate-900">
                        {s.member.fullName}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">
                        {s.member.memberCode}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">
                        {s.plan.name}
                      </TableCell>
                      <TableCell>
                        {isCancelled ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-700 border border-rose-200">
                            Cancelled / Refunded
                          </span>
                        ) : isFutureStart ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200" title={`Starts on ${new Date(s.startDate).toLocaleDateString()}`}>
                            Scheduled ({new Date(s.startDate).toLocaleDateString()})
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium text-slate-900">
                          {new Date(s.endDate).toLocaleDateString()}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {formatDualDate(s.endDate)}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {s.isSponsored ? (
                          <div>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              🎁 Sponsored (0 ETB)
                            </span>
                            {s.sponsorReason && (
                              <div className="text-[10px] text-slate-500 truncate max-w-[130px]" title={s.sponsorReason}>
                                {s.sponsorReason}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="font-mono font-semibold text-slate-900">
                              {Number(s.amountPaidETB).toLocaleString()} ETB
                            </span>
                            {s.registrationFeeETB && Number(s.registrationFeeETB) > 0 ? (
                              <span className="text-[10px] text-emerald-600 block font-normal">
                                +{Number(s.registrationFeeETB)} Reg Fee
                              </span>
                            ) : null}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {s.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">
                        {s.paymentRef || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {s.processedBy.fullName}
                      </TableCell>
                      {currentUser?.role === "ADMIN" && (
                        <TableCell className="text-right">
                          {!isCancelled && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setRefundTarget(s)}
                              className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-medium"
                            >
                              <Undo2 className="h-3 w-3 mr-1" />
                              Refund
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Renewal Modal Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Issue / Renew Membership</DialogTitle>
            <DialogDescription>
              Activate membership duration and record payment reference slip.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubscription} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Member Code or Phone *
              </label>
              <MemberLookupAutocomplete
                placeholder="Search member by code, phone, or name..."
                value={targetMemberCode}
                onChange={(val) => {
                  setTargetMemberCode(val);
                  setLookupError(null);
                }}
                selectedMember={resolvedMember}
                showSelectedCard={true}
                onClearSelected={() => {
                  setResolvedMember(null);
                  setTargetMemberCode("");
                  setLookupError(null);
                }}
                onSelectMember={(m) => {
                  setResolvedMember({
                    id: m.id,
                    fullName: m.fullName,
                    memberCode: m.memberCode,
                    isFirstRegistration: (m as any).isFirstRegistration,
                  });
                  if ((m as any).isFirstRegistration) {
                    setIncludeRegistrationFee(true);
                  } else {
                    setIncludeRegistrationFee(false);
                  }
                  setTargetMemberCode(m.memberCode);
                  setLookupError(null);
                }}
                showLookupButton={true}
                lookupButtonLabel="Verify"
                onManualLookup={(code) => handleLookupMember(code)}
                errorMessage={lookupError}
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Membership Plan *</label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full h-8 rounded border border-slate-200 bg-slate-50 px-2 text-xs"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.durationDays} days) — {Number(p.priceETB).toLocaleString()} ETB
                  </option>
                ))}
              </select>
            </div>

            {/* Adjustable Start Date */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block font-medium text-slate-700">Membership Start Date *</label>
                <span className="text-[10px] text-slate-500 font-mono">
                  Calculated Expiry: <strong className="text-slate-800">{calculatedEndDateStr}</strong>
                </span>
              </div>
              <div className="flex gap-1.5 items-center">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 text-xs bg-slate-50 flex-1"
                  required
                />
                <button
                  type="button"
                  onClick={() => setStartDate(new Date().toISOString().split("T")[0])}
                  className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    setStartDate(d.toISOString().split("T")[0]);
                  }}
                  className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 7);
                    setStartDate(d.toISOString().split("T")[0]);
                  }}
                  className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium"
                >
                  +7 Days
                </button>
              </div>
            </div>

            {/* First-Time Registration Fee Card */}
            <div className={`p-2.5 rounded-lg border transition-colors ${
              includeRegistrationFee ? "bg-emerald-50/70 border-emerald-200" : "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeRegistrationFee}
                    disabled={isSponsored}
                    onChange={(e) => setIncludeRegistrationFee(e.target.checked)}
                    className="h-3.5 w-3.5 rounded text-[#1e3a8a] focus:ring-[#1e3a8a]"
                  />
                  <span>First-Time Registration Fee</span>
                </label>
                <Badge variant={includeRegistrationFee ? "success" : "outline"} className="text-[10px] font-mono">
                  +{registrationFeeAmount} ETB
                </Badge>
              </div>
              <p className="text-[10px] text-slate-500 pl-5.5 mt-0.5">
                {resolvedMember?.isFirstRegistration
                  ? "New member detected: 100 ETB registration fee is applied for first-time onboarding."
                  : "Check to apply the standard registration or account reactivation fee."}
              </p>
            </div>

            {/* Sponsored / Promotional Giveaway */}
            <div className={`p-2.5 rounded-lg border transition-colors ${
              isSponsored ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50/70"
            }`}>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSponsored}
                    onChange={(e) => {
                      setIsSponsored(e.target.checked);
                      if (e.target.checked) setIncludeRegistrationFee(false);
                    }}
                    className="h-3.5 w-3.5 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>🎁 Sponsored / Giveaway Membership</span>
                </label>
                {isSponsored && (
                  <Badge variant="warning" className="text-[10px] font-bold">
                    0 ETB (Waived)
                  </Badge>
                )}
              </div>

              {isSponsored && (
                <div className="mt-2 pt-2 border-t border-amber-200 space-y-1.5">
                  <label className="block text-[11px] font-semibold text-amber-900">
                    Sponsorship Justification / Approval Reason *
                  </label>
                  <Input
                    required
                    value={sponsorReason}
                    onChange={(e) => setSponsorReason(e.target.value)}
                    placeholder="e.g. Sponsoring athlete / promotional giveaway winner / owner approved"
                    className="h-7 text-xs bg-white border-amber-300"
                  />
                  <span className="text-[9px] text-amber-800 block">
                    Permanent administrative audit log will be created with this reason.
                  </span>
                </div>
              )}
            </div>

            {/* Payment Method & Reference (hidden when sponsored) */}
            {!isSponsored && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Payment Method *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full h-8 rounded border border-slate-200 bg-slate-50 px-2 text-xs"
                  >
                    <option value="TELEBIRR">Telebirr</option>
                    <option value="CBE_TRANSFER">CBE Transfer</option>
                    <option value="CASH">Cash</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Payment Ref / Slip #
                  </label>
                  <Input
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder="e.g. TB-829104"
                    className="h-8 text-xs bg-slate-50"
                  />
                </div>
              </div>
            )}

            {/* Total Due Breakdown Callout */}
            <div className="flex justify-between items-baseline p-2.5 bg-slate-100 rounded-md border border-slate-200">
              <div className="text-xs text-slate-700">
                <span className="font-semibold">Total Due:</span>{" "}
                <span className="text-[10px] text-slate-500">
                  {isSponsored
                    ? "Sponsored Access (0 ETB)"
                    : `${currentPlan?.name || "Plan"} (${currentPlan ? Number(currentPlan.priceETB).toLocaleString() : 0} ETB)${
                        includeRegistrationFee ? ` + Reg (${registrationFeeAmount} ETB)` : ""
                      }`}
                </span>
              </div>
              <div className="text-sm font-black text-[#1e3a8a]">
                {isSponsored ? "0 ETB (Waived)" : `${currentTotalETB.toLocaleString()} ETB`}
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !resolvedMember}
                className="h-8 text-xs bg-[#1e3a8a] text-white hover:bg-[#1e40af]"
              >
                Review & Confirm
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Pre-Flight Confirmation Safeguard Dialog */}
      <PaymentConfirmationDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        details={pendingConfirmation}
        onConfirm={handleConfirmSaveSubscription}
        loading={submitting}
      />

      {/* Admin Refund & Rollback Dialog */}
      <RefundConfirmationDialog
        open={!!refundTarget}
        onOpenChange={(open) => {
          if (!open) setRefundTarget(null);
        }}
        title="Refund & Rollback Membership Subscription"
        itemDescription={
          refundTarget
            ? `${refundTarget.plan.name} for ${refundTarget.member.fullName} (${refundTarget.member.memberCode})`
            : undefined
        }
        amountETB={refundTarget ? Number(refundTarget.amountPaidETB) : undefined}
        onConfirmRefund={handleConfirmRefund}
        loading={refundLoading}
      />
    </div>
  );
}
