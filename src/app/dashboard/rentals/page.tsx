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
import { KeyRound, PlusCircle, CheckCircle2, Lock } from "lucide-react";
import { formatDualDate } from "@/lib/ethiopian-calendar";

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

  // New rental dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [memberCode, setMemberCode] = useState("");
  const [resolvedMember, setResolvedMember] = useState<{ id: string; fullName: string } | null>(null);
  const [selectedLockerId, setSelectedLockerId] = useState("");
  const [priceETB, setPriceETB] = useState(500);
  const [durationDays, setDurationDays] = useState(30);
  const [paymentMethod, setPaymentMethod] = useState("TELEBIRR");
  const [paymentRef, setPaymentRef] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const handleLookupMember = async () => {
    if (!memberCode) return;
    setLookupError(null);
    try {
      const res = await fetch(`/api/members/lookup?code=${encodeURIComponent(memberCode)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Member not found");
      setResolvedMember({ id: data.member.id, fullName: data.member.fullName });
    } catch (err: unknown) {
      setLookupError(err instanceof Error ? err.message : "Member not found");
      setResolvedMember(null);
    }
  };

  const handleCreateRental = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedMember || !selectedLockerId) {
      alert("Please verify member and select a locker");
      return;
    }

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
          paymentRef,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create rental");

      setIsDialogOpen(false);
      setMemberCode("");
      setResolvedMember(null);
      setPaymentRef("");
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error creating rental");
    } finally {
      setSubmitting(false);
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
              <div className="flex gap-2">
                <Input
                  required
                  value={memberCode}
                  onChange={(e) => setMemberCode(e.target.value)}
                  placeholder="e.g. BF-1003"
                  className="h-8 text-xs bg-slate-50"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLookupMember}
                  className="h-8 text-xs"
                >
                  Verify
                </Button>
              </div>
              {lookupError && <p className="mt-1 text-[11px] text-red-600">{lookupError}</p>}
              {resolvedMember && (
                <p className="mt-1 text-[11px] text-emerald-700 font-semibold">
                  ✓ {resolvedMember.fullName}
                </p>
              )}
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
    </div>
  );
}
