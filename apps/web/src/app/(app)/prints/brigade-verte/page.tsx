import type { Metadata } from "next";
import Link from "next/link";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { computeBrigadeVerteProgress } from "@/lib/brigade-verte/brigade-verte-service";
import { BrandLogo } from "@/components/brand/brand-logo";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { PrintActionButton } from "./print-action-button";

export const metadata: Metadata = {
  title: "Récapitulatif Parcours Éco-Citoyen | CleanMyMap",
  description: "Récapitulatif informatif A4 des participations Quartier Propre vérifiées.",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function PrintBrigadeVertePage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string }>;
}) {
  const { userId } = await getSafeAuthSession();
  const { name } = await searchParams;

  if (!userId) {
    return (
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center space-y-4">
          <h1 className="text-xl font-bold">Connexion requise</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Vous devez être connecté à votre compte CleanMyMap pour accéder à votre relevé personnel.
          </p>
          <ClerkRequiredGate isAuthenticated={false} mode="blur" lockedPreview={<div />}>
            <div />
          </ClerkRequiredGate>
        </div>
      </main>
    );
  }

  // Contrôle strict côté serveur des preuves actuelles à chaque génération
  const { eligible, count, proofs } = await computeBrigadeVerteProgress(userId);

  // Si moins de 2 preuves vérifiées ou si erreur de calcul / base de données
  if (!eligible || count < 2) {
    return (
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900/50 p-8 space-y-4">
          <h1 className="text-lg font-bold text-amber-900 dark:text-amber-200">
            Justificatif non disponible (2 participations requises)
          </h1>
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Le récapitulatif personnel A4 ne peut être généré qu&apos;une fois réunies <strong>deux participations vérifiées et actives</strong> à des opérations officielles « Quartier Propre » Brigade Verte Paris.
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Progression actuelle : <strong>{eligible ? `${count}/2` : "Indisponible"}</strong>.
            En cas de révocation ou d&apos;invalidation d&apos;une preuve, toute nouvelle génération est immédiatement bloquée.
          </p>
          <div className="pt-2">
            <Link
              href="/sections/gamification"
              className="inline-flex items-center text-sm font-medium text-amber-900 dark:text-amber-200 underline"
            >
              ← Retour à ma progression
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const voluntaryName = name?.trim() || "Bénévole CleanMyMap";
  const editionDate = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 py-8 px-4 print:p-0 print:bg-white print:text-black">
      {/* Barre d'action supérieure masquée à l'impression */}
      <header className="max-w-[210mm] mx-auto mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Link
          href="/sections/gamification"
          className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← Retour à la gamification
        </Link>
        <div className="flex items-center gap-3">
          <PrintActionButton />
        </div>
      </header>

      {/* Feuille A4 portrait (210mm) */}
      <main className="max-w-[210mm] mx-auto bg-white text-zinc-900 shadow-lg rounded-xl print:rounded-none print:shadow-none p-10 print:p-0 border border-zinc-200 print:border-0 print:m-0">
        {/* En-tête du relevé */}
        <div className="flex items-start justify-between border-b border-zinc-200 pb-6 mb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BrandLogo variant="lightSurface" alt="CleanMyMap" className="h-7 w-auto" />
              <span className="font-bold text-lg tracking-tight">CleanMyMap</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 pt-2">
              Relevé Personnel de Participations
            </h1>
            <p className="text-sm font-medium text-emerald-800">
              Parcours Éco-Citoyen • Opérations « Quartier Propre » Brigade Verte Paris
            </p>
          </div>
          <div className="text-right text-xs text-zinc-500 space-y-1">
            <div>Édité le : <strong className="text-zinc-800">{editionDate}</strong></div>
            <div>Statut : <strong className="text-emerald-700">2 / 2 preuves vérifiées</strong></div>
          </div>
        </div>

        {/* Bénéficiaire & Mention obligatoire */}
        <section className="mb-6 space-y-4">
          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4">
            <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-1">
              Bénéficiaire (identité déclarée)
            </div>
            <div className="text-base font-bold text-zinc-900">{voluntaryName}</div>
          </div>

          {/* Mention obligatoire exacte */}
          <div className="p-4 bg-amber-50/70 border border-amber-300/80 rounded-lg text-xs leading-relaxed text-amber-950 font-medium">
            Document informatif établi par CleanMyMap. Ne constitue ni un diplôme, ni une attestation officielle de la Brigade Verte Paris.
          </div>
        </section>

        {/* Tableau des deux opérations vérifiées */}
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-600 mb-3 border-b border-zinc-100 pb-1">
            Opérations « Quartier Propre » vérifiées par CleanMyMap (2 / 2)
          </h2>
          <div className="space-y-3">
            {proofs.slice(0, 2).map((proof, idx) => (
              <div
                key={proof.actionId}
                className="border border-zinc-200 rounded-lg p-4 bg-white space-y-2 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-800">
                    Preuve n°{idx + 1} — Opération Quartier Propre
                  </span>
                  <span className="text-xs text-zinc-500">
                    Date d&apos;action : <strong>{proof.actionDate}</strong>
                  </span>
                </div>
                <div className="text-zinc-800">
                  <span className="text-zinc-500 text-xs">Lieu / Arrondissement :</span>{" "}
                  <strong>{proof.locationLabel}</strong>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500 pt-1 border-t border-zinc-100">
                  <div>
                    Réf. action : <span className="font-mono text-zinc-600">{proof.actionId}</span>
                  </div>
                  <div className="text-right">
                    Qualification administrative :{" "}
                    <span className="font-medium text-zinc-700">
                      {new Date(proof.qualifiedAt).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Rappel des conditions externes vers le Diplôme Éco-Citoyen */}
        <section className="mb-6 p-4 border border-zinc-200 rounded-lg bg-zinc-50 text-xs space-y-2">
          <h3 className="font-bold text-zinc-800 text-sm">
            Démarches externes vers le Diplôme Éco-Citoyen (Brigade Verte Paris)
          </h3>
          <p className="text-zinc-600 leading-relaxed">
            L&apos;obtention du <strong>Diplôme Éco-Citoyen</strong> est délivrée exclusivement par l&apos;association <strong>Brigade Verte Paris</strong>, sous réserve de la validation des 3 conditions publiées :
          </p>
          <ul className="list-disc pl-5 space-y-1 text-zinc-700">
            <li>
              <strong>1. Deux opérations « Quartier Propre »</strong> : Validé par les preuves réunies sur ce relevé informatif.
            </li>
            <li>
              <strong>2. Formation et sensibilisation</strong> : Session organisée directement par Brigade Verte Paris (non vérifiée par CleanMyMap).
            </li>
            <li>
              <strong>3. Engagement durable</strong> : Implication citoyenne suivie par Brigade Verte Paris (non vérifiée par CleanMyMap).
            </li>
          </ul>
          <p className="pt-1 text-zinc-600">
            Pour transmettre ce relevé et finaliser votre parcours : rendez-vous sur le site officiel{" "}
            <span className="font-semibold text-zinc-900 underline">https://www.brigadeverteparis.fr/</span>
          </p>
        </section>

        {/* Pied de page informatif et traçabilité */}
        <footer className="pt-4 border-t border-zinc-200 text-xs text-zinc-500 flex flex-wrap justify-between items-center gap-2">
          <div>CleanMyMap • Plateforme citoyenne de ramassage et de cartographie écologique</div>
          <div>Ce document demeure un relevé historique. Aucune certification ou signature fictive.</div>
        </footer>
      </main>
    </div>
  );
}
