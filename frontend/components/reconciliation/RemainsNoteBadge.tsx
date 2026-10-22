"use client";

import { useState } from "react";
import { MessageSquareText, X } from "lucide-react";

interface RemainsNoteBadgeProps {
  note: string | null;
}

export function RemainsNoteBadge({ note }: RemainsNoteBadgeProps) {
  if (!note || note.trim() === "") return null;

  const [isOpen, setIsOpen] = useState(false);
  const maxLen = 300;
  const displayNote = note.length > maxLen ? note.slice(0, maxLen) + "…" : note;

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onBlur={() => setIsOpen(false)}
        aria-label="Ada keterangan remains"
        title="Ada keterangan remains"
        className="ml-1 flex items-center justify-center rounded-full w-5 h-5 text-amber-600 hover:bg-amber-100 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-300 transition-colors"
      >
        <MessageSquareText size={14} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-1.5 w-[280px] max-w-xs rounded-xl border border-amber-200 bg-white px-3 py-2 text-[11px] text-slate-800 shadow-lg shadow-amber-100/50 whitespace-pre-wrap break-words"
          role="tooltip"
        >
          <div className="flex items-start justify-between gap-2">
            <span>{displayNote}</span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="shrink-0 flex items-center justify-center rounded w-5 h-5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Tutup"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}
    </span>
  );
}