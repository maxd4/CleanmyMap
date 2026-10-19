"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { buildSignInRedirectHref } from "@/lib/auth/redirect-url";
import { swrRecentViewOptions } from "@/lib/swr-config";
import type { PublicSectionBreakdown } from "@/lib/sections/public-section-snapshot-contract";
import { RecyclingQualitySummary, RecyclingStreamTable } from "./recycling-components";

const BREAKDOWN_KEY = "section-recycling-breakdown";

async function fetchRecyclingBreakdown(): Promise<PublicSectionBreakdown> {
  const response = await fetch("/api/recycling/breakdown", {
    method: "GET",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(response.status === 401 ? "breakdown_auth_required" : "breakdown_unavailable");
  }
  return (await response.json()) as PublicSectionBreakdown;
}

function DetailState({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "error" }) {
  return (
    <CmmCard
      as="section"
      tone="emerald"
      variant="glass"
      className={tone === "error" ? "border-rose-300/30 bg-rose-950/20 p-6" : "p-6"}
      ariaLabel="Répartition détaillée des déchets"
    >
      {children}
    </CmmCard>
  );
}

export function RecyclingBreakdownDetails({
  fr,
  onLoaded,
}: {
  fr: boolean;
  onLoaded?: (breakdown: PublicSectionBreakdown) => void;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const [requested, setRequested] = useState(false);
  const canLoad = isLoaded && Boolean(isSignedIn);
  const key = requested && canLoad ? BREAKDOWN_KEY : null;
  const { data, error, isLoading, isValidating } = useSWR<PublicSectionBreakdown>(
    key,
    fetchRecyclingBreakdown,
    {
      ...swrRecentViewOptions,
      keepPreviousData: true,
    },
  );

  useEffect(() => {
    if (data) onLoaded?.(data);
  }, [data, onLoaded]);

  if (!isLoaded) {
    return (
      <DetailState>
        <p role="status" className="text-sm font-semibold text-slate-300">
          {fr ? "Vérification de l’accès à la répartition détaillée…" : "Checking access to the detailed breakdown…"}
        </p>
      </DetailState>
    );
  }

  if (!isSignedIn) {
    return (
      <DetailState>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-black text-white">{fr ? "Répartition détaillée des déchets" : "Detailed waste breakdown"}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {fr ? "Connectez-vous pour consulter les flux privés et leurs indicateurs de qualité." : "Sign in to view private waste streams and their quality indicators."}
            </p>
          </div>
          <CmmButton href={buildSignInRedirectHref("/sections/recycling")} tone="primary" variant="pill">
            {fr ? "Voir la répartition détaillée des déchets" : "View the detailed waste breakdown"}
          </CmmButton>
        </div>
      </DetailState>
    );
  }

  if (!requested) {
    return (
      <DetailState>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-black text-white">{fr ? "Répartition détaillée des déchets" : "Detailed waste breakdown"}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {fr ? "Cette lecture authentifiée est chargée uniquement à votre demande." : "This authenticated read loads only when you ask for it."}
            </p>
          </div>
          <CmmButton type="button" onClick={() => setRequested(true)} tone="primary" variant="pill">
            {fr ? "Voir la répartition détaillée des déchets" : "View the detailed waste breakdown"}
          </CmmButton>
        </div>
      </DetailState>
    );
  }

  if (isLoading || (isValidating && !data)) {
    return (
      <DetailState>
        <p role="status" aria-live="polite" className="text-sm font-semibold text-slate-300">
          {fr ? "Chargement de la répartition détaillée…" : "Loading the detailed breakdown…"}
        </p>
      </DetailState>
    );
  }

  if (error) {
    return (
      <DetailState tone="error">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-black text-white">{fr ? "Répartition indisponible" : "Breakdown unavailable"}</h3>
            <p role="alert" className="mt-2 text-sm leading-6 text-rose-200">
              {error.message === "breakdown_auth_required"
                ? (fr ? "Votre session n’est plus disponible. Reconnectez-vous pour réessayer." : "Your session is no longer available. Sign in again to retry.")
                : (fr ? "La ventilation détaillée n’a pas pu être chargée. Aucune valeur n’est remplacée par zéro." : "The detailed breakdown could not be loaded. No value is replaced with zero.")}
            </p>
          </div>
          <CmmButton type="button" onClick={() => setRequested(false)} tone="secondary" variant="pill">
            {fr ? "Réessayer" : "Retry"}
          </CmmButton>
        </div>
      </DetailState>
    );
  }

  if (!data) {
    return (
      <DetailState>
        <div className="space-y-4">
          <h3 className="text-lg font-black text-white">{fr ? "Répartition indisponible" : "Breakdown unavailable"}</h3>
          <p className="text-sm leading-6 text-slate-300">
            {fr ? "Le snapshot détaillé n’est pas disponible ; aucune valeur inconnue n’est présentée comme zéro." : "The detailed snapshot is unavailable; unknown values are not shown as zero."}
          </p>
          <CmmButton type="button" onClick={() => setRequested(false)} tone="secondary" variant="pill">
            {fr ? "Réessayer" : "Retry"}
          </CmmButton>
        </div>
      </DetailState>
    );
  }

  return (
    <div className="space-y-8" data-breakdown-state="success">
      <p role="status" className="text-sm font-semibold text-emerald-300">
        {fr ? "Répartition détaillée disponible depuis le snapshot réel." : "Detailed breakdown loaded from the real snapshot."}
      </p>
      <RecyclingStreamTable breakdown={data} fr={fr} />
      <div className="grid gap-8 lg:grid-cols-2">
        <RecyclingQualitySummary quality={data.triQuality} fr={fr} />
        <DetailState>
          <h3 className="text-lg font-black text-white">{fr ? "Qualité de la mesure" : "Measurement quality"}</h3>
          <dl className="mt-5 space-y-3 text-sm text-slate-300">
            <div className="flex justify-between gap-4"><dt>{fr ? "Actions avec masse renseignée" : "Actions with recorded mass"}</dt><dd className="font-black text-white">{data.wasteCoverageRate.toFixed(1)} %</dd></div>
            <div className="flex justify-between gap-4"><dt>{fr ? "Snapshot généré le" : "Snapshot generated"}</dt><dd className="font-black text-white">{new Date(data.generatedAt).toLocaleString(fr ? "fr-FR" : "en-GB")}</dd></div>
          </dl>
        </DetailState>
      </div>
    </div>
  );
}
