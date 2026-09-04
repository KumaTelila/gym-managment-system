import {
  TrendingUp,
  TrendingDown,
  Users,
  Grid3X3,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SectionCardsProps {
  activeSessionsCount: number;
  todayCheckinsCount: number;
  availableLockersCount: number;
  totalLockersCount: number;
  expiringMembersCount: number;
  openTabsCount: number;
}

export function SectionCards({
  activeSessionsCount,
  todayCheckinsCount,
  availableLockersCount,
  totalLockersCount,
  expiringMembersCount,
  openTabsCount,
}: SectionCardsProps) {
  const lockerUtilizationPercent =
    totalLockersCount > 0
      ? Math.round(
          ((totalLockersCount - availableLockersCount) / totalLockersCount) * 100
        )
      : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Card 1: Active Gym Sessions */}
      <Card className="border-slate-200/90 shadow-xs hover:border-slate-300 transition-colors">
        <CardHeader className="relative pb-2">
          <CardDescription className="text-xs font-medium text-slate-500">
            Active Gym Sessions
          </CardDescription>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {activeSessionsCount}
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge
              variant="outline"
              className="flex items-center gap-1 rounded-md border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] font-medium px-2 py-0.5"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Floor
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex flex-col items-start gap-1 border-t border-slate-100/80 pt-3 pb-3 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <Users className="h-3.5 w-3.5 text-[#1e3a8a]" />
            <span>Currently on workout floor</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Members holding active locker keys
          </div>
        </CardFooter>
      </Card>

      {/* Card 2: Today's Turnstile Volume */}
      <Card className="border-slate-200/90 shadow-xs hover:border-slate-300 transition-colors">
        <CardHeader className="relative pb-2">
          <CardDescription className="text-xs font-medium text-slate-500">
            Today&apos;s Total Check-Ins
          </CardDescription>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {todayCheckinsCount}
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge
              variant="outline"
              className="flex items-center gap-1 rounded-md border-blue-200 bg-blue-50 text-blue-700 text-[11px] font-medium px-2 py-0.5"
            >
              <TrendingUp className="h-3 w-3" />
              Flow Today
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex flex-col items-start gap-1 border-t border-slate-100/80 pt-3 pb-3 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <UserCheck className="h-3.5 w-3.5 text-blue-600" />
            <span>Front desk turnover</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Cumulative check-ins since 00:00
          </div>
        </CardFooter>
      </Card>

      {/* Card 3: Available Lockers & Capacity */}
      <Card className="border-slate-200/90 shadow-xs hover:border-slate-300 transition-colors">
        <CardHeader className="relative pb-2">
          <CardDescription className="text-xs font-medium text-slate-500">
            Available Lockers
          </CardDescription>
          <CardTitle className="text-2xl font-bold tracking-tight text-emerald-600 tabular-nums">
            {availableLockersCount}
            <span className="text-xs font-normal text-slate-400 ml-1">
              / {totalLockersCount} total
            </span>
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge
              variant="outline"
              className="flex items-center gap-1 rounded-md border-slate-200 bg-slate-50 text-slate-600 text-[11px] font-medium px-2 py-0.5"
            >
              <Grid3X3 className="h-3 w-3 text-slate-500" />
              {lockerUtilizationPercent}% in use
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex flex-col items-start gap-1 border-t border-slate-100/80 pt-3 pb-3 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span>Ready for instant assignment</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Unassigned bays in male & female wings
          </div>
        </CardFooter>
      </Card>

      {/* Card 4: Expiring Subscriptions & Tabs */}
      <Card className="border-slate-200/90 shadow-xs hover:border-slate-300 transition-colors">
        <CardHeader className="relative pb-2">
          <CardDescription className="text-xs font-medium text-slate-500">
            Expiring Subscriptions
          </CardDescription>
          <CardTitle className="text-2xl font-bold tracking-tight text-amber-600 tabular-nums">
            {expiringMembersCount}
            {openTabsCount > 0 && (
              <span className="text-xs font-semibold text-rose-500 ml-2">
                ({openTabsCount} open tabs)
              </span>
            )}
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge
              variant="outline"
              className="flex items-center gap-1 rounded-md border-amber-200 bg-amber-50 text-amber-700 text-[11px] font-medium px-2 py-0.5"
            >
              <AlertCircle className="h-3 w-3" />
              Next 5 Days
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex flex-col items-start gap-1 border-t border-slate-100/80 pt-3 pb-3 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <TrendingDown className="h-3.5 w-3.5 text-amber-600" />
            <span>Renewal reminders required</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Eligible for 1-click renewal on check-in
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
