import { Bot, Eye, FileText, Image as ImageIcon, Layers3, MapPinned, Server } from "lucide-react";
import { ENVIRONMENTAL_IMPACT_POST_DEFINITIONS } from "@/lib/environmental-impact-estimator/constants";
import type {
  EnvironmentalImpactEstimateModel,
  EnvironmentalImpactSnapshotRecord,
} from "@/lib/environmental-impact-estimator/types";
import {
  formatProxyMass,
  formatQuantity,
  formatShortDate,
} from "./environmental-impact-estimator-panel.helpers";

type AuditSectionProps = {
  model: EnvironmentalImpactEstimateModel;
  snapshots: EnvironmentalImpactSnapshotRecord[];
};

const ICONS = {
  pageViews: Eye,
  storedImages: ImageIcon,
  apiRequests: Server,
  pdfExports: FileText,
  maps: MapPinned,
  storageGbMonths: Layers3,
  aiCalls: Bot,
} as const;

function formatCount(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(value);
}

export function ScopePostDetails({ model }: AuditSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/40">
            Détail des postes
          </p>
          <h3 className="mt-1 text-xl font-black tracking-tight text-white">
            Lecture auditable, ligne par ligne
          </h3>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-red-100/50">
          Hypothèses versionnées
        </div>
      </div>

      <div className="space-y-3">
        {ENVIRONMENTAL_IMPACT_POST_DEFINITIONS.map((definition) => {
          const sitePost = model.site.posts.find((post) => post.key === definition.key);
          const userPost = model.user.posts.find((post) => post.key === definition.key);
          const Icon = ICONS[definition.key];

          return (
            <article
              key={definition.key}
              className="grid gap-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 md:grid-cols-[minmax(0,2fr)_minmax(220px,1fr)_minmax(220px,1fr)]"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/10 text-red-200">
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-white">{definition.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-red-100/45">
                    {definition.description}
                  </p>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-red-100/35">
                    {definition.proxyRationale}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-100/35">
                  Site
                </p>
                <p className="mt-2 text-sm font-black text-white">
                  {formatQuantity(sitePost?.quantity ?? null, definition.unitLabel)}
                </p>
                <p className="mt-1 text-xs text-red-100/45">
                  {formatProxyMass(sitePost?.estimatedKgCo2eProxy ?? null)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-100/35">
                  Utilisateur
                </p>
                <p className="mt-2 text-sm font-black text-white">
                  {formatQuantity(userPost?.quantity ?? null, definition.unitLabel)}
                </p>
                <p className="mt-1 text-xs text-red-100/45">
                  {formatProxyMass(userPost?.estimatedKgCo2eProxy ?? null)}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function MethodologyAndLimitations({ model }: AuditSectionProps) {
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <article className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/40">
            Hypothèses retenues
          </p>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-red-100/55">
            {model.methodology.hypotheses.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/40">
            Limites et garde-fous
          </p>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-red-100/55">
            {model.methodology.limitations.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
        <div className="flex items-center gap-3">
          <div className="text-red-300">✦</div>
          <div>
            <p className="text-sm font-black text-white">
              Structure prête pour le rapport d&apos;impact IA
            </p>
            <p className="text-xs leading-relaxed text-red-100/45">
              Les postes sont déjà modélisés pour accueillir des flux réels sans casser le
              contrat de calcul ni la lisibilité du rapport.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export function SnapshotHistory({ snapshots }: AuditSectionProps) {
  if (snapshots.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/40">
            Historique Supabase
          </p>
          <h3 className="mt-1 text-xl font-black tracking-tight text-white">
            Snapshots enregistrés du calculateur
          </h3>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-red-100/50">
          {snapshots.length} snapshot{snapshots.length > 1 ? "s" : ""}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {snapshots.slice(0, 4).map((snapshot) => (
          <article
            key={`${snapshot.snapshotKey}-${snapshot.snapshotDate}`}
            className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
              {snapshot.snapshotDate}
            </p>
            <p className="mt-2 text-sm font-black text-white">
              {formatProxyMass(snapshot.totalKgCo2eProxy)}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-red-100/45">
              Confiance {formatCount(snapshot.confidencePercent)}%, généré le{" "}
              {formatShortDate(snapshot.generatedAt)}.
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
