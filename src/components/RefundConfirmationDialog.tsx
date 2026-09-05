"use client";

import React, { useState } from "react";
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
import { AlertTriangle, Undo2, Loader2 } from "lucide-react";

interface RefundConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  customerName?: string;
  itemDescription?: string;
  amountETB?: number | string;
  onConfirm?: (reason: string) => void | Promise<void>;
  onConfirmRefund?: (reason: string) => void | Promise<void>;
  loading?: boolean;
}

export function RefundConfirmationDialog({
  open,
  onOpenChange,
  title = "Refund / Rollback Transaction",
  description,
  customerName,
  itemDescription,
  amountETB,
  onConfirm,
  onConfirmRefund,
  loading = false,
}: RefundConfirmationDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError("Please provide a reason or justification for this refund.");
      return;
    }
    setError(null);
    const callback = onConfirm || onConfirmRefund;
    if (callback) {
      await callback(reason.trim());
    }
    setReason("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) {
          setReason("");
          setError(null);
        }
        onOpenChange(val);
      }}
    >
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2 text-rose-600">
            <div className="p-2 rounded-full bg-rose-50 border border-rose-200">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="text-base font-bold text-slate-900">
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            {description || "This administrative action will cancel this transaction, reverse its financial impact, and permanently record an audit entry."}
          </DialogDescription>
        </DialogHeader>

        <div className="my-3 space-y-3">
          {(itemDescription || amountETB !== undefined || customerName) && (
            <div className="p-3 bg-rose-50/50 border border-rose-200 rounded-lg space-y-1.5 text-xs">
              {customerName && (
                <div className="flex justify-between items-center pb-1 border-b border-rose-100">
                  <span className="text-slate-500 text-[11px]">Customer / Member</span>
                  <span className="font-semibold text-slate-900">{customerName}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-slate-500 block text-[11px]">Transaction</span>
                  <span className="font-semibold text-slate-900">{itemDescription || "Record"}</span>
                </div>
                {amountETB !== undefined && (
                  <div className="text-right">
                    <span className="text-slate-500 block text-[11px]">Amount</span>
                    <span className="font-mono font-bold text-rose-700 text-sm">
                      {typeof amountETB === "number" ? amountETB.toLocaleString() : amountETB} ETB
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Refund Justification / Reason <span className="text-rose-600">*</span>
            </label>
            <Input
              type="text"
              autoFocus
              placeholder="e.g. Accidentally registered wrong plan / duplicate charge"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleConfirm();
                }
              }}
              className="text-xs h-9 bg-slate-50 border-slate-300"
            />
            {error && <p className="mt-1 text-[11px] text-rose-600 font-medium">{error}</p>}
          </div>
        </div>

        <DialogFooter className="flex flex-row justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={loading || !reason.trim()}
            onClick={handleConfirm}
            className="text-xs bg-rose-600 hover:bg-rose-700 font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Undo2 className="h-3.5 w-3.5 mr-1.5" />
                Confirm Refund & Rollback
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
