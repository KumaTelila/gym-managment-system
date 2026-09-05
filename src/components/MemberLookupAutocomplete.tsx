"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2, X, User, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface MemberLookupResult {
  id: string;
  memberCode: string;
  cardVersion: number;
  fullName: string;
  phone: string;
  gender: string;
  photoUrl?: string | null;
  isExpired: boolean;
  latestSub?: {
    planName: string;
    endDate: string;
    status: string;
  };
  activeSession?: {
    id: string;
    lockerNumber?: string;
  };
}

interface MemberLookupAutocompleteProps {
  placeholder?: string;
  value?: string;
  onChange?: (val: string) => void;
  onSelectMember: (member: MemberLookupResult) => void;
  selectedMember?: { id: string; fullName: string; memberCode?: string } | null;
  onClearSelected?: () => void;
  showLookupButton?: boolean;
  lookupButtonLabel?: string;
  onManualLookup?: (query: string) => void;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  required?: boolean;
  disabled?: boolean;
  showSelectedCard?: boolean;
  errorMessage?: string | null;
}

export function MemberLookupAutocomplete({
  placeholder = "Search by code (e.g. BF-1001), phone, or name...",
  value: controlledValue,
  onChange: controlledOnChange,
  onSelectMember,
  selectedMember,
  onClearSelected,
  showLookupButton = false,
  lookupButtonLabel = "Lookup",
  onManualLookup,
  className = "",
  inputClassName = "",
  autoFocus = false,
  required = false,
  disabled = false,
  showSelectedCard = false,
  errorMessage = null,
}: MemberLookupAutocompleteProps) {
  const [internalValue, setInternalValue] = useState("");
  const isControlled = controlledValue !== undefined;
  const query = isControlled ? controlledValue : internalValue;

  const setQuery = (newVal: string) => {
    if (!isControlled) {
      setInternalValue(newVal);
    }
    controlledOnChange?.(newVal);
  };

  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<MemberLookupResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 1) {
      const resetTimer = setTimeout(() => {
        setResults([]);
        setLoading(false);
      }, 0);
      return () => clearTimeout(resetTimer);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/members/lookup?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          setResults([]);
          return;
        }
        const data = await res.json();
        setResults(data.members || []);
        setIsOpen(true);
        setHighlightedIndex(-1);
      } catch (err: unknown) {
        if ((err as Error).name !== "AbortError") {
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handleSelect = (member: MemberLookupResult) => {
    setIsOpen(false);
    setResults([]);
    onSelectMember(member);
    setQuery(member.memberCode);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen && results.length > 0) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : results.length - 1
      );
    } else if (e.key === "Enter") {
      if (isOpen && highlightedIndex >= 0 && results[highlightedIndex]) {
        e.preventDefault();
        handleSelect(results[highlightedIndex]);
      } else if (onManualLookup && query.trim()) {
        e.preventDefault();
        setIsOpen(false);
        onManualLookup(query.trim());
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  if (showSelectedCard && selectedMember) {
    return (
      <div className="flex items-center justify-between p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/80 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800 font-bold text-xs">
            {selectedMember.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <span>{selectedMember.fullName}</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div className="text-[11px] font-mono font-medium text-emerald-700">
              {selectedMember.memberCode}
            </div>
          </div>
        </div>
        {onClearSelected && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearSelected}
            className="h-7 px-2.5 text-xs text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100/70"
          >
            Change
          </Button>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={query}
            autoFocus={autoFocus}
            required={required}
            disabled={disabled}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => {
              if (query.trim().length > 0 && results.length > 0) {
                setIsOpen(true);
              }
            }}
            onKeyDown={handleKeyDown}
            className={`pr-8 ${inputClassName}`}
          />

          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400">
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
            ) : query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setResults([]);
                  setIsOpen(false);
                  inputRef.current?.focus();
                }}
                className="hover:text-slate-600 focus:outline-hidden"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
          </div>
        </div>

        {showLookupButton && (
          <Button
            type="button"
            variant="outline"
            disabled={disabled || !query.trim()}
            onClick={() => {
              setIsOpen(false);
              onManualLookup?.(query.trim());
            }}
            className="h-9 text-xs shrink-0"
          >
            <Search className="h-3.5 w-3.5 mr-1" />
            {lookupButtonLabel}
          </Button>
        )}
      </div>

      {errorMessage && (
        <p className="mt-1 text-[11px] text-red-600 font-medium">{errorMessage}</p>
      )}

      {/* Floating Suggestions Dropdown */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden max-h-72 overflow-y-auto">
          {results.length > 0 ? (
            <div className="py-1 divide-y divide-slate-100">
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                Matching Members ({results.length})
              </div>
              {results.map((item, index) => {
                const isSelected = index === highlightedIndex;
                return (
                  <div
                    key={item.id}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleSelect(item)}
                    className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-blue-50/80 text-blue-950"
                        : "hover:bg-slate-50 text-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 shrink-0 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 text-xs font-semibold overflow-hidden">
                        {item.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.photoUrl}
                            alt={item.fullName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span>{item.fullName.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 truncate flex items-center gap-1.5">
                          <span>{item.fullName}</span>
                          {item.gender && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({item.gender === "MALE" ? "M" : "F"})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <span className="font-mono text-blue-700 font-medium">
                            {item.memberCode}
                          </span>
                          <span>•</span>
                          <span>{item.phone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-0.5 ml-2">
                      {item.activeSession ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
                          In Gym {item.activeSession.lockerNumber ? `(#${item.activeSession.lockerNumber})` : ""}
                        </span>
                      ) : item.latestSub ? (
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            item.isExpired
                              ? "bg-rose-100 text-rose-700"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {item.latestSub.planName}
                          {item.isExpired ? " (Expired)" : ""}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                          No Plan
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : !loading ? (
            <div className="px-4 py-3 text-center text-xs text-slate-500">
              <User className="h-5 w-5 mx-auto mb-1 text-slate-400" />
              No member found matching &ldquo;<span className="font-medium text-slate-700">{query}</span>&rdquo;
            </div>
          ) : (
            <div className="px-4 py-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Searching members...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
