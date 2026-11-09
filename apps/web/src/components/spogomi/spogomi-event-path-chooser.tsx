"use client";

import { useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import {
  buildSpogomiEventHref,
  buildSpogomiEventSignInHref,
  type SpogomiEventDivisionType,
} from "@/lib/spogomi/navigation-intent";
import {
  journeyStatusLabel,
  type SpogomiEventJourney,
  type SpogomiAuthorizedSpace,
  type SpogomiJourneyStep,
} from "@/lib/spogomi/event-journey";

type PathKey = "volunteers" | "referees" | "organizers";

type Props = {
  eventSlug: string;
  isAuthenticated: boolean;
  divisionTypes?: readonly SpogomiEventDivisionType[];
  selectedDivisionType?: SpogomiEventDivisionType;
  journey: SpogomiEventJourney;
};

const divisionLabel: Record<SpogomiEventDivisionType, string> = {
  casual: "Casual",
  world_cup: "World Cup",
};

const pathLabels: Record<PathKey, string> = {
  volunteers: "Bénévoles",
  referees: "Arbitres",
  organizers: "Organisateurs",
};

function isAvailableStep(
  step: SpogomiJourneyStep,
  journey: SpogomiEventJourney,
): boolean {
  if (!step.href || step.status === "later" || step.status === "indeterminate") {
    return false;
  }
  if (step.status === "validated") return true;
  if (step.status === "pending" || step.status === "access_required") {
    return step.key === journey.next.key;
  }
  return step.status === "todo";
}

function volunteerSteps(journey: SpogomiEventJourney): SpogomiJourneyStep[] {
  const ordered = [
    journey.next,
    ...journey.steps.filter((step) => step.key !== journey.next.key),
  ];
  const seen = new Set<string>();
  return ordered.filter((step) => {
    if (seen.has(step.key)) return false;
    seen.add(step.key);
    return isAvailableStep(step, journey);
  });
}

function PathTabs({
  selectedPath,
  onSelect,
}: {
  selectedPath: PathKey;
  onSelect: (path: PathKey) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Choisir un parcours"
      className="flex flex-wrap gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-2"
    >
      {(Object.keys(pathLabels) as PathKey[]).map((path) => (
        <CmmButton
          key={path}
          id={`spogomi-path-tab-${path}`}
          type="button"
          role="tab"
          ariaControls={`spogomi-path-panel-${path}`}
          ariaSelected={selectedPath === path}
          onClick={() => onSelect(path)}
          tone={selectedPath === path ? "primary" : "secondary"}
          size="sm"
          variant="pill"
        >
          {pathLabels[path]}
        </CmmButton>
      ))}
    </div>
  );
}

function DivisionSelector({
  eventSlug,
  divisionTypes,
  selectedDivisionType,
}: {
  eventSlug: string;
  divisionTypes: readonly SpogomiEventDivisionType[];
  selectedDivisionType?: SpogomiEventDivisionType;
}) {
  if (divisionTypes.length < 2) return null;

  return (
    <nav aria-label="Choisir la division" className="space-y-2">
      <p className="cmm-text-small font-black uppercase tracking-[0.12em] text-slate-600">
        Division de cette édition
      </p>
      <div className="flex flex-wrap gap-2">
        {divisionTypes.map((divisionType) => (
          <CmmButton
            key={divisionType}
            asChild
            tone={selectedDivisionType === divisionType ? "primary" : "secondary"}
            size="sm"
            variant="pill"
            ariaLabel={`Afficher la division ${divisionLabel[divisionType]}`}
          >
            <a
              href={buildSpogomiEventHref(eventSlug, { division: divisionType })}
              aria-current={selectedDivisionType === divisionType ? "page" : undefined}
            >
              {divisionLabel[divisionType]}
            </a>
          </CmmButton>
        ))}
      </div>
    </nav>
  );
}

function StatusLine({ step }: { step: SpogomiJourneyStep }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-black/10 bg-white/70 p-3">
      <div className="min-w-0 flex-1">
        <p className="font-bold text-slate-950">{step.title}</p>
        <p className="cmm-text-small mt-0.5 text-slate-700">
          {step.description}
        </p>
      </div>
      <span className="shrink-0 rounded-full border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-black text-slate-700">
        {journeyStatusLabel(step.status)}
      </span>
    </div>
  );
}

function VolunteerPath({
  selectedDivisionType,
  journey,
}: {
  selectedDivisionType?: SpogomiEventDivisionType;
  journey: SpogomiEventJourney;
}) {
  const steps = volunteerSteps(journey);
  const division = selectedDivisionType
    ? ` pour la division ${divisionLabel[selectedDivisionType]}`
    : "";

  return (
    <CmmCard tone="emerald" variant="glass" className="space-y-4 p-5">
      <div>
        <h3 className="text-xl font-black text-emerald-950">Bénévoles</h3>
        <p className="cmm-text-body mt-1 text-slate-900">
          Les démarches affichées suivent l’état serveur de cette édition
          {division}.
        </p>
      </div>
      {steps.length ? (
        <div className="space-y-2" aria-label="Démarches bénévoles disponibles">
          {steps.map((step) =>
            step.status === "validated" ? (
              <StatusLine key={step.key} step={step} />
            ) : (
              <div
                key={step.key}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-white/80 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-950">{step.title}</p>
                  <p className="cmm-text-small mt-0.5 text-slate-700">
                    {step.description}
                  </p>
                </div>
                <CmmButton href={step.href!} tone="primary" size="sm" variant="pill">
                  Ouvrir
                  <ArrowRight size={15} aria-hidden="true" />
                </CmmButton>
              </div>
            ),
          )}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-3 text-sm font-bold text-slate-700">
          Aucune démarche bénévole n’est disponible dans cet état de l’édition.
        </p>
      )}
    </CmmCard>
  );
}

function AuthorizedPath({
  title,
  description,
  space,
  isAuthenticated,
  signInHref,
}: {
  title: string;
  description: string;
  space?: SpogomiAuthorizedSpace;
  isAuthenticated: boolean;
  signInHref: string;
}) {
  return (
    <CmmCard tone="slate" variant="glass" className="space-y-4 p-5">
      <div>
        <h3 className="text-xl font-black text-slate-950">{title}</h3>
        <p className="cmm-text-body mt-1 text-slate-900">
          {space?.description ?? description}
        </p>
      </div>
      {space ? (
        <CmmButton href={space.href} tone="primary" size="sm" variant="pill">
          Ouvrir l’espace autorisé
        </CmmButton>
      ) : isAuthenticated ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-3 text-sm font-bold text-slate-700">
          Aucune habilitation active pour cette édition.
        </p>
      ) : (
        <CmmButton href={signInHref} tone="secondary" size="sm" variant="pill">
          <LockKeyhole size={15} aria-hidden="true" />
          Se connecter pour vérifier l’accès
        </CmmButton>
      )}
    </CmmCard>
  );
}

export function SpogomiEventPathChooser({
  eventSlug,
  isAuthenticated,
  divisionTypes = [],
  selectedDivisionType,
  journey,
}: Props) {
  const [selectedPath, setSelectedPath] = useState<PathKey>("volunteers");
  const authorizedByKey = new Map(
    journey.authorizedSpaces.map((space) => [space.key, space]),
  );
  const panelId = `spogomi-path-panel-${selectedPath}`;

  return (
    <section
      id="spogomi-event-paths"
      className="space-y-4 scroll-mt-6"
      aria-labelledby="spogomi-event-paths-title"
      data-testid="spogomi-event-path-chooser"
    >
      <div>
        <p className="cmm-text-caption font-black uppercase tracking-[0.16em] text-emerald-700">
          Parcours pour cette édition
        </p>
        <h2
          id="spogomi-event-paths-title"
          className="mt-1 text-2xl font-black text-slate-950"
        >
          Choisir mon parcours
        </h2>
        <p className="cmm-text-body mt-1 max-w-3xl text-slate-900">
          Sélectionnez un parcours pour voir uniquement les étapes et accès
          autorisés pour cette compétition.
        </p>
      </div>
      <DivisionSelector
        eventSlug={eventSlug}
        divisionTypes={divisionTypes}
        selectedDivisionType={selectedDivisionType}
      />
      <PathTabs selectedPath={selectedPath} onSelect={setSelectedPath} />
      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={`spogomi-path-tab-${selectedPath}`}
      >
        {selectedPath === "volunteers" ? (
          <VolunteerPath
            selectedDivisionType={selectedDivisionType}
            journey={journey}
          />
        ) : selectedPath === "referees" ? (
          <AuthorizedPath
            title="Arbitres"
            description="Présences, opérations terrain, arbitrage ou résultats selon les capacités réellement attribuées à cette édition."
            space={authorizedByKey.get("referee")}
            isAuthenticated={isAuthenticated}
            signInHref={buildSpogomiEventSignInHref(eventSlug, {
              focus: "practical",
              division: selectedDivisionType,
            })}
          />
        ) : (
          <AuthorizedPath
            title="Organisateurs"
            description="Préparer et gérer cette édition dans le cockpit prévu pour les organisateurs habilités."
            space={authorizedByKey.get("organizer")}
            isAuthenticated={isAuthenticated}
            signInHref={buildSpogomiEventSignInHref(eventSlug, {
              focus: "practical",
              division: selectedDivisionType,
            })}
          />
        )}
      </div>
    </section>
  );
}
