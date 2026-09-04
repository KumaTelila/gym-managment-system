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
import { PlusCircle, Search, CreditCard, RefreshCw, CheckCircle2 } from "lucide-react";
import { formatDualDate } from "@/lib/ethiopian-calendar";
import { toast } from "@/components/ui/toaster";

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

  // Renewal dialog
  const [isDialogOpen, setIsDialogOpen] = useState(!!initialCode);
  const [targetMemberCode, setTargetMemberCode] = useState(initialCode);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("TELEBIRR");
  const [paymentRef, setPaymentRef] = useState<string>("");
  const [resolvedMember, setResolvedMember] = useState<{ id: string; fullName: string } | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
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

  useEffect(() => {
    loadData();
  }, [filterCode]);

  useEffect(() => {
    if (initialCode) {
      handleLookupMember(initialCode);
    }
  }, [initialCode]);

  const handleLookupMember = async (code: string) => {
    if (!code) return;
    setLookupError(null);
    try {
      const res = await fetch(`/api/members/lookup?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Member not found");
      setResolvedMember({ id: data.member.id, fullName: data.member.fullName });
    } catch (err: unknown) {
      setLookupError(err instanceof Error ? err.message : "Member not found");
      setResolvedMember(null);
    }
  };

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedMember) {
      toast.error("Verification Required", "Please verify member code before issuing subscription.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: resolvedMember.id,
          planId: selectedPlanId,
          paymentMethod,
          paymentRef,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create subscription");

      const successMsg = `Subscription activated for ${resolvedMember.fullName}!`;
      setSuccessMessage(successMsg);
      toast.success("Membership Activated", successMsg);

      setIsDialogOpen(false);
      setTargetMemberCode("");
      setResolvedMember(null);
      setPaymentRef("");
      loadData();
    } catch (err: unknown) {
      toast.error("Subscription Error", err instanceof Error ? err.message : "Error creating subscription");
    } finally {
      setSubmitting(false);
    }
  };

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
                <TableHead>Expiration (GC & EC)</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Ref #</TableHead>
                <TableHead>Cashier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-xs text-slate-400">
                    {loading ? "Loading subscriptions..." : "No records found."}
                  </TableCell>
                </TableRow>
              ) : (
                subscriptions.map((s) => {
                  const isExpired = new Date(s.endDate) < new Date();
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-semibold text-slate-900">
                        {s.member.fullName}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">
                        {s.member.memberCode}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">
                        {s.plan.name}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium text-slate-900">
                          {new Date(s.endDate).toLocaleDateString()}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {formatDualDate(s.endDate)}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-slate-900">
                        {Number(s.amountPaidETB).toLocaleString()} ETB
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
              <div className="flex gap-2">
                <Input
                  required
                  value={targetMemberCode}
                  onChange={(e) => setTargetMemberCode(e.target.value)}
                  placeholder="e.g. BF-1004"
                  className="h-8 text-xs bg-slate-50"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleLookupMember(targetMemberCode)}
                  className="h-8 text-xs"
                >
                  Verify
                </Button>
              </div>
              {lookupError && (
                <p className="mt-1 text-[11px] text-red-600">{lookupError}</p>
              )}
              {resolvedMember && (
                <p className="mt-1 text-[11px] text-emerald-700 font-semibold">
                  ✓ Verified: {resolvedMember.fullName}
                </p>
              )}
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
                {submitting ? "Processing..." : "Activate Membership"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
