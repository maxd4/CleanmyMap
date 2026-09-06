import { ExternalLink, Minus, Plus } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";

const mapMarkers = [
  [18, 72, 1],
  [29, 49, 2],
  [43, 68, 3],
  [55, 35, 4],
  [68, 57, 5],
  [79, 28, 6],
  [84, 71, 7],
] as const;

export function HomeMapPreview() {
  return (
    <div className="relative min-h-[27rem] overflow-hidden rounded-[2rem] border border-white/80 bg-[#effaf4] shadow-[0_28px_56px_-24px_rgba(0,46,34,0.62)] sm:min-h-[32rem] lg:min-h-[36rem]">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1000 650"
        role="img"
        aria-label="Aperçu décoratif de la carte des actions récentes"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="home-map-wash" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#f9fffd" />
            <stop offset="0.54" stopColor="#e6f7ef" />
            <stop offset="1" stopColor="#d4f0e3" />
          </linearGradient>
          <filter id="home-map-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="8" floodColor="#009e71" floodOpacity="0.24" stdDeviation="9" />
          </filter>
        </defs>

        <rect width="1000" height="650" fill="url(#home-map-wash)" />
        <g fill="#bdebd6" opacity="0.74">
          <path d="M0 86C118 30 196 88 294 64s165-72 260-22 158 88 266 30 120-26 180 14v104c-99-36-172 3-264 25-110 25-163-65-276-29-94 30-155 9-242 49S85 276 0 232Z" />
          <path d="M0 414c120-34 196 22 298-2s144-106 247-64c106 43 131 132 270 94 92-25 129-95 185-72v280H0Z" />
          <path d="M655 0c11 66-19 104-7 163 15 74 79 98 64 170-16 75-117 87-117 174 0 57 44 100 67 143h338V0Z" />
        </g>
        <g fill="none" stroke="#c7dcd5" strokeWidth="2" opacity="0.8">
          <path d="M-60 160 1030 485" />
          <path d="M-80 322 1030 82" />
          <path d="M80-30 570 680" />
          <path d="M320-40 920 680" />
          <path d="M735-40 420 700" />
          <path d="M-10 530 1010 260" />
        </g>
        <path d="M-70 205C87 111 193 213 289 253c99 42 137 17 207-35 93-70 139-74 201 26 56 90 97 129 182 115 100-16 151-58 203-23" fill="none" stroke="#91c8d2" strokeLinecap="round" strokeWidth="40" opacity="0.72" />
        <path d="M-70 205C87 111 193 213 289 253c99 42 137 17 207-35 93-70 139-74 201 26 56 90 97 129 182 115 100-16 151-58 203-23" fill="none" stroke="#d8f0f0" strokeLinecap="round" strokeWidth="28" opacity="0.95" />
        <g fill="none" stroke="#ffffff" strokeLinecap="round" opacity="0.92">
          <path d="M42 78 292 194 461 175 620 91 946 182" strokeWidth="8" />
          <path d="M40 477 238 384 385 423 566 331 836 423 1000 367" strokeWidth="9" />
          <path d="M149 0 228 178 205 318 292 650" strokeWidth="7" />
          <path d="M795 0 726 188 758 344 680 650" strokeWidth="8" />
        </g>
        <g fill="#a7e6c9" opacity="0.85">
          <ellipse cx="170" cy="230" rx="91" ry="46" />
          <ellipse cx="480" cy="120" rx="110" ry="34" />
          <ellipse cx="825" cy="501" rx="116" ry="52" />
          <ellipse cx="906" cy="161" rx="70" ry="34" />
        </g>
        <g filter="url(#home-map-shadow)">
          {mapMarkers.map(([cx, cy, key]) => (
            <g key={key} transform={`translate(${cx * 10} ${cy * 6.5})`}>
              <circle r="25" fill="#42dba7" opacity="0.66" />
              <circle r="8" fill="#007658" />
              <circle r="3" fill="#b5ffe0" />
            </g>
          ))}
          <circle cx="650" cy="360" r="7" fill="#b64cf1" />
        </g>
      </svg>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_25%,rgba(255,255,255,0.5),transparent_35%)]" />
      <div className="absolute left-5 top-5 z-10 flex flex-col gap-3 sm:left-6 sm:top-6">
        <div className="flex flex-col overflow-hidden rounded-2xl border border-white/80 bg-white/90 text-xl font-bold text-[#152344] shadow-[0_12px_26px_-16px_rgba(0,45,35,0.5)] backdrop-blur-xl">
          <span className="flex h-10 w-10 items-center justify-center border-b border-slate-100" aria-hidden="true">
            <Plus size={19} />
          </span>
          <span className="flex h-10 w-10 items-center justify-center" aria-hidden="true">
            <Minus size={19} />
          </span>
        </div>
      </div>

      <div className="absolute left-5 top-24 z-10 inline-flex items-center gap-3 rounded-full border border-white/80 bg-white/90 px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-[#192548] shadow-[0_12px_28px_-18px_rgba(0,45,35,0.48)] backdrop-blur-xl sm:left-6 sm:top-28 sm:px-5">
        <span className="h-3 w-3 rounded-full bg-[#c04cf4] shadow-[0_0_12px_rgba(192,76,244,0.5)]" />
        Récentes
      </div>

      <CmmButton
        href="/actions/map"
        tone="secondary"
        variant="pill"
        className="absolute right-5 top-5 z-10 h-12 !border-white/80 !bg-white/95 !text-[#142143] !shadow-[0_12px_28px_-16px_rgba(0,45,35,0.5)] hover:!bg-white sm:right-6 sm:top-6 sm:h-14 sm:px-6"
      >
        Voir la carte
        <ExternalLink size={18} aria-hidden="true" />
      </CmmButton>

      <div className="absolute bottom-4 right-5 z-10 rounded-full border border-white/75 bg-white/70 px-3 py-1.5 text-[10px] font-semibold text-[#1682bd] shadow-sm backdrop-blur sm:bottom-5 sm:right-6">
        Aperçu cartographique
      </div>
    </div>
  );
}
