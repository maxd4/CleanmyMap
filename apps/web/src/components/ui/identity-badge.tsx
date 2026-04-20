type IdentityBadgeTone = "admin" | "role" | "profile" | "mode" | "neutral";

type IdentityBadgeProps = {
  icon: string;
  label: string;
  tone: IdentityBadgeTone;
  className?: string;
};

const TONE_CLASSNAMES: Record<IdentityBadgeTone, string> = {
  admin: "border-rose-400/30 bg-rose-50/50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 shadow-sm shadow-rose-200/20",
  role: "border-sky-400/30 bg-sky-50/50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400 shadow-sm shadow-sky-200/20",
  profile: "border-indigo-400/30 bg-indigo-50/50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 shadow-sm shadow-indigo-200/20",
  mode: "border-amber-400/30 bg-amber-50/50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 shadow-sm shadow-amber-200/20",
  neutral: "border-slate-400/30 bg-slate-50/50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400 shadow-sm shadow-slate-200/20",
};

export function IdentityBadge({
  icon,
  label,
  tone,
  className,
}: IdentityBadgeProps) {
  return (
    <span
      role="status"
      aria-label={`${tone} badge: ${label}`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-tight backdrop-blur-sm transition-all hover:scale-105 ${TONE_CLASSNAMES[tone]} ${className ?? ""}`}
    >
      <span role="img" aria-hidden="true" className="inline-flex min-w-6 justify-center text-[10px] font-bold">
        {icon}
      </span>
      <span>{label}</span>
    </span>
  );
}

