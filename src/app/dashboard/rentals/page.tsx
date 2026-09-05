"use client";

import { useState, useEffect } from "react";
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
import { KeyRound, PlusCircle, CheckCircle2, Lock, Undo2 } from "lucide-react";
import { formatDualDate } from "@/lib/ethiopian-calendar";
import { toast } from "@/components/ui/toaster";
import { MemberLookupAutocomplete } from "@/components/MemberLookupAutocomplete";
import { PaymentConfirmationDialog, PaymentConfirmationDetails } from "@/components/PaymentConfirmationDialog";
import { RefundConfirmationDialog } from "@/components/RefundConfirmationDialog";

interface LockerRental {
  id: string;
  startDate: string;
  endDate: string;
  priceETB: number;
  paymentMethod: string;
  paymentRef: string | null;
  isActive: boolean;
  locker: {
    lockerNumber: string;
    section: string;
  };
  member: {
    id: string;
    fullName: string;
    memberCode: string;
    phone: string;
  };
}

interface AvailableLocker {
  id: string;
  lockerNumber: string;
  section: string;
}

export default function LockerRentalsPage() {
  const [rentals, setRentals] = useState<LockerRental[]>([]);
  const [availableLockers, setAvailableLockers] = useState<AvailableLocker[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);

  // New rental dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [memberCode, setMemberCode] = useState("");
  const [resolvedMember, setResolvedMember] = useState<{ id: string; fullName: string; memberCode: string } | null>(null);
  const [selectedLockerId, setSelectedLockerId] = useState("");
  const [priceETB, setPriceETB] = useState(500);
  const [durationDays, setDurationDays] = useState(30);
  const [paymentMethod, setPaymentMethod] = useState("TELEBIRR");
  const [paymentRef, setPaymentRef] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Payment Confirmation Dialog state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<PaymentConfirmationDetails | null>(null);

  // Admin Refund Dialog state
  const [refundTarget, setRefundTarget] = useState<LockerRental | null>(null);
  const [refundLoading, setRefundLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setCurrentUser(data.user);
      })
      .catch(() => {});
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rentals");
      if (res.ok) {
        const data = await res.json();
        setRentals(data.rentals || []);
        setAvailableLockers(data.availableLockers || []);
        if (data.availableLockers?.length > 0 && !selectedLockerId) {
          setSelectedLockerId(data.availableLockers[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLookupMember = async (customCode?: string) => {
    const codeToLookup = (customCode !== undefined ? customCode : memberCode).trim();
    if (!codeToLookup) return;
    setLookupError(null);
    try {
      const res = await fetch(`/api/members/lookup?code=${encodeURIComponent(codeToLookup)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Member not found");
      setResolvedMember({ id: data.member.id, fullName: data.member.fullName, memberCode: data.member.memberCode });
      setMemberCode(data.member.memberCode);
    } catch (err: unknown) {
      setLookupError(err instanceof Error ? err.message : "Member not found");
      setResolvedMember(null);
    }
  };

  const handleCreateRental = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedMember || !selectedLockerId) {
      toast.error("Validation Error", "Please verify member and select a locker.");
      return;
    }

    const locker = availableLockers.find((l) => l.id === selectedLockerId);

    setPendingConfirmation({
      title: "Confirm Monthly Locker Rental",
      description: "Verify subscriber details, locker selection, and payment details before saving.",
      customerName: resolvedMember.fullName,
      customerCode: resolvedMember.memberCode,
      itemDescription: `Dedicated Locker #${locker?.lockerNumber || selectedLockerId} (${locker?.section || ""} Room)`,
      amountETB: priceETB,
      paymentMethod,
      paymentRef: paymentRef.trim() || undefined,
      extraDetails: {
        "Rental Duration": `${durationDays} Days`,
        "Locker": `#${locker?.lockerNumber}`,
      },
    });
    setIsConfirmOpen(true);
  };

  const handleConfirmSaveRental = async () => {
    if (!resolvedMember || !selectedLockerId) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/rentals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: resolvedMember.id,
          lockerId: selectedLockerId,
          durationDays,
          priceETB,
          paymentMethod,
          paymentRef: paymentRef.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create rental");

      toast.success("Locker Contract Created", `Payment of ${priceETB} ETB recorded for ${resolvedMember.fullName}.`);
      setIsConfirmOpen(false);
      setIsDialogOpen(false);
      setMemberCode("");
      setResolvedMember(null);
      setPaymentRef("");
      loadData();
    } catch (err: unknown) {
      toast.error("Rental Error", err instanceof Error ? err.message : "Error creating rental");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmRefund = async (reason: string) => {
    if (!refundTarget) return;
    setRefundLoading(true);
    try {
      const res = await fetch(`/api/rentals/${refundTarget.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to refund locker rental");

      toast.success("Locker Rental Refunded", data.message || "Rental was refunded and cancelled.");
      setRefundTarget(null);
      loadData();
    } catch (err: unknown) {
      toast.error("Refund Error", err instanceof Error ? err.message : "Failed to refund locker rental");
    } finally {
      setRefundLoading(false);
    }
  };

  const handleTerminateRental = async (id: string, lockerNum: string) => {
    if (!confirm(`Terminate rental contract for locker ${lockerNum} and set it back to Available?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/rentals/${id}/terminate`, { method: "POST" });
      if (res.ok) {
        loadData();
      }
    } catch {
      alert("Failed to terminate rental");
    }
  };

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Dedicated Monthly Locker Rentals
          </h1>
          <p className="text-xs text-slate-500">
            Long-term assigned lockers reserved for specific VIP members on monthly contracts.
          </p>
        </div>

        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-[#1e3a8a] text-white hover:bg-[#1e40af] h-8 text-xs font-semibold shadow-2xs"
        >
          <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
          Assign Monthly Locker
        </Button>
      </div>

      {/* Rentals Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Monthly Locker Contracts</CardTitle>
          <CardDescription className="text-xs">
            Members holding reserved long-term lockers with automated expiry tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Locker #</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Contract Expiration</TableHead>
                <TableHead>Monthly Fee</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rentals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-xs text-slate-400">
                    {loading ? "Loading rentals..." : "No dedicated locker rentals active."}
                  </TableCell>
                </TableRow>
              ) : (
                rentals.map((r) => {
                  const isExpired = new Date(r.endDate) < new Date();

                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs font-bold text-slate-900">
                        {r.locker.lockerNumber}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 capitalize">
                        {r.locker.section.toLowerCase()}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900">
                        {r.member.fullName} ({r.member.memberCode})
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-600">
                        {r.member.phone}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium text-slate-900">
                          {new Date(r.endDate).toLocaleDateString()}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {formatDualDate(r.endDate)}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-slate-900">
                        {Number(r.priceETB).toLocaleString()} ETB
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {r.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.isActive ? (
                          isExpired ? (
                            <Badge variant="warning">Contract Expired</Badge>
                          ) : (
                            <Badge variant="success">Active Reserved</Badge>
                          )
                        ) : (
                          <Badge variant="secondary">Terminated</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {currentUser?.role === "ADMIN" && r.isActive && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setRefundTarget(r)}
                              className="h-7 text-xs text-rose-600 hover:bg-rose-50 hover:border-rose-300"
                            >
                              Refund / Rollback
                            </Button>
                          )}
                          {r.isActive && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTerminateRental(r.id, r.locker.lockerNumber)}
                              className="h-7 text-xs text-red-600 hover:bg-red-50 hover:border-red-300"
                            >
                              Release Locker
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assign Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Dedicated Monthly Locker</DialogTitle>
            <DialogDescription>
              Reserves a locker for exclusive long-term use by a member.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRental} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Member Code or Phone *
              </label>
              <MemberLookupAutocomplete
                placeholder="Search member by code, phone, or name..."
                value={memberCode}
                onChange={(val) => {
                  setMemberCode(val);
                  setLookupError(null);
                }}
                selectedMember={resolvedMember}
                showSelectedCard={true}
                onClearSelected={() => {
                  setResolvedMember(null);
                  setMemberCode("");
                  setLookupError(null);
                }}
                onSelectMember={(m) => {
                  setResolvedMember({
                    id: m.id,
                    fullName: m.fullName,
                    memberCode: m.memberCode,
                  });
                  setMemberCode(m.memberCode);
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
              <label className="block font-medium text-slate-700 mb-1">
                Select Available Locker *
              </label>
              <select
                value={selectedLockerId}
                onChange={(e) => setSelectedLockerId(e.target.value)}
                className="w-full h-8 rounded border border-slate-200 bg-slate-50 px-2 text-xs"
              >
                {availableLockers.length === 0 ? (
                  <option disabled>No lockers currently available</option>
                ) : (
                  availableLockers.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.lockerNumber} ({l.section} Room)
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Duration (Days)</label>
                <Input
                  type="number"
                  value={durationDays}
                  onChange={(e) => setDurationDays(parseInt(e.target.value, 10))}
                  className="h-8 text-xs bg-slate-50"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Rental Fee (ETB)</label>
                <Input
                  type="number"
                  value={priceETB}
                  onChange={(e) => setPriceETB(parseFloat(e.target.value))}
                  className="h-8 text-xs bg-slate-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full h-8 rounded border border-slate-200 bg-slate-50 px-2 text-xs"
                >
                  <option value="TELEBIRR">Telebirr</option>
                  <option value="CBE_TRANSFER">CBE Transfer</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Reference Slip #</label>
                <Input
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="Slip / Conf #"
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
                disabled={submitting || !resolvedMember || !selectedLockerId}
                className="h-8 text-xs bg-[#1e3a8a] text-white hover:bg-[#1e40af]"
              >
                {submitting ? "Reserving..." : "Confirm Monthly Reservation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Confirmation Dialog */}
      <PaymentConfirmationDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        details={pendingConfirmation}
        onConfirm={handleConfirmSaveRental}
        loading={submitting}
      />

      {/* Admin Refund Confirmation Dialog */}
      <RefundConfirmationDialog
        open={!!refundTarget}
        onOpenChange={(open) => {
          if (!open) setRefundTarget(null);
        }}
        title="Refund Locker Rental"
        description="This will cancel the active rental contract, refund the payment recorded, and make the dedicated locker available again."
        amountETB={refundTarget?.priceETB || 0}
        customerName={refundTarget?.member?.fullName}
        itemDescription={`Locker #${refundTarget?.locker?.lockerNumber} Dedicated Rental`}
        onConfirm={handleConfirmRefund}
        loading={refundLoading}
      />
    </div>
  );
}
