"use client";

import { useState } from "react";
import useSWR from "swr";
import { CmmCard } from "@/components/ui/cmm-card";
import { getOrganizerTypeLabel } from "@/lib/actions/organizer-type";
import type {
  LeaderboardMetric,
  PublicLeaderboardItem,
} from "@/lib/gamification/progression-types";
import {
  buildPublicLeaderboardUrl,
  fetchPublicLeaderboard,
  formatBadgeBreakdown,
  isPublicStructureItem,
  PUBLIC_LEADERBOARD_METRICS,
  type PublicLeaderboardScope,
} from "./leaderboard-panel.model";

const numberFormatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 1,
});

const metricLabels: Record<LeaderboardMetric, string> = {
  level: "Niveau",
  xp: "XP",
  badges: "Badges",
};

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function BadgeValue({ item }: { item: PublicLeaderboardItem }) {
  return (
    <div>
      <p className="text-lg font-black text-[#7f1d1d]">{formatNumber(item.badgeTotal)} badges</p>
      <p className="text-xs font-medium text-slate-600">{formatBadgeBreakdown(item)}</p>
    </div>
  );
}

function LeaderboardTable({
  items,
  scope,
}: {
  items: PublicLeaderboardItem[];
  scope: PublicLeaderboardScope;
}) {
  const structure = scope === "structure";

  return (
    <>
      <div className="cmm-data-table-wrap hidden overflow-x-auto sm:block">
        <table className="cmm-data-table w-full min-w-[48rem] border-collapse text-left text-sm">
          <thead className="border-b border-rose-100 text-xs uppercase tracking-[0.12em] text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3">Rang</th>
              <th scope="col" className="px-4 py-3">{structure ? "Structure" : "Utilisateur"}</th>
              {structure ? <th scope="col" className="px-4 py-3">Type</th> : null}
              <th scope="col" className="px-4 py-3">{structure ? "Niveau collectif" : "Niveau"}</th>
              <th scope="col" className="px-4 py-3">XP validée</th>
              <th scope="col" className="px-4 py-3">Badges</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.rank}-${item.publicLabel}`} className="border-b border-rose-50 last:border-0">
                <td className="px-4 py-4 font-black text-[#991b1b]">{item.rank}</td>
                <th scope="row" className="px-4 py-4 font-bold text-slate-900">{item.publicLabel}</th>
                {structure && isPublicStructureItem(item) ? (
                  <td className="px-4 py-4 text-slate-700">{getOrganizerTypeLabel(item.structureType)}</td>
                ) : null}
                <td className="px-4 py-4 font-semibold text-slate-800">{item.level}</td>
                <td className="px-4 py-4 text-slate-700">{formatNumber(item.xpValidated)}</td>
                <td className="px-4 py-4"><BadgeValue item={item} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 sm:hidden">
        {items.map((item) => (
          <article key={`${item.rank}-${item.publicLabel}`} className="rounded-2xl border border-rose-100 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#991b1b]">Rang {item.rank}</p>
                <h3 className="mt-1 font-bold text-slate-900">{item.publicLabel}</h3>
                {structure && isPublicStructureItem(item) ? (
                  <p className="mt-1 text-sm text-slate-600">{getOrganizerTypeLabel(item.structureType)}</p>
                ) : null}
              </div>
              <BadgeValue item={item} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-rose-50 pt-3 text-sm">
              <div><dt className="text-slate-500">{structure ? "Niveau collectif" : "Niveau"}</dt><dd className="font-semibold text-slate-800">{item.level}</dd></div>
              <div><dt className="text-slate-500">XP validée</dt><dd className="font-semibold text-slate-800">{formatNumber(item.xpValidated)}</dd></div>
            </dl>
          </article>
        ))}
      </div>
    </>
  );
}

function Methodology({ scope }: { scope: PublicLeaderboardScope }) {
  return (
    <details className="rounded-2xl border border-rose-100 bg-rose-50/60 px-4 py-3 text-sm text-slate-700">
      <summary className="cursor-pointer font-bold text-[#7f1d1d]">Comment fonctionne le classement ?</summary>
      <div className="mt-3 space-y-2 leading-6">
        <p>{scope === "user" ? "Le niveau utilisateur correspond au niveau courant validé." : "Le niveau collectif correspond au niveau calculé à partir de l’XP validée attribuable à la structure."}</p>
        <p>Seule l’XP validée est prise en compte : l’XP en attente est exclue.</p>
        <p>Les badges additionnent les grades et les one-shot. Observateur vaut 0 ; les éléments LEGACY, privilégiés ou de modération sont exclus.</p>
        <p>Exemple : 4 grades Participant + 3 grades Exploration + 2 one-shot = 9 badges.</p>
      </div>
    </details>
  );
}

export function LeaderboardPanel({
  initialScope = "user",
}: {
  initialScope?: PublicLeaderboardScope;
}) {
  const [scope, setScope] = useState<PublicLeaderboardScope>(initialScope);
  const [metric, setMetric] = useState<LeaderboardMetric>("level");
  const key = buildPublicLeaderboardUrl(scope, metric);
  const { data, error, isLoading } = useSWR(key, fetchPublicLeaderboard, {
    keepPreviousData: false,
    revalidateOnFocus: false,
  });

  return (
    <CmmCard as="section" tone="rose" variant="outlined" className="bg-white p-4 sm:p-6" ariaLabel="Classement public">
      <div className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#991b1b]">Classement public</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Niveaux, XP et badges partagés</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div role="group" aria-label="Périmètre du classement">
              <p className="mb-1 text-xs font-bold text-slate-600">Périmètre</p>
              <div className="flex rounded-xl border border-rose-200 bg-rose-50 p-1">
                {(["user", "structure"] as const).map((value) => (
                  <button key={value} type="button" aria-pressed={scope === value} onClick={() => setScope(value)} className="min-h-11 rounded-lg px-3 text-sm font-bold text-slate-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#991b1b] aria-pressed:bg-[#991b1b] aria-pressed:text-white">
                    {value === "user" ? "Utilisateurs" : "Structures"}
                  </button>
                ))}
              </div>
            </div>
            <div role="group" aria-label="Métrique du classement">
              <p className="mb-1 text-xs font-bold text-slate-600">Métrique</p>
              <div className="flex rounded-xl border border-rose-200 bg-rose-50 p-1">
                {PUBLIC_LEADERBOARD_METRICS.map((value) => (
                  <button key={value} type="button" aria-pressed={metric === value} onClick={() => setMetric(value)} className="min-h-11 rounded-lg px-3 text-sm font-bold text-slate-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#991b1b] aria-pressed:bg-[#991b1b] aria-pressed:text-white">
                    {metricLabels[value]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {isLoading ? <p role="status" aria-live="polite" className="rounded-2xl bg-rose-50 p-6 font-semibold text-slate-700">Chargement du classement…</p> : null}
        {error ? <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 font-semibold text-red-800">{error.message}</p> : null}
        {!isLoading && !error && data?.items.length === 0 ? (
          <p className="rounded-2xl border border-rose-100 bg-rose-50/60 p-6 font-semibold text-slate-700">
            {scope === "user" ? "Aucun utilisateur n’a encore choisi de figurer dans le classement." : "Aucune structure publique n’est encore disponible."}
          </p>
        ) : null}
        {!isLoading && !error && data?.items.length ? <LeaderboardTable items={data.items} scope={scope} /> : null}
        <Methodology scope={scope} />
      </div>
    </CmmCard>
  );
}
