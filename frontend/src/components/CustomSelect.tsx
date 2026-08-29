import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, ArrowUpDown } from "lucide-react";

interface Option {
  label: string;
  value: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  icon?: React.ReactNode;
  placeholder?: string;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  icon,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 h-9 rounded-md border border-card-border bg-card px-3 text-xs font-medium text-foreground hover:bg-white/5 transition-colors cursor-pointer focus:outline-none"
      >
        {icon || <ArrowUpDown className="h-3.5 w-3.5 text-muted shrink-0" />}
        <span>{selectedOption?.label}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-40 rounded-lg border border-card-border bg-card p-1 shadow-lg z-50 animate-fade-in">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer text-left ${
                opt.value === value
                  ? "bg-white/10 text-foreground font-semibold"
                  : "text-muted hover:bg-white/5 hover:text-foreground"
              }`}
            >
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
