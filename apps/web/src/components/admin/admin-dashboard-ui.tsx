import Link from "next/link";
import type { ReactNode } from "react";
import { CmmBadge } from "@/components/ui/cmm-badge";
import type { AdminOperationalMetricAvailability, AdminOperationalMetricItem } from "@/lib/admin/admin-dashboard-types";
import { cn } from "@/lib/utils";
import { ActionCard, SectionHeader, SourceBadge, StatCard } from "@/components/ui/page-structure";
import type { PageStructureIconName } from "@/components/ui/page-structure";
import {
  ACTION_ICON_TONES,
  ADMIN_ICON_MAP,
  type AdminDashboardIconName,
} from "./admin-dashboard-banners";

export { AdminInfoBanner, AdminProfileSwitchStrip } from "./admin-dashboard-banners";
export type { AdminDashboardIconName } from "./admin-dashboard-banners";

export type AdminActionItem = {
  id: string;
  icon: PageStructureIconName;
  title: string;
  description: string;
  badge: string;
  href?: string;
  tone?: keyof typeof ACTION_ICON_TONES;
  footerLabel?: string;
  iconClassName?: string;
  iconWrapClassName?: string;
  badgeClassName?: string;
};

export function AdminHeroStrip({
  icon,
  eyebrow,
  description,
  accessLabel,
  action,
  className,
}: {
  icon: AdminDashboardIconName;
  eyebrow: string;
  description: string;
  accessLabel: string;
  action: ReactNode;
  className?: string;
}) {
  const Icon = ADMIN_ICON_MAP[icon];
  return (
    <section className={cn("rounded-[1.75rem] border border-stone-800/10 bg-[linear-gradient(135deg,#5c4a3e_0%,#857164_48%,#cdb79d_100%)] px-5 py-4 text-white shadow-[0_18px_48px_-28px_rgba(69,45,28,0.32)]", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/12 bg-white/10"><Icon size={22} className="text-amber-100" /></div>
          <div><p className="cmm-text-caption font-black uppercase tracking-[0.24em] text-white">{eyebrow}</p><p className="mt-1 text-sm font-medium text-white">{description}</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-3"><CmmBadge tone="slate" size="md" shape="pill" className="cmm-badge--on-dark">{accessLabel}</CmmBadge>{action}</div>
      </div>
    </section>
  );
}

export function AdminPillLink({ href, children, subdued = false, className }: { href: string; children: ReactNode; subdued?: boolean; className?: string }) {
  return <Link href={href} className={cn("inline-flex h-11 items-center justify-center rounded-full border px-4 cmm-text-caption font-black uppercase tracking-[0.18em] transition hover:-translate-y-0.5", subdued ? "border-white/12 bg-white/10 text-white hover:border-white/20 hover:bg-white/14" : "border-stone-200/80 bg-white text-stone-900 shadow-[0_10px_24px_-18px_rgba(0,0,0,0.35)] hover:border-amber-300/60", className)}>{children}</Link>;
}

export function AdminSectionHeader({ eyebrow, title, description, action, className }: { eyebrow: string; title?: string; description?: string; action?: ReactNode; className?: string }) {
  return <SectionHeader eyebrow={eyebrow} title={title} subtitle={description} action={action} titleSize={title ? "sm" : undefined} className={className} eyebrowClassName="cmm-text-caption font-black uppercase tracking-[0.22em] text-stone-900/80" subtitleClassName="text-sm text-stone-600" />;
}

const OPERATIONAL_METRIC_STATUS: Record<AdminOperationalMetricAvailability, { label: string; tone: "emerald" | "amber" | "rose" }> = {
  available: { label: "Source disponible", tone: "emerald" },
  partial: { label: "Partiel", tone: "amber" },
  unavailable: { label: "Indisponible", tone: "rose" },
};

export function AdminOperationalMetricGrid({ items, className }: { items: AdminOperationalMetricItem[]; className?: string }) {
  return <section className={cn("grid gap-5 lg:grid-cols-4", className)}>{items.map((item) => { const status = OPERATIONAL_METRIC_STATUS[item.availability]; return <StatCard key={item.id} label={item.label} value={item.value ?? status.label} badge={<SourceBadge tone={status.tone}>{status.label}</SourceBadge>} description={item.description} tone="amber" className="bg-[linear-gradient(145deg,rgba(76,61,48,0.94)_0%,rgba(112,94,78,0.90)_58%,rgba(198,177,154,0.24)_100%)]" />; })}</section>;
}

function AdminActionCard({ icon, title, description, badge, href, compact = false, tone = "amber", footerLabel, className, iconClassName, iconWrapClassName, badgeClassName }: AdminActionItem & { compact?: boolean; className?: string }) {
  return <ActionCard icon={icon} title={title} description={description} badge={badge} href={href} tone={tone} footerLabel={footerLabel} className={cn(compact ? "border-amber-200/50 bg-[linear-gradient(180deg,rgba(255,246,232,0.98)_0%,rgba(249,237,222,0.92)_100%)] shadow-[0_14px_34px_-28px_rgba(180,83,9,0.22)]" : "border-amber-200/55 bg-[linear-gradient(180deg,rgba(255,243,228,0.98)_0%,rgba(249,236,219,0.94)_100%)] shadow-[0_16px_40px_-30px_rgba(180,83,9,0.24)]", compact ? "p-4" : "p-5", className)} iconClassName={iconClassName} iconWrapClassName={cn(compact ? "h-11 w-11" : "h-12 w-12", ACTION_ICON_TONES[tone], iconWrapClassName)} badgeClassName={badgeClassName} />;
}

export function AdminActionGrid({ items, compact = false, columnsClassName, className }: { items: AdminActionItem[]; compact?: boolean; columnsClassName?: string; className?: string }) {
  return <div className={cn("grid gap-4", compact ? "sm:grid-cols-2 xl:grid-cols-4" : "xl:grid-cols-3", columnsClassName, className)}>{items.map((item) => <AdminActionCard key={item.id} {...item} compact={compact} />)}</div>;
}
