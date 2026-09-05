"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Dumbbell,
  CheckCircle2,
  Calendar,
  CreditCard,
  User,
  Phone,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  Search,
  Sparkles,
  ArrowRight,
  Clock,
  XCircle,
  Camera,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface Plan {
  id: string;
  name: string;
  durationDays: number;
  priceETB: string | number;
  description: string | null;
}

interface PaymentAccount {
  id: string;
  code: string;
  name: string;
  accountNumber: string | null;
  accountHolder: string | null;
  instructions: string | null;
}

export default function PublicRegistrationPage() {
  const [activeTab, setActiveTab] = useState<"register" | "track">("register");

  // Plans & Payment Accounts from backend
  const [plans, setPlans] = useState<Plan[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [registrationFeeETB, setRegistrationFeeETB] = useState<number>(100);
  const [loadingData, setLoadingData] = useState(true);

  // Form inputs
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
  const [email, setEmail] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [fitnessGoal, setFitnessGoal] = useState("");

  // Plan & Schedule
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<string>("TELEBIRR");
  const [paymentRef, setPaymentRef] = useState<string>("");

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedResult, setSubmittedResult] = useState<{
    requestNumber: string;
    amountETB: number;
    planName: string;
    paymentMethod: string;
    paymentRef: string | null;
  } | null>(null);

  // Tracking query state
  const [trackQuery, setTrackQuery] = useState("");
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [trackResult, setTrackResult] = useState<any | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/public/plans");
        if (res.ok) {
          const data = await res.json();
          setPlans(data.plans || []);
          setPaymentAccounts(data.paymentAccounts || []);
          if (data.registrationFeeETB !== undefined) {
            setRegistrationFeeETB(data.registrationFeeETB);
          }
          if (data.plans && data.plans.length > 0) {
            setSelectedPlanId(data.plans[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load plans:", err);
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, []);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const planPrice = selectedPlan ? Number(selectedPlan.priceETB) : 0;
  const totalAmountDue = planPrice + registrationFeeETB;

  // Compute expiration date preview
  const expirationDatePreview = (() => {
    if (!startDate || !selectedPlan) return null;
    const s = new Date(startDate);
    if (isNaN(s.getTime())) return null;
    const end = new Date(s.getTime() + selectedPlan.durationDays * 24 * 60 * 60 * 1000);
    return end.toISOString().split("T")[0];
  })();

  const activeAccount = paymentAccounts.find(
    (acc) => acc.code.toUpperCase() === paymentMethod.toUpperCase()
  );

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFormError("Please select a valid image file (PNG, JPG, WEBP).");
      return;
    }

    setUploadingPhoto(true);
    setFormError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload photo");
      setPhotoUrl(data.url);
    } catch (err: any) {
      setFormError(err.message || "Failed to upload profile photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim() || !phone.trim() || !password) {
      setFormError("Please complete all required fields (Full name, Phone number, and Password).");
      return;
    }

    if (password.length < 6) {
      setFormError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match. Please retype carefully.");
      return;
    }

    if (!selectedPlanId) {
      setFormError("Please select a membership plan.");
      return;
    }

    if (paymentMethod !== "CASH" && !paymentRef.trim()) {
      setFormError("Please enter your transaction reference code or SMS slip ID.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/public/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone,
          password,
          gender,
          email,
          photoUrl: photoUrl || null,
          emergencyContactName: emergencyName,
          emergencyContactPhone: emergencyPhone,
          dateOfBirth,
          fitnessGoal,
          planId: selectedPlanId,
          startDate,
          paymentMethod,
          paymentRef,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit registration request.");
      }

      setSubmittedResult({
        requestNumber: data.requestNumber,
        amountETB: data.amountETB,
        planName: data.planName,
        paymentMethod: data.paymentMethod,
        paymentRef: data.paymentRef,
      });
    } catch (err: any) {
      setFormError(err.message || "An error occurred during submission.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackQuery.trim()) return;

    setTrackingLoading(true);
    setTrackError(null);
    setTrackResult(null);

    try {
      const res = await fetch(`/api/public/register/status?q=${encodeURIComponent(trackQuery.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No registration found with that tracking code or phone number.");
      }
      setTrackResult(data);
    } catch (err: any) {
      setTrackError(err.message || "Unable to find registration status.");
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-[#dc2626] selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-xs">
              <img src="/blow.png" alt="Blow Fitness" className="h-full w-full object-contain" />
            </div>
            <div>
              <span className="font-black text-base tracking-tight text-slate-900 block leading-tight">
                BLOW <span className="text-[#dc2626]">FITNESS</span>
              </span>
              <span className="text-[10px] text-amber-600 uppercase tracking-wider font-bold block">
                Athlete Registration
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-xs text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex items-center gap-1.5 font-semibold shadow-xs"
            >
              <User className="h-3.5 w-3.5 text-[#dc2626]" />
              Member Login
            </Link>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-10">
        {/* Navigation Tabs (Clean Segmented Control) */}
        <div className="flex items-center justify-center p-1 bg-slate-200/70 rounded-xl max-w-xs mx-auto mb-8 border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setActiveTab("register");
              setFormError(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "register"
                ? "bg-white text-slate-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-[#dc2626]" />
            Register
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("track");
              setTrackError(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "track"
                ? "bg-white text-slate-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Search className="h-3.5 w-3.5 text-slate-500" />
            Track Status
          </button>
        </div>

        {/* TAB 1: REGISTRATION */}
        {activeTab === "register" && (
          <div>
            {submittedResult ? (
              /* Success Submission Card */
              <Card className="bg-white border-slate-200 text-slate-900 shadow-sm animate-in zoom-in-95 duration-200">
                <CardHeader className="text-center pb-4 pt-8">
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-3">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>
                  <CardTitle className="text-xl font-bold text-slate-900">
                    Registration Submitted!
                  </CardTitle>
                  <CardDescription className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
                    Your request has been sent to the front desk. Once our team verifies your
                    payment reference, your membership will be activated.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-6">
                  {/* Tracking Code Callout */}
                  <div className="bg-amber-50/70 rounded-xl p-4 border border-amber-200/80 text-center space-y-1.5">
                    <span className="text-[11px] text-amber-800 uppercase tracking-wider font-semibold">
                      Your Request Tracking Code
                    </span>
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-mono text-2xl font-extrabold text-[#dc2626] tracking-wider">
                        {submittedResult.requestNumber}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(submittedResult.requestNumber, "reqNumber")}
                        className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900"
                      >
                        {copiedField === "reqNumber" ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Save this code or use your phone number to check verification status anytime.
                    </p>
                  </div>

                  {/* Summary Details */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">Selected Tier</span>
                      <span className="font-semibold text-slate-800">{submittedResult.planName}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">Total Paid</span>
                      <span className="font-bold text-emerald-600 font-mono">
                        {submittedResult.amountETB.toLocaleString()} ETB
                      </span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">Payment Method</span>
                      <span className="font-semibold text-slate-800">
                        {submittedResult.paymentMethod}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">Reference Slip Code</span>
                      <span className="font-mono text-slate-800 font-semibold truncate block">
                        {submittedResult.paymentRef || "—"}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-3">
                    <Link href="/login" className="flex-1">
                      <Button className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white font-semibold text-xs h-10 shadow-xs">
                        Sign In to Member Portal
                        <ArrowRight className="h-4 w-4 ml-1.5" />
                      </Button>
                    </Link>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSubmittedResult(null);
                        setFullName("");
                        setPhone("");
                        setPassword("");
                        setConfirmPassword("");
                        setPaymentRef("");
                      }}
                      className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs h-10"
                    >
                      Register Another Athlete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Registration Form */
              <form onSubmit={handleSubmitRegistration} className="space-y-6">
                {/* Error Banner */}
                {formError && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2.5 animate-in fade-in">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                    <div>
                      <span className="font-semibold block">Please correct the following:</span>
                      <span>{formError}</span>
                    </div>
                  </div>
                )}

                {/* Section 1: Athlete Personal Details & Credentials */}
                <Card className="bg-white border-slate-200 text-slate-900 shadow-xs">
                  <CardHeader className="pb-3 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <User className="h-4 w-4 text-[#dc2626]" />
                      1. Athlete Personal Details & Login Credentials
                    </CardTitle>
                    <CardDescription className="text-slate-500 text-xs">
                      Set up your profile and password to access the online athlete portal.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4 text-xs">
                    {/* Photo Upload */}
                    <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="relative w-14 h-14 rounded-full overflow-hidden border border-slate-200 bg-white flex items-center justify-center shrink-0">
                        {photoUrl ? (
                          <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <User className="h-6 w-6 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-slate-800 text-xs block">
                          Profile Photo (Optional)
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate">
                          Displayed on your digital membership card.
                        </span>
                        <div className="flex items-center gap-2 mt-1.5">
                          <input
                            type="file"
                            id="athlete-photo-input"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => document.getElementById("athlete-photo-input")?.click()}
                            disabled={uploadingPhoto}
                            className="h-7 text-xs border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs"
                          >
                            <Camera className="h-3 w-3 mr-1" />
                            {uploadingPhoto ? "Uploading..." : photoUrl ? "Change Photo" : "Upload Photo"}
                          </Button>
                          {photoUrl && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setPhotoUrl("")}
                              className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-medium mb-1">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Abebe Kebede"
                          className="h-9 text-xs bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#dc2626] focus:ring-1 focus:ring-[#dc2626]/20"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-medium mb-1">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <Input
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="0911223344"
                          className="h-9 text-xs bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 font-mono focus:border-[#dc2626] focus:ring-1 focus:ring-[#dc2626]/20"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-medium mb-1">
                          Create Password (Min 6 chars) <span className="text-red-500">*</span>
                        </label>
                        <Input
                          required
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="h-9 text-xs bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#dc2626] focus:ring-1 focus:ring-[#dc2626]/20"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-medium mb-1">
                          Confirm Password <span className="text-red-500">*</span>
                        </label>
                        <Input
                          required
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="h-9 text-xs bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#dc2626] focus:ring-1 focus:ring-[#dc2626]/20"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-700 font-medium mb-1">Gender *</label>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value as "MALE" | "FEMALE")}
                          className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800 focus:outline-none focus:border-[#dc2626] focus:ring-1 focus:ring-[#dc2626]/20"
                        >
                          <option value="MALE">Male</option>
                          <option value="FEMALE">Female</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-700 font-medium mb-1">Emergency Contact Name</label>
                        <Input
                          value={emergencyName}
                          onChange={(e) => setEmergencyName(e.target.value)}
                          placeholder="Family or friend name"
                          className="h-9 text-xs bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-medium mb-1">Emergency Phone</label>
                        <Input
                          value={emergencyPhone}
                          onChange={(e) => setEmergencyPhone(e.target.value)}
                          placeholder="09..."
                          className="h-9 text-xs bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 font-mono"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Section 2: Membership Tier Selection */}
                <Card className="bg-white border-slate-200 text-slate-900 shadow-xs">
                  <CardHeader className="pb-3 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-[#dc2626]" />
                      2. Choose Membership Tier
                    </CardTitle>
                    <CardDescription className="text-slate-500 text-xs">
                      Select your desired training duration and membership tier.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    {loadingData ? (
                      <div className="py-6 text-center text-slate-400 text-xs">
                        Loading gym membership tiers...
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {plans.map((p) => {
                          const isSelected = p.id === selectedPlanId;
                          return (
                            <div
                              key={p.id}
                              onClick={() => setSelectedPlanId(p.id)}
                              className={`p-4 rounded-xl border cursor-pointer transition-all relative flex flex-col justify-between ${
                                isSelected
                                  ? "bg-red-50/50 border-[#dc2626] shadow-xs ring-1 ring-[#dc2626]/30"
                                  : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                              }`}
                            >
                              {isSelected && (
                                <div className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-[#dc2626]" />
                              )}
                              <div>
                                <span className="text-xs font-bold text-slate-900 block">
                                  {p.name}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] mt-1 border-slate-200 text-slate-600 bg-slate-50"
                                >
                                  {p.durationDays} Days Access
                                </Badge>
                                {p.description && (
                                  <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">
                                    {p.description}
                                  </p>
                                )}
                              </div>
                              <div className="mt-4 pt-3 border-t border-slate-100">
                                <span className="text-lg font-bold text-[#dc2626] font-mono">
                                  {Number(p.priceETB).toLocaleString()} ETB
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Section 3: Schedule & Fee Breakdown */}
                <Card className="bg-white border-slate-200 text-slate-900 shadow-xs">
                  <CardHeader className="pb-3 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#dc2626]" />
                      3. Starting Date & Fee Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-700 font-medium mb-1">
                          Membership Start Date
                        </label>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="h-9 text-xs bg-white border-slate-200 text-slate-900 font-mono focus:border-[#dc2626]"
                        />
                        {expirationDatePreview && (
                          <span className="text-[11px] text-slate-500 mt-1 block">
                            Valid through:{" "}
                            <span className="text-[#dc2626] font-mono font-semibold">
                              {expirationDatePreview}
                            </span>
                          </span>
                        )}
                      </div>

                      {/* Fee Breakdown Box */}
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Plan Fee ({selectedPlan?.name || "Tier"})</span>
                          <span className="font-mono text-slate-900 font-medium">
                            {planPrice.toLocaleString()} ETB
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>First-Time Registration Fee</span>
                          <span className="font-mono text-slate-900 font-medium">
                            +{registrationFeeETB} ETB
                          </span>
                        </div>
                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold text-sm">
                          <span className="text-slate-900">Total Amount Due</span>
                          <span className="font-mono text-[#dc2626] text-base">
                            {totalAmountDue.toLocaleString()} ETB
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Section 4: Non-Cash Payment Instructions */}
                <Card className="bg-white border-slate-200 text-slate-900 shadow-xs">
                  <CardHeader className="pb-3 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-[#dc2626]" />
                      4. Payment & Reference Submission
                    </CardTitle>
                    <CardDescription className="text-slate-500 text-xs">
                      Send payment via Telebirr or CBE, then provide your transaction reference.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4 text-xs">
                    {/* Payment Method Selector Chips */}
                    <div className="flex items-center gap-2">
                      {(["TELEBIRR", "CBE_TRANSFER", "AWASH_TRANSFER"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPaymentMethod(m)}
                          className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                            paymentMethod === m
                              ? "bg-[#dc2626] text-white shadow-xs"
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {m === "TELEBIRR"
                            ? "Telebirr"
                            : m === "CBE_TRANSFER"
                            ? "CBE Birr / Bank"
                            : "Awash Bank"}
                        </button>
                      ))}
                    </div>

                    {/* Active Bank Account Instructions */}
                    <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                          Official Recipient Account
                        </span>
                        <span className="text-xs font-semibold text-amber-900">
                          {activeAccount?.name || paymentMethod}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="font-mono text-base font-bold text-slate-900 tracking-wider">
                          {activeAccount?.accountNumber || "TB-894721"}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleCopy(activeAccount?.accountNumber || "TB-894721", "accountNumber")
                          }
                          className="h-7 text-xs text-amber-800 hover:text-amber-950 hover:bg-amber-100/60 px-2"
                        >
                          {copiedField === "accountNumber" ? (
                            <span className="text-emerald-700 flex items-center gap-1">
                              <Check className="h-3 w-3" /> Copied
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Copy className="h-3 w-3" /> Copy
                            </span>
                          )}
                        </Button>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {activeAccount?.instructions ||
                          "Open your mobile banking app, transfer the total amount, and paste the transaction reference code received below."}
                      </p>
                    </div>

                    {/* Reference Slip Input */}
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        Transaction Reference / SMS Slip ID <span className="text-red-500">*</span>
                      </label>
                      <Input
                        required
                        value={paymentRef}
                        onChange={(e) => setPaymentRef(e.target.value)}
                        placeholder="e.g. TB98273461 or CBE transaction code"
                        className="h-10 text-xs bg-white border-slate-200 text-slate-900 font-mono placeholder:text-slate-400 focus:border-[#dc2626] focus:ring-1 focus:ring-[#dc2626]/20"
                      />
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        Our front desk team will match this reference with our statement to verify and approve.
                      </span>
                    </div>

                    {/* Commit Button */}
                    <div className="pt-2">
                      <Button
                        type="submit"
                        disabled={submitting}
                        className="w-full h-11 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-bold text-sm shadow-xs transition-colors"
                      >
                        {submitting ? "Submitting Registration..." : "Submit Registration & Payment"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: TRACK STATUS */}
        {activeTab === "track" && (
          <div className="space-y-6">
            <Card className="bg-white border-slate-200 text-slate-900 shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Search className="h-4 w-4 text-[#dc2626]" />
                  Track Online Registration Status
                </CardTitle>
                <CardDescription className="text-slate-500 text-xs">
                  Enter your Request Tracking Code (e.g. ONL-1001) or registered phone number.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-xs">
                <form onSubmit={handleTrackSubmit} className="flex gap-2">
                  <Input
                    required
                    value={trackQuery}
                    onChange={(e) => setTrackQuery(e.target.value)}
                    placeholder="ONL-1001 or 0911223344"
                    className="h-10 text-xs bg-white border-slate-200 text-slate-900 font-mono placeholder:text-slate-400 flex-1 focus:border-[#dc2626]"
                  />
                  <Button
                    type="submit"
                    disabled={trackingLoading}
                    className="bg-[#dc2626] hover:bg-[#b91c1c] text-white h-10 px-5 text-xs font-semibold shadow-xs"
                  >
                    {trackingLoading ? "Searching..." : "Check Status"}
                  </Button>
                </form>

                {trackError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                    <XCircle className="h-4 w-4 shrink-0" />
                    <span>{trackError}</span>
                  </div>
                )}

                {trackResult && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4 animate-in fade-in">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div>
                        <span className="font-mono text-sm font-bold text-[#dc2626]">
                          {trackResult.requestNumber}
                        </span>
                        <span className="text-xs text-slate-700 block font-medium">
                          {trackResult.fullName}
                        </span>
                      </div>
                      <div>
                        {trackResult.status === "PENDING" && (
                          <Badge className="bg-amber-50 text-amber-800 border-amber-200 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Pending Front Desk Review
                          </Badge>
                        )}
                        {trackResult.status === "APPROVED" && (
                          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Approved & Active
                          </Badge>
                        )}
                        {trackResult.status === "REJECTED" && (
                          <Badge className="bg-red-50 text-red-800 border-red-200 flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> Payment Not Verified
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Requested Tier</span>
                        <span className="font-semibold text-slate-800">{trackResult.planName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Total Amount</span>
                        <span className="font-bold text-emerald-700 font-mono">
                          {Number(trackResult.amountETB).toLocaleString()} ETB
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Payment Method</span>
                        <span className="font-semibold text-slate-800">
                          {trackResult.paymentMethod}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Reference Slip ID</span>
                        <span className="font-mono text-slate-800 font-semibold">
                          {trackResult.paymentRef || "—"}
                        </span>
                      </div>
                    </div>

                    {trackResult.status === "APPROVED" && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 flex items-center justify-between">
                        <div>
                          <span className="font-bold block">Membership Assigned!</span>
                          <span className="text-[11px] text-emerald-700">
                            Member Code: <span className="font-mono font-bold">{trackResult.memberCode}</span>
                          </span>
                        </div>
                        <Link href="/login">
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8">
                            Sign In to Portal →
                          </Button>
                        </Link>
                      </div>
                    )}

                    {trackResult.status === "REJECTED" && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-900 text-xs">
                        <span className="font-bold block">Rejection Reason:</span>
                        <span className="mt-0.5 block text-red-700">{trackResult.rejectionReason || "Payment could not be verified."}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
