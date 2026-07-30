'use client';

/**
 * Professional logo for Mumbai Flood Command Center.
 * A stylized shield/monitoring icon with water wave motif.
 */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer hexagonal shield */}
      <path
        d="M16 2L28 9V23L16 30L4 23V9L16 2Z"
        fill="#13161D"
        stroke="#242832"
        strokeWidth="1.5"
      />
      {/* Inner shield highlight */}
      <path
        d="M16 5L25.5 10.5V21.5L16 27L6.5 21.5V10.5L16 5Z"
        fill="#1A1E27"
        stroke="#2A2F3A"
        strokeWidth="0.5"
      />
      {/* Water wave line 1 */}
      <path
        d="M10 16C11.5 14 13 14 14.5 16C16 18 17.5 18 19 16C20.5 14 22 14 22 14"
        stroke="#5B8DEF"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
      />
      {/* Water wave line 2 */}
      <path
        d="M10 20C11.5 18 13 18 14.5 20C16 22 17.5 22 19 20C20.5 18 22 18 22 18"
        stroke="#5B8DEF"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
      {/* Monitoring dot */}
      <circle
        cx="16"
        cy="11"
        r="2"
        fill="#5B8DEF"
        opacity="0.8"
      />
      {/* Pulse ring */}
      <circle
        cx="16"
        cy="11"
        r="3.5"
        stroke="#5B8DEF"
        strokeWidth="0.5"
        fill="none"
        opacity="0.3"
      />
    </svg>
  );
}

/**
 * Compact monogram for tight spaces (e.g., collapsed sidebar, favicon).
 */
export function LogoMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="6"
        fill="#13161D"
        stroke="#242832"
        strokeWidth="1"
      />
      <path
        d="M7 12C8.5 10 10 10 11.5 12C13 14 14.5 14 16 12C17.5 10 17.5 10 17 10"
        stroke="#5B8DEF"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="12" cy="8" r="1.5" fill="#5B8DEF" opacity="0.7" />
    </svg>
  );
}
