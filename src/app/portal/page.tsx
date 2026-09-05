"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import {
  Dumbbell,
  User,
  Calendar,
  CreditCard,
  KeyRound,
  History,
  QrCode,
  LogOut,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Edit3,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  HeartPulse,
  Activity,
  Printer,
  ChevronRight,
  ShieldCheck,
  Send,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface PortalData {
  member: {
    id: string;
    memberCode: string;
    fullName: string;
    phone: string;
    email: string | null;
    gender: "MALE" | "FEMALE";
    photoUrl: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    dateOfBirth: string | null;
    address: string | null;
    idNumber: string | null;
    fitnessGoal: string | null;
    medicalHistory: string | null;
    bloodGroup: string | null;
    notes: string | null;
    createdAt: string;
  };
  currentSubscription: any | null;
  membershipStatus: "ACTIVE" | "SCHEDULED" | "EXPIRED" | "NONE";
  daysRemaining: number;
  activeLocker: any | null;
  activeLockerRental: any | null;
  currentlyCheckedIn: boolean;
  currentSession: any | null;
  recentVisits: any[];
  allSubscriptions: any[];
  recentOrders: any[];
  profileUpdateRequests: any[];
}

export default function MemberPortalPage() {
  const router = useRouter();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Profile Update Request Modal
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [submittingUpdate, setSubmittingUpdate] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);

  // Form fields for update
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editEmergencyName, setEditEmergencyName] = useState("");
  const [editEmergencyPhone, setEditEmergencyPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editFitnessGoal, setEditFitnessGoal] = useState("");
  const [editMedicalHistory, setEditMedicalHistory] = useState("");
  const [editBloodGroup, setEditBloodGroup] = useState("");

  const loadPortalData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/portal/me");
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const err = await res.json();
        throw new Error(err.error || "Failed to load member profile.");
      }
      const json = await res.json();
      setData(json);

      // Generate QR Code for member check-in
      if (json.member?.memberCode) {
        const url = await QRCode.toDataURL(json.member.memberCode, {
          width: 256,
          margin: 1,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
        setQrDataUrl(url);
      }

      // Prepopulate edit fields
      if (json.member) {
        setEditFullName(json.member.fullName || "");
        setEditPhone(json.member.phone || "");
        setEditEmail(json.member.email || "");
        setEditEmergencyName(json.member.emergencyContactName || "");
        setEditEmergencyPhone(json.member.emergencyContactPhone || "");
        setEditAddress(json.member.address || "");
        setEditFitnessGoal(json.member.fitnessGoal || "");
        setEditMedicalHistory(json.member.medicalHistory || "");
        setEditBloodGroup(json.member.bloodGroup || "");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortalData();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
      router.push("/login");
    }
  };

  const handleProfileUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateError(null);
    setUpdateSuccess(null);
    setSubmittingUpdate(true);

    try {
      const res = await fetch("/api/portal/profile-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: editFullName,
          phone: editPhone,
          email: editEmail,
          emergencyContactName: editEmergencyName,
          emergencyContactPhone: editEmergencyPhone,
          address: editAddress,
          fitnessGoal: editFitnessGoal,
          medicalHistory: editMedicalHistory,
          bloodGroup: editBloodGroup,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to submit profile update request.");
      }

      setUpdateSuccess("Your update request was submitted! An administrator will review and approve it.");
      setIsUpdateModalOpen(false);
      loadPortalData();
    } catch (err: any) {
      setUpdateError(err.message || "Failed to submit profile update.");
    } finally {
      setSubmittingUpdate(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500 gap-3">
        <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shadow-xs animate-pulse">
          <img src="/blow.png" alt="Blow Fitness" className="h-full w-full object-contain" />
        </div>
        <span className="text-xs font-medium text-slate-600">Loading your athlete portal...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="p-6 bg-white border border-slate-200 rounded-2xl max-w-md w-full space-y-4 shadow-xs">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Athlete Profile Not Found</h2>
          <p className="text-xs text-slate-500">{error || "Could not retrieve member profile."}</p>
          <Button onClick={() => router.push("/login")} className="bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs shadow-xs">
            Return to Sign In
          </Button>
        </div>
      </div>
    );
  }

  const { member, currentSubscription, membershipStatus, daysRemaining, activeLocker, currentlyCheckedIn, recentVisits, profileUpdateRequests } = data;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-[#dc2626] selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-xs">
              <img src="/blow.png" alt="Blow Fitness" className="h-full w-full object-contain" />
            </div>
            <div>
              <span className="font-black text-sm sm:text-base tracking-tight text-slate-900 block leading-tight">
                BLOW <span className="text-[#dc2626]">FITNESS</span>
              </span>
              <span className="text-[10px] text-amber-600 uppercase tracking-wider font-bold block">
                Athlete Member Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-900 leading-tight">{member.fullName}</span>
              <span className="font-mono text-[11px] text-[#dc2626] font-semibold">{member.memberCode}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="h-8 text-xs border-slate-200 bg-white text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Success Alert if profile update request was recently sent */}
        {updateSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{updateSuccess}</span>
            </div>
            <button onClick={() => setUpdateSuccess(null)} className="text-emerald-700 hover:text-emerald-950">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Section 1: Top Hero Banner & Digital Membership Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Digital PVC Card */}
          <div className="relative rounded-2xl p-6 bg-white border-2 border-slate-200 shadow-sm flex flex-col justify-between min-h-[220px]">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700">
                  OFFICIAL ATHLETE PASS
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">{member.fullName}</h3>
                <span className="font-mono text-xs font-bold text-[#dc2626]">{member.memberCode}</span>
              </div>
              <div className="h-14 w-14 rounded-xl bg-white p-1 border border-slate-200 shadow-2xs shrink-0">
                {qrDataUrl && <img src={qrDataUrl} alt="Checkin QR" className="w-full h-full object-contain" />}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Current Tier</span>
                <span className="font-semibold text-slate-900">
                  {currentSubscription?.plan?.name || "No Active Plan"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block uppercase">Status</span>
                {membershipStatus === "ACTIVE" && (
                  <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                    ACTIVE
                  </Badge>
                )}
                {membershipStatus === "SCHEDULED" && (
                  <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">
                    SCHEDULED
                  </Badge>
                )}
                {membershipStatus === "EXPIRED" && (
                  <Badge className="bg-red-50 text-red-800 border-red-200 text-[10px]">
                    EXPIRED
                  </Badge>
                )}
                {membershipStatus === "NONE" && (
                  <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px]">PENDING</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics (Active Plan, Locker, Live Check-in) */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Metric 1: Subscription */}
            <Card className="bg-white border-slate-200 text-slate-900 flex flex-col justify-between shadow-xs">
              <CardHeader className="pb-2">
                <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                  <CreditCard className="h-3.5 w-3.5 text-[#dc2626]" />
                  Membership Expiration
                </span>
                <CardTitle className="text-xl font-bold font-mono text-slate-900 mt-1">
                  {membershipStatus === "ACTIVE" ? (
                    <span className="text-emerald-700">{daysRemaining} Days Left</span>
                  ) : membershipStatus === "SCHEDULED" ? (
                    <span className="text-amber-600">Starts Soon</span>
                  ) : (
                    <span className="text-red-600">Needs Renewal</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-[11px] text-slate-500">
                {currentSubscription ? (
                  <span>
                    Valid: {new Date(currentSubscription.startDate).toLocaleDateString()} &rarr;{" "}
                    {new Date(currentSubscription.endDate).toLocaleDateString()}
                  </span>
                ) : (
                  <span>No active subscription.</span>
                )}
              </CardContent>
            </Card>

            {/* Metric 2: Locker */}
            <Card className="bg-white border-slate-200 text-slate-900 flex flex-col justify-between shadow-xs">
              <CardHeader className="pb-2">
                <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                  <KeyRound className="h-3.5 w-3.5 text-[#dc2626]" />
                  Dedicated Locker
                </span>
                <CardTitle className="text-xl font-bold font-mono text-slate-900 mt-1">
                  {activeLocker ? (
                    <span className="text-slate-900">Locker {activeLocker.lockerNumber}</span>
                  ) : (
                    <span className="text-slate-400 font-sans text-sm font-normal">None Assigned</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-[11px] text-slate-500">
                {activeLocker ? (
                  <span>Section: {activeLocker.section}</span>
                ) : (
                  <span>Visit reception to rent a dedicated monthly locker.</span>
                )}
              </CardContent>
            </Card>

            {/* Metric 3: Live Check-in Status */}
            <Card className="bg-white border-slate-200 text-slate-900 flex flex-col justify-between shadow-xs">
              <CardHeader className="pb-2">
                <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                  <Activity className="h-3.5 w-3.5 text-[#dc2626]" />
                  Live Attendance
                </span>
                <CardTitle className="text-xl font-bold text-slate-900 mt-1">
                  {currentlyCheckedIn ? (
                    <span className="text-emerald-700 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-600 animate-ping" />
                      In the Gym
                    </span>
                  ) : (
                    <span className="text-slate-500 text-sm font-medium">Checked Out</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-[11px] text-slate-500">
                {currentlyCheckedIn ? (
                  <span>Scan card at desk upon departure.</span>
                ) : (
                  <span>Total visits on file: {recentVisits.length}</span>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Section 2: Profile Details & Updates */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Overview Card */}
          <Card className="bg-white border-slate-200 text-slate-900 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <User className="h-4 w-4 text-[#dc2626]" />
                  Athlete Profile
                </CardTitle>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsUpdateModalOpen(true)}
                className="h-7 text-xs border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs"
              >
                <Edit3 className="h-3.5 w-3.5 mr-1 text-[#dc2626]" />
                Request Update
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" /> Phone
                </span>
                <span className="font-mono text-slate-900 font-medium">{member.phone}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> Email
                </span>
                <span className="text-slate-900">{member.email || "—"}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> Gender
                </span>
                <span className="text-slate-900">{member.gender}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" /> Emergency Contact
                </span>
                <span className="text-slate-900">
                  {member.emergencyContactName ? `${member.emergencyContactName} (${member.emergencyContactPhone || ""})` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <HeartPulse className="h-3.5 w-3.5 text-slate-400" /> Blood Group
                </span>
                <span className="text-slate-900">{member.bloodGroup || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-slate-400" /> Fitness Goal
                </span>
                <span className="text-slate-900 font-medium">{member.fitnessGoal || "General Fitness"}</span>
              </div>
            </CardContent>
          </Card>

          {/* Profile Update Requests & Admin Approvals Card */}
          <Card className="bg-white border-slate-200 text-slate-900 lg:col-span-2 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#dc2626]" />
                Profile Change Requests & Admin Reviews
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs">
                To maintain gym security and prevent account tampering, profile changes require admin review with reason.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 text-xs space-y-3">
              {profileUpdateRequests.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  No profile update requests submitted.
                </div>
              ) : (
                profileUpdateRequests.map((req) => (
                  <div key={req.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">
                        Requested Changes: <span className="text-slate-900 font-mono">{req.changeSummary || "Details"}</span>
                      </span>
                      <div>
                        {req.status === "PENDING" && (
                          <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Pending Admin Review
                          </Badge>
                        )}
                        {req.status === "APPROVED" && (
                          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Approved by Admin
                          </Badge>
                        )}
                        {req.status === "REJECTED" && (
                          <Badge className="bg-red-50 text-red-800 border-red-200 text-[10px] flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> Rejected by Admin
                          </Badge>
                        )}
                      </div>
                    </div>

                    {req.adminReason && (
                      <div className={`p-2 rounded-lg text-[11px] ${
                        req.status === "APPROVED"
                          ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
                          : "bg-red-50 border border-red-200 text-red-900"
                      }`}>
                        <span className="font-semibold">Admin Reason / Justification: </span>
                        <span>{req.adminReason}</span>
                      </div>
                    )}

                    <div className="text-[10px] text-slate-400">
                      Submitted on: {new Date(req.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Section 3: Gym Visit Attendance Log */}
        <Card className="bg-white border-slate-200 text-slate-900 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="h-4 w-4 text-[#dc2626]" />
              Recent Gym Visits & Check-In History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentVisits.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No check-in sessions recorded yet. Scan your digital QR code at reception upon arrival.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {recentVisits.slice(0, 8).map((v) => (
                  <div key={v.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-[#dc2626] shrink-0">
                        <Dumbbell className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800 block">
                          {new Date(v.checkinTime).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          In: {new Date(v.checkinTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {v.checkoutTime ? ` — Out: ${new Date(v.checkoutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : " (Active Session)"}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      {v.sessionStatus === "ACTIVE" ? (
                        <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                          Currently In Gym
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-mono">
                          {v.locker ? `Daily Locker ${v.locker.lockerNumber}` : "Completed"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* MODAL: Request Profile Update */}
      <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-lg shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-slate-900 flex items-center gap-2 text-sm">
              <Edit3 className="h-4 w-4 text-[#dc2626]" />
              Request Profile Update
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Make changes below. Once submitted, gym administration will review and approve with reason.
            </DialogDescription>
          </DialogHeader>

          {updateError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
              {updateError}
            </div>
          )}

          <form onSubmit={handleProfileUpdateSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Full Name</label>
                <Input
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="h-8 text-xs bg-white border-slate-200 text-slate-900 focus:border-[#dc2626]"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Phone Number</label>
                <Input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="h-8 text-xs bg-white border-slate-200 text-slate-900 font-mono focus:border-[#dc2626]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Email</label>
                <Input
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="h-8 text-xs bg-white border-slate-200 text-slate-900 focus:border-[#dc2626]"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Blood Group</label>
                <Input
                  value={editBloodGroup}
                  onChange={(e) => setEditBloodGroup(e.target.value)}
                  placeholder="e.g. A+, B+, O+"
                  className="h-8 text-xs bg-white border-slate-200 text-slate-900 focus:border-[#dc2626]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Emergency Contact Name</label>
                <Input
                  value={editEmergencyName}
                  onChange={(e) => setEditEmergencyName(e.target.value)}
                  className="h-8 text-xs bg-white border-slate-200 text-slate-900 focus:border-[#dc2626]"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Emergency Phone</label>
                <Input
                  value={editEmergencyPhone}
                  onChange={(e) => setEditEmergencyPhone(e.target.value)}
                  className="h-8 text-xs bg-white border-slate-200 text-slate-900 font-mono focus:border-[#dc2626]"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Fitness Goal</label>
              <Input
                value={editFitnessGoal}
                onChange={(e) => setEditFitnessGoal(e.target.value)}
                placeholder="e.g. Weight loss, Strength training"
                className="h-8 text-xs bg-white border-slate-200 text-slate-900 focus:border-[#dc2626]"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Medical Considerations</label>
              <Input
                value={editMedicalHistory}
                onChange={(e) => setEditMedicalHistory(e.target.value)}
                placeholder="e.g. Asthma, Knee surgery"
                className="h-8 text-xs bg-white border-slate-200 text-slate-900 focus:border-[#dc2626]"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUpdateModalOpen(false)}
                className="h-8 text-xs border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingUpdate}
                className="h-8 text-xs bg-[#dc2626] hover:bg-[#b91c1c] text-white font-semibold shadow-xs"
              >
                {submittingUpdate ? "Submitting..." : "Submit for Admin Approval"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
