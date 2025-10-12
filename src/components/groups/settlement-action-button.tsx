"use client";

import { useState, useRef, useEffect } from "react";
import type { SettlementSuggestion } from "@/lib/settlement";

interface SettlementActionButtonProps {
  settlement: SettlementSuggestion;
  onStatusChange: (settlement: SettlementSuggestion, status: "REQUESTED" | "PAID") => void;
  onVenmoClick: (settlement: SettlementSuggestion, event: React.MouseEvent) => void;
}

export function SettlementActionButton({ 
  settlement, 
  onStatusChange, 
  onVenmoClick 
}: SettlementActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const getButtonText = () => {
    if (settlement.status === "REQUESTED") return "Requested";
    if (settlement.status === "PAID") return "Paid";
    return "Pay";
  };

  const getButtonClass = () => {
    if (settlement.status === "REQUESTED") {
      return "bg-orange-100 text-orange-700 border-orange-300";
    }
    if (settlement.status === "PAID") {
      return "bg-green-100 text-green-700 border-green-300";
    }
    return "border border-emerald-400 text-emerald-600 hover:bg-emerald-50";
  };

  const handleAction = (action: "venmo" | "paid") => {
    setIsOpen(false);
    if (action === "venmo") {
      // Create a synthetic event for Venmo click
      const syntheticEvent = {
        preventDefault: () => {},
      } as React.MouseEvent;
      onVenmoClick(settlement, syntheticEvent);
    } else if (action === "paid") {
      onStatusChange(settlement, "PAID");
    }
  };

  return (
    <div className="relative" ref={buttonRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-wider transition ${getButtonClass()}`}
      >
        {getButtonText()}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 rounded-md border border-zinc-200 bg-white shadow-lg z-10">
          <div className="py-1">
            <button
              type="button"
              onClick={() => handleAction("venmo")}
              className="flex w-full items-center px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              <svg className="mr-3 h-4 w-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2L3 7v11h4v-6h6v6h4V7l-7-5z" />
              </svg>
              Pay with Venmo
            </button>
            <button
              type="button"
              onClick={() => handleAction("paid")}
              className="flex w-full items-center px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              <svg className="mr-3 h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Mark as Paid
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
