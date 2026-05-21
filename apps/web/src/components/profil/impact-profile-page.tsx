"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { toPng } from "html-to-image";
import confetti from "canvas-confetti";
import { Download, Share2, ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { ImpactCard } from "@/components/profil/impact-card";
import { EnvironmentalImpactEstimatorPanel } from "@/components/environmental-impact-estimator/environmental-impact-estimator-panel";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { cn } from "@/lib/utils";
import {
  fetchCurrentAccountIdentity,
  type CurrentAccountIdentity,
} from "@/lib/account/current-account-identity";
import {
  computeEnvironmentalImpactEstimate,
  type EnvironmentalImpactDashboardResponse,
} from "@/lib/environmental-impact-estimator";

type ImpactPageProgression = {
  currentLevel: number;
  dynamicRanking?: {
    rank: number | null;
  };
  impact?: {
    wasteKg?: number;
    totalButts?: number;
    waterSavedLiters?: number;
  };
  badges?: string[];
};

type GamificationMeResponse = {
  status: "ok";
  progression: ImpactPageProgression | null;
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("API Error");
  return response.json();
}

export default function ImpactProfilePage() {
  const { locale } = useSitePreferences();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [currentAccountIdentity, setCurrentAccountIdentity] =
    useState<CurrentAccountIdentity | null>(null);
  const classes = getBlockClasses("impact");
  const impactKey = currentAccountIdentity?.userId
    ? ["environmental-impact-dashboard", currentAccountIdentity.userId]
    : null;
  const { data: impactData } = useSWR<EnvironmentalImpactDashboardResponse>(
    impactKey,
    () => fetchJson<EnvironmentalImpactDashboardResponse>("/api/environmental-impact"),
  );
  const environmentalImpactModel =
    impactData?.model ?? computeEnvironmentalImpactEstimate();

  const { data: meData, isLoading } = useSWR<GamificationMeResponse>(
    "gamification-me",
    () => fetchJson<GamificationMeResponse>("/api/gamification/me"),
  );

  useEffect(() => {
    let cancelled = false;

    fetchCurrentAccountIdentity()
      .then((identity) => {
        if (!cancelled) {
          setCurrentAccountIdentity(identity);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCurrentAccountIdentity(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(document.getElementById("impact-card")!, {
        cacheBust: true,
        backgroundColor: "#450a0a",
      });
      const link = document.createElement("a");
      link.download = `CleanMyMap-Impact-${
        currentAccountIdentity?.displayName ||
        currentAccountIdentity?.firstName ||
        "Contributeur"
      }.png`;
      link.href = dataUrl;
      link.click();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#ef4444", "#f87171", "#ffffff"],
      });
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
        <span className="animate-pulse text-xs font-black uppercase tracking-widest text-red-400/60">
          Chargement de votre impact...
        </span>
      </div>
    );
  }

  const prog = meData?.progression;

  if (!currentAccountIdentity) {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        mode="blur"
        title="Carte d'impact personnelle"
        description="Connectez-vous pour consulter, télécharger et partager votre carte d'impact."
        lockedPreview={
          <div className="grid gap-8 md:grid-cols-2">
            <div className={cn("rounded-[2rem] border p-6", classes.surface)}>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400/60">
                Aperçu verrouillé
              </p>
              <div className="mt-4 rounded-2xl border border-white/5 bg-red-400/5 p-5">
                <p className="text-sm leading-relaxed text-red-100/40">
                  La carte d&apos;impact montre tes actions validées, ton niveau et
                  tes badges après connexion.
                </p>
              </div>
            </div>
            <div className={cn("rounded-[2rem] border p-6", classes.surface)}>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400/60">
                Actions disponibles
              </p>
              <div className="mt-4 space-y-3">
                {[
                  "Télécharger le certificat",
                  "Copier le lien du profil",
                  "Consulter la méthodologie",
                ].map((act) => (
                  <div
                    key={act}
                    className="rounded-xl border border-white/5 bg-white/5 p-4 text-xs font-bold text-red-100/30"
                  >
                    {act}
                  </div>
                ))}
              </div>
            </div>
          </div>
        }
      >
        <div />
      </ClerkRequiredGate>
    );
  }

  return (
    <div className="w-full space-y-10 pb-20">
      <header className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <Link
          href="/dashboard"
          className="group flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-red-400/40 transition-all hover:text-red-400"
        >
          <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
          Retour au cockpit
        </Link>
        <div className="flex items-center gap-3 rounded-full border border-red-400/20 bg-red-400/5 px-6 py-2">
          <ShieldCheck size={14} className="text-red-400" />
          <h1 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400/80">
            Carte d&apos;impact personnelle
          </h1>
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-12 xl:grid-cols-[minmax(340px,420px)_minmax(0,1fr)]">
        <div className="sticky top-24 flex justify-center">
            <ImpactCard
              userName={
                currentAccountIdentity?.displayName ||
                currentAccountIdentity?.username ||
                "Contributeur anonyme"
              }
            level={prog?.currentLevel || 1}
            rank={prog?.dynamicRanking?.rank ?? null}
            totalKg={prog?.impact?.wasteKg || 0}
            totalButts={prog?.impact?.totalButts || 0}
            waterSaved={prog?.impact?.waterSavedLiters || 0}
            topBadges={prog?.badges || []}
          />
        </div>

        <div className="space-y-10">
          <div className="space-y-4">
            <h2 className="text-5xl font-black tracking-tighter text-white leading-[0.9]">
              Votre impact <br />
              <span className="text-red-500">en temps réel.</span>
            </h2>
            <p className="max-w-xl text-lg leading-relaxed text-red-100/40">
              Générez une carte haute fidélité qui résume vos actions validées sur le terrain, votre niveau d&apos;expertise et vos distinctions.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <button
              onClick={handleDownload}
              disabled={isExporting}
              className={cn(
                "flex-1 flex items-center justify-center gap-3 rounded-2xl bg-red-600 px-8 py-5 text-sm font-black uppercase tracking-widest text-white shadow-2xl shadow-red-600/20 transition-all hover:scale-[1.02] hover:bg-red-500 active:scale-[0.98] disabled:opacity-50",
                classes.shadow,
              )}
            >
              <Download size={18} />
              {isExporting ? "Génération..." : "Exporter la carte"}
            </button>
            <button className="flex-1 flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-8 py-5 text-sm font-black uppercase tracking-widest text-red-100/60 transition-all hover:bg-white/10 hover:text-red-100">
              <Share2 size={18} />
              Partager le profil
            </button>
          </div>

          <div
            className={cn(
              "relative space-y-6 overflow-hidden rounded-[2rem] border p-8",
              classes.surface,
            )}
          >
            <div className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-red-500/10 blur-2xl" />

            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-400/40">
                Méthodologie
              </p>
              <p className="text-sm leading-relaxed text-red-100/40">
                Les données d&apos;impact sont consolidées à partir de vos actions validées. Le volume d&apos;eau préservé repose sur un ratio de 500L par mégot extrait de l&apos;environnement.
              </p>
            </div>

            <Link
              href="/methodologie"
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-red-400 transition-colors hover:text-red-300"
            >
              Consulter le protocole scientifique <span className="text-lg">→</span>
            </Link>
          </div>

          <EnvironmentalImpactEstimatorPanel
            model={environmentalImpactModel}
            signals={impactData?.signals ?? null}
            snapshots={impactData?.snapshots ?? []}
          />
        </div>
      </div>
    </div>
  );
}
