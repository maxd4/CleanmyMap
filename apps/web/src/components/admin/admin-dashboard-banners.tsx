import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, ShieldCheck, type LucideIcon } from "lucide-react";
import type { Locale } from "@/lib/ui/preferences";
import type { Role } from "@/lib/domain-language";
import { cn } from "@/lib/utils";

export const INFO_VARIANT_CLASSES = {
  muted: "border-stone-400/18 bg-[linear-gradient(135deg,#65584d_0%,#7f6d60_44%,#c9b6a0_100%)] shadow-[0_18px_48px_-32px_rgba(69,45,28,0.30)] text-white",
  warm: "border-stone-400/18 bg-[linear-gradient(145deg,rgba(96,68,42,0.94)_0%,rgba(129,98,70,0.92)_50%,rgba(217,187,154,0.26)_100%)] shadow-[0_18px_48px_-32px_rgba(69,45,28,0.30)] text-white",
  light: "border-stone-200/80 bg-white/76 shadow-[0_16px_40px_-32px_rgba(69,45,28,0.26)] text-stone-950 backdrop-blur-sm",
} as const;

const INFO_VARIANT_TEXT_CLASSES = {
  muted: { eyebrow: "text-white", title: "text-white", description: "text-white", chip: "border-white/12 bg-white/10 text-white" },
  warm: { eyebrow: "text-amber-100/78", title: "text-white", description: "text-white", chip: "border-white/12 bg-white/10 text-white" },
  light: { eyebrow: "text-stone-800/78", title: "text-stone-950", description: "text-stone-600", chip: "border-stone-200/80 bg-white/72 text-stone-700" },
} as const;

export const ACTION_ICON_TONES = {
  amber: "bg-amber-100 text-amber-700 border-amber-200/60",
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-200/60",
  sky: "bg-sky-100 text-sky-700 border-sky-200/60",
  violet: "bg-violet-100 text-violet-700 border-violet-200/60",
  rose: "bg-rose-100 text-rose-700 border-rose-200/60",
} as const;

export const ADMIN_ICON_MAP = { AlertTriangle, ShieldCheck } satisfies Record<string, LucideIcon>;
export type AdminDashboardIconName = keyof typeof ADMIN_ICON_MAP;

export function AdminInfoBanner({
  eyebrow,
  title,
  description,
  action,
  chips,
  tone = "warm",
  icon,
  iconTone = "amber",
  compact = false,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  chips?: string[];
  tone?: keyof typeof INFO_VARIANT_CLASSES;
  icon?: AdminDashboardIconName;
  iconTone?: keyof typeof ACTION_ICON_TONES;
  compact?: boolean;
  className?: string;
}) {
  const textClasses = INFO_VARIANT_TEXT_CLASSES[tone];
  const Icon = icon ? ADMIN_ICON_MAP[icon] : null;
  return (
    <section className={cn("border", compact ? "rounded-2xl p-3.5" : "rounded-[1.75rem] p-5", INFO_VARIANT_CLASSES[tone], className)}>
      <div className={cn("flex flex-col sm:flex-row sm:items-start sm:justify-between", compact ? "gap-3" : "gap-4")}>
        <div className={cn("flex min-w-0", compact ? "gap-3" : "gap-4")}>
          {Icon ? (
            <div className={cn("flex shrink-0 items-center justify-center border bg-white/10 shadow-inner", compact ? "h-9 w-9 rounded-xl" : "h-12 w-12 rounded-2xl", ACTION_ICON_TONES[iconTone], tone === "light" ? "bg-white/80" : null)}>
              <Icon size={20} className={cn(tone === "light" ? "text-stone-900" : "text-amber-100")} />
            </div>
          ) : null}
          <div className="min-w-0">
            <p className={cn("cmm-text-caption font-black uppercase tracking-[0.22em]", textClasses.eyebrow)}>{eyebrow}</p>
            <h3 className={cn(compact ? "mt-1 text-base font-bold tracking-tight" : "mt-3 text-2xl font-black tracking-tight", textClasses.title)}>{title}</h3>
            {description ? <p className={cn(compact ? "mt-1.5 text-xs" : "mt-3 text-sm", "leading-relaxed", textClasses.description)}>{description}</p> : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {chips && chips.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {chips.map((chip) => <span key={chip} className={cn("inline-flex rounded-full px-3 py-1.5 cmm-text-caption font-black uppercase tracking-[0.16em]", textClasses.chip)}>{chip}</span>)}
        </div>
      ) : null}
    </section>
  );
}

export function AdminProfileSwitchStrip({
  profiles,
  activeProfile,
  getProfileLabel,
  locale,
  label,
  getHref,
  className,
}: {
  profiles: Role[];
  activeProfile: Role;
  getProfileLabel: (profile: Role, locale: Locale) => string;
  locale: Locale;
  label: string;
  getHref: (profile: Role) => string;
  className?: string;
}) {
  return (
    <section className={cn("rounded-[1.75rem] border border-stone-300/70 bg-[linear-gradient(90deg,#6b5a4e_0%,#837267_42%,#cdbda9_100%)] p-4 shadow-[0_18px_48px_-34px_rgba(69,45,28,0.28)]", className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-3">
          {profiles.map((item) => {
            const isActive = item === activeProfile;
            return <Link key={item} href={getHref(item)} className={cn("inline-flex items-center rounded-full border px-4 py-2 cmm-text-caption font-black uppercase tracking-[0.18em] transition hover:-translate-y-0.5", isActive ? "border-amber-100/50 bg-amber-100/32 text-white shadow-[0_8px_18px_-12px_rgba(0,0,0,0.32)]" : "border-white/10 bg-white/8 text-white hover:border-white/20 hover:bg-white/12 hover:text-white")}>{getProfileLabel(item, locale)}</Link>;
          })}
        </div>
        <span className="inline-flex items-center rounded-full border border-white/12 bg-white/10 px-4 py-2 cmm-text-caption font-black uppercase tracking-[0.18em] text-white">{label}</span>
      </div>
    </section>
  );
}
