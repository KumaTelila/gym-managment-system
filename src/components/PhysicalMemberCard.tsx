"use client";

import React from "react";
import { Dumbbell } from "lucide-react";
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
  className = "",
}: PhysicalMemberCardProps) {
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
    : formatEthiopianNumericDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

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
          }}
          className="relative rounded-xl overflow-hidden bg-[#fed700] text-slate-900 border-2 border-slate-900 shadow-md flex flex-col justify-between select-none shrink-0"
        >
          {/* Main Card Content */}
          <div className="p-3.5 pb-1 flex flex-col justify-between flex-1">
            {/* Header: Logo & BLOW FITNESS banner */}
            <div className="flex items-center justify-between gap-2">
              {/* Left Logo Emblem */}
              <div className="flex flex-col items-center leading-none">
                <span className="font-black text-[9px] tracking-wider text-slate-900 uppercase -mb-0.5">
                  BLOW
                </span>
                <div className="relative flex items-center justify-center">
                  <div className="flex items-center space-x-0.5">
                    <div className="w-1.5 h-4 bg-red-600 rounded-xs border border-black" />
                    <div className="w-1 h-3 bg-red-600 rounded-xs border border-black" />
                    <div className="w-4 h-1 bg-slate-900" />
                    <div className="w-1 h-3 bg-red-600 rounded-xs border border-black" />
                    <div className="w-1.5 h-4 bg-red-600 rounded-xs border border-black" />
                  </div>
                </div>
                <span className="text-[7px] font-extrabold tracking-widest text-slate-900 uppercase mt-0.5">
                  FITNESS
                </span>
              </div>

              {/* Center/Right Brand Badge */}
              <div className="flex-1 max-w-[245px] text-center border-2 border-slate-900 rounded-lg bg-transparent py-0.5 px-2">
                <span
                  style={{
                    letterSpacing: "0.08em",
                    textShadow: "1px 1px 0 #000",
                  }}
                  className="font-black text-lg md:text-xl text-slate-900 uppercase font-sans leading-none block"
                >
                  BLOW FITNESS
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
                <div className="w-[86px] h-[98px] border-2 border-slate-900 rounded-sm bg-[#fed700] flex flex-col items-center justify-center overflow-hidden relative shadow-2xs">
                  {showQrInPhotoBox && qrDataUrl ? (
                    <div className="flex flex-col items-center justify-center p-1 bg-white w-full h-full">
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
          <div className="h-3 w-full bg-slate-950 shrink-0" />
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
          }}
          className="relative rounded-xl overflow-hidden bg-[#e64a38] text-slate-950 border-2 border-slate-900 shadow-md flex flex-col justify-between select-none shrink-0"
        >
          {/* Faint Background Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-15">
            <Dumbbell className="w-44 h-44 text-slate-900 -rotate-12" />
          </div>

          {/* Card Inset Framed Content */}
          <div className="p-3.5 pb-1 flex flex-col justify-center flex-1 relative z-10">
            <div className="border border-slate-900/80 rounded-md p-3 bg-red-500/10 backdrop-blur-[1px] space-y-2">
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
          <div className="h-3 w-full bg-slate-950 shrink-0 relative z-10" />
        </div>
      )}
    </div>
  );
}
