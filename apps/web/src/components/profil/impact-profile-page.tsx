"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import confetti from "canvas-confetti";
import { Download, Share2, ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { ImpactCard } from "@/components/profil/impact-card";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { cn } from "@/lib/utils";
import {
  fetchCurrentAccountIdentity,
  type CurrentAccountIdentity,
} from "@/lib/account/current-account-identity";
import { DASHBOARD_ROUTE } from "@/lib/accueil-pilotage-routes";
import { logFailure } from "@/lib/logging/failure-log";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import {
  downloadImpactCardPng,
  generateImpactCardPng,
  isImpactShareAbortError,
  shareOrDownloadImpactCardPng,
} from "@/components/profil/impact-card-export";

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
  const [activeCardAction, setActiveCardAction] = useState<"export" | "share" | null>(null);
  const [cardActionMessage, setCardActionMessage] = useState<string | null>(null);
  const [cardActionError, setCardActionError] = useState<string | null>(null);
  const [currentAccountIdentity, setCurrentAccountIdentity] =
    useState<CurrentAccountIdentity | null>(null);
  const classes = getBlockClasses("impact");

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

  const displayName =
    currentAccountIdentity?.displayName ||
    currentAccountIdentity?.firstName ||
    "Contributeur";

  const showCardActionError = (
    message: string,
    userMessage: string,
    error: unknown,
  ) => {
    logFailure("ImpactProfile", message, error);
    setCardActionError(userMessage);
  };

  const handleDownload = async () => {
    if (activeCardAction) return;
    setActiveCardAction("export");
    setCardActionMessage(null);
    setCardActionError(null);

    try {
      const png = await generateImpactCardPng(displayName);
      downloadImpactCardPng(png);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#ef4444", "#f87171", "#ffffff"],
      });
      setCardActionMessage("Carte téléchargée.");
    } catch (error) {
      showCardActionError(
        "Export failed",
        "La carte n’a pas pu être exportée. Réessayez avec l’un des boutons ci-dessus.",
        error,
      );
    } finally {
      setActiveCardAction(null);
    }
  };

  const handleShare = async () => {
    if (activeCardAction) return;
    setActiveCardAction("share");
    setCardActionMessage(null);
    setCardActionError(null);

    try {
      const png = await generateImpactCardPng(displayName);
      const result = await shareOrDownloadImpactCardPng(png);

      if (result === "downloaded") {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#ef4444", "#f87171", "#ffffff"],
        });
        setCardActionMessage(
          "Partage non disponible ici : la carte a été téléchargée.",
        );
      } else {
        setCardActionMessage("Carte partagée.");
      }
    } catch (error) {
      if (!isImpactShareAbortError(error)) {
        showCardActionError(
          "Share failed",
          "La carte n’a pas pu être partagée. Réessayez avec l’un des boutons ci-dessus.",
          error,
        );
      }
    } finally {
      setActiveCardAction(null);
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
                  "Partager l’image de la carte",
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
          href={DASHBOARD_ROUTE}
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
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-600">
              <span className="rounded-full border border-red-500/15 bg-red-500/8 px-3 py-1 text-red-700">
                Carte d&apos;impact personnelle
              </span>
              <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-slate-500">
                Exportable et partageable
              </span>
            </div>

            <div className="space-y-3">
              <h2 className="max-w-3xl text-4xl font-black tracking-tighter text-slate-950 sm:text-5xl xl:text-[3.5rem] xl:leading-[0.95]">
                Votre impact en temps réel
                <span className="block text-red-600">sans perdre la lisibilité.</span>
              </h2>
              <p className="max-w-2xl text-lg leading-relaxed text-slate-700">
                Générez une carte haute fidélité qui résume vos actions validées sur le
                terrain, votre niveau d&apos;expertise et vos distinctions, avec une lecture
                plus directe sur desktop et mobile.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <button
              type="button"
              onClick={handleDownload}
              disabled={Boolean(activeCardAction)}
              className={cn(
                "flex-1 flex items-center justify-center gap-3 rounded-2xl bg-red-600 px-8 py-5 text-sm font-black uppercase tracking-widest text-white shadow-2xl shadow-red-600/20 transition-all hover:scale-[1.02] hover:bg-red-500 active:scale-[0.98] disabled:opacity-50",
                classes.shadow,
              )}
            >
              <Download size={18} />
              {activeCardAction === "export"
                ? "Génération de la carte..."
                : "Exporter la carte"}
            </button>
            <button
              type="button"
              onClick={handleShare}
              disabled={Boolean(activeCardAction)}
              className="flex-1 flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-8 py-5 text-sm font-black uppercase tracking-widest text-red-100/60 transition-all hover:bg-white/10 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Share2 size={18} />
              {activeCardAction === "share"
                ? "Préparation du partage..."
                : "Partager la carte"}
            </button>
          </div>

          <div className="min-h-6" aria-live="polite" aria-atomic="true">
            {cardActionMessage ? (
              <p className="text-center text-xs font-bold text-red-100/80">
                {cardActionMessage}
              </p>
            ) : null}
            {cardActionError ? (
              <p role="alert" className="text-center text-xs font-bold text-rose-200">
                {cardActionError}
              </p>
            ) : null}
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
                Les données d&apos;impact sont consolidées à partir de vos actions validées. L&apos;eau préservée est un proxy calculé avec {IMPACT_PROXY_CONFIG.factors.waterLitersPerCigaretteButt} L par mégot extrait ; elle ne constitue pas une mesure directe de la qualité de l&apos;eau.
              </p>
            </div>

            <Link
              href="/methodologie"
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-red-400 transition-colors hover:text-red-300"
            >
              Consulter le protocole scientifique <span className="text-lg">→</span>
            </Link>
          </div>

          <section className={cn("space-y-4 rounded-[2rem] border p-8", classes.surface)}>
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-400/40">
                Impact collectif
              </p>
              <h3 className="text-lg font-black tracking-tight text-slate-950">
                Les comparaisons globales restent dans les rapports
              </h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Cette page reste centrée sur votre progression, vos badges et vos actions validées.
                Les indicateurs territoriaux, les méthodes et les exports collectifs sont regroupés
                dans la surface de rapports.
              </p>
            </div>
            <Link
              href="/reports"
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-red-600 transition-colors hover:text-red-500"
            >
              Consulter les rapports collectifs <span className="text-lg">→</span>
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
