import React from "react";

interface LogoProps {
  className?: string;
}

export default function Logo({ className = "h-10 w-10" }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      className={className}
    >
      <defs>
        {/* Background Gradient */}
        <linearGradient id="luminaryBgComp" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" /> {/* Emerald 500 */}
          <stop offset="100%" stopColor="#1E293B" /> {/* Slate 800 */}
        </linearGradient>
      </defs>

      {/* Rounded Background Plate */}
      <rect width="256" height="256" rx="56" fill="url(#luminaryBgComp)" />

      {/* L-shaped Chart Axis */}
      <path
        d="M 64 64 L 64 192 L 192 192"
        fill="none"
        stroke="#F8FAFC"
        strokeWidth="16"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Analytics Bars */}
      <rect x="92" y="140" width="24" height="36" rx="6" fill="#F8FAFC" />
      <rect x="132" y="96" width="24" height="80" rx="6" fill="#F8FAFC" />
      <rect x="172" y="64" width="24" height="112" rx="6" fill="#A7F3D0" />

      {/* Luminary Sparkle / Star */}
      <path
        d="M 184 24 Q 184 44 204 44 Q 184 44 184 64 Q 184 44 164 44 Q 184 44 184 24 Z"
        fill="#F8FAFC"
      />
    </svg>
  );
}
