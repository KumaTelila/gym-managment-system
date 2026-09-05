"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, CreditCard, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";

export interface PaymentConfirmationDetails {
  title?: string;
  description?: string;
  customerName?: string;
  customerCode?: string;
  itemDescription: string;
  amountETB: number | string;
  paymentMethod: string;
  paymentRef?: string | null;
  extraDetails?: Record<string, string | number | undefined>;
}

interface PaymentConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  details: PaymentConfirmationDetails | null;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export function PaymentConfirmationDialog({
  open,
  onOpenChange,
  details,
  onConfirm,
  loading = false,
}: PaymentConfirmationDialogProps) {
  if (!details) return null;

  const formattedAmount =
    typeof details.amountETB === "number"
      ? details.amountETB.toLocaleString()
      : Number(details.amountETB || 0).toLocaleString();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2 text-amber-600">
            <div className="p-2 rounded-full bg-amber-50 border border-amber-200">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <DialogTitle className="text-base font-bold text-slate-900">
              {details.title || "Confirm Payment & Transaction"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            {details.description ||
              "Please carefully verify payment details before committing this financial record to the ledger."}
          </DialogDescription>
        </DialogHeader>

        <div className="my-3 space-y-3.5">
          {/* Main Total Highlight Card */}
          <div className="rounded-xl border border-slate-200 bg-linear-to-b from-slate-50 to-slate-100/60 p-4 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Total Amount Due
            </div>
            <div className="mt-1 font-mono text-3xl font-extrabold text-[#1e3a8a]">
              {formattedAmount} <span className="text-sm font-bold text-slate-600">ETB</span>
            </div>
            <div className="mt-2 flex items-center justify-center gap-2">
              <Badge variant="outline" className="bg-white text-xs font-semibold px-2.5 py-0.5 shadow-2xs">
                <CreditCard className="h-3 w-3 mr-1 text-slate-500" />
                {details.paymentMethod.replace("_", " ")}
              </Badge>
              {details.paymentRef && (
                <span className="font-mono text-[11px] text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                  Ref: {details.paymentRef}
                </span>
              )}
            </div>
          </div>

          {/* Breakdown Details */}
          <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 text-xs bg-white">
            {details.customerName && (
              <div className="flex justify-between items-center px-3.5 py-2">
                <span className="text-slate-500 font-medium">Customer / Member</span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  {details.customerName}
                  {details.customerCode && (
                    <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-1 rounded">
                      {details.customerCode}
                    </span>
                  )}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center px-3.5 py-2">
              <span className="text-slate-500 font-medium">Item / Service</span>
              <span className="font-semibold text-slate-800 text-right max-w-[220px] truncate">
                {details.itemDescription}
              </span>
            </div>

            {details.extraDetails &&
              Object.entries(details.extraDetails).map(
                ([key, val]) =>
                  val !== undefined && (
                    <div key={key} className="flex justify-between items-center px-3.5 py-2">
                      <span className="text-slate-500 font-medium">{key}</span>
                      <span className="font-semibold text-slate-800">{val}</span>
                    </div>
                  )
              )}
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
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back to Edit
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={loading}
            onClick={onConfirm}
            className="text-xs bg-[#1e3a8a] text-white hover:bg-[#1e40af] font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Confirm & Save Payment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
