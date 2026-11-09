"use client";

import { useId, useState, type KeyboardEvent } from "react";
import {
  ArrowDown,
  ArrowRight,
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
import { SpogomiActionInfo } from "./spogomi-action-info";
import type { SpogomiOrientationProgressKey, SpogomiOrientationProgressProof } from "@/lib/spogomi/orientation-progress";

type OrientationId = "volunteers" | "referees" | "organizers";

type OrientationAction = {
  label: string;
  description: string;
  accessCondition: string;
  ctaLabel: string;
  icon: typeof Users;
  href: string;
  requiresAuthentication: boolean;
  progressKey?: SpogomiOrientationProgressKey;
};

type OrientationPhase = {
  title: string;
  description: string;
  actions: OrientationAction[];
};

type Orientation = {
  id: OrientationId;
  label: string;
  summary: string;
  primaryAction: OrientationAction;
  secondaryAction?: OrientationAction;
  phases: OrientationPhase[];
};

const PUBLIC_DISCUSSIONS_HREF = "/sections/messagerie?tab=discussions&channel=community&topicId=spogomi";

function privateAction(label: string, description: string, accessCondition: string, icon: typeof Users, href: string, ctaLabel = label, progressKey?: SpogomiOrientationProgressKey): OrientationAction {
  return { label, description, accessCondition, ctaLabel, icon, href, requiresAuthentication: true, progressKey };
}

function publicAction(label: string, description: string, accessCondition: string, icon: typeof Users, href: string, ctaLabel = label, progressKey?: SpogomiOrientationProgressKey): OrientationAction {
  return { label, description, accessCondition, ctaLabel, icon, href, requiresAuthentication: false, progressKey };
}

function actionDestination(href: string): string {
  if (href === "#spogomi-events") return "Le catalogue public des compétitions, puis la fiche de l’édition.";
  if (href.includes("#spogomi-registration")) return "L’ancre d’inscription du catalogue, puis la fiche publique de l’édition choisie.";
  if (href.includes("#spogomi-team")) return "L’ancre équipe du catalogue, puis la fiche publique de l’édition choisie.";
  if (href.includes("#spogomi-identity")) return "L’ancre de rattachement du catalogue, puis la fiche de l’édition concernée.";
  if (href.includes("#spogomi-assistance")) return "L’explication d’assistance du catalogue ; un lien privé contextualisé est ensuite nécessaire.";
  if (href.includes("#spogomi-results")) return "Le catalogue, puis la fiche publique de l’édition lorsque ses résultats sont publiés.";
  if (href.includes("#spogomi-contributions")) return "Le catalogue, puis la fiche publique de l’édition et sa surface de contributions.";
  if (href.includes("#spogomi-attestations")) return "Le catalogue, puis la fiche de l’édition et l’espace personnel après connexion.";
  if (href.startsWith("/sections/messagerie")) return "Le salon communautaire SPOGOMI.";
  if (href === "/spogomi/nouveau") return "Le formulaire de création d’une édition SPOGOMI.";
  if (href.startsWith("/spogomi/mes-evenements")) return "Le catalogue privé SPOGOMI, puis la section autorisée de l’édition.";
  return "Le parcours SPOGOMI correspondant, après les contrôles serveur.";
}

function actionLimitation(action: Pick<OrientationAction, "label" | "requiresAuthentication">): string {
  if (action.label === "S’inscrire") return "Quiz applicable, capacité, consentements et contrôles serveur restent obligatoires ; ce lien ne soumet aucune demande.";
  if (action.label === "Rejoindre une équipe") return "La demande ne crée ni équipe ni participant et ne révèle pas le roster.";
  if (action.label === "Rattacher mon compte par code") return "Le code doit être remis par l’organisation ; aucune recherche nominative ne le remplace.";
  if (action.label === "Demander de l’assistance") return "Aucune demande n’est envoyée sans invitation ou lien privé contextualisé.";
  if (action.label === "Voir les résultats") return "Les résultats non publiés et les données privées restent masqués.";
  if (action.label === "Mes contributions") return "Une présence ou une demande seule ne crée pas de crédit individuel.";
  if (action.label === "Télécharger mes attestations") return "Une présence ou une demande seule ne suffit pas pour émettre une attestation.";
  if (action.label === "Publier l’événement") return "Cette action ne publie pas les résultats et ne certifie aucune donnée.";
  if (action.label === "Publier les résultats") return "Cette action ne certifie pas les résultats ; elle intervient après les contrôles requis.";
  if (action.label === "Consolider le bilan") return "La consolidation ne modifie pas les classements sportifs ni les mesures sources.";
  if (action.label === "Exporter les résultats") return "L’export reste privé et ne rend pas les données du roster publiques.";
  if (action.requiresAuthentication) return "Le lien ne préaccorde aucune habilitation ; le serveur filtre les éditions et capacités réellement autorisées.";
  return "Cette action n’accorde aucun droit supplémentaire et reste soumise aux contrôles du parcours concerné.";
}

export function buildSpogomiActionInfo(action: Pick<OrientationAction, "description" | "href" | "accessCondition" | "label" | "requiresAuthentication">) {
  return {
    purpose: action.description,
    where: actionDestination(action.href),
    access: action.accessCondition,
    limitation: actionLimitation(action),
  };
}

function ActionInfoContent({ action }: { action: OrientationAction }) {
  return (
    <div className="space-y-3 text-sm leading-6">
      <div>
        <p className="font-black text-slate-950">Ce que permet cette action</p>
        <p>{buildSpogomiActionInfo(action).purpose}</p>
      </div>
      <p><span className="font-black text-slate-950">Où :</span> {buildSpogomiActionInfo(action).where}</p>
      <p><span className="font-black text-slate-950">Accès :</span> {buildSpogomiActionInfo(action).access}</p>
      <p><span className="font-black text-slate-950">Limite :</span> {buildSpogomiActionInfo(action).limitation}</p>
    </div>
  );
}

function ActionTitle({ action, href, infoId, heading: Heading, size }: { action: OrientationAction; href: string; infoId: string; heading: "h4" | "h5"; size: "md" | "lg" }) {
  return (
    <div className="flex items-start gap-2">
      <Heading className="min-w-0 flex-1">
        <CmmButton
          href={href}
          ariaLabel={action.label}
          tone="secondary"
          variant="ghost"
          size={size}
          className="min-w-0 w-full justify-start whitespace-normal px-0 text-left font-black text-emerald-950 hover:text-emerald-800"
        >
          {action.label}
          <ArrowRight size={16} aria-hidden="true" />
        </CmmButton>
      </Heading>
      <SpogomiActionInfo id={infoId} label={action.label}>
        <ActionInfoContent action={action} />
      </SpogomiActionInfo>
    </div>
  );
}

function ActionValidation({ action, isAuthenticated, progress }: { action: OrientationAction; isAuthenticated: boolean; progress: readonly SpogomiOrientationProgressProof[] }) {
  if (!isAuthenticated || !action.progressKey) return null;
  const proofs = progress.filter((proof) => proof.key === action.progressKey);
  if (!proofs.length) {
    return <p role="status" className="text-xs font-bold text-slate-600">Non démontrée par une preuve serveur.</p>;
  }
  return (
    <div role="status" className="space-y-1 text-xs font-bold text-emerald-800">
      <p className="inline-flex items-center gap-1.5"><BadgeCheck size={15} aria-hidden="true" />Validée</p>
      <p className="text-slate-700">{proofs.map((proof) => proof.eventName).join(" · ")}</p>
    </div>
  );
}

type ActionPlacement = { action: OrientationAction; phaseNumber?: number; phaseTitle?: string };

function actionPlacements(orientation: Orientation): { top: ActionPlacement[]; remainingPhases: Array<OrientationPhase & { phaseNumber: number }> } {
  const top: ActionPlacement[] = [
    { action: orientation.primaryAction },
    ...(orientation.secondaryAction ? [{ action: orientation.secondaryAction }] : []),
  ];
  const remainingPhases: Array<OrientationPhase & { phaseNumber: number }> = [];
  orientation.phases.forEach((phase, index) => {
    if (phase.actions.length === 1) {
      top.push({ action: phase.actions[0]!, phaseNumber: index + 1, phaseTitle: phase.title });
      return;
    }
    remainingPhases.push({ ...phase, phaseNumber: index + 1 });
  });
  return { top, remainingPhases };
}

function ActionCard({ placement, placementId, isPrimary = false, isAuthenticated, progress, actionHref }: {
  placement: ActionPlacement;
  placementId: string;
  isPrimary?: boolean;
  isAuthenticated: boolean;
  progress: readonly SpogomiOrientationProgressProof[];
  actionHref: (action: OrientationAction) => string;
}) {
  const { action, phaseNumber, phaseTitle } = placement;
  return (
    <CmmCard as="article" data-testid={`spogomi-action-${action.label}`} tone={isPrimary ? "emerald" : "slate"} variant="outlined" className={cn("flex min-w-0 flex-col gap-3 overflow-visible p-4", isPrimary && "border-emerald-300 bg-emerald-50/80")}>
      {phaseNumber && phaseTitle ? (
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-emerald-700">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-900">{String(phaseNumber).padStart(2, "0")}</span>
          <span>{phaseTitle}</span>
        </div>
      ) : null}
      <div className="flex min-w-0 items-start gap-3">
        <span className={cn("mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800", isPrimary && "h-12 w-12 rounded-2xl bg-emerald-700 text-white")}><CmmIcon icon={action.icon} size={isPrimary ? "lg" : "md"} /></span>
        <div className="min-w-0 flex-1">
          {isPrimary ? <p className="cmm-text-caption font-black uppercase tracking-[0.16em] text-emerald-800">Action principale</p> : null}
          <ActionTitle action={action} href={actionHref(action)} infoId={placementId} heading={isPrimary ? "h4" : "h5"} size={isPrimary ? "lg" : "md"} />
          <ActionValidation action={action} isAuthenticated={isAuthenticated} progress={progress} />
        </div>
      </div>
    </CmmCard>
  );
}

function buildOrientations(): Orientation[] {
  return [
    {
      id: "volunteers",
      label: "Bénévoles",
      summary: "Découvrez une édition, participez avec votre équipe et retrouvez vos contributions certifiées.",
      primaryAction: publicAction("Voir les compétitions", "Parcourir les éditions publiées et ouvrir leur fiche publique.", "Compétition publiée requise pour participer.", Trophy, "#spogomi-events"),
      phases: [
        {
          title: "Avant la compétition",
          description: "Trouver une édition, préparer son inscription et sécuriser son rattachement.",
          actions: [
            publicAction("S’inscrire", "Depuis la fiche d’une édition publiée, vérifier le règlement et le quiz applicables avant d’envoyer une demande.", "Compétition publiée et inscriptions autorisées ; connexion requise pour envoyer la demande.", ClipboardCheck, "/spogomi#spogomi-registration"),
            publicAction("Rejoindre une équipe", "Depuis la fiche publique, demandez à rejoindre une équipe ou utilisez l’invitation remise par l’organisation. Cette demande ne crée ni équipe ni participant et ne révèle pas le roster.", "Compétition publiée et inscription autorisée ; code individuel ou invitation selon le parcours.", Users, "/spogomi#spogomi-team"),
            publicAction("Rattacher mon compte par code", "Le code individuel est remis directement par l’organisation et se saisit sur la fiche de l’édition. Il ne doit pas être deviné, partagé ou remplacé par une recherche nominative.", "Code individuel nécessaire ; l’identité est vérifiée par le serveur.", KeyRound, "/spogomi#spogomi-identity"),
            publicAction("Demander de l’assistance", "Si le code est perdu, demandez à l’organisation un lien privé contextualisé contenant l’événement et l’invitation. Cette page générale n’envoie aucune demande sans ce contexte.", "Invitation ou lien privé nécessaire ; aucune relation n’est accordée par cette page.", HandHelping, "/spogomi#spogomi-assistance"),
            publicAction("Discuter", "Ouvrir le salon communautaire SPOGOMI ; la connexion est nécessaire pour y participer.", "Lecture publique possible ; connexion requise pour participer au salon.", Send, PUBLIC_DISCUSSIONS_HREF),
          ],
        },
        {
          title: "Pendant la compétition",
          description: "Retrouver uniquement une participation déjà liée à votre compte.",
          actions: [
            privateAction("Retrouver ma participation", "Après connexion, choisir une édition liée à votre compte vérifié.", "Connexion requise ; participation ou identité liée vérifiée pour l’édition.", Recycle, buildSpogomiCatalogHref("volunteers"), "Retrouver ma participation", "volunteer.participation"),
          ],
        },
        {
          title: "Après la compétition",
          description: "Consulter les résultats et les preuves personnelles lorsqu’elles sont effectivement publiées ou certifiées.",
          actions: [
            publicAction("Voir les résultats", "Les résultats sont consultables depuis la fiche d’une compétition publiée, uniquement lorsque l’organisateur les a rendus visibles.", "Résultats publiés requis ; aucune donnée privée n’est déduite.", Trophy, "/spogomi#spogomi-results"),
            publicAction("Mes contributions", "Les missions enregistrées et certifiées se consultent depuis la fiche publiée lorsque cette surface est disponible, après connexion au compte concerné.", "Connexion requise ; mission certifiée ou relation personnelle vérifiée.", BadgeCheck, "/spogomi#spogomi-contributions", "Mes contributions", "volunteer.contributions"),
            publicAction("Télécharger mes attestations", "Télécharger une attestation depuis la section personnelle après certification. Une présence ou une demande seule ne suffit pas.", "Connexion requise ; mission certifiée et attestation disponible.", Download, "/spogomi#spogomi-attestations", "Télécharger mes attestations", "volunteer.attestations"),
          ],
        },
      ],
    },
    {
      id: "referees",
      label: "Arbitres & modération",
      summary: "Choisissez une édition où l’organisation vous a habilité ; chaque capacité reste bornée à cet événement.",
      primaryAction: privateAction("Mes événements habilités", "Choisir une édition où une relation active vous a été attribuée.", "Connexion requise ; habilitation événementielle vérifiée par le serveur.", ShieldCheck, buildSpogomiCatalogHref("referees")),
      phases: [
        {
          title: "Avant l’épreuve",
          description: "Préparer l’accueil et les contrôles selon la mission réellement attribuée.",
          actions: [
            privateAction("Accueil et présences", "Ouvrir Accueil et présences lorsque cette capacité est active.", "Connexion requise ; habilitation checkin vérifiée pour cette édition.", ClipboardCheck, buildSpogomiCatalogHref("referees", "attendance")),
            privateAction("Modération autorisée", "Retrouver les décisions et contrôles accessibles pour cette édition.", "Connexion requise ; habilitation arbitrage vérifiée pour cette édition.", ShieldCheck, buildSpogomiCatalogHref("referees", "arbitration")),
          ],
        },
        {
          title: "Pendant l’épreuve",
          description: "Saisir les opérations et décisions uniquement dans le périmètre événementiel autorisé.",
          actions: [
            privateAction("Chronométrage et opérations terrain", "Accéder aux opérations dont l’habilitation événementielle est active.", "Connexion requise ; habilitation timing, arrival ou measurement_entry vérifiée.", ClipboardList, buildSpogomiCatalogHref("referees", "operations")),
            privateAction("Pesée et mesures", "Ouvrir les mesures et la pesée dans l’espace de l’édition autorisée.", "Connexion requise ; habilitation weighing ou measurement_entry vérifiée.", Recycle, buildSpogomiCatalogHref("referees", "operations")),
            privateAction("Arbitrer les soumissions", "Revoir et décider les soumissions dans le périmètre attribué.", "Connexion requise ; habilitation arbitration vérifiée pour cette édition.", Gavel, buildSpogomiCatalogHref("referees", "arbitration")),
          ],
        },
        {
          title: "Après l’épreuve",
          description: "Finaliser les mesures et certifications lorsque la mission serveur le permet.",
          actions: [
            privateAction("Certifier les mesures de terrain", "Certifier les mesures opérationnelles de terrain autorisées ; cette action ne certifie pas les résultats sportifs.", "Connexion requise ; habilitation certification vérifiée et mesures de terrain prêtes à certifier.", BadgeCheck, buildSpogomiCatalogHref("referees", "operations"), "Certifier les mesures de terrain", "referee.certification"),
          ],
        },
      ],
    },
    {
      id: "organizers",
      label: "Organisateurs",
      summary: "Créez une édition privée, préparez ses données, puis publiez séparément l’événement, les résultats et la consolidation.",
      primaryAction: privateAction("Mes compétitions", "Choisir une édition que votre relation organisateur autorise à gérer.", "Connexion requise ; relation organisateur vérifiée pour l’édition.", Users, buildSpogomiCatalogHref("organizers")),
      secondaryAction: privateAction("Créer une compétition", "Préparer une édition privée avec les contrôles existants.", "Connexion requise ; la relation organisateur sera vérifiée avant toute gestion.", CalendarPlus, "/spogomi/nouveau"),
      phases: [
        {
          title: "Préparer l’édition",
          description: "Constituer le roster et vérifier les paramètres avant la publication de l’événement.",
          actions: [
            privateAction("Importer les équipes", "Ouvrir le roster privé et son rapprochement explicable.", "Connexion requise ; relation organisateur vérifiée.", ClipboardList, buildSpogomiCatalogHref("organizers", "teams")),
            privateAction("Gérer les équipes", "Préparer les compositions, noms publics et codes individuels.", "Connexion requise ; relation organisateur vérifiée.", Users, buildSpogomiCatalogHref("organizers", "teams")),
            privateAction("Vérifier le règlement", "Consulter les versions et sources de chaque division.", "Connexion requise ; relation organisateur vérifiée.", ShieldCheck, buildSpogomiCatalogHref("organizers", "settings")),
            privateAction("Importer le GPX", "Associer un parcours officiel de référence à l’édition.", "Connexion requise ; relation organisateur vérifiée.", Recycle, buildSpogomiCatalogHref("organizers", "settings")),
            privateAction("Gérer les accès", "Attribuer des habilitations limitées à cette édition.", "Connexion requise ; relation organisateur vérifiée, puis capacités bornées par événement.", KeyRound, buildSpogomiCatalogHref("organizers", "settings")),
          ],
        },
        {
          title: "Gérer la compétition",
          description: "Suivre le terrain et préparer la certification sans confondre publication de l’événement et publication des résultats.",
          actions: [
            privateAction("Contrôler les résultats", "Préparer et vérifier les résultats avant publication.", "Connexion requise ; relation organisateur vérifiée et données de l’édition disponibles.", Trophy, buildSpogomiCatalogHref("organizers", "results")),
            privateAction("Publier l’événement", "Rendre la fiche de l’édition visible selon la politique de publication.", "Connexion requise ; relation organisateur vérifiée et contrôles de publication satisfaits.", Send, buildSpogomiCatalogHref("organizers", "settings"), "Publier l’événement", "organizer.event_publication"),
          ],
        },
        {
          title: "Clôturer et diffuser",
          description: "Certifier, publier les résultats, consolider puis exporter les données autorisées.",
          actions: [
            privateAction("Publier les résultats", "Rendre les classements visibles depuis le cockpit après les certifications requises.", "Connexion requise ; relation organisateur vérifiée, résultats certifiés et publication autorisée.", Trophy, buildSpogomiCatalogHref("organizers", "results"), "Publier les résultats", "organizer.results_publication"),
            privateAction("Consolider le bilan", "Préparer le bilan environnemental vers l’action CleanMyMap associée.", "Connexion requise ; relation organisateur vérifiée et sources certifiées prêtes pour la consolidation.", Recycle, buildSpogomiCatalogHref("organizers", "bilan")),
            privateAction("Exporter les résultats", "Télécharger le classeur traçable depuis l’espace autorisé.", "Connexion requise ; relation organisateur vérifiée et export autorisé par le serveur.", Download, buildSpogomiCatalogHref("organizers", "results")),
          ],
        },
      ],
    },
  ];
}

export function SpogomiOrientationTabs({ isAuthenticated, progress = [] }: { isAuthenticated: boolean; progress?: readonly SpogomiOrientationProgressProof[] }) {
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

  function actionHref(action: OrientationAction): string {
    return action.requiresAuthentication && !isAuthenticated
      ? `/sign-in?redirect_url=${encodeURIComponent(action.href)}`
      : action.href;
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
          const layout = actionPlacements(orientation);
          return (
            <div key={orientation.id} role="tabpanel" id={orientationPanelId} aria-labelledby={orientationTabId} tabIndex={0} hidden={!isActive}>
              <CmmCard tone="emerald" variant="glass" className="space-y-5 overflow-visible p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-emerald-700">Parcours {orientationIndex + 1} sur {orientations.length}</p>
                    <h3 className="mt-1 text-xl font-black text-emerald-950">{orientation.label}</h3>
                    <p className="cmm-text-body mt-1 max-w-3xl text-slate-900">{orientation.summary}</p>
                  </div>
                  {orientation.id === "referees" ? <ShieldCheck className="h-7 w-7 shrink-0 text-emerald-700" aria-hidden="true" /> : null}
                </div>

                <div data-cmm-action-row="top" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {layout.top.map((placement, placementIndex) => (
                    <ActionCard
                      key={`${placement.action.label}-${placement.phaseNumber ?? "primary"}`}
                      placement={placement}
                      placementId={`${baseId}-info-${orientation.id}-top-${placementIndex}`}
                      isPrimary={placementIndex === 0}
                      isAuthenticated={isAuthenticated}
                      progress={progress}
                      actionHref={actionHref}
                    />
                  ))}
                </div>

                {layout.remainingPhases.length ? (
                  <div data-cmm-action-row="phases" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {layout.remainingPhases.map((phase) => {
                      const phaseHeadingId = `${baseId}-phase-${orientation.id}-${phase.phaseNumber}`;
                      return (
                        <section key={phase.title} aria-labelledby={phaseHeadingId}>
                          <CmmCard tone="slate" variant="glass" className="overflow-visible p-4">
                            <div className="flex items-start gap-3">
                              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-black text-slate-700">{String(phase.phaseNumber).padStart(2, "0")}</span>
                              <div>
                                <h4 id={phaseHeadingId} className="text-base font-black text-slate-950">{phase.title}</h4>
                                <p className="mt-1 text-sm leading-6 text-slate-900">{phase.description}</p>
                              </div>
                            </div>
                            <div className="mt-4 space-y-2">
                              {phase.actions.map((action, actionIndex) => (
                                <div key={action.label}>
                                  <ActionCard
                                    placement={{ action }}
                                    placementId={`${baseId}-info-${orientation.id}-${phase.phaseNumber}-${actionIndex}`}
                                    isAuthenticated={isAuthenticated}
                                    progress={progress}
                                    actionHref={actionHref}
                                  />
                                  {actionIndex < phase.actions.length - 1 ? <div data-cmm-phase-arrow="true" className="flex h-5 items-center justify-center text-slate-400" aria-hidden="true"><ArrowDown size={16} strokeWidth={2} /></div> : null}
                                </div>
                              ))}
                            </div>
                          </CmmCard>
                        </section>
                      );
                    })}
                  </div>
                ) : null}

              </CmmCard>
            </div>
          );
        })}
      </div>
    </section>
  );
}
