"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  DollarSign,
  Smartphone,
  Landmark,
  Banknote,
  Printer,
  ShoppingBag,
  CreditCard,
  KeyRound,
  Search,
  Download,
  RefreshCw,
  SlidersHorizontal,
  Calendar,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { formatDualDate } from "@/lib/ethiopian-calendar";

interface UnifiedTransaction {
  id: string;
  timestamp: string;
  stream: "POS" | "SUBSCRIPTION" | "RENTAL";
  referenceNumber: string;
  customerName: string;
  customerCode: string;
  description: string;
  amountETB: number;
  paymentMethod: string;
  paymentRef: string | null;
  staffName: string;
  status: string;
}

interface SalesReportResponse {
  timeframe: string;
  dateRange: { start: string | null; end: string | null };
  summary: {
    totalGrossETB: number;
    totalTransactionsCount: number;
    posSalesTotalETB: number;
    posSalesCount: number;
    subscriptionsTotalETB: number;
    subscriptionsCount: number;
    rentalsTotalETB: number;
    rentalsCount: number;
    channelSummary: Record<string, { count: number; totalETB: number }>;
  };
  transactions: UnifiedTransaction[];
}

interface ShiftReconciliationData {
  breakdown: Record<string, { count: number; totalETB: number }>;
  grandTotalETB: number;
  ordersCount: number;
  subscriptionsCount: number;
  rentalsCount: number;
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("all-sales");

  // Filter states for All Sales
  const [timeframe, setTimeframe] = useState("today");
  const [stream, setStream] = useState("ALL");
  const [paymentMethod, setPaymentMethod] = useState("ALL");
  const [search, setSearch] = useState("");
  const [salesData, setSalesData] = useState<SalesReportResponse | null>(null);
  const [loadingSales, setLoadingSales] = useState(true);

  // Shift reconciliation state
  const [shiftData, setShiftData] = useState<ShiftReconciliationData | null>(null);
  const [loadingShift, setLoadingShift] = useState(true);
  const [countedCash, setCountedCash] = useState("");
  const [reconciliationSaved, setReconciliationSaved] = useState(false);

  // Fetch all sales report
  const fetchSalesReport = async () => {
    setLoadingSales(true);
    try {
      const params = new URLSearchParams({
        timeframe,
        stream,
        paymentMethod,
        ...(search ? { search } : {}),
      });
      const res = await fetch(`/api/reports/sales?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setSalesData(json);
      }
    } catch (err) {
      console.error("Failed to load sales report:", err);
    } finally {
      setLoadingSales(false);
    }
  };

  // Fetch shift cash report
  const fetchShiftReport = async () => {
    setLoadingShift(true);
    try {
      const res = await fetch("/api/reports/cash");
      if (res.ok) {
        const json = await res.json();
        setShiftData(json);
      }
    } catch (err) {
      console.error("Failed to load shift report:", err);
    } finally {
      setLoadingShift(false);
    }
  };

  useEffect(() => {
    fetchSalesReport();
  }, [timeframe, stream, paymentMethod]);

  useEffect(() => {
    fetchShiftReport();
  }, []);

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSalesReport();
  };

  // Export CSV functionality
  const handleExportCSV = () => {
    if (!salesData || salesData.transactions.length === 0) return;

    const headers = [
      "Transaction ID",
      "Timestamp",
      "Stream",
      "Reference Number",
      "Customer Name",
      "Customer Code",
      "Description / Items",
      "Amount (ETB)",
      "Payment Method",
      "Payment Reference",
      "Staff",
      "Status",
    ];

    const rows = salesData.transactions.map((t) => [
      `"${t.id}"`,
      `"${new Date(t.timestamp).toLocaleString()}"`,
      `"${t.stream}"`,
      `"${t.referenceNumber}"`,
      `"${t.customerName.replace(/"/g, '""')}"`,
      `"${t.customerCode}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      t.amountETB,
      `"${t.paymentMethod}"`,
      `"${(t.paymentRef || "").replace(/"/g, '""')}"`,
      `"${t.staffName.replace(/"/g, '""')}"`,
      `"${t.status}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `BLOW_Fitness_Sales_Report_${timeframe}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Cash drawer calculations for Tab 2
  const expectedCash = shiftData?.breakdown?.CASH?.totalETB || 0;
  const actualCash = parseFloat(countedCash) || 0;
  const cashDifference = actualCash - expectedCash;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Financial & Sales Reports
          </h1>
          <p className="text-xs text-slate-500">
            Consolidated ledger of retail POS, membership plan sales, locker rentals, and cash reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportCSV}
            variant="outline"
            size="sm"
            className="h-8 text-xs font-medium border-slate-200 text-slate-700 hover:bg-slate-50"
            disabled={!salesData || salesData.transactions.length === 0}
          >
            <Download className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
            Export CSV
          </Button>

          <Button
            onClick={() => window.print()}
            variant="outline"
            size="sm"
            className="h-8 text-xs font-medium border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <Printer className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100 p-1 border border-slate-200">
          <TabsTrigger value="all-sales" className="text-xs font-semibold px-4 py-1.5">
            <Layers className="h-3.5 w-3.5 mr-1.5" />
            All Sales Report & Ledger
          </TabsTrigger>
          <TabsTrigger value="shift-reconciliation" className="text-xs font-semibold px-4 py-1.5">
            <Banknote className="h-3.5 w-3.5 mr-1.5" />
            Shift & Cash Drawer Balancing
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: ALL SALES REPORT */}
        <TabsContent value="all-sales" className="space-y-4">
          {/* Filter Bar */}
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardContent className="p-3.5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Left: Selectors */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Timeframe selector */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-[11px] font-medium text-slate-500">Period:</span>
                    <select
                      value={timeframe}
                      onChange={(e) => setTimeframe(e.target.value)}
                      className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="today">Today</option>
                      <option value="yesterday">Yesterday</option>
                      <option value="week">Last 7 Days</option>
                      <option value="month">This Month</option>
                      <option value="year">This Year</option>
                      <option value="all">All Time</option>
                    </select>
                  </div>

                  {/* Sales Stream Selector */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-[11px] font-medium text-slate-500">Stream:</span>
                    <select
                      value={stream}
                      onChange={(e) => setStream(e.target.value)}
                      className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">All Sales Streams</option>
                      <option value="POS">POS & Refreshments</option>
                      <option value="SUBSCRIPTION">Membership Plans</option>
                      <option value="RENTAL">Locker Rentals</option>
                    </select>
                  </div>

                  {/* Payment Channel Selector */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1">
                    <CreditCard className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-[11px] font-medium text-slate-500">Channel:</span>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">All Payment Methods</option>
                      <option value="TELEBIRR">Telebirr Mobile</option>
                      <option value="CBE_TRANSFER">CBE Birr / Transfer</option>
                      <option value="CASH">Cash Drawer</option>
                    </select>
                  </div>
                </div>

                {/* Right: Search & Refresh */}
                <div className="flex items-center gap-2">
                  <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Search ref, member, item..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-8 pl-8 text-xs border-slate-200"
                    />
                  </form>

                  <Button
                    onClick={fetchSalesReport}
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 border-slate-200 hover:bg-slate-50"
                    title="Refresh sales ledger"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 text-slate-600 ${loadingSales ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Grand Total */}
            <Card className="p-4 bg-[#1e3a8a] text-white border-transparent shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-blue-200">Total Gross Revenue</span>
                <DollarSign className="h-4 w-4 text-white" />
              </div>
              <div className="mt-2 text-2xl font-black text-white">
                {Number(salesData?.summary.totalGrossETB || 0).toLocaleString()}{" "}
                <span className="text-xs font-normal text-blue-200">ETB</span>
              </div>
              <div className="mt-1 text-[11px] text-blue-200 flex items-center gap-1">
                <span>{salesData?.summary.totalTransactionsCount || 0} transactions in selected period</span>
              </div>
            </Card>

            {/* POS Sales */}
            <Card className="p-4 bg-white border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">POS & Store Sales</span>
                <ShoppingBag className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900">
                {Number(salesData?.summary.posSalesTotalETB || 0).toLocaleString()}{" "}
                <span className="text-xs font-normal text-slate-500">ETB</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                {salesData?.summary.posSalesCount || 0} merchandise orders
              </div>
            </Card>

            {/* Membership Subscriptions */}
            <Card className="p-4 bg-white border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Membership Plans</span>
                <CreditCard className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900">
                {Number(salesData?.summary.subscriptionsTotalETB || 0).toLocaleString()}{" "}
                <span className="text-xs font-normal text-slate-500">ETB</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                {salesData?.summary.subscriptionsCount || 0} membership activations
              </div>
            </Card>

            {/* Locker Rentals */}
            <Card className="p-4 bg-white border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Locker Rentals</span>
                <KeyRound className="h-4 w-4 text-purple-600" />
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900">
                {Number(salesData?.summary.rentalsTotalETB || 0).toLocaleString()}{" "}
                <span className="text-xs font-normal text-slate-500">ETB</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                {salesData?.summary.rentalsCount || 0} rented lockers
              </div>
            </Card>
          </div>

          {/* Payment Channels Quick Summary Chips */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-blue-100 bg-blue-50/50">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-700">Telebirr Mobile</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-900">
                  {Number(salesData?.summary.channelSummary?.TELEBIRR?.totalETB || 0).toLocaleString()} ETB
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {salesData?.summary.channelSummary?.TELEBIRR?.count || 0} payments
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-purple-100 bg-purple-50/50">
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-semibold text-slate-700">CBE Transfer / Birr</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-900">
                  {Number(salesData?.summary.channelSummary?.CBE_TRANSFER?.totalETB || 0).toLocaleString()} ETB
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {salesData?.summary.channelSummary?.CBE_TRANSFER?.count || 0} slips
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-100 bg-emerald-50/50">
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-700">Physical Cash Drawer</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-900">
                  {Number(salesData?.summary.channelSummary?.CASH?.totalETB || 0).toLocaleString()} ETB
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {salesData?.summary.channelSummary?.CASH?.count || 0} cash receipts
                </span>
              </div>
            </div>
          </div>

          {/* Unified Transactions Ledger Table */}
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardHeader className="pb-3 pt-4 px-5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Comprehensive Sales Ledger
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Itemized record of all completed retail sales, memberships, and locker rentals.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-[11px] font-semibold text-slate-600">
                  {salesData?.transactions.length || 0} Records
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70">
                      <TableHead className="text-xs font-semibold">Date & Time</TableHead>
                      <TableHead className="text-xs font-semibold">Stream</TableHead>
                      <TableHead className="text-xs font-semibold">Reference #</TableHead>
                      <TableHead className="text-xs font-semibold">Customer / Member</TableHead>
                      <TableHead className="text-xs font-semibold">Description / Items</TableHead>
                      <TableHead className="text-xs font-semibold">Channel & Ref</TableHead>
                      <TableHead className="text-xs font-semibold">Staff</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Amount (ETB)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingSales ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-10 text-xs text-slate-400">
                          <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-slate-400" />
                          Loading audited sales transactions...
                        </TableCell>
                      </TableRow>
                    ) : !salesData || salesData.transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-10 text-xs text-slate-500">
                          No sales transactions found matching the selected timeframe and filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      salesData.transactions.map((t) => (
                        <TableRow key={t.id} className="hover:bg-slate-50/50">
                          {/* Date & Time */}
                          <TableCell className="text-xs whitespace-nowrap">
                            <div className="font-medium text-slate-800">
                              {formatDualDate(t.timestamp)}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(t.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </TableCell>

                          {/* Stream */}
                          <TableCell>
                            {t.stream === "POS" ? (
                              <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <ShoppingBag className="h-3 w-3" />
                                POS Retail
                              </span>
                            ) : t.stream === "SUBSCRIPTION" ? (
                              <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CreditCard className="h-3 w-3" />
                                Membership
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                <KeyRound className="h-3 w-3" />
                                Locker
                              </span>
                            )}
                          </TableCell>

                          {/* Reference Number */}
                          <TableCell className="text-xs font-mono font-medium text-slate-700">
                            {t.referenceNumber}
                          </TableCell>

                          {/* Customer */}
                          <TableCell className="text-xs">
                            <div className="font-semibold text-slate-900">{t.customerName}</div>
                            {t.customerCode !== "WALK_IN" && (
                              <div className="text-[10px] font-mono text-slate-400">
                                {t.customerCode}
                              </div>
                            )}
                          </TableCell>

                          {/* Description */}
                          <TableCell className="text-xs text-slate-600 max-w-xs truncate" title={t.description}>
                            {t.description}
                          </TableCell>

                          {/* Payment Channel & Ref */}
                          <TableCell className="text-xs whitespace-nowrap">
                            <div className="font-medium text-slate-800">
                              {t.paymentMethod === "TELEBIRR" ? (
                                <span className="text-blue-600 font-semibold">Telebirr</span>
                              ) : t.paymentMethod === "CBE_TRANSFER" ? (
                                <span className="text-purple-600 font-semibold">CBE Birr</span>
                              ) : (
                                <span className="text-emerald-600 font-semibold">Cash</span>
                              )}
                            </div>
                            {t.paymentRef && (
                              <div className="text-[10px] font-mono text-slate-400" title={`Ref: ${t.paymentRef}`}>
                                Ref: {t.paymentRef}
                              </div>
                            )}
                          </TableCell>

                          {/* Staff */}
                          <TableCell className="text-xs text-slate-600">
                            {t.staffName}
                          </TableCell>

                          {/* Amount */}
                          <TableCell className="text-xs text-right font-black text-slate-900 whitespace-nowrap">
                            {t.amountETB.toLocaleString()}{" "}
                            <span className="text-[10px] font-normal text-slate-400">ETB</span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: SHIFT & CASH RECONCILIATION */}
        <TabsContent value="shift-reconciliation" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left 2 Cols: Breakdown Table */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="border-slate-200 bg-white shadow-xs">
                <CardHeader className="pb-3 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold">Today's Channel Reconciliation Matrix</CardTitle>
                  <CardDescription className="text-xs">
                    Audited payment receipts captured across Front Desk & POS shifts
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/70">
                        <TableHead>Payment Channel</TableHead>
                        <TableHead>Transactions Count</TableHead>
                        <TableHead>Subtotal Amount (ETB)</TableHead>
                        <TableHead className="text-right">Share of Day</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shiftData &&
                        Object.entries(shiftData.breakdown).map(([method, info]) => {
                          const share =
                            shiftData.grandTotalETB > 0
                              ? ((info.totalETB / shiftData.grandTotalETB) * 100).toFixed(1)
                              : "0.0";
                          return (
                            <TableRow key={method}>
                              <TableCell className="font-semibold text-xs text-slate-800 flex items-center gap-2">
                                {method === "TELEBIRR" && <Smartphone className="h-4 w-4 text-blue-600" />}
                                {method === "CBE_TRANSFER" && <Landmark className="h-4 w-4 text-purple-600" />}
                                {method === "CASH" && <Banknote className="h-4 w-4 text-emerald-600" />}
                                {method}
                              </TableCell>
                              <TableCell className="text-xs text-slate-600">{info.count} receipts</TableCell>
                              <TableCell className="text-xs font-bold text-slate-900">
                                {Number(info.totalETB).toLocaleString()} ETB
                              </TableCell>
                              <TableCell className="text-xs text-right text-slate-500 font-mono">
                                {share}%
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Service Stream Volume */}
              <Card className="border-slate-200 bg-white shadow-xs p-4">
                <div className="text-xs font-bold text-slate-800 mb-3">Service Operations Volume Today</div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[11px] font-medium text-slate-500 block">POS Retail Orders</span>
                    <span className="text-lg font-black text-slate-900">{shiftData?.ordersCount || 0}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[11px] font-medium text-slate-500 block">Plan Memberships</span>
                    <span className="text-lg font-black text-slate-900">{shiftData?.subscriptionsCount || 0}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[11px] font-medium text-slate-500 block">Locker Rentals</span>
                    <span className="text-lg font-black text-slate-900">{shiftData?.rentalsCount || 0}</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Col: Register Cash Drawer Balancing */}
            <div>
              <Card className="border-slate-200 bg-white shadow-xs">
                <CardHeader className="pb-3 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold">Register Shift Cash Count</CardTitle>
                  <CardDescription className="text-xs">
                    Count physical banknotes in drawer to balance against ledger
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 px-5">
                  <div className="p-3 bg-slate-50 rounded-md border border-slate-200">
                    <div className="text-xs text-slate-500">Expected System Cash:</div>
                    <div className="text-xl font-bold text-slate-900">
                      {expectedCash.toLocaleString()} <span className="text-xs font-normal text-slate-500">ETB</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">
                      Actual Physical Cash Counted (ETB):
                    </label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={countedCash}
                      onChange={(e) => {
                        setCountedCash(e.target.value);
                        setReconciliationSaved(false);
                      }}
                      className="text-sm font-bold"
                    />
                  </div>

                  {countedCash !== "" && (
                    <div
                      className={`p-3 rounded-md text-xs font-medium ${
                        cashDifference === 0
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : cashDifference > 0
                          ? "bg-blue-50 text-blue-800 border border-blue-200"
                          : "bg-rose-50 text-rose-800 border border-rose-200"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span>Variance:</span>
                        <span className="font-bold">
                          {cashDifference > 0 ? `+${cashDifference.toLocaleString()}` : cashDifference.toLocaleString()} ETB
                        </span>
                      </div>
                      <div className="text-[11px] mt-1 opacity-80">
                        {cashDifference === 0
                          ? "Register is balanced."
                          : cashDifference > 0
                          ? "Cash surplus in register."
                          : "Cash shortage in drawer."}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => setReconciliationSaved(true)}
                    disabled={!countedCash || reconciliationSaved}
                    className="w-full h-9 text-xs font-semibold bg-[#1e3a8a] hover:bg-[#1e40af] text-white"
                  >
                    {reconciliationSaved ? "Shift Balancing Recorded" : "Confirm & Save Shift Closure"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
