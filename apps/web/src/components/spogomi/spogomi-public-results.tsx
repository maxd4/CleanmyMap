"use client";

import { useCallback, useEffect, useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import {
  parseSpogomiPublicResults,
  type SpogomiPublicResults,
} from "@/lib/spogomi/results-projection";

function formatNumber(value: number | null, maximumFractionDigits = 2) {
  return value === null
    ? "—"
    : new Intl.NumberFormat("fr-FR", { maximumFractionDigits }).format(value);
}

function Ranking({
  title,
  description,
  ranking,
}: {
  title: string;
  description: string;
  ranking: SpogomiPublicResults["sport"] | SpogomiPublicResults["butts"];
}) {
  return (
    <CmmCard tone="emerald" variant="glass" className="space-y-4 p-5">
      <div className="text-slate-900">
        <h2 className="text-xl font-black text-emerald-950">{title}</h2>
        <p className="text-sm text-slate-800">{description}</p>
      </div>
      {ranking.reason && ranking.entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-emerald-200 p-4 text-sm text-slate-700">
          {ranking.reason}
        </p>
      ) : null}
      {ranking.entries.length ? (
        <div className="cmm-data-table-wrap">
          <table className="cmm-data-table min-w-[620px]">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr>
                <th scope="col">Rang</th>
                <th scope="col">Équipe</th>
                <th scope="col">Valeur</th>
                <th scope="col">Présents</th>
                <th scope="col">Statut</th>
              </tr>
            </thead>
            <tbody>
              {ranking.entries.map((entry) => (
                <tr key={`${title}-${entry.teamNumber}`}>
                  <td className="cmm-data-table__numeric font-black">
                    {entry.rank ?? "—"}
                  </td>
                  <td>
                    <span className="font-bold">{entry.publicName}</span>
                    <span className="cmm-text-small ml-2 text-slate-600">
                      #{entry.teamNumber}
                    </span>
                  </td>
                  <td>
                    {entry.valueUnit === "points"
                      ? `${formatNumber(entry.score ?? null)} points`
                      : entry.numerator !== null &&
                          entry.numerator !== undefined &&
                          typeof entry.denominator === "number" &&
                          entry.denominator > 0
                        ? `${formatNumber(entry.numerator, 0)} / ${formatNumber(entry.denominator, 0)} = ${formatNumber(entry.ratio ?? null, 2)}`
                        : "Non comparable"}
                  </td>
                  <td className="cmm-data-table__numeric">
                    {formatNumber(entry.presentParticipants ?? null, 0)}
                  </td>
                  <td>
                    <span
                      className={
                        entry.status === "certified"
                          ? "font-bold text-emerald-700"
                          : entry.status === "provisional"
                            ? "font-bold text-amber-700"
                            : "text-slate-600"
                      }
                    >
                      {entry.status === "certified"
                        ? "Certifié"
                        : entry.status === "provisional"
                          ? "Provisoire"
                          : (entry.reason ?? "Indisponible")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </CmmCard>
  );
}

function EnvironmentalSummary({
  environmental,
}: {
  environmental: SpogomiPublicResults["environmental"];
}) {
  if (environmental.status !== "available")
    return (
      <section id="spogomi-balance" className="scroll-mt-6">
        <CmmCard tone="slate" variant="glass" className="border-dashed p-5">
          <h2 className="font-black text-slate-900">
            Bilan environnemental global
          </h2>
          <p className="mt-2 text-sm text-slate-700">
            Le bilan certifié CleanMyMap n’est pas encore publié.
          </p>
        </CmmCard>
      </section>
    );
  return (
    <section id="spogomi-balance" className="scroll-mt-6">
      <CmmCard tone="amber" variant="glass" className="space-y-3 p-5">
        <h2 className="text-xl font-black text-amber-950">
          Bilan environnemental global
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-white/70 p-3">
            <p className="cmm-text-small uppercase tracking-wide text-slate-700">
              Déchets hors mégots
            </p>
            <p className="text-xl font-black text-slate-950">
              {formatNumber(
                environmental.totalWasteMassGrams === null
                  ? null
                  : environmental.totalWasteMassGrams / 1000,
              )}{" "}
              kg
            </p>
          </div>
          <div className="rounded-xl bg-white/70 p-3">
            <p className="cmm-text-small uppercase tracking-wide text-slate-700">
              Mégots comptés
            </p>
            <p className="text-xl font-black text-slate-950">
              {formatNumber(environmental.cigaretteButtsCount, 0)}
            </p>
          </div>
          <div className="rounded-xl bg-white/70 p-3">
            <p className="cmm-text-small uppercase tracking-wide text-slate-700">
              Présents vérifiés
            </p>
            <p className="text-xl font-black text-slate-950">
              {formatNumber(environmental.participantsPresent, 0)}
            </p>
          </div>
        </div>
        <p className="cmm-text-small text-slate-700">
          Projection CleanMyMap {environmental.projectionVersion ?? "—"}. Les
          mesures certifiées des divisions sont consolidées une seule fois dans
          l’action parent.
        </p>
      </CmmCard>
    </section>
  );
}

function PublicResultsContent({
  results,
  activeDivision,
  busy,
  error,
  refresh,
}: {
  results: SpogomiPublicResults;
  activeDivision: NonNullable<SpogomiPublicResults["divisions"]>[number] | null;
  busy: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}) {
  const sport = activeDivision?.sport ?? results.sport;
  const butts = activeDivision?.butts ?? results.butts;
  return (
    <section className="space-y-5" aria-labelledby="spogomi-results-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="spogomi-results-title"
            className="text-2xl font-black text-slate-950"
          >
            Classements et résultats
          </h2>
          <p className="text-sm text-slate-950">
            Règlement{" "}
            {activeDivision?.regulationVersion ?? results.regulationVersion} ·
            dernière lecture{" "}
            {new Intl.DateTimeFormat("fr-FR", { timeStyle: "short" }).format(
              new Date(results.refreshedAt),
            )}
          </p>
          {activeDivision ? (
            <p className="cmm-text-small mt-1 font-black text-emerald-800">
              Division affichée : {activeDivision.type === "world_cup" ? "World Cup" : "Casual"}
            </p>
          ) : null}
        </div>
        <CmmButton
          type="button"
          tone="secondary"
          size="sm"
          disabled={busy}
          onClick={() => {
            void (
              /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ refresh()
            );
          }}
        >
          {busy ? "Actualisation…" : "Actualiser"}
        </CmmButton>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <Ranking
        title="Classement sportif"
        description="Points calculés avec la version du règlement publiée pour cette division. Les équipes de l’autre division ne sont pas incluses."
        ranking={sport}
      />
      <Ranking
        title="Mégots par participant"
        description="Mégots directement comptés / participants présents et vérifiés dans cette division."
        ranking={butts}
      />
      <EnvironmentalSummary environmental={results.environmental} />
    </section>
  );
}

export function SpogomiPublicResults({
  eventSlug,
  initial,
  initialDivisionId,
  active = true,
}: {
  eventSlug: string;
  initial: SpogomiPublicResults | null;
  initialDivisionId?: string;
  active?: boolean;
}) {
  const [results, setResults] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/spogomi/public/events/${encodeURIComponent(eventSlug)}`,
        { cache: "no-store" },
      );
      const body: unknown = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          typeof body === "object" &&
            body !== null &&
            "error" in body &&
            typeof body.error === "string"
            ? body.error
            : "Résultats indisponibles.",
        );
      const parsed =
        typeof body === "object" && body !== null && "results" in body
          ? parseSpogomiPublicResults(body.results)
          : null;
      if (!parsed)
        throw new Error("Les résultats ont renvoyé une réponse invalide.");
      setResults(parsed);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Résultats indisponibles.",
      );
    } finally {
      setBusy(false);
    }
  }, [eventSlug]);
  useEffect(() => {
    if (
      !active ||
      !results ||
      results.visibility === "hidden" ||
      results.lifecycleStatus === "unavailable" ||
      document.visibilityState === "hidden"
    )
      return;
    // Justification polling: public provisional results may change after arbitration;
    // refresh every 60 seconds only while the rankings anchor is active and visible.
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "hidden")
        void (
          /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ refresh().catch(
            () => undefined,
          )
        );
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [active, refresh, results]);
  if (
    !results ||
    results.visibility === "hidden" ||
    results.lifecycleStatus === "unavailable"
  )
    return (
      <section id="spogomi-balance" className="scroll-mt-6">
        <CmmCard tone="slate" variant="glass" className="border-dashed p-5">
          <h2 className="font-black text-slate-900">
            Classements et résultats
          </h2>
          <p className="mt-2 text-sm text-slate-700">
            {results?.visibility === "hidden"
              ? "Les résultats restent masqués jusqu’à publication par l’organisateur."
              : "Aucun résultat public n’est disponible pour cette édition."}
          </p>
        </CmmCard>
      </section>
    );
  const activeDivisionId = initialDivisionId ?? results.divisions?.[0]?.id ?? null;
  const activeDivision =
    results.divisions?.find((division) => division.id === activeDivisionId) ??
    results.divisions?.[0] ??
    null;
  return (
    <PublicResultsContent
      results={results}
      activeDivision={activeDivision}
      busy={busy}
      error={error}
      refresh={refresh}
    />
  );
}
