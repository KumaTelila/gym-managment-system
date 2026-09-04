import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { DashboardCheckouts } from "./dashboard-checkouts";
import { UserCheck, Grid3X3, ShoppingBag, UserPlus } from "lucide-react";

export default async function DashboardPage() {
  const session = await getSession();

  // Fetch real KPI stats
  const activeSessions = await prisma.checkinSession.findMany({
    where: { sessionStatus: "ACTIVE" },
    include: {
      member: true,
      locker: true,
      receptionist: true,
    },
    orderBy: { checkinTime: "desc" },
  });

  const availableLockersCount = await prisma.locker.count({
    where: { status: "AVAILABLE" },
  });

  const reservedLockersCount = await prisma.locker.count({
    where: { status: "RESERVED" },
  });

  const now = new Date();
  const fiveDaysAhead = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  const expiringMembersCount = await prisma.subscription.count({
    where: {
      status: "ACTIVE",
      endDate: { lte: fiveDaysAhead },
    },
  });

  return (
    <div className="space-y-5">
      {/* Welcome Banner Card matching Screenshot 2 */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold text-slate-900">
            Welcome, {session?.fullName || "Staff"}
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Signed in as <span className="font-semibold text-slate-700">{session?.role.replace("_", " ")}</span> — managing active member check-ins, locker assignments, and facility operations from this desk.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              href="/dashboard/checkin"
              className="inline-flex items-center space-x-1.5 rounded-full bg-[#1e3a8a] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#1e40af] transition-colors shadow-2xs"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Front Desk Check-In</span>
            </Link>
            <Link
              href="/dashboard/lockers"
              className="inline-flex items-center space-x-1.5 rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Grid3X3 className="h-3.5 w-3.5 text-slate-500" />
              <span>Locker Grid</span>
            </Link>
            <Link
              href="/dashboard/pos"
              className="inline-flex items-center space-x-1.5 rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <ShoppingBag className="h-3.5 w-3.5 text-slate-500" />
              <span>POS Checkout</span>
            </Link>
            <Link
              href="/dashboard/members"
              className="inline-flex items-center space-x-1.5 rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <UserPlus className="h-3.5 w-3.5 text-slate-500" />
              <span>New Member</span>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* 4 Stat KPI Cards Row matching Screenshot 2 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <span className="text-xs font-medium text-slate-500">Active Gym Sessions</span>
            <div className="mt-1 text-2xl font-bold text-slate-900">{activeSessions.length}</div>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-slate-400">
            Members currently inside workout area
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <span className="text-xs font-medium text-slate-500">Available Lockers</span>
            <div className="mt-1 text-2xl font-bold text-emerald-600">{availableLockersCount}</div>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-slate-400">
            Ready for immediate assignment
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <span className="text-xs font-medium text-slate-500">Dedicated Locker Rentals</span>
            <div className="mt-1 text-2xl font-bold text-amber-600">{reservedLockersCount}</div>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-slate-400">
            Reserved on monthly contracts
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <span className="text-xs font-medium text-slate-500">Expiring Subscriptions</span>
            <div className="mt-1 text-2xl font-bold text-blue-600">{expiringMembersCount}</div>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-slate-400">
            Within the next 5 days
          </CardContent>
        </Card>
      </div>

      {/* Main Content: Active Attendance Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-semibold text-slate-900">
              Active Member Sessions
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Real-time list of members with an active locker key in possession.
            </CardDescription>
          </div>
          <Link
            href="/dashboard/checkin"
            className="text-xs font-medium text-[#1e3a8a] hover:underline"
          >
            Open Check-In Desk &rarr;
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {activeSessions.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-xs font-medium text-slate-500">No active gym sessions right now</div>
              <p className="mt-1 text-[11px] text-slate-400">
                Scan a member card at the check-in desk to assign a locker.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Locker #</TableHead>
                  <TableHead>Check-in Time</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeSessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-slate-900">
                      {s.member.fullName}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">
                      {s.member.memberCode}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded border border-slate-300 bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-800">
                        {s.locker ? s.locker.lockerNumber : "None"}
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
                      <Badge variant="success">Active</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DashboardCheckouts sessionId={s.id} lockerNumber={s.locker?.lockerNumber || ""} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
