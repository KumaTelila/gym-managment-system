"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Copy,
  Check,
  ShieldCheck,
  User,
  CreditCard,
  Phone,
  Calendar,
  AlertTriangle,
  FileText,
  UserCheck,
  Filter,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";

export default function ApprovalsDashboardPage() {
  const [activeTab, setActiveTab] = useState<"registrations" | "profiles">("registrations");

  // Data
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [profileUpdates, setProfileUpdates] = useState<any[]>([]);
  const [counts, setCounts] = useState<{
    pendingRegistrations: number;
    pendingProfileUpdates: number;
    totalPending: number;
  }>({
    pendingRegistrations: 0,
    pendingProfileUpdates: 0,
    totalPending: 0,
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [regStatusFilter, setRegStatusFilter] = useState("PENDING");
  const [profileStatusFilter, setProfileStatusFilter] = useState("PENDING");

  // Modals
  const [selectedRegForApproval, setSelectedRegForApproval] = useState<any | null>(null);
  const [verifiedRefInput, setVerifiedRefInput] = useState("");
  const [approvingReg, setApprovingReg] = useState(false);

  const [selectedRegForRejection, setSelectedRegForRejection] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectingReg, setRejectingReg] = useState(false);

  // Profile Update Review Modal
  const [selectedProfileForReview, setSelectedProfileForReview] = useState<any | null>(null);
  const [adminReviewReason, setAdminReviewReason] = useState("");
  const [submittingProfileReview, setSubmittingProfileReview] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/approvals?regStatus=${regStatusFilter}&profileStatus=${profileStatusFilter}&search=${encodeURIComponent(
          search
        )}`
      );
      if (res.ok) {
        const data = await res.json();
        setRegistrations(data.registrationRequests || []);
        setProfileUpdates(data.profileUpdateRequests || []);
        if (data.counts) setCounts(data.counts);
      }
    } catch (err) {
      console.error("Failed to load approvals:", err);
      toast.error("Error", "Could not load approvals data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [regStatusFilter, profileStatusFilter, search]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 1. Approve Registration
  const handleConfirmApproval = async () => {
    if (!selectedRegForApproval) return;
    setApprovingReg(true);

    try {
      const res = await fetch(`/api/approvals/${selectedRegForApproval.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verifiedPaymentRef: verifiedRefInput }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to approve registration.");

      toast.success(
        "Registration Approved!",
        `${selectedRegForApproval.fullName} has been registered with code ${json.member.memberCode} and membership is now ACTIVE.`
      );

      setSelectedRegForApproval(null);
      loadData();
    } catch (err: any) {
      toast.error("Approval Error", err.message || "Failed to approve registration.");
    } finally {
      setApprovingReg(false);
    }
  };

  // 2. Reject Registration
  const handleConfirmRejection = async () => {
    if (!selectedRegForRejection) return;
    if (!rejectionReason.trim()) {
      toast.error("Reason Required", "Please provide a rejection reason.");
      return;
    }
    setRejectingReg(true);

    try {
      const res = await fetch(`/api/approvals/${selectedRegForRejection.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectionReason }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to reject registration.");

      toast.info("Registration Rejected", "The registration request has been marked as rejected.");
      setSelectedRegForRejection(null);
      setRejectionReason("");
      loadData();
    } catch (err: any) {
      toast.error("Rejection Error", err.message || "Failed to reject registration.");
    } finally {
      setRejectingReg(false);
    }
  };

  // 3. Review Profile Update (Approve or Reject with Reason)
  const handleReviewProfileUpdate = async (action: "APPROVE" | "REJECT") => {
    if (!selectedProfileForReview) return;
    if (!adminReviewReason.trim()) {
      toast.error("Reason Required", "A justification reason is mandatory to review profile changes.");
      return;
    }

    setSubmittingProfileReview(true);
    try {
      const res = await fetch(`/api/approvals/profile-updates/${selectedProfileForReview.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: adminReviewReason }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to review profile update.");

      if (action === "APPROVE") {
        toast.success(
          "Profile Changes Approved",
          `Updated information for ${selectedProfileForReview.member.fullName} is now live.`
        );
      } else {
        toast.info("Profile Update Rejected", "The requested changes were rejected with reason.");
      }

      setSelectedProfileForReview(null);
      setAdminReviewReason("");
      loadData();
    } catch (err: any) {
      toast.error("Review Error", err.message || "Failed to update profile request.");
    } finally {
      setSubmittingProfileReview(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Online Approvals Station
            {counts.totalPending > 0 && (
              <Badge className="bg-amber-500 text-white font-mono text-[11px] px-2">
                {counts.totalPending} Pending
              </Badge>
            )}
          </h1>
          <p className="text-xs text-slate-500">
            Verify online member registrations, match Telebirr/CBE payment references, and approve athlete profile updates with reasons.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData()}
            className="h-8 text-xs border-slate-200 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-1.5 pt-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Registrations
            </span>
            <CardTitle className="text-2xl font-bold font-mono text-slate-900">
              {counts.pendingRegistrations}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 text-[11px] text-slate-500">
            Online sign-ups waiting for payment reference check
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-1.5 pt-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Profile Updates
            </span>
            <CardTitle className="text-2xl font-bold font-mono text-slate-900">
              {counts.pendingProfileUpdates}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 text-[11px] text-slate-500">
            Athlete profile changes requiring admin justification
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-1.5 pt-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Queue Depth
            </span>
            <CardTitle className="text-2xl font-bold font-mono text-[#1e3a8a]">
              {counts.totalPending}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 text-[11px] text-slate-500">
            Items requiring staff verification & authorization
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("registrations")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "registrations"
                ? "bg-[#1e3a8a] text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" />
            Online Registrations ({counts.pendingRegistrations})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("profiles")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "profiles"
                ? "bg-[#1e3a8a] text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            Profile Update Requests ({counts.pendingProfileUpdates})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, ref..."
              className="h-8 pl-8 text-xs bg-slate-50 border-slate-200"
            />
          </div>

          {/* Status Filter */}
          {activeTab === "registrations" ? (
            <select
              value={regStatusFilter}
              onChange={(e) => setRegStatusFilter(e.target.value)}
              className="h-8 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-700"
            >
              <option value="PENDING">Pending Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="ALL">All Registrations</option>
            </select>
          ) : (
            <select
              value={profileStatusFilter}
              onChange={(e) => setProfileStatusFilter(e.target.value)}
              className="h-8 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-700"
            >
              <option value="PENDING">Pending Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="ALL">All Profile Requests</option>
            </select>
          )}
        </div>
      </div>

      {/* TAB 1: ONLINE REGISTRATIONS TABLE */}
      {activeTab === "registrations" && (
        <Card className="bg-white border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                  <th className="p-3">Request #</th>
                  <th className="p-3">Athlete</th>
                  <th className="p-3">Membership Tier</th>
                  <th className="p-3">Amount Due</th>
                  <th className="p-3">Payment Ref (SMS Slip)</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registrations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No online registration requests found matching your filter.
                    </td>
                  </tr>
                ) : (
                  registrations.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3">
                        <span className="font-mono font-bold text-slate-900 block">{r.requestNumber}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(r.createdAt).toLocaleDateString()} {new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-900 block">{r.fullName}</span>
                        <span className="text-[11px] text-slate-500 font-mono">{r.phone}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-medium text-slate-800 block">{r.plan.name}</span>
                        <span className="text-[10px] text-slate-400">
                          Starts: {new Date(r.startDate).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-emerald-700 font-mono block">
                          {Number(r.amountETB).toLocaleString()} ETB
                        </span>
                        {Number(r.registrationFeeETB) > 0 && (
                          <span className="text-[10px] text-slate-400">
                            Includes {Number(r.registrationFeeETB)} ETB Reg Fee
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] bg-slate-50 border-slate-200">
                            {r.paymentMethod}
                          </Badge>
                          {r.paymentRef ? (
                            <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded font-mono text-[11px] text-slate-800">
                              <span>{r.paymentRef}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(r.paymentRef, r.id)}
                                className="text-slate-400 hover:text-slate-700 ml-1"
                              >
                                {copiedId === r.id ? (
                                  <Check className="h-3 w-3 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">No ref</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        {r.status === "PENDING" && (
                          <Badge className="bg-amber-50 text-amber-800 border-amber-200 flex items-center gap-1 w-fit text-[10px]">
                            <Clock className="h-3 w-3" /> Pending Review
                          </Badge>
                        )}
                        {r.status === "APPROVED" && (
                          <div className="space-y-0.5">
                            <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 flex items-center gap-1 w-fit text-[10px]">
                              <CheckCircle2 className="h-3 w-3" /> Approved
                            </Badge>
                            {r.createdMember && (
                              <span className="font-mono text-[10px] text-blue-700 font-bold block">
                                Code: {r.createdMember.memberCode}
                              </span>
                            )}
                          </div>
                        )}
                        {r.status === "REJECTED" && (
                          <div className="space-y-0.5">
                            <Badge className="bg-red-50 text-red-800 border-red-200 flex items-center gap-1 w-fit text-[10px]">
                              <XCircle className="h-3 w-3" /> Rejected
                            </Badge>
                            {r.rejectionReason && (
                              <span className="text-[10px] text-slate-500 block truncate max-w-[150px]">
                                {r.rejectionReason}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {r.status === "PENDING" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedRegForApproval(r);
                                setVerifiedRefInput(r.paymentRef || "");
                              }}
                              className="h-7 text-xs bg-[#1e3a8a] text-white hover:bg-[#1e40af] font-medium"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              Verify & Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRegForRejection(r);
                                setRejectionReason("");
                              }}
                              className="h-7 text-xs border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            By {r.approvedBy?.fullName || "Staff"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: PROFILE UPDATE REQUESTS TABLE */}
      {activeTab === "profiles" && (
        <Card className="bg-white border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                  <th className="p-3">Athlete</th>
                  <th className="p-3">Requested Modifications</th>
                  <th className="p-3">Submitted At</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Admin Reason</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {profileUpdates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No profile update requests found matching your filter.
                    </td>
                  </tr>
                ) : (
                  profileUpdates.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3">
                        <span className="font-semibold text-slate-900 block">{u.member.fullName}</span>
                        <span className="text-[11px] text-blue-700 font-mono font-bold block">
                          {u.member.memberCode}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{u.member.phone}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-medium text-slate-800 block">
                          {u.changeSummary || "Profile Details"}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString()} {new Date(u.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="p-3">
                        {u.status === "PENDING" && (
                          <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">
                            Pending Admin Reason
                          </Badge>
                        )}
                        {u.status === "APPROVED" && (
                          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                            Approved
                          </Badge>
                        )}
                        {u.status === "REJECTED" && (
                          <Badge className="bg-red-50 text-red-800 border-red-200 text-[10px]">
                            Rejected
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 max-w-[200px]">
                        {u.adminReason ? (
                          <span className="text-[11px] text-slate-700 block truncate" title={u.adminReason}>
                            {u.adminReason}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {u.status === "PENDING" ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedProfileForReview(u);
                              setAdminReviewReason("");
                            }}
                            className="h-7 text-xs bg-[#1e3a8a] text-white hover:bg-[#1e40af] font-medium"
                          >
                            <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                            Review & Decide
                          </Button>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            By {u.reviewedBy?.fullName || "Admin"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MODAL 1: APPROVE ONLINE REGISTRATION */}
      <Dialog open={!!selectedRegForApproval} onOpenChange={() => setSelectedRegForApproval(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Verify & Approve Membership Payment
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirm that the non-cash transaction reference matches your mobile banking statement.
            </DialogDescription>
          </DialogHeader>

          {selectedRegForApproval && (
            <div className="space-y-4 text-xs">
              {/* Amount Callout */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                <span className="text-[11px] text-emerald-800 uppercase tracking-wider font-semibold block">
                  Total Amount Verified
                </span>
                <span className="text-2xl font-black font-mono text-emerald-700">
                  {Number(selectedRegForApproval.amountETB).toLocaleString()} ETB
                </span>
                <span className="text-[11px] text-emerald-600 block mt-0.5">
                  Tier: {selectedRegForApproval.plan.name} ({selectedRegForApproval.plan.durationDays} Days)
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Athlete Name:</span>
                  <span className="font-semibold text-slate-900">{selectedRegForApproval.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span className="font-mono text-slate-900">{selectedRegForApproval.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Start Date:</span>
                  <span className="font-medium text-slate-800">
                    {new Date(selectedRegForApproval.startDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Channel:</span>
                  <span className="font-semibold text-blue-700">{selectedRegForApproval.paymentMethod}</span>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Verified Payment Reference Code
                </label>
                <Input
                  value={verifiedRefInput}
                  onChange={(e) => setVerifiedRefInput(e.target.value)}
                  placeholder="e.g. Telebirr SMS code or CBE slip #"
                  className="h-8 text-xs font-mono bg-white border-slate-300"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  You can correct or clean the slip code before committing if needed.
                </span>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRegForApproval(null)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={approvingReg}
                  onClick={handleConfirmApproval}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {approvingReg ? "Activating Membership..." : "Confirm & Activate Membership"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 2: REJECT ONLINE REGISTRATION */}
      <Dialog open={!!selectedRegForRejection} onOpenChange={() => setSelectedRegForRejection(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold text-red-700">
              <XCircle className="h-4 w-4 text-red-600" />
              Reject Registration Request
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provide a clear reason (e.g. transaction code not found or incorrect amount).
            </DialogDescription>
          </DialogHeader>

          {selectedRegForRejection && (
            <div className="space-y-4 text-xs">
              <div className="bg-red-50/70 p-3 rounded-lg border border-red-200">
                <span className="font-semibold text-red-900 block">{selectedRegForRejection.fullName}</span>
                <span className="text-slate-600 block text-[11px]">
                  Ref: {selectedRegForRejection.paymentRef || "No reference provided"}
                </span>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Rejection Reason <span className="text-red-600">*</span>
                </label>
                <Input
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Telebirr SMS code could not be verified in merchant statement"
                  className="h-8 text-xs bg-white border-slate-300"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRegForRejection(null)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={rejectingReg}
                  onClick={handleConfirmRejection}
                  className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white font-semibold"
                >
                  {rejectingReg ? "Rejecting..." : "Reject Registration"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 3: REVIEW PROFILE UPDATE (Approve or Reject with Reason) */}
      <Dialog open={!!selectedProfileForReview} onOpenChange={() => setSelectedProfileForReview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              Review Athlete Profile Modification
            </DialogTitle>
            <DialogDescription className="text-xs">
              Inspect current vs proposed athlete data and enter a mandatory decision reason.
            </DialogDescription>
          </DialogHeader>

          {selectedProfileForReview && (
            <div className="space-y-4 text-xs">
              {/* Athlete header */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">{selectedProfileForReview.member.fullName}</span>
                  <span className="font-mono text-blue-700 text-[11px] font-bold">
                    {selectedProfileForReview.member.memberCode}
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {selectedProfileForReview.changeSummary || "Profile Changes"}
                </Badge>
              </div>

              {/* Side-by-Side Comparison */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Current Data</span>
                  <div className="text-[11px] text-slate-700 space-y-1">
                    {Object.entries(JSON.parse(selectedProfileForReview.currentData || "{}")).map(([k, v]) => (
                      <div key={k} className="truncate">
                        <span className="font-medium text-slate-500 capitalize">{k}: </span>
                        <span>{String(v || "—")}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200 space-y-1.5">
                  <span className="text-[11px] font-bold text-blue-800 uppercase block">Proposed Changes</span>
                  <div className="text-[11px] text-blue-900 space-y-1">
                    {Object.entries(JSON.parse(selectedProfileForReview.proposedData || "{}")).map(([k, v]) => (
                      <div key={k} className="truncate font-semibold">
                        <span className="capitalize">{k}: </span>
                        <span>{String(v || "—")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mandatory Admin Justification Reason */}
              <div>
                <label className="block font-medium text-slate-800 mb-1">
                  Admin Decision Reason / Justification <span className="text-red-600">*</span>
                </label>
                <Input
                  required
                  value={adminReviewReason}
                  onChange={(e) => setAdminReviewReason(e.target.value)}
                  placeholder="e.g. Verified Kebele ID or Contacted athlete by phone"
                  className="h-8 text-xs bg-white border-slate-300"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  This reason is recorded in audit logs and displayed to the athlete in their portal.
                </span>
              </div>

              <DialogFooter className="pt-2 flex items-center justify-between sm:justify-between w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedProfileForReview(null)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={submittingProfileReview}
                    onClick={() => handleReviewProfileUpdate("REJECT")}
                    className="h-8 text-xs border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                  >
                    Reject with Reason
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={submittingProfileReview}
                    onClick={() => handleReviewProfileUpdate("APPROVE")}
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    {submittingProfileReview ? "Applying..." : "Approve with Reason"}
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
