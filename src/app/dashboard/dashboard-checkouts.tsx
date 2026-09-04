"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { toast } from "@/components/ui/toaster";

export function DashboardCheckouts({
  sessionId,
  lockerNumber,
}: {
  sessionId: string;
  lockerNumber: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCheckout = () => {
    toast.confirm(
      `Check out session (Locker ${lockerNumber || "None"})?`,
      "This will complete the workout session and immediately release the locker key.",
      {
        confirmText: "Check Out & Release",
        cancelText: "Cancel",
        onConfirm: async () => {
          setLoading(true);
          try {
            const res = await fetch(`/api/checkin/${sessionId}/checkout`, {
              method: "POST",
            });
            if (!res.ok) {
              const data = await res.json();
              throw new Error(data.error || "Failed to check out");
            }
            toast.success("Checkout Confirmed", `Locker ${lockerNumber || "None"} released successfully.`);
            router.refresh();
          } catch (e: unknown) {
            toast.error("Checkout Error", e instanceof Error ? e.message : "Error checking out");
          } finally {
            setLoading(false);
          }
        },
      }
    );
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCheckout}
      disabled={loading}
      className="h-7 text-xs px-2.5 text-slate-700 hover:bg-slate-100 hover:text-red-600 border-slate-300"
    >
      <LogOut className="h-3 w-3 mr-1" />
      {loading ? "Releasing..." : "Check Out"}
    </Button>
  );
}
