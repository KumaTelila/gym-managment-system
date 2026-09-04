"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
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
import {
  Search,
  UserPlus,
  CreditCard,
  RefreshCw,
  Printer,
  AlertCircle,
  Dumbbell,
  Edit2,
  Eye,
  Archive,
  RotateCcw,
  Trash2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  HeartPulse,
  Target,
  FileText,
  Clock,
  CheckCircle2,
  UserCheck,
  KeyRound,
  AlertTriangle,
  CalendarDays,
  PlusCircle,
  Check,
  Unlock,
  ShieldCheck,
  Lock,
  Camera,
  Upload,
  User,
} from "lucide-react";
import { formatDualDate, toEthiopianDate } from "@/lib/ethiopian-calendar";
import { toast } from "@/components/ui/toaster";
import { PhysicalMemberCard } from "@/components/PhysicalMemberCard";

export interface Member {
  id: string;
  memberCode: string;
  cardVersion: number;
  fullName: string;
  phone: string;
  email: string | null;
  gender: "MALE" | "FEMALE";
  photoUrl?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  idNumber?: string | null;
  fitnessGoal?: string | null;
  medicalHistory?: string | null;
  bloodGroup?: string | null;
  notes?: string | null;
  isActive: boolean;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  createdAt: string;
  subscriptions: Array<{
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    amountPaidETB?: number | string;
    plan: { id: string; name: string; priceETB?: number | string; durationDays: number };
    processedBy?: { fullName: string };
  }>;
  lockerRentals?: Array<{
    id: string;
    startDate: string;
    endDate: string;
    priceETB: number | string;
    isActive: boolean;
    locker: { id: string; lockerNumber: string; section: string; status: string };
  }>;
  checkinSessions?: Array<{
    id: string;
    checkinTime: string;
    checkoutTime: string | null;
    sessionStatus: string;
    locker?: { lockerNumber: string } | null;
    receptionist?: { fullName: string };
  }>;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  durationDays: number;
  priceETB: number;
  description?: string;
}

interface AvailableLocker {
  id: string;
  lockerNumber: string;
  section: string;
  status: string;
}

interface CurrentUser {
  id: string;
  username: string;
  fullName: string;
  role: "ADMIN" | "FINANCE_OWNER" | "RECEPTIONIST";
}

const FITNESS_GOALS = [
  "Weight Loss & Fat Reduction",
  "Muscle Gain & Bodybuilding",
  "Strength & Powerlifting",
  "Cardio Endurance & Stamina",
  "General Fitness & Wellness",
  "Post-Injury Rehabilitation",
  "Athletic Sports Conditioning",
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [availableLockers, setAvailableLockers] = useState<AvailableLocker[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("active");
  const [expiryFilter, setExpiryFilter] = useState<"all" | "active" | "expiring_soon" | "expired" | "no_plan">("all");
  const [loading, setLoading] = useState(true);

  // Dialog States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isCardOpen, setIsCardOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileMember, setProfileMember] = useState<Member | null>(null);
  const [profileTab, setProfileTab] = useState<"info" | "subscriptions" | "lockers" | "attendance">("info");
  const [profileLoading, setProfileLoading] = useState(false);

  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [cardSide, setCardSide] = useState<"both" | "front" | "back">("both");
  const [showQrOnCard, setShowQrOnCard] = useState<boolean>(true);

  // Renew Subscription Dialog
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [renewingMember, setRenewingMember] = useState<Member | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [renewStartDate, setRenewStartDate] = useState<string>("");
  const [renewEndDate, setRenewEndDate] = useState<string>("");
  const [renewPaymentMethod, setRenewPaymentMethod] = useState<"CASH" | "TELEBIRR" | "CBE_TRANSFER" | "OTHER">("CASH");
  const [renewPaymentRef, setRenewPaymentRef] = useState<string>("");
  const [renewAmount, setRenewAmount] = useState<number | string>("");

  // Adjust Expiry Date Dialog
  const [isAdjustExpiryOpen, setIsAdjustExpiryOpen] = useState(false);
  const [adjustingMember, setAdjustingMember] = useState<Member | null>(null);
  const [adjustAddDays, setAdjustAddDays] = useState<number | null>(null);
  const [adjustCustomEndDate, setAdjustCustomEndDate] = useState<string>("");
  const [adjustReason, setAdjustReason] = useState<string>("");

  // Assign & Manage Locker Dialog
  const [isLockerOpen, setIsLockerOpen] = useState(false);
  const [lockerMember, setLockerMember] = useState<Member | null>(null);
  const [selectedLockerId, setSelectedLockerId] = useState<string>("");
  const [lockerDurationDays, setLockerDurationDays] = useState<number>(30);
  const [lockerPriceETB, setLockerPriceETB] = useState<number>(500);
  const [lockerPaymentMethod, setLockerPaymentMethod] = useState<"CASH" | "TELEBIRR" | "CBE_TRANSFER" | "OTHER">("CASH");
  const [lockerPaymentRef, setLockerPaymentRef] = useState<string>("");
  const [lockerExtendDays, setLockerExtendDays] = useState<number>(30);
  const [lockerExtendFee, setLockerExtendFee] = useState<number>(500);

  // New member form
  const [newFullName, setNewFullName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newGender, setNewGender] = useState<"MALE" | "FEMALE">("MALE");
  const [newDateOfBirth, setNewDateOfBirth] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newIdNumber, setNewIdNumber] = useState("");
  const [newFitnessGoal, setNewFitnessGoal] = useState("");
  const [newBloodGroup, setNewBloodGroup] = useState("");
  const [newMedicalHistory, setNewMedicalHistory] = useState("");
  const [newEmergencyName, setNewEmergencyName] = useState("");
  const [newEmergencyPhone, setNewEmergencyPhone] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [uploadingMemberPhoto, setUploadingMemberPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleUploadPhoto = async (file: File, forEdit = false) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Invalid File", "Please select an image file (PNG, JPG, WEBP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File Too Large", "Maximum image size is 5MB.");
      return;
    }

    setUploadingMemberPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload image");
      const data = await res.json();
      if (forEdit) {
        setEditingMember((prev) => (prev ? { ...prev, photoUrl: data.url } : null));
      } else {
        setNewPhotoUrl(data.url);
      }
      toast.success("Photo Attached", "Profile image successfully uploaded.");
    } catch (err) {
      toast.error("Upload Error", err instanceof Error ? err.message : "Error uploading photo");
    } finally {
      setUploadingMemberPhoto(false);
    }
  };

  // Fetch session, plans, and available lockers
  useEffect(() => {
    async function initData() {
      try {
        const [meRes, subRes, rentalRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/subscriptions"),
          fetch("/api/rentals"),
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          setCurrentUser(meData.user);
        }
        if (subRes.ok) {
          const subData = await subRes.json();
          setPlans(subData.plans || []);
          if (subData.plans?.length > 0) {
            setSelectedPlanId(subData.plans[0].id);
          }
        }
        if (rentalRes.ok) {
          const rentalData = await rentalRes.json();
          setAvailableLockers(rentalData.availableLockers || []);
        }
      } catch (err) {
        console.error("Init data load error:", err);
      }
    }
    initData();
  }, []);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/members?search=${encodeURIComponent(search)}&status=${statusFilter}&expiry=${expiryFilter}`
      );
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableLockers = async () => {
    try {
      const res = await fetch("/api/rentals");
      if (res.ok) {
        const data = await res.json();
        setAvailableLockers(data.availableLockers || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadMembers();
  }, [search, statusFilter, expiryFilter]);

  // Compute key summary metrics
  const now = new Date();
  const totalMembers = members.length;
  const activeSubMembers = members.filter((m) => {
    const sub = m.subscriptions[0];
    return sub && sub.status === "ACTIVE" && new Date(sub.endDate) >= now;
  });
  const expiringSoonMembers = members.filter((m) => {
    const sub = m.subscriptions[0];
    if (!sub || sub.status !== "ACTIVE") return false;
    const end = new Date(sub.endDate);
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 7;
  });
  const expiredMembers = members.filter((m) => {
    const sub = m.subscriptions[0];
    if (!sub) return false;
    return sub.status !== "ACTIVE" || new Date(sub.endDate) < now;
  });
  const activeLockerMembers = members.filter(
    (m) => m.lockerRentals && m.lockerRentals.length > 0 && m.lockerRentals[0].isActive
  );

  // Helper for Subscription Expiry status
  const getSubStatus = (member: Member) => {
    const sub = member.subscriptions[0];
    if (!sub) {
      return { label: "No Plan", variant: "secondary" as const, daysLeft: null, isExpired: false, isExpiringSoon: false };
    }
    const end = new Date(sub.endDate);
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (sub.status !== "ACTIVE" || diffDays < 0) {
      return {
        label: `Expired ${Math.abs(diffDays)}d ago`,
        variant: "destructive" as const,
        daysLeft: diffDays,
        isExpired: true,
        isExpiringSoon: false,
      };
    }
    if (diffDays <= 7) {
      return {
        label: `Expires in ${diffDays}d`,
        variant: "warning" as const,
        daysLeft: diffDays,
        isExpired: false,
        isExpiringSoon: true,
      };
    }
    return {
      label: `Active (${diffDays}d left)`,
      variant: "success" as const,
      daysLeft: diffDays,
      isExpired: false,
      isExpiringSoon: false,
    };
  };

  // Helper for Locker Rental & Deadline status
  const getLockerStatus = (member: Member) => {
    const rental = member.lockerRentals?.[0];
    if (!rental || !rental.isActive) {
      return { hasLocker: false };
    }
    const end = new Date(rental.endDate);
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = diffDays < 0;
    const isExpiringSoon = diffDays >= 0 && diffDays <= 3;

    return {
      hasLocker: true,
      rental,
      lockerNumber: rental.locker.lockerNumber,
      section: rental.locker.section,
      daysLeft: diffDays,
      isOverdue,
      isExpiringSoon,
      label: isOverdue ? `Overdue by ${Math.abs(diffDays)}d` : `Deadline: ${diffDays}d left`,
      variant: isOverdue ? ("destructive" as const) : isExpiringSoon ? ("warning" as const) : ("info" as const),
    };
  };

  // --- OPEN RENEW SUBSCRIPTION MODAL ---
  const handleOpenRenew = (member: Member) => {
    setRenewingMember(member);
    const currentSub = member.subscriptions[0];
    const isCurrentlyActive = currentSub && currentSub.status === "ACTIVE" && new Date(currentSub.endDate) >= now;

    // Start date defaults to current sub's end date if currently active, or today if expired
    const start = isCurrentlyActive ? new Date(currentSub.endDate) : new Date();
    const startIso = start.toISOString().split("T")[0];
    setRenewStartDate(startIso);

    // Default plan
    const defaultPlan = plans[0];
    if (defaultPlan) {
      setSelectedPlanId(defaultPlan.id);
      setRenewAmount(defaultPlan.priceETB);
      const calculatedEnd = new Date(start.getTime() + defaultPlan.durationDays * 24 * 60 * 60 * 1000);
      setRenewEndDate(calculatedEnd.toISOString().split("T")[0]);
    }

    setRenewPaymentMethod("CASH");
    setRenewPaymentRef("");
    setIsRenewOpen(true);
  };

  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = plans.find((p) => p.id === planId);
    if (plan && renewStartDate) {
      setRenewAmount(plan.priceETB);
      const start = new Date(renewStartDate);
      const calculatedEnd = new Date(start.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
      setRenewEndDate(calculatedEnd.toISOString().split("T")[0]);
    }
  };

  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewingMember || !selectedPlanId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: renewingMember.id,
          planId: selectedPlanId,
          paymentMethod: renewPaymentMethod,
          paymentRef: renewPaymentRef,
          amountPaidETB: Number(renewAmount),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to renew subscription");

      toast.success(
        "Subscription Renewed!",
        `New plan activated for ${renewingMember.fullName}. Expiry: ${new Date(data.subscription.endDate).toLocaleDateString()} (${formatDualDate(data.subscription.endDate)})`
      );

      setIsRenewOpen(false);
      loadMembers();
      if (profileMember && profileMember.id === renewingMember.id) {
        handleOpenProfile(renewingMember);
      }
    } catch (err) {
      toast.error("Renewal Error", err instanceof Error ? err.message : "Failed to renew");
    } finally {
      setSubmitting(false);
    }
  };

  // --- OPEN ADJUST EXPIRY MODAL ---
  const handleOpenAdjustExpiry = (member: Member) => {
    setAdjustingMember(member);
    const sub = member.subscriptions[0];
    if (sub) {
      setAdjustCustomEndDate(new Date(sub.endDate).toISOString().split("T")[0]);
    }
    setAdjustAddDays(null);
    setAdjustReason("");
    setIsAdjustExpiryOpen(true);
  };

  const handleAdjustExpirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingMember || !adjustingMember.subscriptions[0]) return;
    setSubmitting(true);
    try {
      const subId = adjustingMember.subscriptions[0].id;
      const res = await fetch(`/api/subscriptions/${subId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addDays: adjustAddDays || undefined,
          newEndDate: adjustAddDays ? undefined : adjustCustomEndDate,
          reason: adjustReason || "Front-desk adjustment",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to adjust expiry date");

      toast.success(
        "Expiry Date Adjusted",
        `New expiry: ${new Date(data.subscription.endDate).toLocaleDateString()} (${formatDualDate(data.subscription.endDate)})`
      );

      setIsAdjustExpiryOpen(false);
      loadMembers();
      if (profileMember && profileMember.id === adjustingMember.id) {
        handleOpenProfile(adjustingMember);
      }
    } catch (err) {
      toast.error("Adjustment Error", err instanceof Error ? err.message : "Failed to adjust expiry");
    } finally {
      setSubmitting(false);
    }
  };

  // --- OPEN LOCKER ASSIGN / DEADLINE MODAL ---
  const handleOpenLocker = async (member: Member) => {
    setLockerMember(member);
    await loadAvailableLockers();
    setSelectedLockerId("");
    setLockerDurationDays(30);
    setLockerPriceETB(500);
    setLockerExtendDays(30);
    setLockerExtendFee(500);
    setIsLockerOpen(true);
  };

  const handleAssignLockerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lockerMember || !selectedLockerId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/rentals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: lockerMember.id,
          lockerId: selectedLockerId,
          durationDays: Number(lockerDurationDays),
          priceETB: Number(lockerPriceETB),
          paymentMethod: lockerPaymentMethod,
          paymentRef: lockerPaymentRef,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign locker");

      toast.success(
        "Locker Assigned & Deadline Set",
        `Locker ${data.rental.locker.lockerNumber} assigned to ${lockerMember.fullName}. Deadline: ${new Date(data.rental.endDate).toLocaleDateString()}`
      );

      setIsLockerOpen(false);
      loadMembers();
      if (profileMember && profileMember.id === lockerMember.id) {
        handleOpenProfile(lockerMember);
      }
    } catch (err) {
      toast.error("Locker Assignment Error", err instanceof Error ? err.message : "Failed to assign");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExtendLockerDeadline = async () => {
    const rental = lockerMember?.lockerRentals?.[0];
    if (!rental || !lockerMember) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/rentals/${rental.id}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addDays: Number(lockerExtendDays),
          priceETB: Number(lockerExtendFee),
          paymentMethod: lockerPaymentMethod,
          paymentRef: lockerPaymentRef,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to extend locker deadline");

      toast.success(
        "Locker Deadline Extended",
        `Locker ${rental.locker.lockerNumber} extended to ${new Date(data.rental.endDate).toLocaleDateString()}`
      );

      setIsLockerOpen(false);
      loadMembers();
      if (profileMember && profileMember.id === lockerMember.id) {
        handleOpenProfile(lockerMember);
      }
    } catch (err) {
      toast.error("Extension Error", err instanceof Error ? err.message : "Failed to extend deadline");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVacateLocker = () => {
    const rental = lockerMember?.lockerRentals?.[0];
    if (!rental || !lockerMember) return;

    toast.confirm(
      `Vacate Locker ${rental.locker.lockerNumber}?`,
      `Are you sure you want to release this locker for ${lockerMember.fullName}? The locker will immediately become AVAILABLE for other members.`,
      {
        confirmText: "Vacate & Release Locker",
        cancelText: "Cancel",
        onConfirm: async () => {
          try {
            const res = await fetch(`/api/rentals/${rental.id}/terminate`, {
              method: "POST",
            });
            if (!res.ok) throw new Error("Failed to vacate locker");

            toast.success(
              "Locker Released",
              `Locker ${rental.locker.lockerNumber} is now available in the locker pool.`
            );
            setIsLockerOpen(false);
            loadMembers();
            if (profileMember && profileMember.id === lockerMember.id) {
              handleOpenProfile(lockerMember);
            }
          } catch (err) {
            toast.error("Vacate Error", err instanceof Error ? err.message : "Failed to vacate");
          }
        },
      }
    );
  };

  // --- MEMBER PROFILE DRAWER ---
  const handleOpenProfile = async (member: Member) => {
    setProfileMember(member);
    setProfileTab("info");
    setIsProfileOpen(true);
    setProfileLoading(true);

    try {
      const res = await fetch(`/api/members/${member.id}`);
      if (res.ok) {
        const data = await res.json();
        setProfileMember(data.member);
      }
    } catch {
      // fallback
    } finally {
      setProfileLoading(false);
    }
  };

  // --- CARD PREVIEW & PRINT ---
  const handleOpenCard = async (member: Member) => {
    setSelectedMember(member);
    setShowQrOnCard(!member.photoUrl);
    setIsCardOpen(true);

    const payload = `${member.memberCode}:${member.cardVersion}`;
    try {
      const url = await QRCode.toDataURL(payload, {
        width: 180,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      setQrDataUrl(url);
    } catch {
      // ignore
    }
  };

  const handleReplaceCard = (member: Member) => {
    toast.confirm(
      `Re-issue Lost Card for ${member.fullName}?`,
      `This will increment to Version ${member.cardVersion + 1} and invalidate their previous physical card. Fee: 100 ETB.`,
      {
        confirmText: "Issue Replacement Card",
        cancelText: "Cancel",
        onConfirm: async () => {
          try {
            const res = await fetch(`/api/members/${member.id}/replace-card`, {
              method: "POST",
            });
            if (res.ok) {
              const data = await res.json();
              toast.success(
                "Replacement Card Issued",
                `New Card v${data.member.cardVersion} issued for ${member.fullName}.`
              );
              loadMembers();
              if (selectedMember && selectedMember.id === member.id) {
                handleOpenCard(data.member);
              }
            } else {
              const data = await res.json();
              toast.error("Card Replacement Failed", data.error || "Failed to replace card");
            }
          } catch (err) {
            toast.error("Error", err instanceof Error ? err.message : "Failed to replace card");
          }
        },
      }
    );
  };

  // Soft Delete Toggle
  const handleToggleActive = (member: Member, activate: boolean) => {
    const actionWord = activate ? "Restore & Reactivate" : "Archive & Deactivate";
    const desc = activate
      ? `Reactivate ${member.fullName}'s profile? They will be able to check in and renew subscriptions.`
      : `Archive ${member.fullName}? All attendance history and records will remain completely intact.`;

    toast.confirm(`${actionWord} ${member.fullName}?`, desc, {
      confirmText: activate ? "Reactivate Member" : "Archive Member",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/members/${member.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: activate }),
          });

          if (!res.ok) throw new Error("Failed to update status");

          toast.success(
            activate ? "Member Reactivated" : "Member Archived",
            `${member.fullName} has been ${activate ? "restored to active members" : "safely archived"}.`
          );

          loadMembers();
        } catch (err) {
          toast.error("Status Change Error", err instanceof Error ? err.message : "Failed to change status");
        }
      },
    });
  };

  // Admin Permanent Purge
  const handleAdminPurge = (member: Member) => {
    if (currentUser?.role !== "ADMIN") {
      toast.error("Admin Access Required", "Only System Administrators can permanently purge member data.");
      return;
    }

    toast.confirm(
      `ADMIN PURGE: Permanently Clear All Data for ${member.fullName}?`,
      `WARNING: Destructive Action. This permanently purges member ${member.memberCode}, subscriptions, attendance logs, and locker rentals. This CANNOT be undone.`,
      {
        confirmText: "Yes, Permanently Purge",
        cancelText: "Cancel",
        onConfirm: async () => {
          try {
            const res = await fetch(`/api/members/${member.id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to purge member data");

            toast.success("Member Data Cleared", data.message || `Member data permanently removed.`);
            setIsProfileOpen(false);
            setProfileMember(null);
            loadMembers();
          } catch (err) {
            toast.error("Purge Error", err instanceof Error ? err.message : "Failed to clear data");
          }
        },
      }
    );
  };

  // New Member Registration
  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: newFullName,
          phone: newPhone,
          email: newEmail,
          gender: newGender,
          photoUrl: newPhotoUrl || null,
          dateOfBirth: newDateOfBirth,
          address: newAddress,
          idNumber: newIdNumber,
          fitnessGoal: newFitnessGoal,
          bloodGroup: newBloodGroup,
          medicalHistory: newMedicalHistory,
          emergencyContactName: newEmergencyName,
          emergencyContactPhone: newEmergencyPhone,
          notes: newNotes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create member");
      }

      const data = await res.json();
      toast.success(
        "Member Registered Successfully",
        `${data.member.fullName} registered with code ${data.member.memberCode}.`
      );

      setIsAddOpen(false);
      setNewFullName("");
      setNewPhone("");
      setNewEmail("");
      setNewPhotoUrl("");
      setNewDateOfBirth("");
      setNewAddress("");
      setNewIdNumber("");
      setNewFitnessGoal("");
      setNewBloodGroup("");
      setNewMedicalHistory("");
      setNewEmergencyName("");
      setNewEmergencyPhone("");
      setNewNotes("");
      loadMembers();
    } catch (err) {
      toast.error("Registration Error", err instanceof Error ? err.message : "Error creating member");
    } finally {
      setSubmitting(false);
    }
  };

  // Update Member
  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/members/${editingMember.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: editingMember.fullName,
          phone: editingMember.phone,
          email: editingMember.email,
          gender: editingMember.gender,
          photoUrl: editingMember.photoUrl || null,
          dateOfBirth: editingMember.dateOfBirth,
          address: editingMember.address,
          idNumber: editingMember.idNumber,
          fitnessGoal: editingMember.fitnessGoal,
          bloodGroup: editingMember.bloodGroup,
          medicalHistory: editingMember.medicalHistory,
          emergencyContactName: editingMember.emergencyContactName,
          emergencyContactPhone: editingMember.emergencyContactPhone,
          notes: editingMember.notes,
        }),
      });

      if (!res.ok) throw new Error("Failed to update member");

      toast.success("Profile Updated", `Member profile for ${editingMember.fullName} saved.`);
      setEditingMember(null);
      loadMembers();
    } catch (err) {
      toast.error("Update Error", err instanceof Error ? err.message : "Error updating member");
    } finally {
      setSubmitting(false);
    }
  };

  const isAdmin = currentUser?.role === "ADMIN";

  return (
    <div className="space-y-5">
      {/* Top Header & Fast Register */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Membership Center
            {isAdmin && (
              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-300">
                Admin Purge Enabled
              </Badge>
            )}
          </h1>
          <p className="text-xs text-slate-500">
            One-stop hub for subscription renewals, expiry date tracking, locker assignments & deadlines, and ID cards.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setIsAddOpen(true)}
            className="bg-[#1e3a8a] text-white hover:bg-[#1e40af] h-8 text-xs font-semibold shadow-2xs"
          >
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            Register New Athlete
          </Button>
        </div>
      </div>

      {/* Quick Status Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card
          onClick={() => {
            setExpiryFilter("all");
            setStatusFilter("active");
          }}
          className={`cursor-pointer transition-all hover:border-blue-300 ${
            expiryFilter === "all" ? "ring-2 ring-[#1e3a8a]" : ""
          }`}
        >
          <CardContent className="p-3">
            <div className="text-[11px] font-medium text-slate-500">Total Members</div>
            <div className="text-xl font-bold text-slate-900 mt-1">{totalMembers}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Active directory</div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setExpiryFilter("active")}
          className={`cursor-pointer transition-all hover:border-emerald-300 ${
            expiryFilter === "active" ? "ring-2 ring-emerald-600" : ""
          }`}
        >
          <CardContent className="p-3">
            <div className="text-[11px] font-medium text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Active Plans
            </div>
            <div className="text-xl font-bold text-emerald-700 mt-1">{activeSubMembers.length}</div>
            <div className="text-[10px] text-emerald-600/80 mt-0.5">Valid memberships</div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setExpiryFilter("expiring_soon")}
          className={`cursor-pointer transition-all hover:border-amber-300 ${
            expiryFilter === "expiring_soon" ? "ring-2 ring-amber-500" : ""
          }`}
        >
          <CardContent className="p-3">
            <div className="text-[11px] font-medium text-amber-700 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Expiring Soon
            </div>
            <div className="text-xl font-bold text-amber-700 mt-1">{expiringSoonMembers.length}</div>
            <div className="text-[10px] text-amber-600 mt-0.5">Next 7 days (Call/Renew)</div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setExpiryFilter("expired")}
          className={`cursor-pointer transition-all hover:border-rose-300 ${
            expiryFilter === "expired" ? "ring-2 ring-rose-500" : ""
          }`}
        >
          <CardContent className="p-3">
            <div className="text-[11px] font-medium text-rose-700 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Expired / Overdue
            </div>
            <div className="text-xl font-bold text-rose-700 mt-1">{expiredMembers.length}</div>
            <div className="text-[10px] text-rose-600 mt-0.5">Action required</div>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-1 bg-blue-50/40 border-blue-200">
          <CardContent className="p-3">
            <div className="text-[11px] font-medium text-blue-800 flex items-center gap-1">
              <KeyRound className="h-3 w-3" />
              Rented Lockers
            </div>
            <div className="text-xl font-bold text-blue-900 mt-1">{activeLockerMembers.length}</div>
            <div className="text-[10px] text-blue-700/80 mt-0.5">{availableLockers.length} free to assign</div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Toolbar */}
      <Card>
        <CardContent className="p-3 space-y-3">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search by name, member code (BF-XXXX), phone, or locker number (e.g. M-04)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8 text-xs bg-slate-50 border-slate-200 w-full"
              />
            </div>

            {/* Expiry Filter Pills */}
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg shrink-0 overflow-x-auto w-full md:w-auto">
              {(
                [
                  { key: "all", label: "All Expiries" },
                  { key: "active", label: "Active" },
                  { key: "expiring_soon", label: `Expiring Soon (${expiringSoonMembers.length})` },
                  { key: "expired", label: `Expired (${expiredMembers.length})` },
                  { key: "no_plan", label: "No Plan" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setExpiryFilter(tab.key)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    expiryFilter === tab.key
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Status Filter (Active / Archived) */}
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg shrink-0">
              {(
                [
                  { key: "active", label: "Active" },
                  { key: "inactive", label: "Archived" },
                  { key: "all", label: "All" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                    statusFilter === tab.key
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Members Roster Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member Code</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Phone / Contact</TableHead>
                <TableHead>Subscription & Expiry</TableHead>
                <TableHead>Locker & Deadline</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Quick Management</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-xs text-slate-400">
                    {loading ? "Loading membership records..." : "No members found matching your search and filter criteria."}
                  </TableCell>
                </TableRow>
              ) : (
                members.map((m) => {
                  const subStatus = getSubStatus(m);
                  const lockerStatus = getLockerStatus(m);
                  const sub = m.subscriptions[0];

                  return (
                    <TableRow
                      key={m.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !m.isActive ? "bg-slate-50/50 opacity-70" : ""
                      }`}
                    >
                      {/* Member Code & Card Version */}
                      <TableCell>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {m.memberCode}
                          </span>
                          <span className="rounded border border-slate-200 bg-slate-100 px-1 py-0.2 text-[9px] font-mono text-slate-600">
                            v{m.cardVersion}
                          </span>
                        </div>
                      </TableCell>

                      {/* Full Name & Quick Click */}
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => handleOpenProfile(m)}
                          className="text-left group cursor-pointer flex items-center gap-2.5"
                        >
                          <div className="h-8 w-8 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0 shadow-2xs">
                            {m.photoUrl ? (
                              <img
                                src={m.photoUrl}
                                alt={m.fullName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] font-bold text-slate-600">
                                {m.fullName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join("")}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 group-hover:text-[#1e3a8a] transition-colors flex items-center gap-1">
                              {m.fullName}
                              <Eye className="h-3 w-3 text-slate-400 group-hover:text-[#1e3a8a] opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-[10px] text-slate-400 capitalize">
                              {m.gender.toLowerCase()}{" "}
                              {m.dateOfBirth ? `• ${m.dateOfBirth}` : ""}
                            </div>
                          </div>
                        </button>
                      </TableCell>

                      {/* Contact */}
                      <TableCell>
                        <div className="text-xs text-slate-700 font-mono flex items-center gap-1">
                          <Phone className="h-2.5 w-2.5 text-slate-400" />
                          {m.phone}
                        </div>
                        {m.idNumber && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            ID: {m.idNumber}
                          </div>
                        )}
                      </TableCell>

                      {/* Subscription Expiry & Quick Adjust */}
                      <TableCell>
                        {sub ? (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1.5">
                              <Badge variant={subStatus.variant} className="text-[10px] py-0 px-1.5 font-semibold">
                                {subStatus.label}
                              </Badge>
                              <span className="text-[11px] font-medium text-slate-800">
                                {sub.plan.name}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                              <span>Exp: {new Date(sub.endDate).toLocaleDateString()}</span>
                              <button
                                type="button"
                                onClick={() => handleOpenAdjustExpiry(m)}
                                title="Adjust or extend expiry date"
                                className="text-blue-700 hover:text-blue-900 underline font-sans ml-1.5"
                              >
                                Adjust
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs text-slate-400">No active plan</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenRenew(m)}
                              className="h-6 text-[10px] px-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                            >
                              + Subscribe
                            </Button>
                          </div>
                        )}
                      </TableCell>

                      {/* Locker & Deadline */}
                      <TableCell>
                        {lockerStatus.hasLocker && lockerStatus.rental ? (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono font-bold text-xs text-blue-900 bg-blue-100/70 border border-blue-200 px-1.5 py-0.5 rounded">
                                {lockerStatus.lockerNumber} ({lockerStatus.section})
                              </span>
                              <Badge variant={lockerStatus.variant} className="text-[9px] py-0 px-1 font-semibold">
                                {lockerStatus.label}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                              <span>Due: {new Date(lockerStatus.rental.endDate).toLocaleDateString()}</span>
                              <button
                                type="button"
                                onClick={() => handleOpenLocker(m)}
                                className="text-blue-700 hover:text-blue-900 underline font-sans ml-1.5"
                              >
                                Manage
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenLocker(m)}
                            className="inline-flex items-center text-[11px] text-slate-500 hover:text-blue-800 bg-slate-50 hover:bg-blue-50 border border-slate-200 px-2 py-1 rounded transition-colors"
                          >
                            <KeyRound className="h-3 w-3 mr-1 text-slate-400" />
                            Assign Locker
                          </button>
                        )}
                      </TableCell>

                      {/* Active/Archived Status */}
                      <TableCell>
                        {m.isActive ? (
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600 border-slate-300">
                            Archived
                          </Badge>
                        )}
                      </TableCell>

                      {/* Actions Toolbar */}
                      <TableCell className="text-right space-x-1">
                        {/* 1-Click Renew Subscription */}
                        <Button
                          size="sm"
                          onClick={() => handleOpenRenew(m)}
                          title="Renew membership subscription"
                          className="h-7 text-xs px-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Renew
                        </Button>

                        {/* Locker Manage */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenLocker(m)}
                          title="Assign or manage locker deadline"
                          className="h-7 text-xs px-2 border-slate-200 text-slate-700 hover:bg-slate-50"
                        >
                          <KeyRound className="h-3 w-3 mr-1 text-slate-500" />
                          Locker
                        </Button>

                        {/* Physical Card */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenCard(m)}
                          title="View / Print physical monthly card"
                          className="h-7 w-7 p-0 border-slate-200 text-slate-700 hover:bg-slate-50"
                        >
                          <CreditCard className="h-3 w-3 text-slate-600" />
                        </Button>

                        {/* Profile Drawer */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenProfile(m)}
                          title="Full athlete profile"
                          className="h-7 w-7 p-0 border-slate-200 text-slate-700 hover:bg-slate-50"
                        >
                          <Eye className="h-3 w-3 text-slate-600" />
                        </Button>

                        {/* Edit */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingMember(m)}
                          title="Edit athlete information"
                          className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>

                        {/* Archive / Restore */}
                        {m.isActive ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(m, false)}
                            title="Archive member (Preserves history)"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-amber-700"
                          >
                            <Archive className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(m, true)}
                            title="Restore member"
                            className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-800"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}

                        {/* Admin Purge */}
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAdminPurge(m)}
                            title="Admin: Permanently purge all member data"
                            className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3 w-3" />
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

      {/* MODAL 1: RENEW SUBSCRIPTION */}
      <Dialog open={isRenewOpen} onOpenChange={setIsRenewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <RefreshCw className="h-4 w-4 text-emerald-600" />
              Renew Subscription
            </DialogTitle>
            <DialogDescription>
              Activate or extend gym membership for{" "}
              <strong className="text-slate-900">{renewingMember?.fullName}</strong> ({renewingMember?.memberCode}).
            </DialogDescription>
          </DialogHeader>

          {renewingMember && (
            <form onSubmit={handleRenewSubmit} className="space-y-3 text-xs">
              {/* Current Status Banner */}
              <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
                <div className="text-[11px] text-slate-500">Current Plan Status:</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {renewingMember.subscriptions[0] ? (
                    <span>
                      {renewingMember.subscriptions[0].plan.name} •{" "}
                      {new Date(renewingMember.subscriptions[0].endDate) >= now
                        ? `Active until ${new Date(renewingMember.subscriptions[0].endDate).toLocaleDateString()}`
                        : `Expired on ${new Date(renewingMember.subscriptions[0].endDate).toLocaleDateString()}`}
                    </span>
                  ) : (
                    <span className="text-slate-500 italic">No previous subscription</span>
                  )}
                </div>
              </div>

              {/* Plan Selection */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">Select Membership Plan *</label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => handlePlanChange(e.target.value)}
                  className="w-full h-8 rounded border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-800"
                  required
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {Number(p.priceETB).toLocaleString()} ETB ({p.durationDays} Days)
                    </option>
                  ))}
                </select>
              </div>

              {/* Dates Calculation */}
              <div className="grid grid-cols-2 gap-2 bg-blue-50/50 p-2.5 rounded border border-blue-100">
                <div>
                  <label className="block font-medium text-blue-900 mb-1">Start Date</label>
                  <Input
                    type="date"
                    value={renewStartDate}
                    onChange={(e) => {
                      setRenewStartDate(e.target.value);
                      const plan = plans.find((p) => p.id === selectedPlanId);
                      if (plan && e.target.value) {
                        const s = new Date(e.target.value);
                        const ed = new Date(s.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
                        setRenewEndDate(ed.toISOString().split("T")[0]);
                      }
                    }}
                    className="h-8 text-xs bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-blue-900 mb-1">New Expiry Date</label>
                  <Input
                    type="date"
                    value={renewEndDate}
                    onChange={(e) => setRenewEndDate(e.target.value)}
                    className="h-8 text-xs bg-white font-bold text-emerald-800"
                    required
                  />
                </div>
                {renewEndDate && (
                  <div className="col-span-2 text-[10px] text-blue-800">
                    Dual Date: {formatDualDate(renewEndDate)}
                  </div>
                )}
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Payment Method *</label>
                  <select
                    value={renewPaymentMethod}
                    onChange={(e) => setRenewPaymentMethod(e.target.value as any)}
                    className="w-full h-8 rounded border border-slate-200 bg-slate-50 px-2 text-xs font-semibold"
                  >
                    <option value="CASH">Cash</option>
                    <option value="TELEBIRR">Telebirr</option>
                    <option value="CBE_TRANSFER">CBE Transfer</option>
                    <option value="OTHER">Other Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Amount Paid (ETB) *</label>
                  <Input
                    type="number"
                    value={renewAmount}
                    onChange={(e) => setRenewAmount(e.target.value)}
                    className="h-8 text-xs bg-slate-50 font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Payment Reference (Telebirr SMS / CBE Slip #)
                </label>
                <Input
                  value={renewPaymentRef}
                  onChange={(e) => setRenewPaymentRef(e.target.value)}
                  placeholder="e.g. TXN-89472918"
                  className="h-8 text-xs bg-slate-50 font-mono"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsRenewOpen(false)} className="h-8 text-xs">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-8 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
                >
                  {submitting ? "Processing..." : "Confirm & Activate Renewal"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 2: ADJUST / EXTEND EXPIRY DATE */}
      <Dialog open={isAdjustExpiryOpen} onOpenChange={setIsAdjustExpiryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-blue-600" />
              Adjust Expiry Date
            </DialogTitle>
            <DialogDescription>
              Quickly extend or modify subscription deadline for{" "}
              <strong>{adjustingMember?.fullName}</strong> ({adjustingMember?.memberCode}).
            </DialogDescription>
          </DialogHeader>

          {adjustingMember && adjustingMember.subscriptions[0] && (
            <form onSubmit={handleAdjustExpirySubmit} className="space-y-3 text-xs">
              <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
                <span className="text-slate-500">Current Expiry: </span>
                <span className="font-bold text-slate-900">
                  {new Date(adjustingMember.subscriptions[0].endDate).toLocaleDateString()} (
                  {formatDualDate(adjustingMember.subscriptions[0].endDate)})
                </span>
              </div>

              {/* Quick Add Days Pills */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Quick Extend (Holiday / Freeze / Bonus)
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[3, 7, 14, 30].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setAdjustAddDays(days)}
                      className={`py-1.5 px-2 rounded border text-xs font-semibold transition-colors ${
                        adjustAddDays === days
                          ? "bg-blue-700 text-white border-blue-700 shadow-2xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      +{days} Days
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Date Input if not using quick add */}
              {!adjustAddDays && (
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Or Set Exact Date</label>
                  <Input
                    type="date"
                    value={adjustCustomEndDate}
                    onChange={(e) => setAdjustCustomEndDate(e.target.value)}
                    className="h-8 text-xs bg-slate-50"
                  />
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 mb-1">Adjustment Reason</label>
                <Input
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Gym holiday compensation, medical freeze, promo"
                  className="h-8 text-xs bg-slate-50"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAdjustExpiryOpen(false)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-8 text-xs bg-[#1e3a8a] text-white hover:bg-[#1e40af]"
                >
                  {submitting ? "Saving..." : "Save New Expiry Date"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 3: ASSIGN & MANAGE LOCKER DEADLINE */}
      <Dialog open={isLockerOpen} onOpenChange={setIsLockerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-blue-600" />
              Locker Rental & Deadline
            </DialogTitle>
            <DialogDescription>
              Assign a dedicated monthly locker or manage deadline for{" "}
              <strong>{lockerMember?.fullName}</strong>.
            </DialogDescription>
          </DialogHeader>

          {lockerMember && (
            <div className="space-y-4 text-xs">
              {/* Scenario A: Already has an assigned locker */}
              {lockerMember.lockerRentals && lockerMember.lockerRentals.length > 0 && lockerMember.lockerRentals[0].isActive ? (
                <div className="space-y-3">
                  <div className="rounded-lg bg-blue-50/70 border border-blue-200 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-blue-950 font-mono">
                        Locker #{lockerMember.lockerRentals[0].locker.lockerNumber} (
                        {lockerMember.lockerRentals[0].locker.section})
                      </span>
                      <Badge variant="info" className="text-[10px]">
                        Active Rental
                      </Badge>
                    </div>
                    <div className="mt-2 text-slate-700 space-y-1">
                      <div>
                        Rented: {new Date(lockerMember.lockerRentals[0].startDate).toLocaleDateString()}
                      </div>
                      <div className="font-semibold text-blue-900">
                        Current Deadline: {new Date(lockerMember.lockerRentals[0].endDate).toLocaleDateString()} (
                        {formatDualDate(lockerMember.lockerRentals[0].endDate)})
                      </div>
                    </div>
                  </div>

                  {/* Extend Deadline Box */}
                  <div className="space-y-2 border border-slate-200 p-3 rounded-lg bg-slate-50/50">
                    <div className="font-semibold text-slate-800 flex items-center gap-1">
                      <RefreshCw className="h-3.5 w-3.5 text-blue-700" />
                      Extend Locker Rental Deadline
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-600 mb-1">Extend By</label>
                        <select
                          value={lockerExtendDays}
                          onChange={(e) => {
                            const d = Number(e.target.value);
                            setLockerExtendDays(d);
                            setLockerExtendFee(d === 30 ? 500 : d === 60 ? 950 : 1400);
                          }}
                          className="w-full h-8 rounded border border-slate-200 bg-white px-2 text-xs"
                        >
                          <option value={30}>+30 Days (1 Month)</option>
                          <option value={60}>+60 Days (2 Months)</option>
                          <option value={90}>+90 Days (3 Months)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Fee (ETB)</label>
                        <Input
                          type="number"
                          value={lockerExtendFee}
                          onChange={(e) => setLockerExtendFee(Number(e.target.value))}
                          className="h-8 text-xs bg-white font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-600 mb-1">Payment Method</label>
                        <select
                          value={lockerPaymentMethod}
                          onChange={(e) => setLockerPaymentMethod(e.target.value as any)}
                          className="w-full h-8 rounded border border-slate-200 bg-white px-2 text-xs font-semibold"
                        >
                          <option value="CASH">Cash</option>
                          <option value="TELEBIRR">Telebirr</option>
                          <option value="CBE_TRANSFER">CBE Transfer</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Payment Reference</label>
                        <Input
                          value={lockerPaymentRef}
                          onChange={(e) => setLockerPaymentRef(e.target.value)}
                          placeholder="Optional ref"
                          className="h-8 text-xs bg-white font-mono"
                        />
                      </div>
                    </div>

                    <Button
                      type="button"
                      disabled={submitting}
                      onClick={handleExtendLockerDeadline}
                      className="w-full h-8 text-xs bg-[#1e3a8a] text-white hover:bg-[#1e40af] mt-1 font-semibold"
                    >
                      {submitting ? "Updating..." : "Confirm Deadline Extension"}
                    </Button>
                  </div>

                  {/* Vacate Locker Option */}
                  <div className="pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleVacateLocker}
                      className="w-full h-8 text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
                    >
                      <Unlock className="h-3.5 w-3.5 mr-1" />
                      Vacate & Release Locker Back to Available Pool
                    </Button>
                  </div>
                </div>
              ) : (
                /* Scenario B: Member does NOT have a locker - Assign one */
                <form onSubmit={handleAssignLockerSubmit} className="space-y-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Select Available Locker *</label>
                    <select
                      value={selectedLockerId}
                      onChange={(e) => setSelectedLockerId(e.target.value)}
                      className="w-full h-8 rounded border border-slate-200 bg-slate-50 px-2 text-xs font-semibold"
                      required
                    >
                      <option value="">-- Choose available locker --</option>
                      {availableLockers.map((l) => (
                        <option key={l.id} value={l.id}>
                          Locker #{l.lockerNumber} ({l.section})
                        </option>
                      ))}
                    </select>
                    {availableLockers.length === 0 && (
                      <span className="text-[11px] text-amber-700 block mt-1">
                        All lockers are currently rented or occupied.
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Duration *</label>
                      <select
                        value={lockerDurationDays}
                        onChange={(e) => {
                          const d = Number(e.target.value);
                          setLockerDurationDays(d);
                          setLockerPriceETB(d === 30 ? 500 : d === 60 ? 950 : 1400);
                        }}
                        className="w-full h-8 rounded border border-slate-200 bg-slate-50 px-2 text-xs"
                      >
                        <option value={30}>30 Days (1 Month)</option>
                        <option value={60}>60 Days (2 Months)</option>
                        <option value={90}>90 Days (3 Months)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Rental Price (ETB) *</label>
                      <Input
                        type="number"
                        value={lockerPriceETB}
                        onChange={(e) => setLockerPriceETB(Number(e.target.value))}
                        className="h-8 text-xs bg-slate-50 font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Payment Method</label>
                      <select
                        value={lockerPaymentMethod}
                        onChange={(e) => setLockerPaymentMethod(e.target.value as any)}
                        className="w-full h-8 rounded border border-slate-200 bg-slate-50 px-2 text-xs font-semibold"
                      >
                        <option value="CASH">Cash</option>
                        <option value="TELEBIRR">Telebirr</option>
                        <option value="CBE_TRANSFER">CBE Transfer</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Payment Reference</label>
                      <Input
                        value={lockerPaymentRef}
                        onChange={(e) => setLockerPaymentRef(e.target.value)}
                        placeholder="Optional slip / SMS"
                        className="h-8 text-xs bg-slate-50 font-mono"
                      />
                    </div>
                  </div>

                  <DialogFooter className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsLockerOpen(false)}
                      className="h-8 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting || availableLockers.length === 0}
                      className="h-8 text-xs bg-[#1e3a8a] text-white hover:bg-[#1e40af] font-semibold"
                    >
                      {submitting ? "Assigning..." : "Assign Locker & Set Deadline"}
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 4: COMPREHENSIVE ATHLETE PROFILE */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {profileMember && (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-slate-200 bg-slate-100 flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                    {profileMember.photoUrl ? (
                      <img
                        src={profileMember.photoUrl}
                        alt={profileMember.fullName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-base">
                        {profileMember.fullName
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-base font-bold text-slate-900">{profileMember.fullName}</h2>
                      <Badge variant="outline" className="font-mono text-xs font-semibold">
                        {profileMember.memberCode}
                      </Badge>
                      <Badge variant={profileMember.isActive ? "success" : "secondary"} className="text-[10px]">
                        {profileMember.isActive ? "Active" : "Archived"}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Card v{profileMember.cardVersion} • Athlete since{" "}
                      {new Date(profileMember.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <Button
                    size="sm"
                    onClick={() => {
                      setIsProfileOpen(false);
                      handleOpenRenew(profileMember);
                    }}
                    className="h-8 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    Renew
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsProfileOpen(false);
                      handleOpenLocker(profileMember);
                    }}
                    className="h-8 text-xs font-semibold border-slate-300"
                  >
                    <KeyRound className="h-3.5 w-3.5 mr-1" />
                    Locker
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsProfileOpen(false);
                      handleOpenCard(profileMember);
                    }}
                    className="h-8 text-xs font-semibold border-slate-300"
                  >
                    <CreditCard className="h-3.5 w-3.5 mr-1" />
                    Card
                  </Button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setProfileTab("info")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    profileTab === "info" ? "bg-[#1e3a8a] text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Personal & Health Profile
                </button>
                <button
                  type="button"
                  onClick={() => setProfileTab("subscriptions")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    profileTab === "subscriptions" ? "bg-[#1e3a8a] text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Subscriptions ({profileMember.subscriptions?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setProfileTab("lockers")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    profileTab === "lockers" ? "bg-[#1e3a8a] text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Lockers ({profileMember.lockerRentals?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setProfileTab("attendance")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    profileTab === "attendance" ? "bg-[#1e3a8a] text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Attendance History ({profileMember.checkinSessions?.length || 0})
                </button>
              </div>

              {/* Tab 1: Info */}
              {profileTab === "info" && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Phone Number</span>
                      <span className="font-mono font-medium text-slate-800">{profileMember.phone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Email Address</span>
                      <span className="text-slate-800">{profileMember.email || "— Not provided —"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Gender</span>
                      <span className="capitalize text-slate-800">{profileMember.gender.toLowerCase()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Date of Birth</span>
                      <span className="text-slate-800">{profileMember.dateOfBirth || "— Not provided —"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Kebele / National ID</span>
                      <span className="font-mono text-slate-800">{profileMember.idNumber || "— Not provided —"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Residential Address</span>
                      <span className="text-slate-800">{profileMember.address || "— Not provided —"}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                    <div>
                      <span className="text-blue-900 font-semibold flex items-center gap-1 mb-1">
                        <Target className="h-3.5 w-3.5 text-blue-700" />
                        Fitness Goal
                      </span>
                      <span className="text-slate-800">{profileMember.fitnessGoal || "General conditioning"}</span>
                    </div>
                    <div>
                      <span className="text-blue-900 font-semibold flex items-center gap-1 mb-1">
                        <HeartPulse className="h-3.5 w-3.5 text-rose-600" />
                        Blood Group
                      </span>
                      <span className="font-mono font-bold text-rose-700">{profileMember.bloodGroup || "Not specified"}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-blue-900 font-semibold flex items-center gap-1 mb-1">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                        Medical History & Health Considerations
                      </span>
                      <p className="text-slate-700 bg-white p-2 rounded border border-blue-100">
                        {profileMember.medicalHistory || "None reported by athlete."}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Emergency Contact Person</span>
                      <span className="font-medium text-slate-800">{profileMember.emergencyContactName || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Emergency Phone</span>
                      <span className="font-mono font-medium text-slate-800">{profileMember.emergencyContactPhone || "—"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Subscriptions */}
              {profileTab === "subscriptions" && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-800">Historical & Active Subscriptions</span>
                    <Button
                      size="sm"
                      onClick={() => {
                        setIsProfileOpen(false);
                        handleOpenRenew(profileMember);
                      }}
                      className="h-7 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Renew Subscription
                    </Button>
                  </div>

                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="text-xs">Plan</TableHead>
                          <TableHead className="text-xs">Start Date</TableHead>
                          <TableHead className="text-xs">End Date</TableHead>
                          <TableHead className="text-xs">Amount</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {profileMember.subscriptions.map((s, idx) => (
                          <TableRow key={s.id || idx}>
                            <TableCell className="font-semibold text-xs text-slate-900">{s.plan.name}</TableCell>
                            <TableCell className="text-xs font-mono text-slate-600">
                              {s.startDate ? new Date(s.startDate).toLocaleDateString() : "—"}
                            </TableCell>
                            <TableCell className="text-xs font-mono text-slate-600">
                              {new Date(s.endDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-xs font-mono font-bold text-slate-800">
                              {s.amountPaidETB ? `${Number(s.amountPaidETB).toLocaleString()} ETB` : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={s.status === "ACTIVE" ? "success" : "secondary"} className="text-[10px]">
                                {s.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setIsProfileOpen(false);
                                  handleOpenAdjustExpiry(profileMember);
                                }}
                                className="h-6 text-[10px] px-2 text-blue-700"
                              >
                                Adjust Expiry
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Tab 3: Lockers */}
              {profileTab === "lockers" && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-800">Locker Rental History & Deadlines</span>
                    <Button
                      size="sm"
                      onClick={() => {
                        setIsProfileOpen(false);
                        handleOpenLocker(profileMember);
                      }}
                      className="h-7 text-xs bg-[#1e3a8a] text-white hover:bg-[#1e40af] font-semibold"
                    >
                      <KeyRound className="h-3 w-3 mr-1" />
                      Manage Locker
                    </Button>
                  </div>

                  {!profileMember.lockerRentals || profileMember.lockerRentals.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">No lockers rented by this athlete.</div>
                  ) : (
                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="text-xs">Locker</TableHead>
                            <TableHead className="text-xs">Section</TableHead>
                            <TableHead className="text-xs">Start Date</TableHead>
                            <TableHead className="text-xs">Deadline</TableHead>
                            <TableHead className="text-xs">Price</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {profileMember.lockerRentals.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell className="font-mono font-bold text-xs text-blue-900">
                                #{r.locker.lockerNumber}
                              </TableCell>
                              <TableCell className="text-xs capitalize">{r.locker.section.toLowerCase()}</TableCell>
                              <TableCell className="text-xs font-mono">{new Date(r.startDate).toLocaleDateString()}</TableCell>
                              <TableCell className="text-xs font-mono font-semibold text-slate-800">
                                {new Date(r.endDate).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-xs font-mono">{Number(r.priceETB).toLocaleString()} ETB</TableCell>
                              <TableCell>
                                <Badge variant={r.isActive ? "info" : "outline"} className="text-[10px]">
                                  {r.isActive ? "Active Rental" : "Terminated"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Attendance */}
              {profileTab === "attendance" && (
                <div className="space-y-3">
                  {!profileMember.checkinSessions || profileMember.checkinSessions.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">No check-in visits logged yet.</div>
                  ) : (
                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="text-xs">Check-in Time</TableHead>
                            <TableHead className="text-xs">Check-out Time</TableHead>
                            <TableHead className="text-xs">Locker Assigned</TableHead>
                            <TableHead className="text-xs">Receptionist</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {profileMember.checkinSessions.map((session) => (
                            <TableRow key={session.id}>
                              <TableCell className="text-xs font-mono text-slate-800">
                                {new Date(session.checkinTime).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-xs font-mono text-slate-600">
                                {session.checkoutTime
                                  ? new Date(session.checkoutTime).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "Still inside gym"}
                              </TableCell>
                              <TableCell className="text-xs font-mono">
                                {session.locker ? (
                                  <span className="font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                                    {session.locker.lockerNumber}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-slate-500">
                                {session.receptionist?.fullName || "Staff"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}

              <DialogFooter className="sm:justify-between border-t border-slate-100 pt-3">
                <div className="flex items-center space-x-2">
                  {profileMember.isActive ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(profileMember, false)}
                      className="text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
                    >
                      <Archive className="h-3.5 w-3.5 mr-1" />
                      Archive / Deactivate
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(profileMember, true)}
                      className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      Reactivate Member
                    </Button>
                  )}

                  {isAdmin && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleAdminPurge(profileMember)}
                      className="text-xs bg-rose-600 hover:bg-rose-700 font-semibold"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Admin: Clear All Member Data
                    </Button>
                  )}
                </div>

                <Button type="button" variant="outline" size="sm" onClick={() => setIsProfileOpen(false)} className="text-xs">
                  Close Profile
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 5: PRINTABLE PHYSICAL CARD */}
      <Dialog open={isCardOpen} onOpenChange={setIsCardOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Blow Fitness Monthly Membership Card</span>
              <span className="text-xs font-mono font-normal text-slate-500">
                CR80 Standard (85.6mm × 53.98mm)
              </span>
            </DialogTitle>
            <DialogDescription>
              Authentic gym card: Front displays Amharic & Ethiopian dates; Back displays 4 gym regulations.
            </DialogDescription>
          </DialogHeader>

          {selectedMember && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
                  {(
                    [
                      { key: "both", label: "Duplex (Both Sides)" },
                      { key: "front", label: "Front (Yellow)" },
                      { key: "back", label: "Back (Red Rules)" },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setCardSide(t.key)}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                        cardSide === t.key ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-600 font-medium">Photo Box:</span>
                  <button
                    type="button"
                    onClick={() => setShowQrOnCard(!showQrOnCard)}
                    className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
                      showQrOnCard ? "bg-blue-50 border-blue-200 text-blue-800" : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    {showQrOnCard ? "✓ Front-Desk Scan QR" : "Photo / Stamp"}
                  </button>
                </div>
              </div>

              <div className="printable-card-area flex justify-center py-3 bg-slate-100/70 rounded-xl border border-dashed border-slate-300 overflow-x-auto">
                <PhysicalMemberCard
                  member={selectedMember}
                  qrDataUrl={qrDataUrl}
                  showQrInPhotoBox={showQrOnCard}
                  side={cardSide}
                />
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => selectedMember && handleReplaceCard(selectedMember)}
              className="text-xs text-amber-800 border-amber-300 hover:bg-amber-50"
            >
              <RefreshCw className="h-3 w-3 mr-1.5" />
              Re-issue Lost Card (100 ETB)
            </Button>

            <div className="flex space-x-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCardOpen(false)} className="text-xs">
                Close
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => window.print()}
                className="text-xs bg-[#1e3a8a] text-white hover:bg-[#1e40af] font-semibold"
              >
                <Printer className="h-3.5 w-3.5 mr-1.5" />
                Print Physical Card
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 6: REGISTER NEW MEMBER */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register New Gym Athlete</DialogTitle>
            <DialogDescription>
              Complete athlete personal information, health considerations, and contacts.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateMember} className="space-y-4 text-xs">
            {/* Section 1: Basic Information */}
            <div className="space-y-2">
              <div className="font-semibold text-slate-800 border-b border-slate-100 pb-1 flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-[#1e3a8a]" />
                1. Basic Personal Information
              </div>

              {/* Optional Profile Photo */}
              <div className="flex items-center gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200">
                <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-slate-300 bg-white flex items-center justify-center shrink-0 shadow-2xs">
                  {newPhotoUrl ? (
                    <img
                      src={newPhotoUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-7 w-7 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-800 text-xs">
                      Member Profile Photo
                    </span>
                    <span className="rounded-full bg-slate-200/80 px-1.5 py-0.2 text-[10px] font-medium text-slate-600">
                      Optional
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    Printed on PVC membership card and shown during check-in.
                  </p>
                  <div className="flex items-center gap-2 pt-0.5">
                    <input
                      type="file"
                      id="new-member-photo-input"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadPhoto(file, false);
                      }}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        document.getElementById("new-member-photo-input")?.click()
                      }
                      disabled={uploadingMemberPhoto}
                      className="h-7 text-xs bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    >
                      <Camera className="h-3 w-3 mr-1 text-slate-500" />
                      {uploadingMemberPhoto
                        ? "Uploading..."
                        : newPhotoUrl
                        ? "Change Photo"
                        : "Upload Photo"}
                    </Button>
                    {newPhotoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setNewPhotoUrl("")}
                        className="h-7 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 px-2"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Full Name *</label>
                <Input
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g. Bethlehem Tadesse"
                  className="h-8 text-xs bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Phone Number *</label>
                  <Input
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+251 9..."
                    className="h-8 text-xs bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Gender *</label>
                  <select
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value as "MALE" | "FEMALE")}
                    className="w-full h-8 rounded border border-slate-200 bg-slate-50 px-2 text-xs"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Email Address</label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="athlete@example.com"
                    className="h-8 text-xs bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Date of Birth</label>
                  <Input
                    type="text"
                    value={newDateOfBirth}
                    onChange={(e) => setNewDateOfBirth(e.target.value)}
                    placeholder="YYYY-MM-DD or 1996"
                    className="h-8 text-xs bg-slate-50"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: ID & Location */}
            <div className="space-y-2">
              <div className="font-semibold text-slate-800 border-b border-slate-100 pb-1 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-[#1e3a8a]" />
                2. Identification & Address
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Kebele / National ID</label>
                  <Input
                    value={newIdNumber}
                    onChange={(e) => setNewIdNumber(e.target.value)}
                    placeholder="e.g. 14/12849"
                    className="h-8 text-xs bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Residential Address</label>
                  <Input
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="Subcity, Woreda, Addis Ababa"
                    className="h-8 text-xs bg-slate-50"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Health & Fitness Goals */}
            <div className="space-y-2">
              <div className="font-semibold text-slate-800 border-b border-slate-100 pb-1 flex items-center gap-1.5">
                <HeartPulse className="h-3.5 w-3.5 text-rose-600" />
                3. Health & Fitness Profile
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Primary Fitness Goal</label>
                  <select
                    value={newFitnessGoal}
                    onChange={(e) => setNewFitnessGoal(e.target.value)}
                    className="w-full h-8 rounded border border-slate-200 bg-slate-50 px-2 text-xs"
                  >
                    <option value="">-- Select fitness goal --</option>
                    {FITNESS_GOALS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Blood Group</label>
                  <select
                    value={newBloodGroup}
                    onChange={(e) => setNewBloodGroup(e.target.value)}
                    className="w-full h-8 rounded border border-slate-200 bg-slate-50 px-2 text-xs font-mono"
                  >
                    <option value="">-- Unknown / Not tested --</option>
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Medical History & Considerations</label>
                <Input
                  value={newMedicalHistory}
                  onChange={(e) => setNewMedicalHistory(e.target.value)}
                  placeholder="e.g. Asthma, hypertension, joint injury, or None"
                  className="h-8 text-xs bg-slate-50"
                />
              </div>
            </div>

            {/* Section 4: Emergency Contacts & Notes */}
            <div className="space-y-2">
              <div className="font-semibold text-slate-800 border-b border-slate-100 pb-1 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-amber-600" />
                4. Emergency Contact & Staff Notes
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Emergency Contact Person</label>
                  <Input
                    value={newEmergencyName}
                    onChange={(e) => setNewEmergencyName(e.target.value)}
                    placeholder="Full Name"
                    className="h-8 text-xs bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Emergency Phone</label>
                  <Input
                    value={newEmergencyPhone}
                    onChange={(e) => setNewEmergencyPhone(e.target.value)}
                    placeholder="+251 9..."
                    className="h-8 text-xs bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Staff Notes (Optional)</label>
                <Input
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Special instructions or preferences..."
                  className="h-8 text-xs bg-slate-50"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="h-8 text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="h-8 text-xs bg-[#1e3a8a] text-white hover:bg-[#1e40af]">
                {submitting ? "Saving..." : "Save & Register Athlete"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 7: EDIT MEMBER */}
      <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Member Profile</DialogTitle>
            <DialogDescription>
              Update member profile details for {editingMember?.memberCode}.
            </DialogDescription>
          </DialogHeader>

          {editingMember && (
            <form onSubmit={handleUpdateMember} className="space-y-4 text-xs">
              {/* Member Profile Photo */}
              <div className="flex items-center gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200">
                <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-slate-300 bg-white flex items-center justify-center shrink-0 shadow-2xs">
                  {editingMember.photoUrl ? (
                    <img
                      src={editingMember.photoUrl}
                      alt={editingMember.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-7 w-7 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-800 text-xs">
                      Member Profile Photo
                    </span>
                    <span className="rounded-full bg-slate-200/80 px-1.5 py-0.2 text-[10px] font-medium text-slate-600">
                      Optional
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    Printed on PVC membership card and shown during check-in.
                  </p>
                  <div className="flex items-center gap-2 pt-0.5">
                    <input
                      type="file"
                      id="edit-member-photo-input"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadPhoto(file, true);
                      }}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        document.getElementById("edit-member-photo-input")?.click()
                      }
                      disabled={uploadingMemberPhoto}
                      className="h-7 text-xs bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    >
                      <Camera className="h-3 w-3 mr-1 text-slate-500" />
                      {uploadingMemberPhoto
                        ? "Uploading..."
                        : editingMember.photoUrl
                        ? "Change Photo"
                        : "Upload Photo"}
                    </Button>
                    {editingMember.photoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setEditingMember({ ...editingMember, photoUrl: null })
                        }
                        className="h-7 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 px-2"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-700 mb-1">Full Name *</label>
                  <Input
                    required
                    value={editingMember.fullName}
                    onChange={(e) => setEditingMember({ ...editingMember, fullName: e.target.value })}
                    className="h-8 text-xs bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Phone Number *</label>
                  <Input
                    required
                    value={editingMember.phone}
                    onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })}
                    className="h-8 text-xs bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Gender *</label>
                  <select
                    value={editingMember.gender}
                    onChange={(e) => setEditingMember({ ...editingMember, gender: e.target.value as "MALE" | "FEMALE" })}
                    className="w-full h-8 rounded border border-slate-200 bg-slate-50 px-2 text-xs"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Email Address</label>
                  <Input
                    type="email"
                    value={editingMember.email || ""}
                    onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                    className="h-8 text-xs bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Date of Birth</label>
                  <Input
                    value={editingMember.dateOfBirth || ""}
                    onChange={(e) => setEditingMember({ ...editingMember, dateOfBirth: e.target.value })}
                    className="h-8 text-xs bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Kebele / National ID</label>
                  <Input
                    value={editingMember.idNumber || ""}
                    onChange={(e) => setEditingMember({ ...editingMember, idNumber: e.target.value })}
                    className="h-8 text-xs bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Residential Address</label>
                  <Input
                    value={editingMember.address || ""}
                    onChange={(e) => setEditingMember({ ...editingMember, address: e.target.value })}
                    className="h-8 text-xs bg-slate-50"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Fitness Goal</label>
                  <select
                    value={editingMember.fitnessGoal || ""}
                    onChange={(e) => setEditingMember({ ...editingMember, fitnessGoal: e.target.value })}
                    className="w-full h-8 rounded border border-slate-200 bg-slate-50 px-2 text-xs"
                  >
                    <option value="">-- None selected --</option>
                    {FITNESS_GOALS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Blood Group</label>
                  <select
                    value={editingMember.bloodGroup || ""}
                    onChange={(e) => setEditingMember({ ...editingMember, bloodGroup: e.target.value })}
                    className="w-full h-8 rounded border border-slate-200 bg-slate-50 px-2 text-xs font-mono"
                  >
                    <option value="">-- None --</option>
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-700 mb-1">Medical Considerations</label>
                  <Input
                    value={editingMember.medicalHistory || ""}
                    onChange={(e) => setEditingMember({ ...editingMember, medicalHistory: e.target.value })}
                    className="h-8 text-xs bg-slate-50"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Emergency Contact</label>
                  <Input
                    value={editingMember.emergencyContactName || ""}
                    onChange={(e) => setEditingMember({ ...editingMember, emergencyContactName: e.target.value })}
                    className="h-8 text-xs bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Emergency Phone</label>
                  <Input
                    value={editingMember.emergencyContactPhone || ""}
                    onChange={(e) => setEditingMember({ ...editingMember, emergencyContactPhone: e.target.value })}
                    className="h-8 text-xs bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <DialogFooter className="pt-3">
                <Button type="button" variant="outline" onClick={() => setEditingMember(null)} className="h-8 text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="h-8 text-xs bg-[#1e3a8a] text-white">
                  {submitting ? "Saving..." : "Save Member Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
