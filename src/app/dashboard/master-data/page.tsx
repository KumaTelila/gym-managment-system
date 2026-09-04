"use client";

import { useState, useEffect } from "react";
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
  CreditCard,
  Landmark,
  Grid3X3,
  Package,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Power,
  Edit2,
  Trash2,
} from "lucide-react";

interface Plan {
  id: string;
  name: string;
  durationDays: number;
  priceETB: number;
  description: string | null;
  isActive: boolean;
}

interface PaymentAccount {
  id: string;
  code: string;
  name: string;
  accountNumber: string | null;
  accountHolder: string | null;
  instructions: string | null;
  isActive: boolean;
}

interface Locker {
  id: string;
  lockerNumber: string;
  section: string;
  status: string;
}

interface Product {
  id: string;
  barcode: string | null;
  name: string;
  costPriceETB: number;
  sellingPriceETB: number;
  currentStock: number;
  reorderLevel: number;
  isActive: boolean;
  category: { id: string; name: string };
}

interface Category {
  id: string;
  name: string;
}

export default function MasterDataPage() {
  const [activeTab, setActiveTab] = useState<"PLANS" | "PAYMENTS" | "LOCKERS" | "PRODUCTS">("PLANS");
  const [loading, setLoading] = useState(true);

  // Master data state
  const [plans, setPlans] = useState<Plan[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Create Dialog states
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isLockerOpen, setIsLockerOpen] = useState(false);
  const [isProductOpen, setIsProductOpen] = useState(false);

  // EDIT Dialog states
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editingPayment, setEditingPayment] = useState<PaymentAccount | null>(null);
  const [editingLocker, setEditingLocker] = useState<Locker | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Create Forms
  const [planName, setPlanName] = useState("");
  const [planDuration, setPlanDuration] = useState("30");
  const [planPrice, setPlanPrice] = useState("2500");
  const [planDesc, setPlanDesc] = useState("");

  const [payCode, setPayCode] = useState("");
  const [payName, setPayName] = useState("");
  const [payNumber, setPayNumber] = useState("");
  const [payHolder, setPayHolder] = useState("");
  const [payInstructions, setPayInstructions] = useState("");

  const [lockerMode, setLockerMode] = useState<"SINGLE" | "BATCH">("SINGLE");
  const [lockerNum, setLockerNum] = useState("");
  const [lockerSection, setLockerSection] = useState("MALE");
  const [batchPrefix, setBatchPrefix] = useState("M-");
  const [batchStart, setBatchStart] = useState("17");
  const [batchEnd, setBatchEnd] = useState("24");

  const [prodName, setProdName] = useState("");
  const [prodCatId, setProdCatId] = useState("");
  const [prodBarcode, setProdBarcode] = useState("");
  const [prodCost, setProdCost] = useState("50");
  const [prodPrice, setProdPrice] = useState("90");
  const [prodStock, setProdStock] = useState("20");

  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/master-data");
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
        setPaymentAccounts(data.paymentAccounts || []);
        setLockers(data.lockers || []);
        setProducts(data.products || []);
        setCategories(data.categories || []);
        if (data.categories?.length > 0 && !prodCatId) {
          setProdCatId(data.categories[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // TOGGLES
  const handleTogglePlan = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/master-data/plans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      if (res.ok) {
        setNotification(`Plan ${!current ? "activated" : "deactivated"}.`);
        loadData();
      }
    } catch {
      alert("Error toggling plan");
    }
  };

  const handleTogglePayment = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/master-data/payments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      if (res.ok) {
        setNotification(`Payment method ${!current ? "enabled" : "disabled"}.`);
        loadData();
      }
    } catch {
      alert("Error toggling payment account");
    }
  };

  const handleToggleProduct = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/master-data/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      if (res.ok) {
        setNotification(`Product ${!current ? "activated" : "archived"}.`);
        loadData();
      }
    } catch {
      alert("Error toggling product");
    }
  };

  const handleDeleteLocker = async (id: string, num: string) => {
    if (!confirm(`Are you sure you want to permanently delete locker ${num}?`)) return;
    try {
      const res = await fetch(`/api/master-data/lockers/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete locker");
      setNotification(`Locker ${num} removed from inventory.`);
      loadData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error deleting locker");
    }
  };

  // CREATE HANDLERS
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/master-data/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: planName,
          durationDays: planDuration,
          priceETB: planPrice,
          description: planDesc,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create plan");
      }
      setIsPlanOpen(false);
      setPlanName("");
      setNotification("Subscription plan created successfully.");
      loadData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error creating plan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/master-data/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: payCode,
          name: payName,
          accountNumber: payNumber,
          accountHolder: payHolder,
          instructions: payInstructions,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create payment account");
      }
      setIsPaymentOpen(false);
      setPayCode("");
      setPayName("");
      setNotification("Payment account master data saved.");
      loadData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error creating payment account");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateLocker = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/master-data/lockers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: lockerMode,
          lockerNumber: lockerNum,
          section: lockerSection,
          prefix: batchPrefix,
          startNum: batchStart,
          endNum: batchEnd,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create lockers");
      }
      setIsLockerOpen(false);
      setLockerNum("");
      setNotification("Locker assets updated in master inventory.");
      loadData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error creating lockers");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/master-data/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: prodName,
          categoryId: prodCatId,
          barcode: prodBarcode,
          costPriceETB: prodCost,
          sellingPriceETB: prodPrice,
          currentStock: prodStock,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create product");
      }
      setIsProductOpen(false);
      setProdName("");
      setProdBarcode("");
      setNotification("Product added to POS catalog master data.");
      loadData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error creating product");
    } finally {
      setSubmitting(false);
    }
  };

  // UPDATE HANDLERS
  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/master-data/plans/${editingPlan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingPlan.name,
          durationDays: editingPlan.durationDays,
          priceETB: editingPlan.priceETB,
          description: editingPlan.description,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update plan");
      }
      setEditingPlan(null);
      setNotification(`Plan "${editingPlan.name}" updated successfully.`);
      loadData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error updating plan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/master-data/payments/${editingPayment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingPayment.name,
          accountNumber: editingPayment.accountNumber,
          accountHolder: editingPayment.accountHolder,
          instructions: editingPayment.instructions,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update payment");
      }
      setEditingPayment(null);
      setNotification(`Payment account "${editingPayment.name}" updated successfully.`);
      loadData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error updating payment account");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateLocker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLocker) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/master-data/lockers/${editingLocker.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lockerNumber: editingLocker.lockerNumber,
          section: editingLocker.section,
          status: editingLocker.status,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update locker");
      }
      setEditingLocker(null);
      setNotification(`Locker "${editingLocker.lockerNumber}" updated.`);
      loadData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error updating locker");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/master-data/products/${editingProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingProduct.name,
          barcode: editingProduct.barcode,
          costPriceETB: editingProduct.costPriceETB,
          sellingPriceETB: editingProduct.sellingPriceETB,
          currentStock: editingProduct.currentStock,
          reorderLevel: editingProduct.reorderLevel,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update product");
      }
      setEditingProduct(null);
      setNotification(`Product "${editingProduct.name}" updated.`);
      loadData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error updating product");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Master Data Management
          </h1>
          <p className="text-xs text-slate-500">
            Centralized dictionary for subscription tiers, payment accounts, locker numbering, and retail catalog.
          </p>
        </div>

        <div className="flex space-x-2">
          {activeTab === "PLANS" && (
            <Button
              onClick={() => setIsPlanOpen(true)}
              className="bg-[#1e3a8a] text-white hover:bg-[#1e40af] h-8 text-xs font-semibold"
            >
              <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
              New Subscription Plan
            </Button>
          )}

          {activeTab === "PAYMENTS" && (
            <Button
              onClick={() => setIsPaymentOpen(true)}
              className="bg-[#1e3a8a] text-white hover:bg-[#1e40af] h-8 text-xs font-semibold"
            >
              <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
              Add Payment Method
            </Button>
          )}

          {activeTab === "LOCKERS" && (
            <Button
              onClick={() => setIsLockerOpen(true)}
              className="bg-[#1e3a8a] text-white hover:bg-[#1e40af] h-8 text-xs font-semibold"
            >
              <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
              Add / Batch Generate Lockers
            </Button>
          )}

          {activeTab === "PRODUCTS" && (
            <Button
              onClick={() => setIsProductOpen(true)}
              className="bg-[#1e3a8a] text-white hover:bg-[#1e40af] h-8 text-xs font-semibold"
            >
              <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
              Add Catalog Product
            </Button>
          )}
        </div>
      </div>

      {notification && (
        <div className="flex items-center space-x-2 rounded border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Tabs Row */}
      <div className="flex space-x-2 border-b border-slate-200 pb-3">
        {(
          [
            { id: "PLANS", label: `Subscription Plans (${plans.length})`, icon: CreditCard },
            { id: "PAYMENTS", label: `Payment Accounts (${paymentAccounts.length})`, icon: Landmark },
            { id: "LOCKERS", label: `Locker Inventory (${lockers.length})`, icon: Grid3X3 },
            { id: "PRODUCTS", label: `Retail Catalog (${products.length})`, icon: Package },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id);
                setNotification(null);
              }}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold rounded transition-colors ${
                isActive
                  ? "bg-[#1e3a8a] text-white shadow-2xs"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. SUBSCRIPTION PLANS TAB */}
      {activeTab === "PLANS" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Configured Subscription Plans</CardTitle>
            <CardDescription className="text-xs">
              Membership duration packages available to front desk staff for renewal. Click Edit to adjust rates or durations.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan Name</TableHead>
                  <TableHead>Duration (Days)</TableHead>
                  <TableHead>Rate (ETB)</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-semibold text-slate-900">{p.name}</TableCell>
                    <TableCell className="text-xs font-mono text-slate-700">{p.durationDays} days</TableCell>
                    <TableCell className="font-mono text-xs font-bold text-[#1e3a8a]">
                      {Number(p.priceETB).toLocaleString()} ETB
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{p.description || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={p.isActive ? "success" : "secondary"} className="text-[10px]">
                        {p.isActive ? "Active" : "Archived"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingPlan(p)}
                        className="h-7 text-xs px-2 border-slate-300 text-slate-700 hover:bg-slate-50"
                      >
                        <Edit2 className="h-3 w-3 mr-1 text-slate-500" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTogglePlan(p.id, p.isActive)}
                        className={`h-7 text-xs px-2 ${p.isActive ? "text-slate-600" : "text-emerald-700"}`}
                      >
                        <Power className="h-3 w-3 mr-1" />
                        {p.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 2. PAYMENT ACCOUNTS TAB */}
      {activeTab === "PAYMENTS" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Payment Methods & Settlement Accounts</CardTitle>
            <CardDescription className="text-xs">
              Configured banking and mobile wallet accounts (Telebirr, CBE, Awash, Cash). Click Edit to modify details.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel Code</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Account / Merchant #</TableHead>
                  <TableHead>Beneficiary / Holder</TableHead>
                  <TableHead>Verification Instructions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentAccounts.map((acc) => (
                  <TableRow key={acc.id}>
                    <TableCell className="font-mono text-xs font-bold text-slate-900">{acc.code}</TableCell>
                    <TableCell className="font-semibold text-slate-900">{acc.name}</TableCell>
                    <TableCell className="font-mono text-xs text-blue-900">{acc.accountNumber || "—"}</TableCell>
                    <TableCell className="text-xs text-slate-700">{acc.accountHolder || "—"}</TableCell>
                    <TableCell className="text-xs text-slate-500 max-w-xs truncate">{acc.instructions || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={acc.isActive ? "success" : "secondary"} className="text-[10px]">
                        {acc.isActive ? "Active" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingPayment(acc)}
                        className="h-7 text-xs px-2 border-slate-300 text-slate-700 hover:bg-slate-50"
                      >
                        <Edit2 className="h-3 w-3 mr-1 text-slate-500" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTogglePayment(acc.id, acc.isActive)}
                        className="h-7 text-xs px-2"
                      >
                        <Power className="h-3 w-3 mr-1" />
                        {acc.isActive ? "Disable" : "Enable"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 3. LOCKER ASSETS TAB */}
      {activeTab === "LOCKERS" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Physical Locker Inventory</CardTitle>
            <CardDescription className="text-xs">
              Configured physical storage units. Click Edit to change room section, number, or operational status.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Locker Number</TableHead>
                  <TableHead>Locker Room / Section</TableHead>
                  <TableHead>Operational Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lockers.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-xs font-bold text-slate-900">{l.lockerNumber}</TableCell>
                    <TableCell className="text-xs text-slate-700 capitalize">{l.section.toLowerCase()} Room</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          l.status === "AVAILABLE"
                            ? "success"
                            : l.status === "OCCUPIED"
                            ? "default"
                            : l.status === "RESERVED"
                            ? "warning"
                            : "destructive"
                        }
                        className="text-[10px]"
                      >
                        {l.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingLocker(l)}
                        className="h-7 text-xs px-2 border-slate-300 text-slate-700 hover:bg-slate-50"
                      >
                        <Edit2 className="h-3 w-3 mr-1 text-slate-500" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteLocker(l.id, l.lockerNumber)}
                        className="h-7 text-xs px-2 text-red-600 hover:bg-red-50 hover:border-red-300"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 4. RETAIL CATALOG TAB */}
      {activeTab === "PRODUCTS" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">POS Product Master Catalog</CardTitle>
            <CardDescription className="text-xs">
              Retail supplements, beverages, and merchandise sold at front desk. Click Edit to modify price, stock, or barcode.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Cost Price (ETB)</TableHead>
                  <TableHead>Selling Price (ETB)</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Reorder Threshold</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs text-slate-500">{p.barcode || "—"}</TableCell>
                    <TableCell className="font-semibold text-slate-900">{p.name}</TableCell>
                    <TableCell className="text-xs text-slate-600">{p.category.name}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">
                      {Number(p.costPriceETB).toLocaleString()} ETB
                    </TableCell>
                    <TableCell className="font-mono text-xs font-bold text-[#1e3a8a]">
                      {Number(p.sellingPriceETB).toLocaleString()} ETB
                    </TableCell>
                    <TableCell className="font-mono text-xs font-bold text-slate-900">
                      {p.currentStock} units
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">{p.reorderLevel}</TableCell>
                    <TableCell>
                      <Badge variant={p.isActive ? "success" : "secondary"} className="text-[10px]">
                        {p.isActive ? "Active" : "Archived"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingProduct(p)}
                        className="h-7 text-xs px-2 border-slate-300 text-slate-700 hover:bg-slate-50"
                      >
                        <Edit2 className="h-3 w-3 mr-1 text-slate-500" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleProduct(p.id, p.isActive)}
                        className={`h-7 text-xs px-2 ${p.isActive ? "text-slate-600" : "text-emerald-700"}`}
                      >
                        <Power className="h-3 w-3 mr-1" />
                        {p.isActive ? "Archive" : "Activate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* EDIT MODALS FOR ALL DATA TABLES */}
      {/* ========================================================================= */}

      {/* EDIT PLAN MODAL */}
      <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Subscription Plan</DialogTitle>
            <DialogDescription>Modify plan duration, price, or description.</DialogDescription>
          </DialogHeader>

          {editingPlan && (
            <form onSubmit={handleUpdatePlan} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Plan Name *</label>
                <Input
                  required
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  className="h-8 text-xs bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Duration (Days) *</label>
                  <Input
                    type="number"
                    required
                    value={editingPlan.durationDays}
                    onChange={(e) => setEditingPlan({ ...editingPlan, durationDays: parseInt(e.target.value, 10) || 0 })}
                    className="h-8 text-xs bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Rate (ETB) *</label>
                  <Input
                    type="number"
                    required
                    value={editingPlan.priceETB}
                    onChange={(e) => setEditingPlan({ ...editingPlan, priceETB: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-xs bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description</label>
                <Input
                  value={editingPlan.description || ""}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  className="h-8 text-xs bg-slate-50"
                />
              </div>

              <DialogFooter className="pt-3">
                <Button type="button" variant="outline" onClick={() => setEditingPlan(null)} className="h-8 text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="h-8 text-xs bg-[#1e3a8a] text-white">
                  {submitting ? "Saving..." : "Save Plan Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* EDIT PAYMENT MODAL */}
      <Dialog open={!!editingPayment} onOpenChange={() => setEditingPayment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Payment Method / Account</DialogTitle>
            <DialogDescription>Modify settlement account number or verification instructions.</DialogDescription>
          </DialogHeader>

          {editingPayment && (
            <form onSubmit={handleUpdatePayment} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Channel Code</label>
                  <Input
                    disabled
                    value={editingPayment.code}
                    className="h-8 text-xs bg-slate-100 font-mono opacity-70"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Display Name *</label>
                  <Input
                    required
                    value={editingPayment.name}
                    onChange={(e) => setEditingPayment({ ...editingPayment, name: e.target.value })}
                    className="h-8 text-xs bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Account / Merchant #</label>
                  <Input
                    value={editingPayment.accountNumber || ""}
                    onChange={(e) => setEditingPayment({ ...editingPayment, accountNumber: e.target.value })}
                    className="h-8 text-xs bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Account Holder</label>
                  <Input
                    value={editingPayment.accountHolder || ""}
                    onChange={(e) => setEditingPayment({ ...editingPayment, accountHolder: e.target.value })}
                    className="h-8 text-xs bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Verification Instructions</label>
                <Input
                  value={editingPayment.instructions || ""}
                  onChange={(e) => setEditingPayment({ ...editingPayment, instructions: e.target.value })}
                  className="h-8 text-xs bg-slate-50"
                />
              </div>

              <DialogFooter className="pt-3">
                <Button type="button" variant="outline" onClick={() => setEditingPayment(null)} className="h-8 text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="h-8 text-xs bg-[#1e3a8a] text-white">
                  {submitting ? "Saving..." : "Save Account Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* EDIT LOCKER MODAL */}
      <Dialog open={!!editingLocker} onOpenChange={() => setEditingLocker(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Locker Asset</DialogTitle>
            <DialogDescription>Modify locker number, room section, or operational status.</DialogDescription>
          </DialogHeader>

          {editingLocker && (
            <form onSubmit={handleUpdateLocker} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Locker Number *</label>
                  <Input
                    required
                    value={editingLocker.lockerNumber}
                    onChange={(e) => setEditingLocker({ ...editingLocker, lockerNumber: e.target.value })}
                    className="h-8 text-xs bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Room Section *</label>
                  <select
                    value={editingLocker.section}
                    onChange={(e) => setEditingLocker({ ...editingLocker, section: e.target.value })}
                    className="w-full h-8 rounded border border-slate-200 bg-slate-50 px-2 text-xs"
                  >
                    <option value="MALE">Male Locker Room</option>
                    <option value="FEMALE">Female Locker Room</option>
                    <option value="VIP">VIP Locker Room</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Operational Status *</label>
                <select
                  value={editingLocker.status}
                  onChange={(e) => setEditingLocker({ ...editingLocker, status: e.target.value })}
                  className="w-full h-8 rounded border border-slate-200 bg-slate-50 px-2 text-xs"
                >
                  <option value="AVAILABLE">AVAILABLE (Free to assign)</option>
                  <option value="OCCUPIED">OCCUPIED (In active session)</option>
                  <option value="RESERVED">RESERVED (Monthly rental)</option>
                  <option value="MAINTENANCE">MAINTENANCE (Defective lock/door)</option>
                </select>
              </div>

              <DialogFooter className="pt-3">
                <Button type="button" variant="outline" onClick={() => setEditingLocker(null)} className="h-8 text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="h-8 text-xs bg-[#1e3a8a] text-white">
                  {submitting ? "Saving..." : "Save Locker Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* EDIT PRODUCT MODAL */}
      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Product Catalog Item</DialogTitle>
            <DialogDescription>Modify pricing, barcode, or adjust stock levels.</DialogDescription>
          </DialogHeader>

          {editingProduct && (
            <form onSubmit={handleUpdateProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Product Name *</label>
                <Input
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="h-8 text-xs bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Barcode</label>
                  <Input
                    value={editingProduct.barcode || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                    className="h-8 text-xs bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Category</label>
                  <Input
                    disabled
                    value={editingProduct.category?.name || "General"}
                    className="h-8 text-xs bg-slate-100 opacity-70"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Cost Price (ETB)</label>
                  <Input
                    type="number"
                    value={editingProduct.costPriceETB}
                    onChange={(e) => setEditingProduct({ ...editingProduct, costPriceETB: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-xs bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Selling Price (ETB) *</label>
                  <Input
                    type="number"
                    required
                    value={editingProduct.sellingPriceETB}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sellingPriceETB: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-xs bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Current Stock (Units)</label>
                  <Input
                    type="number"
                    value={editingProduct.currentStock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, currentStock: parseInt(e.target.value, 10) || 0 })}
                    className="h-8 text-xs bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Reorder Level</label>
                  <Input
                    type="number"
                    value={editingProduct.reorderLevel}
                    onChange={(e) => setEditingProduct({ ...editingProduct, reorderLevel: parseInt(e.target.value, 10) || 0 })}
                    className="h-8 text-xs bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <DialogFooter className="pt-3">
                <Button type="button" variant="outline" onClick={() => setEditingProduct(null)} className="h-8 text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="h-8 text-xs bg-[#1e3a8a] text-white">
                  {submitting ? "Saving..." : "Save Product Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* CREATE MODALS */}
      {/* Modal: New Subscription Plan */}
      <Dialog open={isPlanOpen} onOpenChange={setIsPlanOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Subscription Plan</DialogTitle>
            <DialogDescription>Define duration and pricing for membership tiers.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePlan} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Plan Name *</label>
              <Input
                required
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="e.g. Student 2-Month Pass"
                className="h-8 text-xs bg-slate-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Duration (Days) *</label>
                <Input
                  type="number"
                  required
                  value={planDuration}
                  onChange={(e) => setPlanDuration(e.target.value)}
                  placeholder="e.g. 60"
                  className="h-8 text-xs bg-slate-50"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Price (ETB) *</label>
                <Input
                  type="number"
                  required
                  value={planPrice}
                  onChange={(e) => setPlanPrice(e.target.value)}
                  placeholder="e.g. 4500"
                  className="h-8 text-xs bg-slate-50"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Description</label>
              <Input
                value={planDesc}
                onChange={(e) => setPlanDesc(e.target.value)}
                placeholder="Optional plan perks, sauna access, etc."
                className="h-8 text-xs bg-slate-50"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsPlanOpen(false)} className="h-8 text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="h-8 text-xs bg-[#1e3a8a] text-white">
                {submitting ? "Saving..." : "Create Plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: New Payment Account */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Payment Method</DialogTitle>
            <DialogDescription>Add bank account or mobile wallet merchant information.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePayment} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Channel Code *</label>
                <Input
                  required
                  value={payCode}
                  onChange={(e) => setPayCode(e.target.value)}
                  placeholder="e.g. CBE_BIRR"
                  className="h-8 text-xs bg-slate-50 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Display Name *</label>
                <Input
                  required
                  value={payName}
                  onChange={(e) => setPayName(e.target.value)}
                  placeholder="e.g. CBE Birr Merchant"
                  className="h-8 text-xs bg-slate-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Account / Merchant #</label>
                <Input
                  value={payNumber}
                  onChange={(e) => setPayNumber(e.target.value)}
                  placeholder="e.g. 1000-xxxx-xxxx"
                  className="h-8 text-xs bg-slate-50"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Account Holder</label>
                <Input
                  value={payHolder}
                  onChange={(e) => setPayHolder(e.target.value)}
                  placeholder="Blow Fitness PLC"
                  className="h-8 text-xs bg-slate-50"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Verification Instructions</label>
              <Input
                value={payInstructions}
                onChange={(e) => setPayInstructions(e.target.value)}
                placeholder="Ask customer to present SMS confirmation..."
                className="h-8 text-xs bg-slate-50"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsPaymentOpen(false)} className="h-8 text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="h-8 text-xs bg-[#1e3a8a] text-white">
                {submitting ? "Saving..." : "Add Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Locker Generation */}
      <Dialog open={isLockerOpen} onOpenChange={setIsLockerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Locker Assets</DialogTitle>
            <DialogDescription>Create single units or bulk generate numbered lockers.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateLocker} className="space-y-3 text-xs">
            <div className="flex space-x-2 border-b border-slate-100 pb-2">
              <button
                type="button"
                onClick={() => setLockerMode("SINGLE")}
                className={`px-3 py-1 rounded text-xs font-semibold ${
                  lockerMode === "SINGLE" ? "bg-[#1e3a8a] text-white" : "border border-slate-200 text-slate-600"
                }`}
              >
                Single Locker
              </button>
              <button
                type="button"
                onClick={() => setLockerMode("BATCH")}
                className={`px-3 py-1 rounded text-xs font-semibold ${
                  lockerMode === "BATCH" ? "bg-[#1e3a8a] text-white" : "border border-slate-200 text-slate-600"
                }`}
              >
                Batch Range Generator
              </button>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Locker Room Section *</label>
              <select
                value={lockerSection}
                onChange={(e) => setLockerSection(e.target.value)}
                className="w-full h-8 rounded border border-slate-200 bg-slate-50 px-2 text-xs"
              >
                <option value="MALE">Male Locker Room</option>
                <option value="FEMALE">Female Locker Room</option>
                <option value="VIP">VIP Locker Room</option>
              </select>
            </div>

            {lockerMode === "SINGLE" ? (
              <div>
                <label className="block font-medium text-slate-700 mb-1">Locker Number *</label>
                <Input
                  required
                  value={lockerNum}
                  onChange={(e) => setLockerNum(e.target.value)}
                  placeholder="e.g. M-17 or F-15"
                  className="h-8 text-xs bg-slate-50 font-mono"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Prefix *</label>
                  <Input
                    required
                    value={batchPrefix}
                    onChange={(e) => setBatchPrefix(e.target.value)}
                    placeholder="e.g. M- or F-"
                    className="h-8 text-xs bg-slate-50 font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Start Number</label>
                    <Input
                      type="number"
                      value={batchStart}
                      onChange={(e) => setBatchStart(e.target.value)}
                      className="h-8 text-xs bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">End Number</label>
                    <Input
                      type="number"
                      value={batchEnd}
                      onChange={(e) => setBatchEnd(e.target.value)}
                      className="h-8 text-xs bg-slate-50"
                    />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsLockerOpen(false)} className="h-8 text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="h-8 text-xs bg-[#1e3a8a] text-white">
                {submitting ? "Generating..." : "Save Lockers"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: New Product */}
      <Dialog open={isProductOpen} onOpenChange={setIsProductOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Product to Catalog</DialogTitle>
            <DialogDescription>Define retail inventory item pricing and barcode.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Product Name *</label>
              <Input
                required
                value={prodName}
                onChange={(e) => setProdName(e.target.value)}
                placeholder="e.g. Creatine Monohydrate 300g"
                className="h-8 text-xs bg-slate-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Category *</label>
                <select
                  value={prodCatId}
                  onChange={(e) => setProdCatId(e.target.value)}
                  className="w-full h-8 rounded border border-slate-200 bg-slate-50 px-2 text-xs"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Barcode</label>
                <Input
                  value={prodBarcode}
                  onChange={(e) => setProdBarcode(e.target.value)}
                  placeholder="e.g. 600401"
                  className="h-8 text-xs bg-slate-50 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Cost (ETB)</label>
                <Input
                  type="number"
                  value={prodCost}
                  onChange={(e) => setProdCost(e.target.value)}
                  className="h-8 text-xs bg-slate-50 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Selling (ETB) *</label>
                <Input
                  type="number"
                  required
                  value={prodPrice}
                  onChange={(e) => setProdPrice(e.target.value)}
                  className="h-8 text-xs bg-slate-50 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Initial Stock</label>
                <Input
                  type="number"
                  value={prodStock}
                  onChange={(e) => setProdStock(e.target.value)}
                  className="h-8 text-xs bg-slate-50 font-mono"
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsProductOpen(false)} className="h-8 text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="h-8 text-xs bg-[#1e3a8a] text-white">
                {submitting ? "Saving..." : "Add Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
