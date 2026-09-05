"use client";

import React, { useState, useEffect } from "react";
import { formatEthiopianNumericDate } from "@/lib/ethiopian-calendar";

export interface PhysicalCardMember {
  fullName: string;
  memberCode: string;
  cardVersion: number;
  phone?: string;
  gender?: string;
  photoUrl?: string | null;
  latestSub?: {
    startDate?: string | null;
    endDate?: string | null;
    amountPaidETB?: number | string | null;
    planName?: string;
  };
  subscriptions?: Array<{
    startDate?: string | null;
    endDate?: string | null;
    amountPaidETB?: number | string | null;
    plan?: { name: string; priceETB?: number | string };
  }>;
}

interface PhysicalMemberCardProps {
  member: PhysicalCardMember;
  qrDataUrl?: string;
  showQrInPhotoBox?: boolean;
  side?: "front" | "back" | "both";
  logoUrl?: string;
  facilityName?: string;
  className?: string;
}

/**
 * Recreates the exact physical monthly membership card used by Blow Fitness.
 * Front: Yellow ID card with Amharic fields, Ethiopian dates, and photo/QR box.
 * Back: Coral Red card with the 4 official gym rules in Amharic and watermark.
 */
export function PhysicalMemberCard({
  member,
  qrDataUrl,
  showQrInPhotoBox = true,
  side = "both",
  logoUrl: propLogo,
  facilityName: propName,
  className = "",
}: PhysicalMemberCardProps) {
  const [fetchedLogo, setFetchedLogo] = useState<string>("");
  const [fetchedName, setFetchedName] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    if (!propLogo || !propName) {
      fetch("/api/settings/public")
        .then((res) => res.json())
        .then((data) => {
          if (!isMounted) return;
          if (data.config?.facility_logo_url) {
            setFetchedLogo(data.config.facility_logo_url);
          }
          if (data.config?.facility_name) {
            setFetchedName(data.config.facility_name);
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [propLogo, propName]);

  const activeLogo = propLogo || fetchedLogo || "/blow.png";
  const activeName = propName || fetchedName || "BLOW FITNESS";

  // Extract subscription details
  const subFromList = member.subscriptions && member.subscriptions[0];
  const sub = member.latestSub || subFromList;

  // Compute fee
  const planPrice = subFromList?.plan?.priceETB;
  const feeAmount = sub?.amountPaidETB
    ? Number(sub.amountPaidETB).toLocaleString()
    : planPrice
    ? Number(planPrice).toLocaleString()
    : "1,850";

  // Compute Ethiopian dates (e.g. 08/07/18)
  const startDateStr = sub?.startDate
    ? formatEthiopianNumericDate(sub.startDate)
    : formatEthiopianNumericDate(new Date());

  const endDateStr = sub?.endDate
    ? formatEthiopianNumericDate(sub.endDate)
    : (() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return formatEthiopianNumericDate(d);
      })();

  return (
    <div className={`flex flex-wrap items-center justify-center gap-6 ${className}`}>
      {/* ========================================================================= */}
      {/* FRONT SIDE: Yellow Authentic Blow Fitness Card                             */}
      {/* ========================================================================= */}
      {(side === "front" || side === "both") && (
        <div
          style={{
            width: "350px",
            height: "220px",
            backgroundColor: "#fed700",
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}
          className="relative rounded-xl overflow-hidden bg-[#fed700] text-slate-900 border-2 border-slate-900 shadow-md flex flex-col justify-between select-none shrink-0 print:shadow-none"
        >
          {/* Main Card Content */}
          <div className="p-3.5 pb-1 flex flex-col justify-between flex-1">
            {/* Header: Logo & BLOW FITNESS banner */}
            <div className="flex items-center justify-between gap-2">
              {/* Left Logo Emblem */}
              <div className="flex items-center justify-center shrink-0 h-10 w-10 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeLogo}
                  alt={activeName}
                  className="h-10 max-h-10 w-10 max-w-10 object-contain drop-shadow-xs"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== "/logo.png") {
                      target.src = "/logo.png";
                    }
                  }}
                />
              </div>

              {/* Center/Right Brand Badge */}
              <div className="flex-1 max-w-[245px] text-center border-2 border-slate-900 rounded-lg bg-transparent py-0.5 px-2">
                <span
                  style={{
                    letterSpacing: "0.08em",
                    textShadow: "1px 1px 0 #000",
                  }}
                  className="font-black text-lg md:text-xl text-slate-900 uppercase font-sans leading-none block truncate"
                >
                  {activeName}
                </span>
              </div>
            </div>

            {/* Middle Section: Amharic Form Fields + Photo Box */}
            <div className="flex items-center justify-between gap-3 mt-2.5">
              {/* Left: Amharic Form Fields */}
              <div className="flex-1 space-y-2 text-[11px] font-medium leading-tight">
                {/* Field 1: Name (ስም) */}
                <div className="flex items-baseline">
                  <span className="font-extrabold text-slate-900 shrink-0 w-8 text-xs">
                    ስም
                  </span>
                  <div className="flex-1 border-b border-dotted border-slate-900 pb-0.5 pl-1 font-bold text-slate-950 truncate">
                    {member.fullName}
                  </div>
                </div>

                {/* Field 2: Fee / Amount (ክፍያ) */}
                <div className="flex items-baseline">
                  <span className="font-extrabold text-slate-900 shrink-0 w-8 text-xs">
                    ክፍያ
                  </span>
                  <div className="flex-1 border-b border-dotted border-slate-900 pb-0.5 pl-1 font-mono font-bold text-slate-950">
                    {feeAmount} ETB
                  </div>
                </div>

                {/* Field 3: Start Date (የጀመረበት ቀን) */}
                <div className="flex items-baseline">
                  <span className="font-extrabold text-slate-900 shrink-0 w-22 text-[10px]">
                    የጀመረበት ቀን
                  </span>
                  <div className="flex-1 border-b border-dotted border-slate-900 pb-0.5 pl-1 font-mono font-bold text-slate-950">
                    {startDateStr}
                  </div>
                </div>

                {/* Field 4: End Date (የሚያበቃበት ቀን) */}
                <div className="flex items-baseline">
                  <span className="font-extrabold text-slate-900 shrink-0 w-22 text-[10px]">
                    የሚያበቃበት ቀን
                  </span>
                  <div className="flex-1 border-b border-dotted border-slate-900 pb-0.5 pl-1 font-mono font-bold text-slate-950">
                    {endDateStr}
                  </div>
                </div>
              </div>

              {/* Right: Authentic Photo / Stamp Box */}
              <div className="shrink-0 flex flex-col items-center">
                <div
                  style={{
                    backgroundColor: showQrInPhotoBox && qrDataUrl ? "#ffffff" : "#fed700",
                    WebkitPrintColorAdjust: "exact",
                    printColorAdjust: "exact",
                  }}
                  className="w-[86px] h-[98px] border-2 border-slate-900 rounded-sm flex flex-col items-center justify-center overflow-hidden relative shadow-2xs print:shadow-none"
                >
                  {showQrInPhotoBox && qrDataUrl ? (
                    <div className="flex flex-col items-center justify-center p-1 bg-white w-full h-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrDataUrl}
                        alt="QR Card Code"
                        className="w-[74px] h-[74px] object-contain"
                      />
                      <span className="text-[7px] font-mono font-bold text-slate-700 leading-none mt-0.5">
                        {member.memberCode}
                      </span>
                    </div>
                  ) : member.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.photoUrl}
                      alt={member.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-600 text-center p-1">
                      <div className="w-8 h-8 rounded-full border border-slate-500 flex items-center justify-center mb-1">
                        <span className="font-mono text-xs font-bold text-slate-800">
                          ID
                        </span>
                      </div>
                      <span className="text-[8px] font-semibold uppercase tracking-wider text-slate-800">
                        PHOTO
                      </span>
                    </div>
                  )}
                </div>

                {/* Digital Code / Version tag */}
                <div className="text-[8px] font-mono font-bold text-slate-800 mt-1 flex items-center space-x-1">
                  <span>{member.memberCode}</span>
                  <span>•</span>
                  <span>v{member.cardVersion}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Solid Black Stripe */}
          <div
            style={{
              backgroundColor: "#020617",
              WebkitPrintColorAdjust: "exact",
              printColorAdjust: "exact",
            }}
            className="h-3 w-full bg-slate-950 shrink-0"
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* BACK SIDE: Coral Red Card with the 4 Gym Rules in Amharic                  */}
      {/* ========================================================================= */}
      {(side === "back" || side === "both") && (
        <div
          style={{
            width: "350px",
            height: "220px",
            backgroundColor: "#e64a38",
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}
          className="relative rounded-xl overflow-hidden bg-[#e64a38] text-slate-950 border-2 border-slate-900 shadow-md flex flex-col justify-between select-none shrink-0 print:shadow-none"
        >
          {/* Faint Background Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeLogo}
              alt="Gym Watermark"
              className="w-40 h-40 object-contain -rotate-12 filter grayscale contrast-200"
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== "/logo.png") {
                  target.src = "/logo.png";
                }
              }}
            />
          </div>

          {/* Card Inset Framed Content */}
          <div className="p-3.5 pb-1 flex flex-col justify-center flex-1 relative z-10">
            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                WebkitPrintColorAdjust: "exact",
                printColorAdjust: "exact",
              }}
              className="border border-slate-900/80 rounded-md p-3 bg-white/15 backdrop-blur-[1px] space-y-2"
            >
              {/* Rule 1 */}
              <div className="text-[10px] font-bold leading-snug tracking-tight text-slate-950">
                1. ለስፖርት ሲሰሩ በሚመጡበት ጊዜ መታወቂያውን መያዝ አይርሱ።
              </div>

              {/* Rule 2 */}
              <div className="text-[10px] font-bold leading-snug tracking-tight text-slate-950">
                2. በእርስዎ ካርድ ሌላ ሰው መጠቀም አይችልም።
              </div>

              {/* Rule 3 */}
              <div className="text-[10px] font-bold leading-snug tracking-tight text-slate-950">
                3. ካርዱን የጣለ ሰው 100 ብር ከፍሎ ሌላ መውሰድ ይችላል።
              </div>

              {/* Rule 4 */}
              <div className="text-[10px] font-bold leading-snug tracking-tight text-slate-950">
                4. የተከፈለ ገንዘብ አይመለስም።
              </div>
            </div>
          </div>

          {/* Bottom Solid Black Stripe */}
          <div
            style={{
              backgroundColor: "#020617",
              WebkitPrintColorAdjust: "exact",
              printColorAdjust: "exact",
            }}
            className="h-3 w-full bg-slate-950 shrink-0 relative z-10"
          />
        </div>
      )}
    </div>
  );
}
