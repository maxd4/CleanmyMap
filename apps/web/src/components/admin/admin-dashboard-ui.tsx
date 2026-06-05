import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, type LucideIcon } from "lucide-react";
import type { Locale } from "@/lib/ui/preferences";
import type { Role } from "@/lib/domain-language";
import { cn } from "@/lib/utils";

type AdminMetricState = "positive" | "neutral" | "negative";

const METRIC_STATE_CLASSES: Record<AdminMetricState, string> = {
  positive: "border-emerald-500/20 bg-emerald-50 text-emerald-800",
  neutral: "border-amber-500/20 bg-amber-50 text-amber-800",
  negative: "border-rose-500/20 bg-rose-50 text-rose-700",
};

const ACTION_VARIANT_CLASSES = {
  soft:
    "border-amber-200/55 bg-[linear-gradient(180deg,rgba(255,243,228,0.98)_0%,rgba(249,236,219,0.94)_100%)] shadow-[0_16px_40px_-30px_rgba(180,83,9,0.24)]",
  compact:
    "border-amber-200/50 bg-[linear-gradient(180deg,rgba(255,246,232,0.98)_0%,rgba(249,237,222,0.92)_100%)] shadow-[0_14px_34px_-28px_rgba(180,83,9,0.22)]",
} as const;

const INFO_VARIANT_CLASSES = {
  muted:
    "border-stone-400/18 bg-[linear-gradient(135deg,#65584d_0%,#7f6d60_44%,#c9b6a0_100%)] shadow-[0_18px_48px_-32px_rgba(69,45,28,0.30)] text-white",
  warm:
    "border-stone-400/18 bg-[linear-gradient(145deg,rgba(96,68,42,0.94)_0%,rgba(129,98,70,0.92)_50%,rgba(217,187,154,0.26)_100%)] shadow-[0_18px_48px_-32px_rgba(69,45,28,0.30)] text-white",
  light:
    "border-stone-200/80 bg-white/76 shadow-[0_16px_40px_-32px_rgba(69,45,28,0.26)] text-stone-950 backdrop-blur-sm",
} as const;

const INFO_VARIANT_TEXT_CLASSES = {
  muted: {
    eyebrow: "text-white/78",
    title: "text-white",
    description: "text-white/84",
    chip: "border-white/12 bg-white/10 text-white/90",
  },
  warm: {
    eyebrow: "text-amber-100/78",
    title: "text-white",
    description: "text-white/84",
    chip: "border-white/12 bg-white/10 text-white/90",
  },
  light: {
    eyebrow: "text-stone-800/78",
    title: "text-stone-950",
    description: "text-stone-600",
    chip: "border-stone-200/80 bg-white/72 text-stone-700",
  },
} as const;

const ACTION_ICON_TONES = {
  amber: "bg-amber-100 text-amber-700 border-amber-200/60",
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-200/60",
  sky: "bg-sky-100 text-sky-700 border-sky-200/60",
  violet: "bg-violet-100 text-violet-700 border-violet-200/60",
  rose: "bg-rose-100 text-rose-700 border-rose-200/60",
} as const;

function resolveTrendLabel(interpretation: AdminMetricState): string {
  if (interpretation === "positive") return "En hausse";
  if (interpretation === "negative") return "À renforcer";
  return "Stable";
}

export function AdminHeroStrip({
  icon: Icon,
  eyebrow,
  description,
  accessLabel,
  action,
  className,
}: {
  icon: LucideIcon;
  eyebrow: string;
  description: string;
  accessLabel: string;
  action: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[1.75rem] border border-stone-800/10 bg-[linear-gradient(135deg,#5c4a3e_0%,#857164_48%,#cdb79d_100%)] px-5 py-4 text-white shadow-[0_18px_48px_-28px_rgba(69,45,28,0.32)]",
        className,
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/12 bg-white/10">
            <Icon size={22} className="text-amber-100" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/82">
              {eyebrow}
            </p>
            <p className="mt-1 text-sm font-medium text-white/84">
              {description}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-full border border-white/12 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/92">
            {accessLabel}
          </span>
          {action}
        </div>
      </div>
    </section>
  );
}

export function AdminPillLink({
  href,
  children,
  subdued = false,
  className,
}: {
  href: string;
  children: ReactNode;
  subdued?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-full border px-4 text-[11px] font-black uppercase tracking-[0.18em] transition hover:-translate-y-0.5",
        subdued
          ? "border-white/12 bg-white/10 text-white/92 hover:border-white/20 hover:bg-white/14"
          : "border-stone-200/80 bg-white text-stone-900 shadow-[0_10px_24px_-18px_rgba(0,0,0,0.35)] hover:border-amber-300/60",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function AdminSectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-900/80">
          {eyebrow}
        </p>
        {title ? (
          <h2 className="mt-2 text-lg font-black tracking-tight text-stone-950">
            {title}
          </h2>
        ) : null}
        {description ? (
          <p className="mt-2 text-sm text-stone-600">{description}</p>
        ) : null}
      </div>
      {action ? <div className="self-start">{action}</div> : null}
    </div>
  );
}

export function AdminMetricCard({
  label,
  value,
  deltaPercent,
  previousValue,
  interpretation,
  forecastLabel,
  className,
}: {
  label: string;
  value: string;
  deltaPercent: string;
  previousValue: string;
  interpretation: AdminMetricState;
  forecastLabel?: string;
  className?: string;
}) {
  const trendLabel = resolveTrendLabel(interpretation);

  return (
    <article
      className={cn(
        "rounded-[2rem] border border-stone-400/18 bg-[linear-gradient(145deg,rgba(76,61,48,0.94)_0%,rgba(112,94,78,0.90)_58%,rgba(198,177,154,0.24)_100%)] p-6 shadow-[0_18px_48px_-34px_rgba(69,45,28,0.28)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/72">
          {label}
        </p>
        <span
          className={cn(
            "inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]",
            METRIC_STATE_CLASSES[interpretation],
          )}
        >
          {trendLabel}
        </span>
      </div>

      <p className="mt-5 text-4xl font-black tracking-tight text-white sm:text-5xl">
        {value}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span
          className={cn(
            "inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em]",
            METRIC_STATE_CLASSES[interpretation],
          )}
        >
          {deltaPercent}
        </span>
        <span className="text-white/74">vs dernier période</span>
      </div>

      <p className="mt-4 border-t border-white/10 pt-4 text-sm text-white/72">
        N-1 <span className="font-semibold text-white">{previousValue}</span>
      </p>

      {forecastLabel ? (
        <p className="mt-3 text-[11px] font-black uppercase tracking-[0.18em] text-white/58">
          {forecastLabel}
        </p>
      ) : null}
    </article>
  );
}

export function AdminMetricGrid({
  items,
  className,
}: {
  items: Array<{
    id: string;
    label: string;
    value: string;
    previousValue: string;
    deltaPercent: string;
    interpretation: AdminMetricState;
    forecastLabel?: string;
  }>;
  className?: string;
}) {
  return (
    <section className={cn("grid gap-5 lg:grid-cols-3", className)}>
      {items.map((item) => (
        <AdminMetricCard key={item.id} {...item} />
      ))}
    </section>
  );
}

export function AdminActionCard({
  icon: Icon,
  title,
  description,
  badge,
  href,
  compact = false,
  tone = "amber",
  footerLabel,
  className,
  iconClassName,
  iconWrapClassName,
  badgeClassName,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  badge: string;
  href?: string;
  compact?: boolean;
  tone?: keyof typeof ACTION_ICON_TONES;
  footerLabel?: string;
  className?: string;
  iconClassName?: string;
  iconWrapClassName?: string;
  badgeClassName?: string;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-2xl border bg-white/70 shadow-inner",
            compact ? "h-11 w-11" : "h-12 w-12",
            ACTION_ICON_TONES[tone],
            iconWrapClassName,
          )}
        >
          <Icon
            className={cn(compact ? "h-5 w-5" : "h-6 w-6", iconClassName)}
          />
        </div>

        <span
          className={cn(
            "inline-flex shrink-0 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]",
            compact
              ? "border-amber-200 bg-white/72 text-amber-700"
              : "border-amber-200 bg-white/76 text-amber-700",
            badgeClassName,
          )}
        >
          {badge}
        </span>
      </div>

      <div className={compact ? "mt-4 space-y-2" : "mt-5 space-y-2"}>
        <h3
          className={cn(
            "font-black tracking-tight text-stone-950",
            compact ? "text-base" : "text-lg",
          )}
        >
          {title}
        </h3>
        <p
          className={cn(
            "leading-relaxed text-stone-600",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {description}
        </p>
      </div>

      {footerLabel ? (
        <div className="mt-4 inline-flex items-center gap-2 text-sm font-black text-stone-950">
          {footerLabel}
          <ArrowRight
            size={15}
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </div>
      ) : (
        <div className="mt-4 inline-flex items-center text-stone-950">
          <ArrowRight
            size={16}
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </div>
      )}
    </>
  );

  const classes = cn(
    "group flex h-full flex-col justify-between rounded-[1.75rem] border transition-all duration-300 hover:-translate-y-0.5",
    compact ? ACTION_VARIANT_CLASSES.compact : ACTION_VARIANT_CLASSES.soft,
    compact ? "p-4" : "p-5",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return <article className={classes}>{content}</article>;
}

export function AdminActionGrid({
  items,
  compact = false,
  columnsClassName,
  className,
}: {
  items: Array<{
    id: string;
    icon: LucideIcon;
    title: string;
    description: string;
    badge: string;
    href?: string;
    tone?: keyof typeof ACTION_ICON_TONES;
    footerLabel?: string;
    iconClassName?: string;
    iconWrapClassName?: string;
    badgeClassName?: string;
  }>;
  compact?: boolean;
  columnsClassName?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-4",
        compact ? "sm:grid-cols-2 xl:grid-cols-4" : "xl:grid-cols-3",
        columnsClassName,
        className,
      )}
    >
      {items.map((item) => (
        <AdminActionCard key={item.id} {...item} compact={compact} />
      ))}
    </div>
  );
}

export function AdminInfoBanner({
  eyebrow,
  title,
  description,
  action,
  chips,
  tone = "warm",
  icon: Icon,
  iconTone = "amber",
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  chips?: string[];
  tone?: keyof typeof INFO_VARIANT_CLASSES;
  icon?: LucideIcon;
  iconTone?: keyof typeof ACTION_ICON_TONES;
  className?: string;
}) {
  const textClasses = INFO_VARIANT_TEXT_CLASSES[tone];

  return (
    <section
      className={cn(
        "rounded-[1.75rem] border p-5",
        INFO_VARIANT_CLASSES[tone],
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          {Icon ? (
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border bg-white/10 shadow-inner",
                ACTION_ICON_TONES[iconTone],
                tone === "light" ? "bg-white/80" : null,
              )}
            >
              <Icon
                size={20}
                className={cn(
                  tone === "light" ? "text-stone-900" : "text-amber-100",
                )}
              />
            </div>
          ) : null}

          <div className="min-w-0">
            <p
              className={cn(
                "text-[11px] font-black uppercase tracking-[0.22em]",
                textClasses.eyebrow,
              )}
            >
              {eyebrow}
            </p>
            <h3
              className={cn(
                "mt-3 text-2xl font-black tracking-tight",
                textClasses.title,
              )}
            >
              {title}
            </h3>
            {description ? (
              <p
                className={cn(
                  "mt-3 text-sm leading-relaxed",
                  textClasses.description,
                )}
              >
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      {chips && chips.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span
              key={chip}
              className={cn(
                "inline-flex rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em]",
                textClasses.chip,
              )}
            >
              {chip}
            </span>
          ))}
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
    <section
      className={cn(
        "rounded-[1.75rem] border border-stone-300/70 bg-[linear-gradient(90deg,#6b5a4e_0%,#837267_42%,#cdbda9_100%)] p-4 shadow-[0_18px_48px_-34px_rgba(69,45,28,0.28)]",
        className,
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-3">
          {profiles.map((item) => {
            const isActive = item === activeProfile;
            return (
              <Link
                key={item}
                href={getHref(item)}
                className={cn(
                  "inline-flex items-center rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] transition hover:-translate-y-0.5",
                  isActive
                    ? "border-amber-100/50 bg-amber-100/32 text-white shadow-[0_8px_18px_-12px_rgba(0,0,0,0.32)]"
                    : "border-white/10 bg-white/8 text-white/78 hover:border-white/20 hover:bg-white/12 hover:text-white",
                )}
              >
                {getProfileLabel(item, locale)}
              </Link>
            );
          })}
        </div>

        <span className="inline-flex items-center rounded-full border border-white/12 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/80">
          {label}
        </span>
      </div>
    </section>
  );
}
