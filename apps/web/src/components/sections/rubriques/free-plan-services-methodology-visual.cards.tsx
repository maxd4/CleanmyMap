import {
  BarChart3,
  Database,
  GitBranch,
  Globe,
  Mail,
  Monitor,
  ShieldAlert,
  Triangle,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TAB_ITEMS } from "./free-plan-services-methodology-visual.data";
import type { DisplayService } from "./free-plan-services-methodology-visual.logic";
import {
  formatFallbackStatusLabel,
  formatPercent,
  getMetricFillClass,
  getPlanTone,
  getStateTone,
  getTabIconTone,
  getTabTone,
} from "./free-plan-services-methodology-visual.logic";
import { formatServiceQuotaStateLabel, type ServiceQuotaMetricSummary } from "@/lib/environmental-impact-estimator/service-risk";

export type ServiceIconCardProps = {
  service: DisplayService;
  selected: boolean;
  onSelect: (key: DisplayService["key"]) => void;
  onHover: (key: DisplayService["key"] | null) => void;
};

function getMetricIcon(metricKey: string): LucideIcon {
  if (metricKey.includes("supabaseDb")) return Database;
  if (metricKey.includes("supabaseAuth")) return ShieldAlert;
  if (metricKey.includes("supabaseStorage")) return Database;
  if (metricKey.includes("supabaseRealtime")) return Monitor;
  if (metricKey.includes("supabaseEgress")) return Globe;
  if (metricKey.includes("vercelPageViews")) return Monitor;
  if (metricKey.includes("vercelFunction")) return Zap;
  if (metricKey.includes("vercelDeployments")) return Triangle;
  if (metricKey.includes("vercelBandwidth")) return Globe;
  if (metricKey.includes("github")) return GitBranch;
  if (metricKey.includes("resend")) return Mail;
  if (metricKey.includes("posthog")) return BarChart3;
  if (metricKey.includes("lwsDomain")) return Globe;
  if (metricKey.includes("lwsDns")) return Globe;
  return ShieldAlert;
}

function renderMetricIcon(metricKey: string) {
  const Icon = getMetricIcon(metricKey);
  return <Icon size={16} />;
}

export function TabPill({
  tab,
  active,
  onClick,
}: {
  tab: (typeof TAB_ITEMS)[number];
  active: boolean;
  onClick: () => void;
}) {
  const Icon = tab.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-3 rounded-2xl border px-5 py-3 text-sm font-medium shadow-[0_10px_30px_-24px_rgba(15,23,42,0.3)] transition",
        getTabTone(active),
      )}
    >
      <Icon size={18} className={getTabIconTone(active)} />
      <span>{tab.label}</span>
    </button>
  );
}

export function ServiceIconCard({ service, selected, onSelect, onHover }: ServiceIconCardProps) {
  const Icon = service.icon;
  const primarySummary = service.summary;

  return (
    <button
      type="button"
      onClick={() => onSelect(service.key)}
      onMouseEnter={() => onHover(service.key)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(service.key)}
      onBlur={() => onHover(null)}
      className={cn(
        "group rounded-[1.4rem] border bg-white p-4 text-left shadow-[0_10px_30px_-24px_rgba(15,23,42,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-24px_rgba(15,23,42,0.28)]",
        selected ? "border-rose-300 ring-1 ring-rose-200" : "border-slate-200",
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50"
          style={{
            color: service.accent,
            boxShadow: `inset 0 0 0 1px ${service.accent}1c`,
          }}
        >
          <Icon size={24} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-black text-slate-950">{service.label}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold capitalize", getPlanTone(service.planType))}>
                  {service.planType}
                </span>
                {service.price !== "NA" ? (
                  <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-700">
                    {service.price}
                  </span>
                ) : service.planType === "NA" ? (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-500">
                    NA
                  </span>
                ) : null}
              </div>
            </div>

            <span className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold capitalize", getStateTone(service.state))}>
              {service.state === "NA" ? formatFallbackStatusLabel("quota") : formatServiceQuotaStateLabel(service.state)}
            </span>
          </div>

          <p className="mt-3 text-[12px] leading-relaxed text-slate-500">
            {primarySummary}
          </p>
          {service.details.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {service.details.map((detail) => (
                <span
                  key={detail}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600"
                >
                  {detail}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export function QuotaMetricRow({ metric }: { metric: ServiceQuotaMetricSummary }) {
  const width = metric.consumedPercent === null ? 0 : Math.max(2, Math.min(100, metric.consumedPercent));
  const missingLabel = metric.source === "reference" ? "Non calculé" : "Historique insuffisant";
  const stateLabel =
    metric.state === "NA" ? missingLabel : formatServiceQuotaStateLabel(metric.state);

  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-rose-600">
          {renderMetricIcon(metric.key)}
        </span>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">{metric.label}</p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                {metric.consumedPercent === null
                  ? missingLabel
                  : `Réf. ${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
                      metric.referenceMonthlyQuantity,
                    )} ${metric.unitLabel}`}
              </p>
            </div>

            <div className="text-right">
              <p className="text-[13px] font-black text-slate-950">
                {metric.consumedPercent === null ? missingLabel : formatPercent(metric.consumedPercent)}
              </p>
              <p className="text-[11px] font-medium text-slate-500">{stateLabel}</p>
            </div>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-rose-100">
            {metric.consumedPercent === null ? (
              <div className="h-full w-full rounded-full border border-dashed border-slate-300 bg-transparent" />
            ) : (
              <div
                className={cn("h-full rounded-full", getMetricFillClass(metric.state))}
                style={{ width: `${width}%` }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
