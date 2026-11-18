"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  HelpCircle,
  Info,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { GamificationPanelLoading, SectionLabel } from "./gamification-shell";

type PublicProof = {
  actionId: string;
  actionDate: string;
  locationLabel: string;
  qualifiedAt: string;
};

type BrigadeVerteApiResponse =
  | {
      status: "available";
      count: number;
      proofs: PublicProof[];
    }
  | {
      status: "error";
      message: string;
    };

async function fetcher(url: string): Promise<BrigadeVerteApiResponse> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    return {
      status: "error",
      message: "Indisponibilité temporaire du service de parcours.",
    };
  }
  return res.json();
}

type Props = {
  locale?: string;
  displayMode?: string;
};

export function GamificationBrigadeVertePanel({
  locale = "fr",
  displayMode = "calme",
}: Props) {
  const { data, error, isLoading, mutate } = useSWR<BrigadeVerteApiResponse>(
    "/api/parcours/brigade-verte",
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  const [declaredName, setDeclaredName] = useState("");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setOpenFaqIndex((prev) => (prev === idx ? null : idx));
  };

  // 1. État de chargement
  if (isLoading) {
    return (
      <section
        aria-label="Chargement du Parcours Éco-Citoyen"
        className="rounded-[1.75rem] border border-[#f0e4df] bg-white p-6 shadow-sm"
      >
        <GamificationPanelLoading
          ariaLabel="Chargement du Parcours Éco-Citoyen"
          headingWidth="w-56"
          cardHeight="h-32"
        />
      </section>
    );
  }

  // 2. État d'erreur / indisponibilité (FAIL-CLOSED : NE JAMAIS afficher 0/2 sur erreur ou format invalide)
  if (error || !data || data.status !== "available" || !Array.isArray(data.proofs)) {
    return (
      <section
        role="region"
        aria-label="Erreur Parcours Éco-Citoyen"
        className="rounded-[1.75rem] border border-rose-200 bg-rose-50/70 p-6 shadow-sm"
      >
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-rose-600 mt-0.5 shrink-0" aria-hidden="true" />
          <div className="space-y-2">
            <h2 className="text-base font-bold text-rose-950">
              Parcours Éco-Citoyen | Brigade Verte Paris
            </h2>
            <p className="text-sm text-rose-800">
              Impossible de charger votre progression actuellement. Ce service est momentanément indisponible.
            </p>
            <p className="text-xs text-rose-700">
              Note : en conformité avec nos garanties de sécurité, aucune valeur n&apos;est présumée ou affichée à zéro lors d&apos;une interruption.
            </p>
            <div className="pt-2">
              <CmmButton
                tone="secondary"
                size="sm"
                onClick={() => mutate()}
                className="gap-2 text-rose-900 border-rose-300 hover:bg-rose-100"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Réessayer la lecture
              </CmmButton>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const { count, proofs } = data;
  const isComplete = count >= 2;

  // Libellés du compteur officiel
  const progressBadgeText =
    count === 0
      ? "0/2 • Aucune participation justificative"
      : count === 1
      ? "1/2 • Une participation vérifiée"
      : "2/2 • Deux participations justificatives réunies";

  const progressTone =
    count === 0
      ? "border-zinc-200 bg-zinc-50 text-zinc-700"
      : count === 1
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-emerald-200 bg-emerald-50 text-emerald-900";

  const faqItems = [
    {
      q: "Qu'est-ce qu'une opération admissible « Quartier Propre » ?",
      a: "Une opération admissible est une action de ramassage canonique passée, finalisée, publique, visible, non annulée et expressément qualifiée par l'administration CleanMyMap sur preuve d'organisation ou de coorganisation par Brigade Verte Paris. Aucun titre ou import ne qualifie automatiquement une action.",
    },
    {
      q: "Pourquoi mon inscription seule ne suffit-elle pas ?",
      a: "La validation du diplôme exige une présence réelle sur le terrain. Seules les participations confirmées par l'organisateur (participation_status = confirmed) sont prises en compte pour le relevé justificatif.",
    },
    {
      q: "J'ai participé mais ma présence n'est pas confirmée, que faire ?",
      a: "Vous pouvez contacter l'organisateur de l'action depuis sa page sur CleanMyMap ou formuler une demande de confirmation rétrospective (post-action claim) pour attester de votre participation effective.",
    },
    {
      q: "Quelles sont les deux autres conditions requises par la Brigade Verte ?",
      a: "En complément des 2 opérations de terrain suivies par CleanMyMap, la Brigade Verte Paris requiert de suivre une session de formation/sensibilisation et de faire preuve d'un engagement citoyen durable. Ces deux volets relèvent exclusivement de leur autorité.",
    },
    {
      q: "Comment obtenir le Diplôme Éco-Citoyen officiel ?",
      a: "Une fois vos 2 preuves réunies sur CleanMyMap, éditez votre récapitulatif personnel A4 et prenez contact avec la Brigade Verte Paris (https://www.brigadeverteparis.fr/). Le diplôme officiel est délivré exclusivement par eux après examen de votre dossier.",
    },
  ];

  return (
    <section
      role="region"
      aria-label="Parcours Éco-Citoyen Brigade Verte Paris"
      data-locale={locale}
      data-display-mode={displayMode}
      className="rounded-[1.75rem] border border-[#f0e4df] bg-white p-6 shadow-sm space-y-6"
    >
      {/* En-tête de la carte */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#f5edea] pb-4">
        <div className="space-y-3">
          <SectionLabel
            icon={ShieldCheck}
            title="Parcours Éco-Citoyen | Brigade Verte Paris"
            subtitle="Participez activement à la propreté de la capitale et préparez les démarches vers le Diplôme Éco-Citoyen officiel délivré par Brigade Verte Paris."
          />
          <div className="flex items-center gap-2 pt-1">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${progressTone}`}
            >
              {progressBadgeText}
            </span>
            <span className="text-xs text-zinc-500 font-medium">
              Dispositif Partenaire • Ville de Paris
            </span>
          </div>
        </div>

        {/* Jauge visuelle */}
        <div className="w-full sm:w-48 bg-zinc-100 rounded-full h-3 overflow-hidden border border-zinc-200">
          <div
            className={`h-full transition-all duration-500 ${
              count === 0
                ? "w-0 bg-transparent"
                : count === 1
                ? "w-1/2 bg-amber-500"
                : "w-full bg-emerald-600"
            }`}
            style={{ width: `${Math.min(100, (count / 2) * 100)}%` }}
            aria-valuenow={count}
            aria-valuemin={0}
            aria-valuemax={2}
            role="progressbar"
            aria-label="Progression vers les 2 opérations requises"
          />
        </div>
      </div>

      {/* Présentation séparée des 3 conditions officielles */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#8b6f67]">
          Les 3 conditions publiées (Référentiel Brigade Verte Paris — Septembre 2026)
        </h3>
        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          {/* Condition 1 : CleanMyMap */}
          <article className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 space-y-1.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 mb-1">
                <span>1. Deux opérations terrain</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-900 border border-emerald-300">
                  Vérifié par CleanMyMap
                </span>
              </div>
              <p className="text-xs text-emerald-950 font-medium">
                Participer à 2 opérations « Quartier Propre » qualifiées avec présence confirmée.
              </p>
            </div>
            <div className="text-xs font-bold text-emerald-800 pt-2 border-t border-emerald-200">
              Statut : {count} / 2 {isComplete ? "✓ Réuni" : "en cours"}
            </div>
          </article>

          {/* Condition 2 : Externe */}
          <article className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 space-y-1.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-600 mb-1">
                <span>2. Formation & Sensibilisation</span>
                <span className="rounded-full bg-zinc-200/80 px-2 py-0.5 text-xs text-zinc-700">
                  Externe • Non vérifié
                </span>
              </div>
              <p className="text-xs text-zinc-600">
                Suivre la session d&apos;initiation animée par l&apos;équipe de la Brigade Verte Paris.
              </p>
            </div>
            <div className="text-xs text-zinc-500 pt-2 border-t border-zinc-200">
              À valider directement auprès de l&apos;association.
            </div>
          </article>

          {/* Condition 3 : Externe */}
          <article className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 space-y-1.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-600 mb-1">
                <span>3. Engagement durable</span>
                <span className="rounded-full bg-zinc-200/80 px-2 py-0.5 text-xs text-zinc-700">
                  Externe • Non vérifié
                </span>
              </div>
              <p className="text-xs text-zinc-600">
                Maintenir une continuité d&apos;implication citoyenne pour la salubrité urbaine.
              </p>
            </div>
            <div className="text-xs text-zinc-500 pt-2 border-t border-zinc-200">
              Évalué souverainement par la Brigade Verte Paris.
            </div>
          </article>
        </div>
      </div>

      {/* Preuves retenues pour le compte connecté */}
      {proofs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#8b6f67]">
            Vos participations retenues ({proofs.length} / 2)
          </h3>
          <div className="space-y-2">
            {proofs.map((proof, idx) => (
              <div
                key={proof.actionId}
                className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 text-sm"
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
                    <span>Preuve n°{idx + 1} — Opération Quartier Propre</span>
                  </div>
                  <div className="text-xs text-zinc-600 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-zinc-500" aria-hidden="true" />
                      {proof.actionDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-zinc-500" aria-hidden="true" />
                      {proof.locationLabel}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-emerald-800 font-medium text-right">
                  Validée le {new Date(proof.qualifiedAt).toLocaleDateString("fr-FR")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Zone Justificatif Personnel A4 (uniquement à 2/2) */}
      {isComplete ? (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50/70 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-6 w-6 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-emerald-950">
                Félicitations ! Vos deux preuves de participation sont réunies.
              </h3>
              <p className="text-xs text-emerald-900 leading-relaxed">
                Vous pouvez dès à présent générer votre relevé privé A4 imprimable pour engager les démarches auprès de la Brigade Verte Paris.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end pt-2 border-t border-emerald-200/80">
            <div className="space-y-1">
              <label htmlFor="declared-name-input" className="text-xs font-semibold text-emerald-950 block">
                Nom ou prénom pour le document (facultatif, non enregistré en base) :
              </label>
              <input
                id="declared-name-input"
                type="text"
                value={declaredName}
                onChange={(e) => setDeclaredName(e.target.value)}
                placeholder="Ex. Alex Martin"
                maxLength={60}
                className="w-full text-xs rounded-lg border border-emerald-300 bg-white px-3 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <Link
                href={`/prints/brigade-verte${declaredName.trim() ? `?name=${encodeURIComponent(declaredName.trim())}` : ""}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs px-4 py-2.5 transition shadow-sm"
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                Ouvrir le relevé A4 imprimable
                <ExternalLink className="h-3 w-3 opacity-80" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="text-xs text-emerald-900/90 leading-normal italic bg-emerald-100/60 p-2.5 rounded-lg border border-emerald-200">
            <strong>Mention obligatoire :</strong> Document informatif établi par CleanMyMap. Ne constitue ni un diplôme, ni une attestation officielle de la Brigade Verte Paris.
          </div>
        </div>
      ) : (
        /* Étapes du parcours guidé */
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#8b6f67]">
            Parcours guidé pour obtenir vos 2 preuves
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 text-xs">
            {/* 1. Découvrir */}
            <div className="rounded-xl border border-zinc-200 p-3.5 space-y-1 bg-white">
              <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold">1</span>
                Découvrir les opérations
              </div>
              <p className="text-zinc-600 leading-relaxed">
                Recherchez les opérations parisiennes coorganisées ou labellisées « Quartier Propre ».
              </p>
            </div>

            {/* 2. Participer */}
            <div className="rounded-xl border border-zinc-200 p-3.5 space-y-1 bg-white">
              <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold">2</span>
                Participer sur le terrain
              </div>
              <p className="text-zinc-600 leading-relaxed">
                Rejoignez une action via les{" "}
                <Link href="/actions" className="text-emerald-700 font-semibold underline">
                  actions CleanMyMap
                </Link>{" "}
                ou le site officiel{" "}
                <a
                  href="https://www.brigadeverteparis.fr/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 font-semibold underline inline-flex items-center gap-0.5"
                >
                  Brigade Verte Paris <ExternalLink className="h-2.5 w-2.5" />
                </a>.
              </p>
            </div>

            {/* 3. Confirmer */}
            <div className="rounded-xl border border-zinc-200 p-3.5 space-y-1 bg-white">
              <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold">3</span>
                Faire confirmer sa présence
              </div>
              <p className="text-zinc-600 leading-relaxed">
                Une simple inscription ne suffit pas : veillez à ce que votre présence soit confirmée par l&apos;organisateur lors de la clôture.
              </p>
            </div>

            {/* 4. Suivre */}
            <div className="rounded-xl border border-zinc-200 p-3.5 space-y-1 bg-white">
              <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold">4</span>
                Suivre ses preuves
              </div>
              <p className="text-zinc-600 leading-relaxed">
                Dès que l&apos;action est qualifiée administrativement, votre progression s&apos;incrémente automatiquement ici.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FAQ interactive accessible */}
      <div className="pt-2 border-t border-[#f5edea] space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#8b6f67] flex items-center gap-1.5">
          <HelpCircle className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
          Foire aux questions • Parcours Éco-Citoyen
        </h3>
        <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
          {faqItems.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div key={item.q} className="p-3 text-xs">
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full text-left font-semibold text-zinc-900 flex items-center justify-between gap-2 hover:text-emerald-700 transition"
                  aria-expanded={isOpen}
                >
                  <span>{item.q}</span>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-zinc-400 shrink-0" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" aria-hidden="true" />
                  )}
                </button>
                {isOpen && (
                  <p className="mt-2 text-zinc-600 leading-relaxed pl-1 border-l-2 border-emerald-500">
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
