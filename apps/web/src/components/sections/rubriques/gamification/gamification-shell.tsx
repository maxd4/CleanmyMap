import { Sparkles, type LucideIcon } from "lucide-react";

export function SectionLabel({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#c51f1f] text-white shadow-[0_10px_30px_rgba(197,31,31,0.28)]">
        <Icon size={18} strokeWidth={2.3} />
      </div>
      <div className="space-y-1">
        <h3 className="text-[11px] font-black uppercase tracking-[0.28em] text-[#211312]">
          {title}
        </h3>
        <p className="max-w-2xl text-[13px] leading-relaxed text-[#7f635d]">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function HeroArtwork() {
  return (
    <div className="relative mx-auto h-[20rem] w-full max-w-[36rem] overflow-hidden rounded-[2.5rem] border border-[#f0d9d2] bg-[linear-gradient(180deg,#fffaf8_0%,#fff0eb_100%)] shadow-[0_24px_70px_rgba(160,43,31,0.12)] lg:h-[24rem]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(245,85,74,0.28)_0%,rgba(245,85,74,0.12)_16%,transparent_40%),radial-gradient(circle_at_82%_30%,rgba(241,74,63,0.16)_0%,transparent_30%),radial-gradient(circle_at_60%_70%,rgba(197,31,31,0.08)_0%,transparent_40%)]" />
      <div className="absolute right-7 top-7 h-32 w-32 rounded-full border border-[#f4b5ad]/80 bg-[#ff7a73]/75 shadow-[0_0_0_22px_rgba(255,121,113,0.10),0_0_0_44px_rgba(255,121,113,0.05)]" />
      <div className="absolute right-4 top-4 h-40 w-40 rounded-full border border-dashed border-[#efb0a7] opacity-80" />
      <div className="absolute right-0 top-20 h-28 w-28 rounded-full border border-dashed border-[#efb0a7] opacity-50" />

      <svg
        viewBox="0 0 720 520"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="gamification-hill-1" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#f8b6ae" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#df2b22" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="gamification-hill-2" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#f7a59b" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#c61d1d" stopOpacity="0.98" />
          </linearGradient>
          <linearGradient id="gamification-road" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#fff8f6" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#ffd9d0" stopOpacity="0.88" />
          </linearGradient>
          <filter id="gamification-glow">
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>

        <circle cx="595" cy="95" r="78" fill="#ff6c63" opacity="0.16" filter="url(#gamification-glow)" />
        <circle cx="595" cy="95" r="44" fill="#ff6c63" opacity="0.95" />

        <path
          d="M0 405C78 372 120 378 180 360C238 343 281 288 356 272C432 255 471 306 534 300C593 294 620 251 720 228V520H0Z"
          fill="url(#gamification-hill-1)"
        />
        <path
          d="M0 465C88 423 152 430 220 404C288 379 312 320 388 304C470 286 520 345 587 338C639 332 674 300 720 285V520H0Z"
          fill="url(#gamification-hill-2)"
        />

        <path
          d="M526 176C576 170 612 179 650 185C681 190 703 186 720 180"
          fill="none"
          stroke="#f3cdc5"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          d="M531 179C531 226 533 258 536 333"
          fill="none"
          stroke="#d37064"
          strokeWidth="2"
          opacity="0.45"
        />
        <circle cx="531" cy="178" r="11" fill="#fffdfb" stroke="#bb362f" strokeWidth="3" />
        <text x="531" y="182" textAnchor="middle" fontSize="13" fontWeight="700" fill="#bb362f">
          R
        </text>

        <path
          d="M180 476C228 456 266 428 319 387C371 347 416 299 465 246C513 193 564 170 642 134"
          fill="none"
          stroke="url(#gamification-road)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M181 477C229 457 269 431 322 389C374 349 420 301 468 249C517 196 568 172 646 137"
          fill="none"
          stroke="#cf241e"
          strokeOpacity="0.45"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="12 10"
        />

        {[
          [260, 320],
          [300, 292],
          [332, 320],
          [400, 284],
          [428, 252],
          [470, 238],
          [518, 222],
          [570, 188],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="5.5" fill="#bb241e" opacity="0.9" />
        ))}

        {[
          [120, 138],
          [182, 160],
          [224, 126],
          [636, 164],
          [688, 120],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill="#f4bdb4" opacity="0.9" />
        ))}

        <path
          d="M628 272c16-12 31-13 45-4 12 8 20 22 23 43"
          fill="none"
          stroke="#ff9d93"
          strokeWidth="3"
          opacity="0.45"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function HeroBlock({ fr }: { fr: boolean }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-6 lg:px-8 lg:pb-12 lg:pt-10">
      <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <p className="text-[11px] font-black uppercase tracking-[0.42em] text-[#c51f1f]">
            Impact rouge
          </p>
          <div className="space-y-4">
            <h1 className="text-[clamp(2.8rem,5vw,4.8rem)] font-black leading-[0.93] tracking-[-0.05em] text-[#2a1412]">
              {fr ? "Écosystème & Gamification" : "Ecosystem & Gamification"}
            </h1>
            <p className="max-w-2xl text-[clamp(1.05rem,1.7vw,1.55rem)] font-medium leading-tight text-[#4f2e29]">
              {fr ? "Engagement communautaire et impact validé" : "Community engagement and validated impact"}
            </p>
          </div>
          <p className="max-w-2xl text-[15px] leading-7 text-[#6f5450]">
            {fr
              ? "Votre progression reflète des contributions vérifiées et votre participation au service de l'intérêt collectif. Chaque action compte."
              : "Your progression reflects verified contributions and participation in service of the common good. Every action counts."}
          </p>
        </div>

        <div className="relative">
          <div className="absolute inset-x-8 top-10 h-24 rounded-full bg-[#ff6d62]/10 blur-3xl" aria-hidden="true" />
          <HeroArtwork />
        </div>
      </div>
    </section>
  );
}

export function EmptyStateCard({
  title,
  description,
  icon: Icon,
  ctaLabel,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  ctaLabel: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-[#f1dfd8] bg-[#fff8f6] px-6 py-12 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#fff0ee] text-[#f19a92] shadow-inner">
        <Icon size={40} strokeWidth={1.9} />
      </div>
      <p className="mt-8 max-w-xs text-[22px] font-black leading-[1.15] tracking-[-0.03em] text-[#291714]">
        {title}
      </p>
      <p className="mt-3 max-w-md text-[14px] leading-7 text-[#6f5a56]">
        {description}
      </p>
      <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#efb0a9] bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#ba302b]">
        <Sparkles size={12} />
        {ctaLabel}
      </p>
    </div>
  );
}
