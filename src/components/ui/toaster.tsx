"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  HelpCircle,
  X,
} from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info" | "confirm";

export interface ToastOptions {
  id?: string;
  title?: string;
  description?: string;
  duration?: number; // in ms, default 4500. For 'confirm', default is 0 (persistent until clicked)
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export interface ToastItem extends ToastOptions {
  id: string;
  type: ToastType;
  createdAt: number;
}

// Global subscribers set
type Listener = (toasts: ToastItem[]) => void;
let listeners: Listener[] = [];
let toastsState: ToastItem[] = [];

function notify() {
  listeners.forEach((listener) => listener([...toastsState]));
}

export const toast = {
  success: (title: string, descriptionOrOptions?: string | ToastOptions) => {
    return createToast("success", title, descriptionOrOptions);
  },
  error: (title: string, descriptionOrOptions?: string | ToastOptions) => {
    return createToast("error", title, descriptionOrOptions);
  },
  warning: (title: string, descriptionOrOptions?: string | ToastOptions) => {
    return createToast("warning", title, descriptionOrOptions);
  },
  info: (title: string, descriptionOrOptions?: string | ToastOptions) => {
    return createToast("info", title, descriptionOrOptions);
  },
  confirm: (
    title: string,
    description: string,
    options: {
      onConfirm: () => void | Promise<void>;
      onCancel?: () => void;
      confirmText?: string;
      cancelText?: string;
    }
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newToast: ToastItem = {
      id,
      type: "confirm",
      title,
      description,
      duration: 0, // persistent until confirmed or cancelled
      onConfirm: options.onConfirm,
      onCancel: options.onCancel,
      confirmText: options.confirmText || "Confirm",
      cancelText: options.cancelText || "Cancel",
      createdAt: Date.now(),
    };
    toastsState = [newToast, ...toastsState].slice(0, 8);
    notify();
    return id;
  },
  dismiss: (id: string) => {
    toastsState = toastsState.filter((t) => t.id !== id);
    notify();
  },
  clear: () => {
    toastsState = [];
    notify();
  },
};

function createToast(
  type: ToastType,
  title: string,
  descriptionOrOptions?: string | ToastOptions
): string {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  let options: ToastOptions = {};

  if (typeof descriptionOrOptions === "string") {
    options = { description: descriptionOrOptions };
  } else if (descriptionOrOptions) {
    options = descriptionOrOptions;
  }

  const newToast: ToastItem = {
    id,
    type,
    title,
    description: options.description,
    duration: options.duration !== undefined ? options.duration : 4500,
    onConfirm: options.onConfirm,
    onCancel: options.onCancel,
    confirmText: options.confirmText,
    cancelText: options.cancelText,
    createdAt: Date.now(),
  };

  toastsState = [newToast, ...toastsState].slice(0, 8);
  notify();
  return id;
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    listeners.push(setToasts);
    setToasts([...toastsState]);

    return () => {
      listeners = listeners.filter((l) => l !== setToasts);
    };
  }, []);

  const notificationToasts = toasts.filter((t) => t.type !== "confirm");
  const confirmToasts = toasts.filter((t) => t.type === "confirm");

  return (
    <>
      {/* 1. NOTIFICATION TOASTS (Success, Error, Warning, Info) -> Top Right */}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 sm:right-4 left-4 sm:left-auto z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        {notificationToasts.map((t) => (
          <ToastCard key={t.id} item={t} onDismiss={() => toast.dismiss(t.id)} />
        ))}
      </div>

      {/* 2. CONFIRMATION POPUPS -> CENTERED ON SCREEN WITH MODAL BACKDROP */}
      {confirmToasts.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md animate-in zoom-in-95 duration-200">
            {confirmToasts.map((t) => (
              <CenteredConfirmModal key={t.id} item={t} onDismiss={() => toast.dismiss(t.id)} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// Centered confirmation popup card
function CenteredConfirmModal({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: () => void;
}) {
  const [loadingAction, setLoadingAction] = useState(false);

  const handleConfirm = async () => {
    if (item.onConfirm) {
      try {
        setLoadingAction(true);
        await item.onConfirm();
      } finally {
        setLoadingAction(false);
        onDismiss();
      }
    } else {
      onDismiss();
    }
  };

  const handleCancel = () => {
    if (item.onCancel) item.onCancel();
    onDismiss();
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      className="relative w-full rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4"
    >
      <div className="flex items-start gap-3.5">
        <div className="shrink-0 rounded-xl bg-blue-50 border border-blue-200 p-2.5 text-[#1e3a8a]">
          <HelpCircle className="h-6 w-6" />
        </div>

        <div className="flex-1 min-w-0 pr-2">
          <h3 className="text-base font-bold text-slate-900 leading-snug">
            {item.title}
          </h3>
          {item.description && (
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed break-words">
              {item.description}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleCancel}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
        <button
          type="button"
          disabled={loadingAction}
          onClick={handleCancel}
          className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs"
        >
          {item.cancelText || "Cancel"}
        </button>

        <button
          type="button"
          disabled={loadingAction}
          onClick={handleConfirm}
          className="px-4 py-2 text-xs font-bold rounded-lg bg-[#1e3a8a] text-white hover:bg-[#1e40af] transition-colors shadow-xs"
        >
          {loadingAction ? "Processing..." : item.confirmText || "Confirm"}
        </button>
      </div>
    </div>
  );
}

// Notification Toast Card (Top-Right)
function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (item.duration && item.duration > 0 && !isHovered) {
      const timer = setTimeout(() => {
        onDismiss();
      }, item.duration);
      return () => clearTimeout(timer);
    }
  }, [item.duration, isHovered, onDismiss]);

  const config = {
    success: {
      border: "border-emerald-200 bg-white",
      iconColor: "text-emerald-600 bg-emerald-50 border-emerald-100",
      accent: "bg-emerald-500",
      icon: CheckCircle2,
    },
    error: {
      border: "border-red-200 bg-white",
      iconColor: "text-red-600 bg-red-50 border-red-100",
      accent: "bg-red-500",
      icon: XCircle,
    },
    warning: {
      border: "border-amber-200 bg-white",
      iconColor: "text-amber-600 bg-amber-50 border-amber-100",
      accent: "bg-amber-500",
      icon: AlertTriangle,
    },
    info: {
      border: "border-blue-200 bg-white",
      iconColor: "text-blue-600 bg-blue-50 border-blue-100",
      accent: "bg-[#1e3a8a]",
      icon: Info,
    },
    confirm: {
      border: "border-blue-300 bg-white shadow-lg",
      iconColor: "text-blue-700 bg-blue-50 border-blue-200",
      accent: "bg-blue-600",
      icon: HelpCircle,
    },
  }[item.type];

  const Icon = config.icon;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`pointer-events-auto relative overflow-hidden rounded-xl border p-3.5 shadow-md transition-all duration-200 animate-in slide-in-from-top-2 fade-in ${config.border}`}
      style={{
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
      }}
    >
      <div className={`absolute top-0 left-0 bottom-0 w-1 ${config.accent}`} />

      <div className="flex items-start gap-3 pl-1.5">
        <div
          className={`shrink-0 rounded-lg p-1.5 border flex items-center justify-center ${config.iconColor}`}
        >
          <Icon className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0 pr-4">
          <div className="font-bold text-xs text-slate-900 leading-snug">
            {item.title}
          </div>
          {item.description && (
            <div className="text-[11px] text-slate-600 mt-0.5 leading-relaxed break-words">
              {item.description}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-700 transition-colors p-0.5 rounded -mr-1 -mt-1"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
