type IdentityBadgeTone = "admin" | "role" | "profile" | "mode" | "neutral";

type IdentityBadgeProps = {
  icon: string;
  label: string;
  tone: IdentityBadgeTone;
  className?: string;
};

const TONE_CLASSNAMES: Record<IdentityBadgeTone, string> = {
  admin: "border-emerald-300 bg-emerald-50 text-emerald-800",
  role: "border-sky-300 bg-sky-50 text-sky-800",
  profile: "border-indigo-300 bg-indigo-50 text-indigo-800",
  mode: "border-amber-300 bg-amber-50 text-amber-800",
  neutral: "border-slate-300 bg-slate-50 text-slate-700",
};

export function IdentityBadge({
  icon,
  label,
  tone,
  className,
}: IdentityBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${TONE_CLASSNAMES[tone]} ${className ?? ""}`}
    >
      <span className="inline-flex min-w-6 justify-center text-[10px] font-bold">
        {icon}
      </span>
      <span>{label}</span>
    </span>
  );
}

