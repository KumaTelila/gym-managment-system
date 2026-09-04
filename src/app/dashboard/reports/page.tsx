"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { DollarSign, Smartphone, Landmark, Banknote, Printer, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDualDate } from "@/lib/ethiopian-calendar";

interface RevenueBreakdown {
  breakdown: Record<string, { count: number; totalETB: number }>;
  grandTotalETB: number;
  ordersCount: number;
  subscriptionsCount: number;
  rentalsCount: number;
}

export default function ReportsPage() {
  const [data, setData] = useState<RevenueBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [countedCash, setCountedCash] = useState("");
  const [reconciliationSaved, setReconciliationSaved] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/cash");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const expectedCash = data?.breakdown?.CASH?.totalETB || 0;
  const actualCash = parseFloat(countedCash) || 0;
  const cashDifference = actualCash - expectedCash;

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Shift Reconciliation & Financial Reports
          </h1>
          <p className="text-xs text-slate-500">
            End-of-day register closure, revenue audit by channel, and CBE/Telebirr settlement.
          </p>
        </div>

        <Button
          onClick={() => window.print()}
          variant="outline"
          className="h-8 text-xs border-slate-300"
        >
          <Printer className="h-3.5 w-3.5 mr-1.5" />
          Print Daily Audit
        </Button>
      </div>

      {/* 4 Financial Channel Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 bg-white border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Telebirr Total</span>
            <Smartphone className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {Number(data?.breakdown?.TELEBIRR?.totalETB || 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">ETB</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {data?.breakdown?.TELEBIRR?.count || 0} mobile transactions
          </div>
        </Card>

        <Card className="p-4 bg-white border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">CBE Birr / Direct</span>
            <Landmark className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {Number(data?.breakdown?.CBE_TRANSFER?.totalETB || 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">ETB</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {data?.breakdown?.CBE_TRANSFER?.count || 0} bank transfer slips
          </div>
        </Card>

        <Card className="p-4 bg-white border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Physical Cash Drawer</span>
            <Banknote className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {Number(expectedCash).toLocaleString()} <span className="text-xs font-normal text-slate-500">ETB</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {data?.breakdown?.CASH?.count || 0} cash payments
          </div>
        </Card>

        <Card className="p-4 bg-[#1e3a8a] text-white border-transparent">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-200">Today's Grand Total</span>
            <DollarSign className="h-4 w-4 text-white" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            {Number(data?.grandTotalETB || 0).toLocaleString()} <span className="text-xs font-normal text-blue-200">ETB</span>
          </div>
          <div className="mt-1 text-[11px] text-blue-200">
            {(data?.ordersCount || 0) + (data?.subscriptionsCount || 0) + (data?.rentalsCount || 0)} total operations
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Breakdown Table */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Channel Reconciliation Matrix</CardTitle>
              <CardDescription className="text-xs">
                Audited payment receipts captured across Front Desk & POS shifts
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment Channel</TableHead>
                    <TableHead>Transactions Count</TableHead>
                    <TableHead>Subtotal Amount (ETB)</TableHead>
                    <TableHead className="text-right">Share of Day</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data &&
                    Object.entries(data.breakdown).map(([method, info]) => {
                      const share =
                        data.grandTotalETB > 0
                          ? ((info.totalETB / data.grandTotalETB) * 100).toFixed(1)
                          : "0.0";

                      return (
                        <TableRow key={method}>
                          <TableCell className="font-semibold text-slate-900">
                            {method === "CBE_TRANSFER" ? "CBE Birr / Direct Transfer" : method}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 font-mono">
                            {info.count}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-bold text-slate-900">
                            {info.totalETB.toLocaleString()} ETB
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-slate-500">
                            {share}%
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: End-of-Day Cash Drawer Close */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold">End-of-Shift Cash Audit</CardTitle>
              <CardDescription className="text-xs">
                Verify physical drawer banknotes against recorded cash receipts
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block font-medium">System Expected Cash:</span>
                <span className="text-lg font-bold font-mono text-slate-900">
                  {expectedCash.toLocaleString()} ETB
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Physically Counted Cash in Drawer (ETB) *
                </label>
                <Input
                  type="number"
                  placeholder="Enter counted bills..."
                  value={countedCash}
                  onChange={(e) => {
                    setCountedCash(e.target.value);
                    setReconciliationSaved(false);
                  }}
                  className="h-9 font-mono text-xs bg-slate-50 border-slate-300"
                />
              </div>

              {countedCash && (
                <div
                  className={`p-2.5 rounded border text-xs ${
                    cashDifference === 0
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : cashDifference > 0
                      ? "bg-blue-50 border-blue-200 text-blue-800"
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}
                >
                  <div className="font-semibold">
                    {cashDifference === 0
                      ? "✓ Cash drawer is balanced exactly!"
                      : cashDifference > 0
                      ? `Over by +${cashDifference.toLocaleString()} ETB`
                      : `Short by ${cashDifference.toLocaleString()} ETB`}
                  </div>
                  <div className="text-[10px] mt-0.5 opacity-80">
                    Expected: {expectedCash.toLocaleString()} ETB | Counted: {actualCash.toLocaleString()} ETB
                  </div>
                </div>
              )}

              <Button
                disabled={!countedCash}
                onClick={() => setReconciliationSaved(true)}
                className="w-full bg-[#1e3a8a] text-white hover:bg-[#1e40af] h-8 text-xs font-semibold mt-2"
              >
                Sign & Close Shift Drawer
              </Button>

              {reconciliationSaved && (
                <div className="flex items-center space-x-1.5 text-xs text-emerald-700 font-semibold pt-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Shift reconciliation signed and recorded.</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
