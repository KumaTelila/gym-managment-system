"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Package, PlusCircle, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "@/components/ui/toaster";

interface ProductMinimal {
  id: string;
  name: string;
  currentStock: number;
  reorderLevel?: number;
}

interface QuickStockAdjustDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: ProductMinimal | null;
  productsList?: ProductMinimal[];
  onSuccess?: () => void;
}

export function QuickStockAdjustDialog({
  open,
  onOpenChange,
  product,
  productsList = [],
  onSuccess,
}: QuickStockAdjustDialogProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [mode, setMode] = useState<"ADD" | "SET">("ADD");
  const [quantity, setQuantity] = useState<string>("10");
  const [reason, setReason] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setSelectedProductId(product.id);
    } else if (productsList.length > 0 && !selectedProductId) {
      setSelectedProductId(productsList[0].id);
    }
  }, [product, productsList, selectedProductId]);

  const activeProduct = product || productsList.find((p) => p.id === selectedProductId);

  const numQty = parseInt(quantity, 10) || 0;
  const currentStock = activeProduct ? activeProduct.currentStock : 0;
  const newStock = mode === "ADD" ? currentStock + numQty : numQty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProduct) {
      toast.error("Error", "Please select a product to adjust.");
      return;
    }

    if (numQty <= 0) {
      toast.error("Invalid Quantity", "Please enter a valid positive quantity.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/pos/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: activeProduct.id,
          mode,
          quantity: numQty,
          type: mode === "ADD" ? "RESTOCK" : "AUDIT_CORRECTION",
          reason: reason.trim() || (mode === "ADD" ? "Delivery restock" : "Manual inventory count correction"),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update inventory.");

      toast.success("Inventory Updated", data.message || `Stock for ${activeProduct.name} updated to ${newStock} units.`);
      onOpenChange(false);
      setQuantity("10");
      setReason("");
      onSuccess?.();
    } catch (err: unknown) {
      toast.error("Restock Failed", err instanceof Error ? err.message : "Error adjusting stock");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 text-[#1e3a8a]">
            <div className="p-2 rounded-full bg-blue-50 border border-blue-200">
              <Package className="h-5 w-5" />
            </div>
            <DialogTitle className="text-base font-bold text-slate-900">
              Quick Stock Adjustment & Restock
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Replenish inventory or record physical count corrections for retail goods.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 my-2 text-xs">
          {/* Product Selection if not predefined */}
          {!product && productsList.length > 0 && (
            <div>
              <label className="block font-medium text-slate-700 mb-1">Select Product *</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full h-8 rounded border border-slate-200 bg-slate-50 px-2 text-xs font-semibold"
              >
                {productsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Current: {p.currentStock} units)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Active Product Details Box */}
          {activeProduct && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900 text-sm">{activeProduct.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Reorder Threshold: {activeProduct.reorderLevel ?? 5} units
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-medium">CURRENT COUNT</div>
                <div className="font-mono text-base font-black text-slate-900">
                  {activeProduct.currentStock} <span className="text-xs font-normal text-slate-500">units</span>
                </div>
              </div>
            </div>
          )}

          {/* Adjustment Mode: Add vs Set */}
          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setMode("ADD")}
              className={`py-1.5 text-xs font-semibold rounded transition-colors ${
                mode === "ADD"
                  ? "bg-white text-emerald-800 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              + Add Incoming (Restock)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("SET");
                setQuantity(String(currentStock));
              }}
              className={`py-1.5 text-xs font-semibold rounded transition-colors ${
                mode === "SET"
                  ? "bg-white text-blue-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              = Set Exact Physical Count
            </button>
          </div>

          {/* Quantity Input */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block font-medium text-slate-700">
                {mode === "ADD" ? "Units to Add to Inventory *" : "New Exact Stock Count *"}
              </label>
              {activeProduct && (
                <span className="text-[11px] font-mono text-slate-600">
                  Resulting Stock: <strong className="text-emerald-700 font-bold">{newStock} units</strong>
                </span>
              )}
            </div>
            <Input
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="h-8 text-xs font-mono font-bold bg-white"
            />
            {/* Quick Presets for ADD mode */}
            {mode === "ADD" && (
              <div className="flex gap-1.5 mt-1.5">
                {[6, 12, 24, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setQuantity(String(amt))}
                    className="flex-1 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
                  >
                    +{amt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reason / Note */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Reason / Delivery Slip Note
            </label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. New beverage crate shipment received"
              className="h-8 text-xs bg-slate-50"
            />
            <div className="flex gap-1 mt-1">
              {["Supplier Delivery", "Inventory Count Correction", "Damaged / Spoiled"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className="px-2 py-0.5 text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-600 rounded"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !activeProduct}
              className="h-8 text-xs font-bold bg-[#1e3a8a] text-white hover:bg-[#1e40af]"
            >
              {loading ? "Updating..." : `Confirm & Save (${newStock} Units)`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
