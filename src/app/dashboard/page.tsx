import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { DashboardCheckouts } from "./dashboard-checkouts";
import { SectionCards } from "@/components/dashboard-section-cards";
import {
  UserCheck,
  Grid3X3,
  ShoppingBag,
  UserPlus,
  Clock,
  Flame,
  ArrowRight,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await getSession();

  // Start of today for counting daily turnstile entries
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const now = new Date();
  const fiveDaysAhead = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  // Parallel database execution (AUD-009)
  const [
    activeSessionsCount,
    activeSessions,
    todayCheckinsCount,
    availableLockersCount,
    totalLockersCount,
    expiringMembersCount,
    openTabsCount,
  ] = await Promise.all([
    // Dedicated count for KPI (AUD-007)
    prisma.checkinSession.count({
      where: { sessionStatus: "ACTIVE" },
    }),
    // Bounded query for dashboard active session table (AUD-007)
    prisma.checkinSession.findMany({
      where: { sessionStatus: "ACTIVE" },
      include: {
        member: true,
        locker: true,
        receptionist: true,
      },
      orderBy: { checkinTime: "desc" },
      take: 25,
    }),
    prisma.checkinSession.count({
      where: { checkinTime: { gte: startOfToday } },
    }),
    prisma.locker.count({
      where: { status: "AVAILABLE" },
    }),
    prisma.locker.count(),
    // Accurately bound expiring subscriptions within [now, now + 5 days] (AUD-008)
    prisma.subscription.count({
      where: {
        status: "ACTIVE",
        endDate: {
          gte: now,
          lte: fiveDaysAhead,
        },
      },
    }),
    prisma.salesOrder.count({
      where: { status: "OPEN_TAB" },
    }),
  ]);

  const getInitials = (name?: string) => {
    if (!name) return "MB";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Quick Actions (dashboard-01 style) */}
      <Card className="border-slate-200/90 shadow-xs bg-white">
        <CardHeader className="pb-3 pt-5 px-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 tracking-tight">
                Welcome back, {session?.fullName || "Staff"}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Signed into terminal as{" "}
                <span className="font-semibold text-slate-700">
                  {session?.role.replace("_", " ")}
                </span>{" "}
                &bull; Live attendance, locker allocation, and store registers.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/checkin"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e3a8a] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#1e40af] transition-colors"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Front Desk Check-In</span>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-4 pt-1">
          <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
            <Link
              href="/dashboard/checkin"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <UserCheck className="h-3 w-3 text-blue-600" />
              <span>Card Check-In</span>
            </Link>
            <Link
              href="/dashboard/lockers"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Grid3X3 className="h-3 w-3 text-slate-500" />
              <span>Locker Grid</span>
            </Link>
            <Link
              href="/dashboard/pos"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <ShoppingBag className="h-3 w-3 text-slate-500" />
              <span>POS & Open Tabs</span>
              {openTabsCount > 0 && (
                <span className="ml-1 rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                  {openTabsCount}
                </span>
              )}
            </Link>
            <Link
              href="/dashboard/members"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <UserPlus className="h-3 w-3 text-slate-500" />
              <span>Register Member</span>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* SectionCards: 4 KPI Cards Row (shadcn dashboard-01) */}
      <SectionCards
        activeSessionsCount={activeSessionsCount}
        todayCheckinsCount={todayCheckinsCount}
        availableLockersCount={availableLockersCount}
        totalLockersCount={totalLockersCount}
        expiringMembersCount={expiringMembersCount}
        openTabsCount={openTabsCount}
      />

      {/* Occupancy Rush Overview Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200/90 shadow-xs bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-800">Peak Workout Hours</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                06:30 - 09:00 &bull; 17:30 - 20:30
              </div>
            </div>
          </div>
        </Card>

        <Card className="border-slate-200/90 shadow-xs bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100 shrink-0">
              <Flame className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-800">Gym Floor Activity</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {activeSessions.length > 15
                  ? "High Occupancy Zone"
                  : activeSessions.length > 5
                  ? "Moderate Workout Flow"
                  : "Steady Facility Flow"}
              </div>
            </div>
          </div>
        </Card>

        <Card className="border-slate-200/90 shadow-xs bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-800">Open Tabs (Pay on Exit)</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {openTabsCount === 0
                  ? "All tabs settled"
                  : `${openTabsCount} active member tabs pending`}
              </div>
            </div>
            <Link
              href="/dashboard/pos"
              className="text-xs font-semibold text-[#1e3a8a] hover:underline flex items-center gap-1"
            >
              <span>View POS</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Main Content: Active Member Sessions Data Table */}
      <Card className="border-slate-200/90 shadow-xs bg-white">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 pt-5 px-5">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-bold text-slate-900">
                Active Member Sessions
              </CardTitle>
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px]">
                {activeSessions.length} inside
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Live roster of members currently possessing a physical locker key.
            </CardDescription>
          </div>
          <Link
            href="/dashboard/checkin"
            className="text-xs font-medium text-[#1e3a8a] hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Open Check-In Desk</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {activeSessions.length === 0 ? (
            <div className="py-14 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-2">
                <UserCheck className="h-5 w-5" />
              </div>
              <div className="text-xs font-semibold text-slate-700">No active gym sessions right now</div>
              <p className="mt-1 text-[11px] text-slate-400 max-w-sm mx-auto">
                Scan or select a member card at the check-in desk to issue a physical locker key and initiate a workout session.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200/80 bg-slate-50/60">
                    <TableHead className="text-xs font-semibold text-slate-700 pl-5">Member</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Card Code</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Assigned Locker</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Check-In Time</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Attending Staff</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 text-right pr-5">Quick Checkout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeSessions.map((s) => (
                    <TableRow key={s.id} className="border-slate-100 hover:bg-slate-50/70 transition-colors">
                      <TableCell className="font-medium text-slate-900 pl-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7 border border-slate-200">
                            <AvatarFallback className="bg-slate-100 text-[10px] font-bold text-slate-700">
                              {getInitials(s.member.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="leading-tight">
                            <div className="text-xs font-semibold text-slate-900">{s.member.fullName}</div>
                            <div className="text-[10px] text-slate-400">{s.member.phone || "No phone"}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200">
                          {s.member.memberCode}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-0.5 font-mono text-xs font-bold text-[#1e3a8a]">
                          <Grid3X3 className="h-3 w-3 text-blue-600" />
                          {s.locker ? `Bay #${s.locker.lockerNumber}` : "None"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500" suppressHydrationWarning>
                        {new Date(s.checkinTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {s.receptionist.fullName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="success" className="text-[10px] font-medium px-2 py-0.5">
                          Inside Gym
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-5">
                        <DashboardCheckouts
                          sessionId={s.id}
                          lockerNumber={s.locker?.lockerNumber || ""}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
