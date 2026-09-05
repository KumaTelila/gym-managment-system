"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  QrCode,
  Search,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  LogOut,
  Sparkles,
  UserCheck,
  CreditCard,
  Printer,
} from "lucide-react";
import QRCode from "qrcode";
import { formatDualDate } from "@/lib/ethiopian-calendar";
import { toast } from "@/components/ui/toaster";
import { PhysicalMemberCard } from "@/components/PhysicalMemberCard";
import { MemberLookupAutocomplete, MemberLookupResult } from "@/components/MemberLookupAutocomplete";
import { PaymentConfirmationDialog, PaymentConfirmationDetails } from "@/components/PaymentConfirmationDialog";

interface LockerItem {
  id: string;
  lockerNumber: string;
  section: string;
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";
}

interface BoardMemberItem {
  id: string;
  memberCode: string;
  cardVersion: number;
  fullName: string;
  phone: string;
  gender: "MALE" | "FEMALE";
  photoUrl?: string | null;
  subscriptions: Array<{
    status: string;
    endDate: string;
    plan: { name: string };
  }>;
  checkinSessions: Array<{
    id: string;
    sessionStatus: string;
    checkinTime: string;
    locker?: { id: string; lockerNumber: string; section: string } | null;
  }>;
}

export default function CheckinPage() {
  const router = useRouter();

  // Top Scanner/Search Input state
  const [scanInput, setScanInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [member, setMember] = useState<MemberLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Locker state
  const [lockers, setLockers] = useState<LockerItem[]>([]);
  const [selectedLockerId, setSelectedLockerId] = useState<string | null>(null);
  const [sectionFilter, setSectionFilter] = useState<"ALL" | "MALE" | "FEMALE">("ALL");

  // Left-Side Member Board state
  const [isBoardOpen, setIsBoardOpen] = useState(true);
  const [boardMembers, setBoardMembers] = useState<BoardMemberItem[]>([]);
  const [boardLoading, setBoardLoading] = useState(false);
  const [boardSearch, setBoardSearch] = useState("");
  const [boardFilter, setBoardFilter] = useState<"ALL" | "ACTIVE" | "IN_GYM" | "EXPIRED">("ALL");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Physical Card Modal preview state
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [cardQrUrl, setCardQrUrl] = useState("");
  const [cardSide, setCardSide] = useState<"both" | "front" | "back">("both");
  const [showQrOnCard, setShowQrOnCard] = useState(true);

  // Settle Open Tab on Exit state
  const [pendingTabCheckout, setPendingTabCheckout] = useState<{
    sessionId: string;
    memberName: string;
    totalDueETB: number;
    openTabs: Array<{
      id: string;
      orderNumber: string;
      totalAmountETB: number;
      items: Array<{ quantity: number; product: { name: string }; subtotalETB: number }>;
    }>;
  } | null>(null);
  const [tabPaymentMethod, setTabPaymentMethod] = useState<"CASH" | "TELEBIRR" | "CBE_TRANSFER">("CASH");
  const [tabPaymentRef, setTabPaymentRef] = useState("");
  const [tabSettling, setTabSettling] = useState(false);

  // Rent Locker Modal state
  const [isRentModalOpen, setIsRentModalOpen] = useState(false);
  const [rentLockerId, setRentLockerId] = useState<string | null>(null);
  const [rentMemberCode, setRentMemberCode] = useState("");
  const [rentResolvedMember, setRentResolvedMember] = useState<{ id: string; fullName: string; memberCode: string } | null>(null);
  const [rentDurationDays, setRentDurationDays] = useState(30);
  const [rentPriceETB, setRentPriceETB] = useState(500);
  const [rentPaymentMethod, setRentPaymentMethod] = useState<"CASH" | "TELEBIRR" | "CBE_TRANSFER">("TELEBIRR");
  const [rentPaymentRef, setRentPaymentRef] = useState("");
  const [rentSubmitting, setRentSubmitting] = useState(false);
  const [rentLookupError, setRentLookupError] = useState<string | null>(null);

  // Quick Member Picker to Assign Locker state
  const [isAssignPickerOpen, setIsAssignPickerOpen] = useState(false);
  const [assignSearch, setAssignSearch] = useState("");

  const handleOpenRentModalForLocker = (targetLockerId: string) => {
    setRentLockerId(targetLockerId);
    if (member) {
      setRentResolvedMember({
        id: member.id,
        fullName: member.fullName,
        memberCode: member.memberCode,
      });
      setRentMemberCode(member.memberCode);
    } else {
      setRentResolvedMember(null);
      setRentMemberCode("");
    }
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

  // Payment Confirmation Dialog state for checkin rent modal
  const [isConfirmRentOpen, setIsConfirmRentOpen] = useState(false);
  const [pendingRentConfirmation, setPendingRentConfirmation] = useState<PaymentConfirmationDetails | null>(null);

  const handleSubmitRentLocker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rentResolvedMember || !rentLockerId) {
      toast.error("Validation Error", "Please select a member and locker.");
      return;
    }

    const lockerNum = lockers.find((l) => l.id === rentLockerId)?.lockerNumber;
    setPendingRentConfirmation({
      title: "Confirm Dedicated Locker Payment",
      description: "Carefully verify member details, locker assignment, and payment details before saving.",
      customerName: rentResolvedMember.fullName,
      customerCode: rentResolvedMember.memberCode,
      itemDescription: `Dedicated Locker #${lockerNum || rentLockerId}`,
      amountETB: rentPriceETB,
      paymentMethod: rentPaymentMethod,
      paymentRef: rentPaymentRef?.trim() || null,
      extraDetails: {
        "Rental Duration": `${rentDurationDays} Days`,
      },
    });
    setIsConfirmRentOpen(true);
  };

  const handleConfirmSaveRentLocker = async () => {
    if (!rentResolvedMember || !rentLockerId) return;

    setRentSubmitting(true);
    try {
      const res = await fetch("/api/rentals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: rentResolvedMember.id,
          lockerId: rentLockerId,
          durationDays: rentDurationDays,
          priceETB: rentPriceETB,
          paymentMethod: rentPaymentMethod,
          paymentRef: rentPaymentRef?.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create rental contract");

      const lockerNum = lockers.find((l) => l.id === rentLockerId)?.lockerNumber;
      toast.success(
        "Locker Rented Successfully",
        `Locker ${lockerNum} reserved for ${rentResolvedMember.fullName} (${rentDurationDays} days).`
      );

      setIsConfirmRentOpen(false);
      setIsRentModalOpen(false);
      setSelectedLockerId(null);
      setRentResolvedMember(null);
      setRentMemberCode("");
      loadLockers();
      loadBoardMembers();
    } catch (err: unknown) {
      toast.error("Rental Error", err instanceof Error ? err.message : "Failed to rent locker");
    } finally {
      setRentSubmitting(false);
    }
  };

  const handleAssignAndCheckinMember = async (
    target: { id: string; memberCode: string; cardVersion: number; fullName: string },
    lockerId: string
  ) => {
    setActionLoadingId(target.id);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberCode: target.memberCode,
          cardVersion: target.cardVersion,
          lockerId: lockerId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Check-in failed");

      const lockerNum = lockers.find((l) => l.id === lockerId)?.lockerNumber;
      toast.success(
        "Check-In Confirmed",
        `${target.fullName} checked in and assigned Locker ${lockerNum || lockerId}.`
      );

      setIsAssignPickerOpen(false);
      setSelectedLockerId(null);
      setMember(null);
      setScanInput("");
      loadLockers();
      loadBoardMembers();
      router.refresh();
    } catch (err: unknown) {
      toast.error("Check-In Error", err instanceof Error ? err.message : "Failed to assign locker");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenCardModal = async (target: MemberLookupResult | BoardMemberItem) => {
    const payload = `${target.memberCode}:${target.cardVersion}`;
    try {
      const url = await QRCode.toDataURL(payload, {
        width: 180,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      setCardQrUrl(url);
    } catch {
      // ignore
    }
    setIsCardModalOpen(true);
  };

  // Load Lockers
  const loadLockers = async () => {
    try {
      const res = await fetch("/api/lockers");
      if (res.ok) {
        const data = await res.json();
        setLockers(data.lockers || []);
      }
    } catch {
      // ignore
    }
  };

  // Load Board Members
  const loadBoardMembers = async () => {
    setBoardLoading(true);
    try {
      const res = await fetch(`/api/members`);
      if (res.ok) {
        const data = await res.json();
        setBoardMembers(data.members || []);
      }
    } catch {
      // ignore
    } finally {
      setBoardLoading(false);
    }
  };

  useEffect(() => {
    loadLockers();
    loadBoardMembers();
  }, []);

  // Top Search / Scan Form Handler
  const handleLookup = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const query = (customQuery !== undefined ? customQuery : scanInput).trim();
    if (!query) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    setSelectedLockerId(null);

    // Parse potential QR format: "BF-1001:1" or plain "BF-1001"
    let code = query;
    let version: number | undefined = undefined;
    if (code.includes(":")) {
      const parts = code.split(":");
      code = parts[0];
      version = parseInt(parts[1], 10);
    }

    try {
      const res = await fetch(`/api/members/lookup?code=${encodeURIComponent(code)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Member not found");
      }

      // Check card version if supplied from QR
      if (version !== undefined && version !== data.member.cardVersion) {
        throw new Error(
          `Inactive card presented (v${version}). Current valid card is v${data.member.cardVersion}.`
        );
      }

      setMember(data.member);
      toast.info("Member Verified", `${data.member.fullName} (${data.member.memberCode}) loaded.`);
      // Auto-filter locker section by member gender
      if (data.member.gender === "MALE") setSectionFilter("MALE");
      else if (data.member.gender === "FEMALE") setSectionFilter("FEMALE");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lookup failed";
      setError(msg);
      toast.error("Lookup Error", msg);
      setMember(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMemberDirectly = (selected: MemberLookupResult) => {
    setError(null);
    setSuccess(null);
    setSelectedLockerId(null);
    setMember(selected);
    setScanInput(selected.memberCode);
    toast.info("Member Verified", `${selected.fullName} (${selected.memberCode}) loaded.`);
    if (selected.gender === "MALE") setSectionFilter("MALE");
    else if (selected.gender === "FEMALE") setSectionFilter("FEMALE");
  };

  // Select a member from the Left-Side Board
  const handleSelectMemberFromBoard = (m: BoardMemberItem) => {
    setError(null);
    setSuccess(null);

    const sub = m.subscriptions[0];
    const isExpired = !sub || sub.status !== "ACTIVE" || new Date(sub.endDate) < new Date();
    const activeSession = m.checkinSessions[0];

    const result: MemberLookupResult = {
      id: m.id,
      memberCode: m.memberCode,
      cardVersion: m.cardVersion,
      fullName: m.fullName,
      phone: m.phone,
      gender: m.gender,
      isExpired,
      latestSub: sub
        ? {
            planName: sub.plan.name,
            endDate: sub.endDate,
            status: sub.status,
          }
        : undefined,
      activeSession: activeSession
        ? {
            id: activeSession.id,
            lockerNumber: activeSession.locker?.lockerNumber,
          }
        : undefined,
    };

    setMember(result);
    setSelectedLockerId(null);
    if (m.gender === "MALE") setSectionFilter("MALE");
    else if (m.gender === "FEMALE") setSectionFilter("FEMALE");

    toast.info("Member Selected", `${m.fullName} (${m.memberCode}) ready for check-in.`);
  };

  // Process Checkin (with or without Locker)
  const handleProcessCheckin = async (overrideLockerId?: string | null) => {
    if (!member) return;
    setLoading(true);
    setError(null);

    const lockerToAssign = overrideLockerId !== undefined ? overrideLockerId : selectedLockerId;

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberCode: member.memberCode,
          cardVersion: member.cardVersion,
          lockerId: lockerToAssign || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Check-in failed");
      }

      const assignedLocker = lockers.find((l) => l.id === lockerToAssign)?.lockerNumber;
      const successMsg = `Check-in successful! Assigned Locker: ${assignedLocker || "None"}. Key handed to ${member.fullName}.`;
      setSuccess(successMsg);
      toast.success("Check-In Confirmed", successMsg);

      setMember(null);
      setScanInput("");
      setSelectedLockerId(null);
      loadLockers();
      loadBoardMembers();
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error processing check-in";
      setError(msg);
      toast.error("Check-In Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  // Simple 1-Click Checkin directly from Member Card View
  const handleQuickCheckinFromCard = async (m: BoardMemberItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoadingId(m.id);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberCode: m.memberCode,
          cardVersion: m.cardVersion,
          lockerId: null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Fast check-in failed");
      }

      const successMsg = `Fast Check-in confirmed for ${m.fullName}! (No locker assigned)`;
      setSuccess(successMsg);
      toast.success("Fast Check-In Successful", successMsg);

      if (member?.id === m.id) {
        setMember(null);
      }
      loadLockers();
      loadBoardMembers();
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Fast check-in failed";
      setError(msg);
      toast.error("Fast Check-In Error", msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Simple 1-Click Checkout directly from Member Card View with interactive toast confirmation
  const handleQuickCheckoutFromCard = (sessionId: string, memberName: string, e: React.MouseEvent) => {
    e.stopPropagation();

    toast.confirm(
      `Check Out ${memberName}?`,
      "This will complete their active gym session and immediately release their locker key.",
      {
        confirmText: "Check Out & Release",
        cancelText: "Keep In Gym",
        onConfirm: async () => {
          setActionLoadingId(sessionId);
          setError(null);
          setSuccess(null);

          try {
            const res = await fetch(`/api/checkin/${sessionId}/checkout`, {
              method: "POST",
            });

            const data = await res.json();
            if (!res.ok) {
              if (data.hasOpenTabs) {
                setPendingTabCheckout({
                  sessionId,
                  memberName,
                  totalDueETB: data.totalDueETB,
                  openTabs: data.openTabs,
                });
                toast.warning(
                  "Unpaid Gym Tab Found",
                  `${memberName} has unpaid refreshments/items (${data.totalDueETB} ETB). Please collect payment before exit.`
                );
                return;
              }
              throw new Error(data.error || "Checkout failed");
            }

            const successMsg = `Checked out ${memberName} successfully. Locker released.`;
            setSuccess(successMsg);
            toast.success("Session Checked Out", successMsg);

            if (member?.activeSession?.id === sessionId) {
              setMember(null);
            }
            loadLockers();
            loadBoardMembers();
            router.refresh();
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Error checking out";
            setError(msg);
            toast.error("Checkout Failed", msg);
          } finally {
            setActionLoadingId(null);
          }
        },
      }
    );
  };

  // Settle athlete's open tab and complete checkout in one atomic action
  const handleSettleAndCompleteCheckout = async () => {
    if (!pendingTabCheckout) return;
    setTabSettling(true);
    try {
      const res = await fetch(`/api/checkin/${pendingTabCheckout.sessionId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settleOpenTabs: true,
          paymentMethod: tabPaymentMethod,
          paymentRef: tabPaymentRef,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to settle tab and check out");

      toast.success(
        "Tab Settled & Athlete Checked Out",
        `Collected ${pendingTabCheckout.totalDueETB.toLocaleString()} ETB. Locker released.`
      );

      if (member?.activeSession?.id === pendingTabCheckout.sessionId) {
        setMember(null);
      }
      setPendingTabCheckout(null);
      setTabPaymentRef("");
      loadLockers();
      loadBoardMembers();
      router.refresh();
    } catch (err: unknown) {
      toast.error("Settlement Error", err instanceof Error ? err.message : "Failed to settle tab");
    } finally {
      setTabSettling(false);
    }
  };

  // Filter board members based on search and status tabs
  const filteredBoardMembers = useMemo(() => {
    const term = boardSearch.trim().toLowerCase();

    return boardMembers.filter((m) => {
      const sub = m.subscriptions[0];
      const isExpired = !sub || sub.status !== "ACTIVE" || new Date(sub.endDate) < new Date();
      const inGym = m.checkinSessions && m.checkinSessions.length > 0;

      // Status Filter
      if (boardFilter === "ACTIVE" && (isExpired || inGym)) return false;
      if (boardFilter === "IN_GYM" && !inGym) return false;
      if (boardFilter === "EXPIRED" && !isExpired) return false;

      // Search Query (Name, Code, Phone)
      if (term) {
        const matchesName = m.fullName.toLowerCase().includes(term);
        const matchesCode = m.memberCode.toLowerCase().includes(term);
        const matchesPhone = m.phone.includes(term);
        return matchesName || matchesCode || matchesPhone;
      }

      return true;
    });
  }, [boardMembers, boardSearch, boardFilter]);

  // Lockers filtered by section
  const filteredLockers = lockers.filter((l) => {
    if (sectionFilter === "ALL") return true;
    return l.section === sectionFilter;
  });

  const availableLockersCount = lockers.filter((l) => l.status === "AVAILABLE").length;
  const inGymMembersCount = boardMembers.filter((m) => m.checkinSessions && m.checkinSessions.length > 0).length;

  return (
    <div className="space-y-4">
      {/* Title Header with Quick Stats & Board Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Front Desk Check-In Desk
            </h1>
            <Badge variant="info" className="text-[11px] font-mono">
              {inGymMembersCount} In Gym
            </Badge>
            <Badge variant="success" className="text-[11px] font-mono">
              {availableLockersCount} Lockers Free
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Search members by name, phone, or code, scan QR cards, and manage locker keys.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadLockers();
              loadBoardMembers();
            }}
            className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>

          <Button
            variant={isBoardOpen ? "default" : "outline"}
            size="sm"
            onClick={() => setIsBoardOpen(!isBoardOpen)}
            className={`h-8 text-xs font-semibold ${
              isBoardOpen
                ? "bg-[#1e3a8a] text-white hover:bg-[#1e40af]"
                : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {isBoardOpen ? (
              <>
                <PanelLeftClose className="h-3.5 w-3.5 mr-1.5" />
                Hide Member Board
              </>
            ) : (
              <>
                <PanelLeftOpen className="h-3.5 w-3.5 mr-1.5" />
                Open Member Board
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 shadow-2xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="font-medium">{success}</span>
          </div>
          <button
            onClick={() => setSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 shadow-2xs">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-700 hover:text-red-900 text-xs underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Universal Scan & Name Search Bar */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-3">
          <form onSubmit={(e) => handleLookup(e)} className="flex gap-2">
            <div className="relative flex-1">
              <MemberLookupAutocomplete
                placeholder="Scan QR or search by Name (e.g. Bethlehem), Member Code (BF-1001), or Phone..."
                value={scanInput}
                onChange={(val) => setScanInput(val)}
                onSelectMember={(m) => handleSelectMemberDirectly(m)}
                inputClassName="pl-9 h-9 text-xs bg-slate-50 border-slate-300 focus:bg-white"
                onManualLookup={(code) => handleLookup(undefined, code)}
              />
              <QrCode className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none z-10" />
            </div>
            <Button
              type="submit"
              disabled={loading || !scanInput.trim()}
              className="h-9 px-4 text-xs font-semibold bg-[#1e3a8a] text-white hover:bg-[#1e40af] shadow-xs shrink-0"
            >
              <Search className="h-3.5 w-3.5 mr-1.5" />
              {loading ? "Searching..." : "Search / Scan"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Main Workspace Layout: Left-Side Board + Center Member Details & Right Locker Grid */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* ========================================================================= */}
        {/* LEFT-SIDE BOARD: Member Card View & Simple 1-Click Check-In               */}
        {/* ========================================================================= */}
        {isBoardOpen && (
          <div className="w-full lg:w-[410px] xl:w-[430px] shrink-0 space-y-3">
            <Card className="border-slate-200 shadow-2xs flex flex-col h-[740px]">
              {/* Board Header & Controls */}
              <CardHeader className="p-3.5 pb-2 border-b border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Users className="h-4 w-4 text-[#1e3a8a]" />
                    <CardTitle className="text-sm font-bold text-slate-900">
                      Member Check-In Board
                    </CardTitle>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-semibold">
                    {filteredBoardMembers.length} listed
                  </span>
                </div>

                {/* Real-time Search by Name, Code, Phone */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Quick search by name, code, phone..."
                    value={boardSearch}
                    onChange={(e) => setBoardSearch(e.target.value)}
                    className="pl-8 h-8 text-xs bg-slate-50 border-slate-200 focus:bg-white"
                  />
                  {boardSearch && (
                    <button
                      type="button"
                      onClick={() => setBoardSearch("")}
                      className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="grid grid-cols-4 gap-1 pt-1">
                  {(
                    [
                      { key: "ALL", label: "All" },
                      { key: "ACTIVE", label: "Ready" },
                      { key: "IN_GYM", label: "In Gym" },
                      { key: "EXPIRED", label: "Expired" },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setBoardFilter(tab.key)}
                      className={`text-[11px] py-1 font-semibold rounded transition-colors text-center ${
                        boardFilter === tab.key
                          ? "bg-[#1e3a8a] text-white shadow-2xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </CardHeader>

              {/* Scrollable Member Cards List */}
              <CardContent className="p-3 flex-1 overflow-y-auto space-y-2.5">
                {boardLoading ? (
                  <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto text-slate-400" />
                    <span>Loading registered members...</span>
                  </div>
                ) : filteredBoardMembers.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    <Users className="h-8 w-8 mx-auto text-slate-300 mb-1" />
                    <p className="font-medium text-slate-600">No members found</p>
                    <p className="text-[11px] mt-0.5">Try searching another name or reset filters.</p>
                  </div>
                ) : (
                  filteredBoardMembers.map((m) => {
                    const sub = m.subscriptions[0];
                    const isExpired = !sub || sub.status !== "ACTIVE" || new Date(sub.endDate) < new Date();
                    const activeSession = m.checkinSessions[0];
                    const isSelected = member?.id === m.id;
                    const isProcessing = actionLoadingId === m.id || actionLoadingId === activeSession?.id;

                    // Initials for avatar
                    const initials = m.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    return (
                      <div
                        key={m.id}
                        onClick={() => handleSelectMemberFromBoard(m)}
                        className={`group relative rounded-xl border p-3 transition-all cursor-pointer ${
                          isSelected
                            ? "border-[#1e3a8a] bg-blue-50/50 shadow-xs ring-1 ring-[#1e3a8a]"
                            : activeSession
                            ? "border-blue-200 bg-white hover:border-blue-400 hover:shadow-xs"
                            : isExpired
                            ? "border-amber-200 bg-white hover:border-amber-400"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                        }`}
                      >
                        {/* Top: Avatar, Name & Code */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <div
                              className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-slate-200/80 shadow-2xs ${
                                activeSession
                                  ? "bg-blue-900 text-white"
                                  : isExpired
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {m.photoUrl ? (
                                <img
                                  src={m.photoUrl}
                                  alt={m.fullName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                initials
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 text-xs truncate leading-tight group-hover:text-[#1e3a8a]">
                                {m.fullName}
                              </div>
                              <div className="flex items-center space-x-1.5 mt-0.5">
                                <span className="font-mono text-[10px] text-slate-500 font-semibold">
                                  {m.memberCode}
                                </span>
                                <span className="text-[10px] text-slate-300">•</span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {m.phone}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="shrink-0">
                            {activeSession ? (
                              <Badge variant="info" className="text-[10px] font-mono px-1.5 py-0">
                                Locker #{activeSession.locker?.lockerNumber || "None"}
                              </Badge>
                            ) : isExpired ? (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                Expired
                              </Badge>
                            ) : (
                              <Badge variant="success" className="text-[10px] px-1.5 py-0">
                                Active
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Middle: Plan Details / Validity */}
                        <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-1.5">
                          <span className="truncate">
                            {sub ? sub.plan.name : "No Subscription Plan"}
                          </span>
                          {sub && (
                            <span className="font-mono text-[10px] text-slate-400 shrink-0">
                              Exp: {new Date(sub.endDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {/* Bottom Actions: Simple Check-In or Checkout */}
                        <div className="mt-2.5 flex items-center justify-between gap-1.5 pt-1 border-t border-slate-100">
                          {activeSession ? (
                            <div className="flex items-center justify-between w-full">
                              <span className="text-[10px] text-blue-700 font-medium">
                                In Workout Area
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isProcessing}
                                onClick={(e) =>
                                  handleQuickCheckoutFromCard(activeSession.id, m.fullName, e)
                                }
                                className="h-6 text-[10px] px-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                              >
                                <LogOut className="h-3 w-3 mr-1" />
                                Check Out
                              </Button>
                            </div>
                          ) : !isExpired ? (
                            <div className="flex items-center justify-between w-full gap-1.5">
                              <Button
                                size="sm"
                                disabled={isProcessing}
                                onClick={(e) => handleQuickCheckinFromCard(m, e)}
                                className="h-6 flex-1 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-2xs"
                              >
                                <Sparkles className="h-2.5 w-2.5 mr-1" />
                                {isProcessing ? "Checking in..." : "Simple Check-In"}
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectMemberFromBoard(m);
                                }}
                                className="h-6 text-[10px] px-2 border-slate-200 text-slate-700 hover:bg-slate-100"
                              >
                                Assign Locker
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between w-full">
                              <span className="text-[10px] text-amber-700">Needs Renewal</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/dashboard/subscriptions?memberCode=${m.memberCode}`);
                                }}
                                className="h-6 text-[10px] px-2 border-amber-300 text-amber-800 hover:bg-amber-50"
                              >
                                Renew Plan
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CENTER & RIGHT: Selected Member Detail Card + Locker Grid Selector        */}
        {/* ========================================================================= */}
        <div className="flex-1 min-w-0 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left 1 Col: Verified Member Information & Confirmation */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="border-slate-200 shadow-2xs">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-slate-900">
                      Verified Member
                    </CardTitle>
                    {member && (
                      <button
                        onClick={() => setMember(null)}
                        className="text-[11px] text-slate-400 hover:text-slate-700 underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <CardDescription className="text-xs">
                    Front-desk verification details
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3.5 text-xs">
                  {!member ? (
                    <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                      <UserCheck className="h-8 w-8 mx-auto text-slate-300" />
                      <div className="font-semibold text-slate-600">No member loaded yet</div>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                        Click any card on the left member board or scan a card above to inspect details and assign a locker.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Name & Code with photo */}
                      <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full overflow-hidden border border-slate-300 bg-white flex items-center justify-center shrink-0 shadow-2xs">
                          {member.photoUrl ? (
                            <img
                              src={member.photoUrl}
                              alt={member.fullName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="font-bold text-sm text-slate-700">
                              {member.fullName
                                .split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-base text-slate-900 truncate">
                            {member.fullName}
                          </div>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="font-mono text-xs font-bold text-[#1e3a8a]">
                              {member.memberCode}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              (Card v{member.cardVersion})
                            </span>
                            <span className="text-[10px] text-slate-400">•</span>
                            <span className="text-xs text-slate-600 capitalize">
                              {member.gender.toLowerCase()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Phone & Status */}
                      <div className="space-y-2 text-xs border-b border-slate-100 pb-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Phone Number:</span>
                          <span className="font-mono font-medium text-slate-800">{member.phone}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Subscription Status:</span>
                          {member.isExpired ? (
                            <Badge variant="destructive">Expired</Badge>
                          ) : (
                            <Badge variant="success">Active Plan</Badge>
                          )}
                        </div>
                      </div>

                      {/* Subscription Dual Date Details */}
                      {member.latestSub && (
                        <div className="rounded bg-blue-50/50 p-2.5 text-[11px] text-blue-900 border border-blue-100 space-y-1">
                          <div className="font-semibold flex items-center justify-between">
                            <span>{member.latestSub.planName}</span>
                            <span className="text-[10px] text-blue-700">
                              {new Date(member.latestSub.endDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-[10px] text-blue-800">
                            Ethiopian Date: {formatDualDate(member.latestSub.endDate)}
                          </div>
                        </div>
                      )}

                      {/* Active Session Warning */}
                      {member.activeSession && (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-[11px] text-blue-900 flex items-center justify-between">
                          <span>
                            Currently inside at Locker <strong>#{member.activeSession.lockerNumber || "None"}</strong>
                          </span>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) =>
                              handleQuickCheckoutFromCard(member.activeSession!.id, member.fullName, e)
                            }
                            className="h-6 text-[10px] px-2"
                          >
                            Check Out
                          </Button>
                        </div>
                      )}

                      {/* Selected Locker Preview */}
                      <div className="rounded-lg border border-slate-200 bg-white p-2.5 flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <KeyRound className="h-4 w-4 text-[#1e3a8a]" />
                          <span className="text-slate-700 font-medium">Assigned Locker:</span>
                        </div>
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {selectedLockerId
                            ? lockers.find((l) => l.id === selectedLockerId)?.lockerNumber
                            : "None (Simple Check-In)"}
                        </span>
                      </div>

                      {/* View Authentic Physical Card Button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenCardModal(member)}
                        className="w-full h-8 text-xs border-amber-300 bg-amber-50/60 text-amber-950 hover:bg-amber-100 font-semibold"
                      >
                        <CreditCard className="h-3.5 w-3.5 mr-1.5 text-amber-700" />
                        View Monthly Card (Yellow/Red EC)
                      </Button>

                      {/* Primary Check-In Button */}
                      {member.isExpired ? (
                        <Button
                          type="button"
                          onClick={() => router.push(`/dashboard/subscriptions?memberCode=${member.memberCode}`)}
                          className="w-full bg-amber-600 text-white hover:bg-amber-700 h-9 text-xs font-semibold"
                        >
                          Renew Subscription First
                        </Button>
                      ) : !member.activeSession ? (
                        <Button
                          type="button"
                          onClick={() => handleProcessCheckin()}
                          disabled={loading}
                          className="w-full bg-[#1e3a8a] text-white hover:bg-[#1e40af] h-10 text-xs font-bold shadow-xs flex items-center justify-center space-x-1.5"
                        >
                          <KeyRound className="h-4 w-4 mr-1" />
                          <span>
                            {loading
                              ? "Processing Check-In..."
                              : selectedLockerId
                              ? `Confirm Check-In with Locker ${
                                  lockers.find((l) => l.id === selectedLockerId)?.lockerNumber
                                }`
                              : "Check-In Without Locker"}
                          </span>
                        </Button>
                      ) : null}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right 2 Cols: Locker Grid Selector */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="border-slate-200 shadow-2xs">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2 border-b border-slate-100">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900">
                      Select Locker Room Key
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Click an available locker to allocate to {member ? member.fullName : "current check-in"}
                    </CardDescription>
                  </div>

                  {/* Section Filter Pills */}
                  <div className="flex space-x-1">
                    {(["ALL", "MALE", "FEMALE"] as const).map((sec) => (
                      <button
                        key={sec}
                        onClick={() => setSectionFilter(sec)}
                        className={`px-3 py-1 text-[11px] font-semibold rounded transition-colors ${
                          sectionFilter === sec
                            ? "bg-[#1e3a8a] text-white shadow-2xs"
                            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {sec === "ALL" ? "All Sections" : `${sec} Room`}
                      </button>
                    ))}
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-3">
                  {/* Status Legend */}
                  <div className="mb-4 flex flex-wrap gap-4 text-[11px] text-slate-500 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center space-x-1.5">
                      <div className="h-3 w-3 rounded border border-slate-300 bg-white" />
                      <span>Available</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <div className="h-3 w-3 rounded bg-blue-900" />
                      <span>Occupied</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <div className="h-3 w-3 rounded bg-amber-500" />
                      <span>Reserved (Monthly)</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <div className="h-3 w-3 rounded bg-red-400" />
                      <span>Maintenance</span>
                    </div>
                  </div>

                  {/* Locker Grid */}
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {filteredLockers.map((locker) => {
                      const isSelected = selectedLockerId === locker.id;
                      const isAvail = locker.status === "AVAILABLE";

                      let btnStyle =
                        "border-slate-300 bg-white text-slate-800 hover:border-blue-600 hover:bg-blue-50/50";
                      if (isSelected) {
                        btnStyle =
                          "border-2 border-[#1e3a8a] bg-blue-100 text-[#1e3a8a] font-bold shadow-xs";
                      } else if (locker.status === "OCCUPIED") {
                        btnStyle = "bg-blue-900 text-white opacity-80 cursor-not-allowed border-transparent";
                      } else if (locker.status === "RESERVED") {
                        btnStyle = "bg-amber-500 text-white opacity-90 cursor-not-allowed border-transparent";
                      } else if (locker.status === "MAINTENANCE") {
                        btnStyle = "bg-red-400 text-white opacity-80 cursor-not-allowed border-transparent";
                      }

                      return (
                        <button
                          key={locker.id}
                          type="button"
                          disabled={!isAvail}
                          onClick={() => setSelectedLockerId(isSelected ? null : locker.id)}
                          className={`flex flex-col items-center justify-center p-2 rounded border text-xs transition-all h-14 ${btnStyle}`}
                        >
                          <span className="font-mono font-bold text-xs">{locker.lockerNumber}</span>
                          <span className="text-[9px] opacity-75 mt-0.5">{locker.section[0]}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Interactive Locker Action Bar (Assign or Rent) */}
                  {selectedLockerId && (() => {
                    const activeLocker = lockers.find((l) => l.id === selectedLockerId);
                    if (!activeLocker) return null;

                    return (
                      <div className="mt-4 rounded-xl bg-slate-900 text-white p-3.5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white font-mono font-bold text-sm shrink-0 shadow-xs">
                            {activeLocker.lockerNumber}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span>Locker {activeLocker.lockerNumber} Selected</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-blue-300 font-normal">
                                {activeLocker.section} Room
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {member
                                ? `Ready to allocate to ${member.fullName}`
                                : "Choose an action for this free locker:"}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* 1. Assign to Workout Check-In */}
                          <Button
                            size="sm"
                            onClick={() => {
                              if (member) {
                                handleProcessCheckin(selectedLockerId);
                              } else {
                                setIsAssignPickerOpen(true);
                              }
                            }}
                            className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
                          >
                            <UserCheck className="h-3.5 w-3.5 mr-1" />
                            {member ? `Check In & Assign` : "Assign Check-In"}
                          </Button>

                          {/* 2. Rent Locker Monthly / Dedicated */}
                          <Button
                            size="sm"
                            onClick={() => handleOpenRentModalForLocker(selectedLockerId)}
                            className="h-8 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs"
                          >
                            <KeyRound className="h-3.5 w-3.5 mr-1" />
                            Rent (Monthly)
                          </Button>

                          {/* Clear Selection */}
                          <button
                            onClick={() => setSelectedLockerId(null)}
                            className="text-slate-400 hover:text-white text-xs px-1.5 underline"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Physical Card Dialog */}
      <Dialog open={isCardModalOpen} onOpenChange={setIsCardModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Blow Fitness Monthly Membership Card</span>
              <span className="text-xs font-mono font-normal text-slate-500">
                CR80 Standard (85.6mm × 53.98mm)
              </span>
            </DialogTitle>
            <DialogDescription>
              Authentic monthly gym card: Front displays Amharic fields & Ethiopian dates (Megabit/etc); Back contains the 4 gym regulations.
            </DialogDescription>
          </DialogHeader>

          {member && (
            <div className="space-y-4">
              {/* Card Controls Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                {/* Side Selection Tabs */}
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
                        cardSide === t.key
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* QR vs Photo Toggle */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-600 font-medium">Photo Box:</span>
                  <button
                    type="button"
                    onClick={() => setShowQrOnCard(!showQrOnCard)}
                    className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
                      showQrOnCard
                        ? "bg-blue-50 border-blue-200 text-blue-800"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    {showQrOnCard ? "✓ Front-Desk Scan QR" : "Photo / Stamp"}
                  </button>
                </div>
              </div>

              {/* Printable Physical Card Area */}
              <div className="printable-card-area flex justify-center py-3 bg-slate-100/70 rounded-xl border border-dashed border-slate-300 overflow-x-auto">
                <PhysicalMemberCard
                  member={member}
                  qrDataUrl={cardQrUrl}
                  showQrInPhotoBox={showQrOnCard}
                  side={cardSide}
                />
              </div>

              {/* Informational Guidance Alert */}
              <div className="rounded-lg bg-amber-50/80 border border-amber-200 p-3 text-xs text-amber-900 flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-amber-950">
                    Matches Blow Fitness Physical Card Specifications:
                  </div>
                  <div className="text-[11px] text-amber-800 leading-relaxed">
                    • <strong>Front:</strong> Member Name (ስም), Subscription Fee (ክፍያ), and Start/End dates in Ethiopian Calendar (የጀመረበት ቀን & የሚያበቃበት ቀን).
                    <br />
                    • <strong>Back:</strong> Gym regulations with 100 ETB replacement fee upon loss.
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCardModalOpen(false)}
              className="text-xs"
            >
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => window.print()}
              className="text-xs bg-[#1e3a8a] text-white hover:bg-[#1e40af] font-semibold"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Print Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settle Unpaid Gym Tab on Exit Dialog */}
      <Dialog open={!!pendingTabCheckout} onOpenChange={() => setPendingTabCheckout(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-amber-900">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Unpaid Gym Tab: Settle Before Exit
            </DialogTitle>
            <DialogDescription>
              <strong>{pendingTabCheckout?.memberName}</strong> took items during their workout. Please collect payment before releasing the locker and completing departure.
            </DialogDescription>
          </DialogHeader>

          {pendingTabCheckout && (
            <div className="space-y-3 text-xs">
              <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-3 space-y-2">
                <div className="font-semibold text-amber-950">Items Taken On Tab:</div>
                <div className="space-y-1">
                  {pendingTabCheckout.openTabs.map((tab) =>
                    tab.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-slate-800">
                        <span>
                          {item.quantity}x {item.product.name}
                        </span>
                        <span className="font-mono font-semibold">
                          {Number(item.subtotalETB).toLocaleString()} ETB
                        </span>
                      </div>
                    ))
                  )}
                </div>
                <div className="border-t border-amber-200/80 pt-2 flex justify-between font-bold text-slate-900">
                  <span>Total Due:</span>
                  <span className="text-base text-amber-900 font-extrabold">
                    {pendingTabCheckout.totalDueETB.toLocaleString()} ETB
                  </span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">Select Payment Method</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["CASH", "TELEBIRR", "CBE_TRANSFER"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTabPaymentMethod(m)}
                      className={`py-1.5 text-xs font-bold rounded border transition-colors ${
                        tabPaymentMethod === m
                          ? "bg-[#1e3a8a] text-white border-[#1e3a8a]"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {m === "CBE_TRANSFER" ? "CBE Birr" : m}
                    </button>
                  ))}
                </div>
              </div>

              {tabPaymentMethod !== "CASH" && (
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Transaction Slip / SMS Reference #
                  </label>
                  <Input
                    placeholder="e.g. TXN code"
                    value={tabPaymentRef}
                    onChange={(e) => setTabPaymentRef(e.target.value)}
                    className="h-8 text-xs bg-slate-50 font-mono"
                  />
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPendingTabCheckout(null)}
                  className="h-8 text-xs"
                >
                  Keep Inside Gym
                </Button>
                <Button
                  type="button"
                  disabled={tabSettling}
                  onClick={handleSettleAndCompleteCheckout}
                  className="h-8 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                >
                  {tabSettling
                    ? "Settling..."
                    : `Collect ${pendingTabCheckout.totalDueETB.toLocaleString()} ETB & Release Locker`}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
              Assign a dedicated monthly locker to a member. The locker will be marked as Reserved.
            </DialogDescription>
          </DialogHeader>

          {rentLockerId && (() => {
            const locker = lockers.find((l) => l.id === rentLockerId);
            return (
              <form onSubmit={handleSubmitRentLocker} className="space-y-4 pt-1">
                {/* Locker Banner */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded bg-[#1e3a8a] text-white flex items-center justify-center font-mono font-bold text-sm">
                      {locker?.lockerNumber || rentLockerId}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900">
                        Locker #{locker?.lockerNumber}
                      </div>
                      <div className="text-xs text-slate-500">
                        {locker?.section} Locker Room (Available)
                      </div>
                    </div>
                  </div>
                  <Badge variant="warning" className="text-[10px]">
                    Reserved Contract
                  </Badge>
                </div>

                {/* Member Lookup / Target */}
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
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Assign Locker Member Picker Modal */}
      <Dialog open={isAssignPickerOpen} onOpenChange={setIsAssignPickerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                <UserCheck className="h-4 w-4" />
              </div>
              <span>
                Assign Locker #{lockers.find((l) => l.id === selectedLockerId)?.lockerNumber} to Member
              </span>
            </DialogTitle>
            <DialogDescription>
              Choose an active member checking in today to hand over this locker key.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search member name, code, phone..."
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-slate-50"
              />
            </div>

            {/* Member List */}
            <div className="max-h-72 overflow-y-auto space-y-1.5 divide-y divide-slate-100 pr-1">
              {boardMembers
                .filter((m) => {
                  const activeSession = m.checkinSessions[0];
                  if (activeSession) return false; // Already in gym
                  if (!assignSearch.trim()) return true;
                  const q = assignSearch.toLowerCase();
                  return (
                    m.fullName.toLowerCase().includes(q) ||
                    m.memberCode.toLowerCase().includes(q) ||
                    m.phone.toLowerCase().includes(q)
                  );
                })
                .map((m) => {
                  const sub = m.subscriptions[0];
                  const isExpired = !sub || sub.status !== "ACTIVE" || new Date(sub.endDate) < new Date();

                  return (
                    <div
                      key={m.id}
                      className="pt-1.5 first:pt-0 flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {m.fullName
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                            <span>{m.fullName}</span>
                            <span className="font-mono text-[10px] text-slate-400 font-normal">
                              {m.memberCode}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {sub?.plan?.name || "Standard Membership"} • {m.gender}
                            {isExpired && (
                              <span className="ml-1 text-amber-600 font-semibold">(Expired)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        disabled={actionLoadingId === m.id || !selectedLockerId || isExpired}
                        onClick={() => {
                          if (selectedLockerId) {
                            handleAssignAndCheckinMember(m, selectedLockerId);
                          }
                        }}
                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                      >
                        {actionLoadingId === m.id ? "Checking In..." : "Assign & Check In"}
                      </Button>
                    </div>
                  );
                })}

              {boardMembers.filter((m) => !m.checkinSessions[0]).length === 0 && (
                <div className="text-center py-6 text-xs text-slate-400">
                  No eligible members found.
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAssignPickerOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Pre-Flight Confirmation Safeguard Dialog for Check-in Rent Modal */}
      <PaymentConfirmationDialog
        open={isConfirmRentOpen}
        onOpenChange={setIsConfirmRentOpen}
        details={pendingRentConfirmation}
        onConfirm={handleConfirmSaveRentLocker}
        loading={rentSubmitting}
      />
    </div>
  );
}
