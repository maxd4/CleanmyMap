"use client";

import { useId, useState, type KeyboardEvent } from "react";
import {
  BadgeCheck,
  CalendarPlus,
  ClipboardCheck,
  ClipboardList,
  Download,
  Gavel,
  HandHelping,
  KeyRound,
  Recycle,
  Send,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";

import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmIcon } from "@/components/ui/cmm-icon";
import { buildSpogomiCatalogHref } from "@/lib/spogomi/navigation-intent";
import { cn } from "@/lib/utils";

type OrientationId = "volunteers" | "referees" | "organizers";

type OrientationAction = {
  label: string;
  description: string;
  icon: typeof Users;
  href: string;
  requiresAuthentication: boolean;
};

type Orientation = {
  id: OrientationId;
  label: string;
  summary: string;
  actions: OrientationAction[];
};

const PUBLIC_DISCUSSIONS_HREF = "/sections/messagerie?tab=discussions&channel=community&topicId=spogomi";

function privateAction(label: string, description: string, icon: typeof Users, href: string): OrientationAction {
  return { label, description, icon, href, requiresAuthentication: true };
}

function publicAction(label: string, description: string, icon: typeof Users, href: string): OrientationAction {
  return { label, description, icon, href, requiresAuthentication: false };
}

function buildOrientations(): Orientation[] {
  return [
    {
      id: "volunteers",
      label: "Bénévoles",
      summary: "Découvrez une édition, participez avec votre équipe et retrouvez vos contributions certifiées.",
      actions: [
        publicAction("Découvrir les compétitions", "Parcourir les éditions publiées et ouvrir leur fiche publique.", Users, "#spogomi-events"),
        publicAction("S’inscrire", "Choisir une compétition publiée puis utiliser sa demande d’inscription si le règlement l’autorise.", ClipboardCheck, "/spogomi#spogomi-registration"),
        publicAction("Rejoindre une équipe", "Depuis une fiche publique, demander une équipe ou utiliser l’invitation remise par l’organisation.", Users, "/spogomi#spogomi-team"),
        publicAction("Rattacher mon compte par code", "Saisir sur la fiche publiée le code individuel remis directement par l’organisation.", KeyRound, "/spogomi#spogomi-identity"),
        publicAction("Demander de l’assistance", "Obtenir d’abord le lien privé contextualisé remis par l’organisation ; aucune demande n’est envoyée sans lui.", HandHelping, "/spogomi#spogomi-assistance"),
        privateAction("Retrouver ma participation", "Après connexion, choisir une édition liée à votre compte vérifié.", Recycle, buildSpogomiCatalogHref("volunteers")),
        publicAction("Voir les résultats", "Ouvrir une fiche publiée lorsque ses résultats ont été rendus visibles.", Trophy, "/spogomi#spogomi-results"),
        publicAction("Mes contributions", "Consulter les missions enregistrées et certifiées depuis la surface de l’édition.", BadgeCheck, "/spogomi#spogomi-contributions"),
        publicAction("Télécharger mes attestations", "Télécharger une attestation depuis la section personnelle après certification.", Download, "/spogomi#spogomi-attestations"),
        publicAction("Discuter", "Rejoindre le salon communautaire SPOGOMI.", Send, PUBLIC_DISCUSSIONS_HREF),
      ],
    },
    {
      id: "referees",
      label: "Arbitres & modération",
      summary: "Choisissez une édition où l’organisation vous a habilité ; chaque capacité reste bornée à cet événement.",
      actions: [
        privateAction("Événements habilités", "Choisir une édition où une relation active vous a été attribuée.", ShieldCheck, buildSpogomiCatalogHref("referees")),
        privateAction("Accueil", "Ouvrir Accueil et présences lorsque cette capacité est active.", ClipboardCheck, buildSpogomiCatalogHref("referees", "attendance")),
        privateAction("Opérations terrain", "Accéder aux opérations dont l’habilitation événementielle est active.", ClipboardList, buildSpogomiCatalogHref("referees", "operations")),
        privateAction("Pesée", "Ouvrir les mesures et la pesée dans l’espace de l’édition autorisée.", Recycle, buildSpogomiCatalogHref("referees", "operations")),
        privateAction("Arbitrage", "Revoir et décider les soumissions dans le périmètre attribué.", Gavel, buildSpogomiCatalogHref("referees", "arbitration")),
        privateAction("Certification", "Certifier uniquement les opérations de terrain autorisées.", BadgeCheck, buildSpogomiCatalogHref("referees", "operations")),
        privateAction("Modération autorisée", "Retrouver les décisions et contrôles accessibles pour cette édition.", ShieldCheck, buildSpogomiCatalogHref("referees", "arbitration")),
      ],
    },
    {
      id: "organizers",
      label: "Organisateurs",
      summary: "Créez une édition privée, préparez ses données, puis publiez séparément l’événement, les résultats et la consolidation.",
      actions: [
        privateAction("Créer une compétition", "Préparer une édition privée avec les contrôles existants.", CalendarPlus, "/spogomi/nouveau"),
        privateAction("Mes événements", "Choisir une édition que votre relation organisateur autorise à gérer.", Users, buildSpogomiCatalogHref("organizers")),
        privateAction("Importer les équipes", "Ouvrir le roster privé et son rapprochement explicable.", ClipboardList, buildSpogomiCatalogHref("organizers", "teams")),
        privateAction("Gérer les équipes", "Préparer les compositions, noms publics et codes individuels.", Users, buildSpogomiCatalogHref("organizers", "teams")),
        privateAction("Vérifier le règlement", "Consulter les versions et sources de chaque division.", ShieldCheck, buildSpogomiCatalogHref("organizers", "settings")),
        privateAction("Importer le GPX", "Associer un parcours officiel de référence à l’édition.", Recycle, buildSpogomiCatalogHref("organizers", "settings")),
        privateAction("Gérer les accès", "Attribuer des habilitations limitées à cette édition.", KeyRound, buildSpogomiCatalogHref("organizers", "settings")),
        privateAction("Contrôler les résultats", "Préparer et vérifier les résultats avant publication.", Trophy, buildSpogomiCatalogHref("organizers", "results")),
        privateAction("Publier", "Rendre l’événement ou ses résultats visibles selon leurs conditions propres.", Send, buildSpogomiCatalogHref("organizers", "settings")),
        privateAction("Consolider", "Préparer le bilan environnemental vers l’action CleanMyMap associée.", Recycle, buildSpogomiCatalogHref("organizers", "bilan")),
        privateAction("Exporter", "Télécharger le classeur traçable depuis l’espace autorisé.", Download, buildSpogomiCatalogHref("organizers", "results")),
      ],
    },
  ];
}

export function SpogomiOrientationTabs({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [activeOrientation, setActiveOrientation] = useState<OrientationId>("volunteers");
  const baseId = useId();
  const orientations = buildOrientations();

  function handleTabKeyDown(index: number, event: KeyboardEvent<HTMLButtonElement>) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % orientations.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + orientations.length) % orientations.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = orientations.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const nextOrientation = orientations[nextIndex];
    setActiveOrientation(nextOrientation.id);
    document.getElementById(`${baseId}-tab-${nextOrientation.id}`)?.focus();
  }

  return (
    <section aria-labelledby="spogomi-orientation-title" className="space-y-4">
      <div>
        <p className="cmm-text-caption font-black uppercase tracking-[0.2em] text-emerald-700">Votre parcours</p>
        <h2 id="spogomi-orientation-title" className="mt-1 text-2xl font-black text-slate-950">Choisissez votre rôle</h2>
        <p className="cmm-text-body mt-1 text-slate-900">Chaque onglet ouvre les actions réellement disponibles sans modifier les règles d’accès.</p>
      </div>

      <div role="tablist" aria-label="Parcours SPOGOMI" className="grid gap-2 rounded-2xl border border-emerald-200/80 bg-white/70 p-2 sm:grid-cols-3">
        {orientations.map((orientation, index) => {
          const isActive = orientation.id === activeOrientation;
          return (
            <CmmButton
              key={orientation.id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${orientation.id}`}
              ariaControls={`${baseId}-panel-${orientation.id}`}
              ariaSelected={isActive}
              tabIndex={isActive ? 0 : -1}
              tone={isActive ? "primary" : "secondary"}
              variant="pill"
              onClick={() => setActiveOrientation(orientation.id)}
              onKeyDown={(event) => handleTabKeyDown(index, event)}
              className={cn("justify-center text-center", !isActive && "border-transparent bg-transparent shadow-none")}
            >
              {orientation.label}
            </CmmButton>
          );
        })}
      </div>

      <div className="space-y-5">
        {orientations.map((orientation, orientationIndex) => {
          const isActive = orientation.id === activeOrientation;
          const orientationTabId = `${baseId}-tab-${orientation.id}`;
          const orientationPanelId = `${baseId}-panel-${orientation.id}`;
          return (
            <div key={orientation.id} role="tabpanel" id={orientationPanelId} aria-labelledby={orientationTabId} tabIndex={0} hidden={!isActive}>
              <CmmCard tone="emerald" variant="glass" className="space-y-5 p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-emerald-700">Parcours {orientationIndex + 1} sur {orientations.length}</p>
                    <h3 className="mt-1 text-xl font-black text-emerald-950">{orientation.label}</h3>
                    <p className="cmm-text-body mt-1 max-w-3xl text-slate-900">{orientation.summary}</p>
                  </div>
                  {orientation.id === "referees" ? <ShieldCheck className="h-7 w-7 shrink-0 text-emerald-700" aria-hidden="true" /> : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {orientation.actions.map((action, index) => {
                    const href = action.requiresAuthentication && !isAuthenticated
                      ? `/sign-in?redirect_url=${encodeURIComponent(action.href)}`
                      : action.href;
                    return (
                      <CmmCard key={action.label} as="article" tone="slate" variant="glass" className="flex h-full flex-col gap-3 p-4">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                            <CmmIcon icon={action.icon} label={action.label} />
                          </span>
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">{String(index + 1).padStart(2, "0")}</p>
                            <p className="font-black text-slate-950">{action.label}</p>
                          </div>
                        </div>
                        <p className="cmm-text-body text-slate-900">{action.description}</p>
                        <CmmButton href={href} ariaLabel={`Ouvrir : ${action.label}`} tone={index === 0 ? "primary" : "secondary"} size="sm" className="mt-auto self-start">Ouvrir</CmmButton>
                      </CmmCard>
                    );
                  })}
                </div>

                <p className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm font-semibold leading-6 text-emerald-950">Les entrées privées conservent votre intention après connexion, puis le catalogue ne propose que les éditions et sections réellement autorisées par le serveur.</p>
              </CmmCard>
            </div>
          );
        })}
      </div>
    </section>
  );
}
