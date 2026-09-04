"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
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
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Printer,
  CheckCircle2,
  Package,
  Barcode,
  Clock,
  UserCheck,
  CreditCard,
  AlertCircle,
  Receipt,
  DollarSign,
  Coffee,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { formatDualDate } from "@/lib/ethiopian-calendar";
import { toast } from "@/components/ui/toaster";

interface Product {
  id: string;
  barcode: string | null;
  name: string;
  sellingPriceETB: number;
  currentStock: number;
  category: { name: string };
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface ActiveSessionMember {
  id: string;
  member: {
    id: string;
    fullName: string;
    memberCode: string;
    phone: string;
  };
  locker?: {
    lockerNumber: string;
  } | null;
}

interface OpenTabOrder {
  id: string;
  orderNumber: string;
  totalAmountETB: number;
  status: string;
  createdAt: string;
  member: {
    id: string;
    fullName: string;
    memberCode: string;
    phone: string;
  };
  cashier: {
    fullName: string;
    username: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    unitPriceETB: number;
    subtotalETB: number;
    product: {
      name: string;
    };
  }>;
}

interface CompletedOrder {
  id: string;
  orderNumber: string;
  totalAmountETB: number;
  paymentMethod: string;
  paymentRef: string | null;
  status: string;
  createdAt: string;
  member?: {
    fullName: string;
    memberCode: string;
  } | null;
  cashier?: {
    fullName: string;
  } | null;
  items: Array<{
    quantity: number;
    unitPriceETB: number;
    subtotalETB: number;
    product: { name: string };
  }>;
}

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [cart, setCart] = useState<CartItem[]>([]);

  // Navigation View: "pos" (Catalog & Cart) vs "tabs" (Open Gym Tabs)
  const [viewMode, setViewMode] = useState<"pos" | "tabs">("pos");
  const [openTabs, setOpenTabs] = useState<OpenTabOrder[]>([]);
  const [totalUnpaidTabsETB, setTotalUnpaidTabsETB] = useState<number>(0);
  const [activeGymMembers, setActiveGymMembers] = useState<ActiveSessionMember[]>([]);

  // Checkout Confirmation Modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<"IMMEDIATE" | "OPEN_TAB">("IMMEDIATE");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TELEBIRR" | "CBE_TRANSFER">("CASH");
  const [paymentRef, setPaymentRef] = useState("");
  const [cashTendered, setCashTendered] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Settle Open Tab Modal
  const [settlingTab, setSettlingTab] = useState<OpenTabOrder | null>(null);
  const [settlePaymentMethod, setSettlePaymentMethod] = useState<"CASH" | "TELEBIRR" | "CBE_TRANSFER">("CASH");
  const [settlePaymentRef, setSettlePaymentRef] = useState("");

  // Receipt Modal
  const [completedOrder, setCompletedOrder] = useState<CompletedOrder | null>(null);

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pos/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setCategories(data.categories || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadOpenTabs = async () => {
    try {
      const res = await fetch("/api/pos/tabs");
      if (res.ok) {
        const data = await res.json();
        setOpenTabs(data.tabs || []);
        setTotalUnpaidTabsETB(data.totalUnpaidETB || 0);
      }
    } catch {
      // ignore
    }
  };

  const loadActiveGymMembers = async () => {
    try {
      const res = await fetch("/api/checkin");
      if (res.ok) {
        const data = await res.json();
        setActiveGymMembers(data.activeSessions || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadCatalog();
    loadOpenTabs();
    loadActiveGymMembers();
  }, []);

  const handleAddToCart = (product: Product) => {
    if (product.currentStock <= 0) {
      toast.warning("Out of Stock", `${product.name} is currently out of stock.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.currentStock) {
          toast.warning("Max Stock Reached", `Only ${product.currentStock} available in inventory.`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty > item.product.currentStock) {
              toast.warning("Insufficient Stock", `Only ${item.product.currentStock} units available.`);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Barcode quick-scan enter
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;

    const matched = products.find(
      (p) =>
        p.barcode === search.trim() ||
        p.name.toLowerCase().includes(search.trim().toLowerCase())
    );

    if (matched) {
      handleAddToCart(matched);
      setSearch("");
      toast.success("Item Added", `${matched.name} added to cart.`);
    } else {
      toast.info("Not Found", `No product found matching "${search}".`);
    }
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + Number(item.product.sellingPriceETB) * item.quantity,
    0
  );

  // Pre-open checkout confirmation dialog
  const handleOpenCheckoutConfirmation = (mode: "IMMEDIATE" | "OPEN_TAB") => {
    if (cart.length === 0) {
      toast.warning("Empty Cart", "Please add items to the cart before checking out.");
      return;
    }
    setCheckoutMode(mode);
    if (mode === "OPEN_TAB" && activeGymMembers.length > 0 && !selectedMemberId) {
      setSelectedMemberId(activeGymMembers[0].member.id);
    }
    setCashTendered(String(cartTotal));
    setIsConfirmModalOpen(true);
  };

  // Process Confirmed Sale (either Pay Now or Gym Tab)
  const handleProcessConfirmedSale = async () => {
    if (cart.length === 0) return;

    if (checkoutMode === "OPEN_TAB" && !selectedMemberId) {
      toast.error("Member Required", "Please select an athlete to open a gym tab.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
          paymentMethod: checkoutMode === "IMMEDIATE" ? paymentMethod : "CASH",
          paymentRef: checkoutMode === "IMMEDIATE" ? paymentRef : undefined,
          memberId: selectedMemberId || undefined,
          status: checkoutMode === "OPEN_TAB" ? "OPEN_TAB" : "COMPLETED",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");

      if (checkoutMode === "OPEN_TAB") {
        const memberName =
          activeGymMembers.find((m) => m.member.id === selectedMemberId)?.member.fullName ||
          "Athlete";
        toast.success(
          "Gym Tab Opened",
          `${cartTotal.toLocaleString()} ETB charged to ${memberName}'s tab. Payment will be collected when leaving gym.`
        );
      } else {
        toast.success("Sale Completed", `Order #${data.order.orderNumber} successfully processed.`);
        setCompletedOrder(data.order);
      }

      setIsConfirmModalOpen(false);
      setCart([]);
      setPaymentRef("");
      setSelectedMemberId("");
      loadCatalog();
      loadOpenTabs();
    } catch (err: unknown) {
      toast.error("Checkout Failed", err instanceof Error ? err.message : "Error processing sale");
    } finally {
      setSubmitting(false);
    }
  };

  // Settle an Open Tab (Pay when leaving gym)
  const handleSettleTabSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingTab) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/pos/tabs/${settlingTab.id}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: settlePaymentMethod,
          paymentRef: settlePaymentRef,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to settle tab");

      toast.success(
        "Tab Settled Successfully",
        `${Number(settlingTab.totalAmountETB).toLocaleString()} ETB payment recorded for ${settlingTab.member.fullName}.`
      );

      setCompletedOrder(data.order);
      setSettlingTab(null);
      setSettlePaymentRef("");
      loadOpenTabs();
    } catch (err: unknown) {
      toast.error("Settlement Error", err instanceof Error ? err.message : "Failed to settle tab");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === "ALL" || p.category.name === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.includes(search));
    return matchesCat && matchesSearch;
  });

  const changeDue = Math.max(0, Number(cashTendered || 0) - cartTotal);

  return (
    <div className="space-y-5">
      {/* Top Header & Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Point of Sale (POS) & Gym Cafe
            {openTabs.length > 0 && (
              <Badge variant="warning" className="text-[10px] font-bold">
                {openTabs.length} Open Tabs ({totalUnpaidTabsETB.toLocaleString()} ETB)
              </Badge>
            )}
          </h1>
          <p className="text-xs text-slate-500">
            Dispense water, drinks, and supplements with instant sales confirmation and gym tab settlement on exit.
          </p>
        </div>

        {/* View Mode Pills: POS vs Open Tabs */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("pos")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              viewMode === "pos" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShoppingCart className="h-3.5 w-3.5 text-[#1e3a8a]" />
            POS Terminal
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("tabs");
              loadOpenTabs();
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              viewMode === "tabs" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            Open Gym Tabs ({openTabs.length})
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: STANDARD POS CATALOG & CART */}
      {viewMode === "pos" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left 2 Cols: Catalog & Search */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="p-3">
                <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <Barcode className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Scan barcode or search product name (e.g. Water, Powerade)..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 h-8 text-xs bg-slate-50 border-slate-200"
                    />
                  </div>
                  <Button type="submit" variant="outline" className="h-8 text-xs px-3">
                    Scan / Add
                  </Button>
                </form>

                {/* Category Filter Pills */}
                <div className="flex flex-wrap gap-1 mt-3">
                  <button
                    onClick={() => setSelectedCategory("ALL")}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                      selectedCategory === "ALL"
                        ? "bg-[#1e3a8a] text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    All Items
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCategory(c.name)}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                        selectedCategory === c.name
                          ? "bg-[#1e3a8a] text-white"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Product Items Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.map((product) => {
                const inStock = product.currentStock > 0;

                return (
                  <Card
                    key={product.id}
                    onClick={() => inStock && handleAddToCart(product)}
                    className={`p-3 transition-all cursor-pointer hover:border-blue-400 flex flex-col justify-between ${
                      !inStock ? "opacity-60 bg-slate-50 cursor-not-allowed" : "bg-white hover:shadow-xs"
                    }`}
                  >
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-slate-400">
                        {product.category.name}
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-1 line-clamp-2">
                        {product.name}
                      </div>
                      {product.barcode && (
                        <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                          #{product.barcode}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-sm font-extrabold text-[#1e3a8a]">
                          {Number(product.sellingPriceETB).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-500 ml-1">ETB</span>
                      </div>

                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          inStock
                            ? product.currentStock <= 5
                              ? "bg-amber-50 text-amber-700"
                              : "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {inStock ? `${product.currentStock} in stock` : "Out of stock"}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Right 1 Col: Cart & Confirmation Controls */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="flex flex-col h-full border-slate-200 shadow-2xs">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center space-x-1.5">
                    <ShoppingCart className="h-4 w-4 text-[#1e3a8a]" />
                    <span>Selected Items</span>
                  </CardTitle>
                  <span className="text-xs text-slate-500 font-mono">
                    {cart.reduce((s, i) => s + i.quantity, 0)} items
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-3 flex-1 overflow-y-auto max-h-80 space-y-2">
                {cart.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Cart is empty. Click any item (e.g. Water) to add.
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center justify-between p-2 rounded bg-slate-50/80 border border-slate-200 text-xs"
                    >
                      <div className="flex-1 pr-2">
                        <div className="font-semibold text-slate-900 leading-tight">
                          {item.product.name}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {Number(item.product.sellingPriceETB).toLocaleString()} ETB each
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleUpdateQty(item.product.id, -1)}
                          className="h-6 w-6 rounded border border-slate-300 bg-white flex items-center justify-center hover:bg-slate-100 text-slate-600"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-5 text-center font-bold text-xs font-mono">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQty(item.product.id, 1)}
                          className="h-6 w-6 rounded border border-slate-300 bg-white flex items-center justify-center hover:bg-slate-100 text-slate-600"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleRemoveFromCart(item.product.id)}
                          className="h-6 w-6 ml-1 text-slate-400 hover:text-red-600 flex items-center justify-center"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>

              <CardFooter className="p-3 border-t border-slate-100 flex flex-col space-y-3 bg-slate-50/50">
                <div className="w-full flex justify-between items-baseline">
                  <span className="text-xs text-slate-600 font-medium">Total Amount:</span>
                  <div className="text-right">
                    <span className="text-xl font-black text-[#1e3a8a]">
                      {cartTotal.toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-slate-700 ml-1">ETB</span>
                  </div>
                </div>

                {/* Checkout Confirmation Buttons */}
                <div className="w-full space-y-2 pt-1">
                  {/* Button 1: Immediate Settlement */}
                  <Button
                    disabled={cart.length === 0}
                    onClick={() => handleOpenCheckoutConfirmation("IMMEDIATE")}
                    className="w-full h-9 bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <DollarSign className="h-4 w-4" />
                    Pay Now (Instant Checkout)
                  </Button>

                  {/* Button 2: Gym Tab (Pay on Leave) */}
                  <Button
                    disabled={cart.length === 0}
                    variant="outline"
                    onClick={() => handleOpenCheckoutConfirmation("OPEN_TAB")}
                    className="w-full h-9 border-blue-300 bg-blue-50/60 text-blue-900 hover:bg-blue-100 text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Clock className="h-4 w-4 text-blue-700" />
                    Charge to Gym Tab (Pay on Exit)
                  </Button>
                  <p className="text-[10px] text-slate-400 text-center">
                    Athlete takes water/drink now and settles payment at front desk when leaving.
                  </p>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      ) : (
        /* VIEW MODE 2: OPEN GYM TABS (UNPAID ITEMS) */
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  Active Unpaid Gym Tabs
                </CardTitle>
                <CardDescription className="text-xs">
                  Refreshments & items taken by athletes during workout. Collect payment upon gym departure.
                </CardDescription>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 mr-2">Total Outstanding:</span>
                <span className="font-mono font-bold text-base text-amber-700">
                  {totalUnpaidTabsETB.toLocaleString()} ETB
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {openTabs.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto opacity-60" />
                <div className="font-semibold text-slate-600">All Gym Tabs Are Settled!</div>
                <div className="text-[11px]">No unpaid refreshments or items pending at the moment.</div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {openTabs.map((tab) => (
                  <div
                    key={tab.id}
                    className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-slate-900">
                          {tab.member?.fullName}
                        </span>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {tab.member?.memberCode}
                        </Badge>
                        <Badge variant="warning" className="text-[9px] font-bold">
                          Unpaid Tab
                        </Badge>
                      </div>

                      {/* Items Taken */}
                      <div className="text-xs text-slate-700 flex flex-wrap items-center gap-2">
                        {tab.items.map((i) => (
                          <span
                            key={i.id}
                            className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px] font-medium"
                          >
                            {i.quantity}x {i.product.name} ({Number(i.subtotalETB).toLocaleString()} ETB)
                          </span>
                        ))}
                      </div>

                      <div className="text-[10px] text-slate-400 flex items-center gap-2">
                        <span>Order #{tab.orderNumber}</span>
                        <span>•</span>
                        <span>Dispensed by {tab.cashier?.fullName || "Staff"}</span>
                        <span>•</span>
                        <span>{new Date(tab.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <div className="text-right">
                        <div className="text-xs text-slate-400">Balance Due</div>
                        <div className="text-base font-extrabold text-[#1e3a8a]">
                          {Number(tab.totalAmountETB).toLocaleString()} ETB
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => {
                          setSettlingTab(tab);
                          setSettlePaymentMethod("CASH");
                          setSettlePaymentRef("");
                        }}
                        className="h-8 text-xs font-bold bg-[#1e3a8a] text-white hover:bg-[#1e40af]"
                      >
                        Settle Tab
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* CHECKOUT CONFIRMATION DIALOG (Mandatory Confirmation Process) */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-[#1e3a8a]" />
              Confirm POS Transaction
            </DialogTitle>
            <DialogDescription>
              Review items and confirm payment terms before completing order.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setCheckoutMode("IMMEDIATE")}
                className={`py-1.5 text-xs font-semibold rounded transition-colors ${
                  checkoutMode === "IMMEDIATE"
                    ? "bg-white text-emerald-800 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Immediate Settlement (Pay Now)
              </button>
              <button
                type="button"
                onClick={() => setCheckoutMode("OPEN_TAB")}
                className={`py-1.5 text-xs font-semibold rounded transition-colors ${
                  checkoutMode === "OPEN_TAB"
                    ? "bg-white text-blue-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Gym Tab (Pay on Exit)
              </button>
            </div>

            {/* Order Items Breakdown */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1.5 max-h-36 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.product.id} className="flex justify-between items-center text-xs">
                  <span className="text-slate-800 font-medium">
                    {item.quantity}x {item.product.name}
                  </span>
                  <span className="font-mono text-slate-700">
                    {(Number(item.product.sellingPriceETB) * item.quantity).toLocaleString()} ETB
                  </span>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-1.5 mt-1 flex justify-between items-baseline font-bold text-slate-900">
                <span>Total Amount:</span>
                <span className="text-base text-[#1e3a8a]">{cartTotal.toLocaleString()} ETB</span>
              </div>
            </div>

            {/* MODE A: IMMEDIATE PAYMENT */}
            {checkoutMode === "IMMEDIATE" ? (
              <div className="space-y-3">
                {/* Payment Method Options */}
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Payment Method</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["CASH", "TELEBIRR", "CBE_TRANSFER"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMethod(m)}
                        className={`py-1.5 text-xs font-bold rounded border transition-colors ${
                          paymentMethod === m
                            ? "bg-[#1e3a8a] text-white border-[#1e3a8a]"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {m === "CBE_TRANSFER" ? "CBE Birr" : m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* If Cash: Calculator & Tendered Presets */}
                {paymentMethod === "CASH" ? (
                  <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-2.5 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-emerald-900">Cash Tendered:</span>
                      <Input
                        type="number"
                        value={cashTendered}
                        onChange={(e) => setCashTendered(e.target.value)}
                        className="w-24 h-7 text-right text-xs bg-white font-bold"
                      />
                    </div>
                    {/* Quick Cash Presets */}
                    <div className="flex gap-1">
                      {[cartTotal, 50, 100, 200, 500].map((amt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCashTendered(String(amt))}
                          className="flex-1 py-1 text-[10px] font-semibold bg-white border border-emerald-300 rounded hover:bg-emerald-100/50"
                        >
                          {idx === 0 ? "Exact" : `${amt} ETB`}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-emerald-200/80">
                      <span className="font-bold text-emerald-900">Change Due:</span>
                      <span className="text-sm font-extrabold text-emerald-700 font-mono">
                        {changeDue.toLocaleString()} ETB
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Transaction Slip / SMS Reference *
                    </label>
                    <Input
                      required
                      placeholder="e.g. TXN-928374 or Telebirr code"
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      className="h-8 text-xs bg-slate-50 font-mono"
                    />
                  </div>
                )}
              </div>
            ) : (
              /* MODE B: GYM TAB (PAY ON EXIT) */
              <div className="space-y-3">
                <div className="rounded-lg bg-blue-50/80 border border-blue-200 p-2.5 flex items-start gap-2 text-blue-900">
                  <Coffee className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 text-[11px] leading-relaxed">
                    <div className="font-bold">Athlete Taking Items During Workout:</div>
                    <div>
                      Items will be dispensed now. The charge will be linked to the athlete's open tab and automatically collected when they exit the gym.
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Select Athlete Currently in Gym *
                  </label>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full h-8 rounded border border-slate-200 bg-slate-50 px-2 text-xs font-semibold"
                    required
                  >
                    <option value="">-- Choose active athlete --</option>
                    {activeGymMembers.map((s) => (
                      <option key={s.member.id} value={s.member.id}>
                        {s.member.fullName} ({s.member.memberCode}) • Locker:{" "}
                        {s.locker?.lockerNumber || "None"}
                      </option>
                    ))}
                  </select>
                  {activeGymMembers.length === 0 && (
                    <span className="text-[10px] text-amber-700 block mt-1">
                      No members currently checked in. Check in the athlete first or choose Immediate Settlement.
                    </span>
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsConfirmModalOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={submitting || (checkoutMode === "OPEN_TAB" && !selectedMemberId)}
                onClick={handleProcessConfirmedSale}
                className={`h-8 text-xs font-bold text-white ${
                  checkoutMode === "IMMEDIATE"
                    ? "bg-emerald-700 hover:bg-emerald-800"
                    : "bg-[#1e3a8a] hover:bg-[#1e40af]"
                }`}
              >
                {submitting
                  ? "Processing..."
                  : checkoutMode === "IMMEDIATE"
                  ? `Confirm Sale (${cartTotal.toLocaleString()} ETB)`
                  : `Confirm & Open Gym Tab`}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* SETTLE OPEN TAB MODAL */}
      <Dialog open={!!settlingTab} onOpenChange={() => setSettlingTab(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4 text-emerald-600" />
              Settle Gym Tab
            </DialogTitle>
            <DialogDescription>
              Collect payment for items taken by{" "}
              <strong>{settlingTab?.member?.fullName}</strong> ({settlingTab?.member?.memberCode}).
            </DialogDescription>
          </DialogHeader>

          {settlingTab && (
            <form onSubmit={handleSettleTabSubmit} className="space-y-3 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5">
                <div className="font-semibold text-slate-700 mb-1">Unpaid Refreshments / Items:</div>
                {settlingTab.items.map((i) => (
                  <div key={i.id} className="flex justify-between text-slate-800">
                    <span>
                      {i.quantity}x {i.product.name}
                    </span>
                    <span className="font-mono font-semibold">{Number(i.subtotalETB).toLocaleString()} ETB</span>
                  </div>
                ))}
                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900">
                  <span>Total Due:</span>
                  <span className="text-base text-emerald-700">
                    {Number(settlingTab.totalAmountETB).toLocaleString()} ETB
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["CASH", "TELEBIRR", "CBE_TRANSFER"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSettlePaymentMethod(m)}
                      className={`py-1.5 text-xs font-bold rounded border transition-colors ${
                        settlePaymentMethod === m
                          ? "bg-[#1e3a8a] text-white border-[#1e3a8a]"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {m === "CBE_TRANSFER" ? "CBE Birr" : m}
                    </button>
                  ))}
                </div>
              </div>

              {settlePaymentMethod !== "CASH" && (
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Transaction Reference Slip # / SMS
                  </label>
                  <Input
                    placeholder="e.g. Telebirr code"
                    value={settlePaymentRef}
                    onChange={(e) => setSettlePaymentRef(e.target.value)}
                    className="h-8 text-xs bg-slate-50 font-mono"
                  />
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSettlingTab(null)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-8 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                >
                  {submitting ? "Processing..." : "Confirm Payment & Settle Tab"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* 80mm THERMAL RECEIPT PRINT MODAL */}
      <Dialog open={!!completedOrder} onOpenChange={() => setCompletedOrder(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Receipt Generated</DialogTitle>
            <DialogDescription>
              Order #{completedOrder?.orderNumber} processed successfully.
            </DialogDescription>
          </DialogHeader>

          {completedOrder && (
            <div className="printable-card-area p-3 bg-white border border-slate-200 rounded font-mono text-xs text-slate-800 space-y-2">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <div className="font-bold text-sm uppercase">BLOW FITNESS</div>
                <div className="text-[10px] text-slate-500">Addis Ababa, Ethiopia</div>
                <div className="text-[10px] text-slate-500">Tel: +251 11 000 0000</div>
              </div>

              <div className="text-[10px] flex justify-between text-slate-500">
                <span>{completedOrder.orderNumber}</span>
                <span>{new Date(completedOrder.createdAt).toLocaleTimeString()}</span>
              </div>

              {completedOrder.member && (
                <div className="text-[11px] font-bold text-slate-900 border-b border-dashed border-slate-200 pb-1">
                  Athlete: {completedOrder.member.fullName} ({completedOrder.member.memberCode})
                </div>
              )}

              <div className="border-b border-dashed border-slate-300 py-1 space-y-1">
                {completedOrder.items.map((i, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span>
                      {i.quantity}x {i.product.name}
                    </span>
                    <span className="font-bold">{Number(i.subtotalETB).toLocaleString()} ETB</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between font-bold text-sm pt-1">
                <span>TOTAL PAID:</span>
                <span>{Number(completedOrder.totalAmountETB).toLocaleString()} ETB</span>
              </div>

              <div className="text-[10px] text-slate-500 flex justify-between">
                <span>Method: {completedOrder.paymentMethod}</span>
                <span>Ref: {completedOrder.paymentRef || "—"}</span>
              </div>

              <div className="text-center pt-2 text-[9px] text-slate-400 border-t border-dashed border-slate-300">
                Thank you for training with Blow Fitness!
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCompletedOrder(null)}
              className="text-xs"
            >
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => window.print()}
              className="text-xs bg-[#1e3a8a] text-white hover:bg-[#1e40af]"
            >
              <Printer className="h-3 w-3 mr-1" />
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
