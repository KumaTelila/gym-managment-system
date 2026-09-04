"use client";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Settings,
  Save,
  CheckCircle2,
  AlertTriangle,
  Landmark,
  Smartphone,
  ShieldAlert,
  Building2,
  Upload,
  Image as ImageIcon,
  Trash2,
  Dumbbell,
} from "lucide-react";
import { toast } from "@/components/ui/toaster";

interface SettingItem {
  id: string;
  key: string;
  value: string;
  category: "GENERAL" | "FINANCIAL" | "PAYMENT" | "POLICIES";
  description: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "GENERAL" | "FINANCIAL" | "PAYMENT" | "POLICIES"
  >("GENERAL");
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings || []);
        const map: Record<string, string> = {};
        (data.settings || []).forEach((s: SettingItem) => {
          map[s.key] = s.value;
        });
        setFormData(map);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (key: string, val: string) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
    setSuccessMessage(null);
  };

  const handleLogoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Invalid File", "Please select a valid image file (PNG, JPG, SVG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File Too Large", "Maximum image size is 5MB.");
      return;
    }

    setUploadingLogo(true);
    try {
      const data = new FormData();
      data.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: data,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to upload logo image");
      }

      const resData = await res.json();
      handleChange("facility_logo_url", resData.url);
      toast.success("Logo Uploaded", "Facility logo updated. Remember to save all changes.");
    } catch (err) {
      toast.error("Upload Error", err instanceof Error ? err.message : "Error uploading logo");
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
    }
  };

  const handleRemoveLogo = () => {
    handleChange("facility_logo_url", "");
    toast.info("Logo Removed", "Default system icon will be used until a new logo is saved.");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const payload = Object.entries(formData).map(([key, value]) => ({
      key,
      value,
    }));

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: payload }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to update configuration");

      setSuccessMessage(
        "System configuration saved successfully and audit entry created."
      );
      toast.success("Settings Saved", "Branding, financial rates, and policies updated.");
      loadSettings();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error saving configuration"
      );
      toast.error("Save Failed", err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  const tabSettings = settings.filter(
    (s) => s.category === activeTab && s.key !== "facility_logo_url"
  );

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            System Configuration
          </h1>
          <p className="text-xs text-slate-500">
            Operational policies, financial rates, payment settlement accounts, and branding.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="bg-[#1e3a8a] text-white hover:bg-[#1e40af] h-8 text-xs font-semibold shadow-2xs"
        >
          <Save className="h-3.5 w-3.5 mr-1.5" />
          {saving ? "Saving Changes..." : "Save All Changes"}
        </Button>
      </div>

      {successMessage && (
        <div className="flex items-center space-x-2 rounded border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center space-x-2 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {(
          [
            { id: "GENERAL", label: "General & Branding", icon: Building2 },
            { id: "FINANCIAL", label: "Financial & Rates", icon: Landmark },
            { id: "PAYMENT", label: "Payment Channels", icon: Smartphone },
            { id: "POLICIES", label: "Session & Hardware Policies", icon: Settings },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
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

      {/* Configuration Form Card */}
      <form onSubmit={handleSave}>
        <Card className="border-slate-200/90 shadow-xs bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold">
              {activeTab === "GENERAL" && "Facility Profile & Public Branding"}
              {activeTab === "FINANCIAL" && "Fees, Replacement Rates & Currency"}
              {activeTab === "PAYMENT" &&
                "Telebirr & Commercial Bank of Ethiopia (CBE) Settings"}
              {activeTab === "POLICIES" &&
                "Automated Rules & Receipt Print Customization"}
            </CardTitle>
            <CardDescription className="text-xs">
              Changes take effect immediately across all front desk sessions, cards, and receipts
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-5 text-xs">
            {/* Dedicated Brand Logo Upload Section in General & Branding */}
            {activeTab === "GENERAL" && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-900 block">
                      Facility Brand Logo
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Uploaded logo is displayed in the navigation header, sidebar, login portal, and printed PVC membership cards.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleLogoFileSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="h-8 text-xs font-medium bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-xs"
                    >
                      <Upload className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
                      {uploadingLogo ? "Uploading..." : "Upload Logo Image"}
                    </Button>

                    {formData.facility_logo_url && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveLogo}
                        className="h-8 text-xs font-medium text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 shadow-xs"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>

                {/* Logo Preview & URL Field */}
                <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                  <div className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 bg-white w-32 h-24 shrink-0 shadow-2xs overflow-hidden relative group">
                    {formData.facility_logo_url ? (
                      <img
                        src={formData.facility_logo_url}
                        alt="Facility Logo"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 text-center">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#1e3a8a] text-white mb-1 shadow-2xs">
                          <Dumbbell className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] font-medium text-slate-500">Default Icon</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 w-full space-y-1">
                    <label className="text-[11px] font-medium text-slate-600 block">
                      Logo Image URL or Local Path:
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. /uploads/logo.png or https://..."
                      value={formData.facility_logo_url || ""}
                      onChange={(e) => handleChange("facility_logo_url", e.target.value)}
                      className="h-8 text-xs bg-white border-slate-200 focus:bg-white"
                    />
                    <span className="text-[10px] text-slate-400 block">
                      Recommended: Transparent PNG or SVG (square or horizontal banner).
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Standard Settings Rows */}
            {loading ? (
              <div className="py-8 text-center text-slate-400">
                Loading settings...
              </div>
            ) : (
              tabSettings.map((s) => (
                <div
                  key={s.key}
                  className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <label className="font-semibold text-slate-900 block capitalize">
                      {s.key.replace(/_/g, " ")}
                    </label>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      {s.description}
                    </span>
                  </div>

                  <div className="md:col-span-2">
                    {s.key === "calendar_display_mode" ? (
                      <select
                        value={formData[s.key] || "DUAL"}
                        onChange={(e) => handleChange(s.key, e.target.value)}
                        className="w-full h-8 rounded border border-slate-300 bg-slate-50 px-2.5 text-xs"
                      >
                        <option value="DUAL">
                          DUAL — Show Both Gregorian (GC) & Ethiopian Calendar (EC)
                        </option>
                        <option value="GC_ONLY">
                          GC_ONLY — Show Gregorian Calendar Only
                        </option>
                      </select>
                    ) : (
                      <Input
                        value={formData[s.key] || ""}
                        onChange={(e) => handleChange(s.key, e.target.value)}
                        className="h-8 text-xs bg-slate-50/80 border-slate-300 focus:bg-white"
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>

          <CardFooter className="border-t border-slate-100 bg-slate-50/50 p-4 flex justify-between items-center">
            <div className="flex items-center space-x-1.5 text-slate-500 text-[11px]">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
              <span>
                All configuration updates are permanently timestamped in the audit log.
              </span>
            </div>

            <Button
              type="submit"
              disabled={saving || loading}
              className="bg-[#1e3a8a] text-white hover:bg-[#1e40af] h-8 text-xs font-semibold shadow-xs"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
