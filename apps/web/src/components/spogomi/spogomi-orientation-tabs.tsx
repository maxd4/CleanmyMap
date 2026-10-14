"use client";

import { useId, useState, type KeyboardEvent } from "react";
import {
  BadgeCheck,
  CalendarPlus,
  ClipboardCheck,
  ClipboardList,
  Gavel,
  Recycle,
  Send,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";

import { CmmButton, CmmButtonGroup } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmIcon } from "@/components/ui/cmm-icon";
import { cn } from "@/lib/utils";

type OrientationId = "volunteers" | "referees" | "organizers";

type OrientationStep = {
  label: string;
  description: string;
  icon: typeof Users;
};

type Orientation = {
  id: OrientationId;
  label: string;
  summary: string;
  steps: OrientationStep[];
};

const ORIENTATIONS: Orientation[] = [
  {
    id: "volunteers",
    label: "Bénévoles",
    summary: "Trouvez une compétition publiée, participez sur le terrain et retrouvez les résultats rendus publics.",
    steps: [
      { label: "Rejoindre", description: "Choisir une compétition publiée.", icon: Users },
      { label: "Collecter", description: "Agir avec son équipe sur le terrain.", icon: Recycle },
      { label: "Résultats", description: "Consulter les résultats publiés.", icon: Trophy },
    ],
  },
  {
    id: "referees",
    label: "Arbitres & modération",
    summary: "Encadrez une édition seulement lorsque l’organisateur vous a habilité pour cette compétition.",
    steps: [
      { label: "Encadrer", description: "Accompagner le déroulement de l’édition.", icon: Gavel },
      { label: "Vérifier", description: "Contrôler les éléments soumis.", icon: ClipboardCheck },
      { label: "Certifier", description: "Prendre une décision dans le cadre autorisé.", icon: BadgeCheck },
    ],
  },
  {
    id: "organizers",
    label: "Organisateurs",
    summary: "Préparez une compétition dans votre espace privé, puis rendez publics uniquement les éléments que vous choisissez.",
    steps: [
      { label: "Créer", description: "Préparer un événement en privé.", icon: CalendarPlus },
      { label: "Préparer", description: "Organiser équipes, règles et accès.", icon: ClipboardList },
      { label: "Publier", description: "Rendre l’édition et ses résultats visibles.", icon: Send },
    ],
  },
];

export function SpogomiOrientationTabs({
  canAccessOrganizerDashboard,
}: {
  canAccessOrganizerDashboard: boolean;
}) {
  const [activeOrientation, setActiveOrientation] = useState<OrientationId>("volunteers");
  const baseId = useId();
  const activePanel = ORIENTATIONS.find((orientation) => orientation.id === activeOrientation) ?? ORIENTATIONS[0];

  function selectOrientation(id: OrientationId) {
    setActiveOrientation(id);
  }

  function handleTabKeyDown(index: number, event: KeyboardEvent<HTMLButtonElement>) {
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % ORIENTATIONS.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + ORIENTATIONS.length) % ORIENTATIONS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = ORIENTATIONS.length - 1;
    }

    if (nextIndex === null) return;

    event.preventDefault();
    const nextOrientation = ORIENTATIONS[nextIndex];
    selectOrientation(nextOrientation.id);
    document.getElementById(`${baseId}-tab-${nextOrientation.id}`)?.focus();
  }

  const activeIndex = ORIENTATIONS.findIndex((orientation) => orientation.id === activePanel.id);
  const tabId = `${baseId}-tab-${activePanel.id}`;
  const panelId = `${baseId}-panel-${activePanel.id}`;

  return (
    <section aria-labelledby="spogomi-orientation-title" className="space-y-4">
      <div>
        <p className="cmm-text-caption font-black uppercase tracking-[0.2em] text-emerald-700">Votre parcours</p>
        <h2 id="spogomi-orientation-title" className="mt-1 text-2xl font-black text-slate-950">Choisissez votre rôle</h2>
        <p className="cmm-text-body mt-1 text-slate-900">Les onglets expliquent les parcours disponibles sans modifier les règles d’accès.</p>
      </div>

      <div
        role="tablist"
        aria-label="Parcours SPOGOMI"
        className="grid gap-2 rounded-2xl border border-emerald-200/80 bg-white/70 p-2 sm:grid-cols-3"
      >
        {ORIENTATIONS.map((orientation, index) => {
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
              onClick={() => selectOrientation(orientation.id)}
              onKeyDown={(event) => handleTabKeyDown(index, event)}
              className={cn("justify-center text-center", !isActive && "border-transparent bg-transparent shadow-none")}
            >
              {orientation.label}
            </CmmButton>
          );
        })}
      </div>

      <CmmCard tone="emerald" variant="glass" className="space-y-5 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-emerald-700">Étape {activeIndex + 1} sur {ORIENTATIONS.length}</p>
            <h3 className="mt-1 text-xl font-black text-emerald-950">{activePanel.label}</h3>
            <p className="cmm-text-body mt-1 max-w-3xl text-slate-900">{activePanel.summary}</p>
          </div>
          {activePanel.id === "referees" ? <ShieldCheck className="h-7 w-7 shrink-0 text-emerald-700" aria-hidden="true" /> : null}
        </div>

        <div role="tabpanel" id={panelId} aria-labelledby={tabId} tabIndex={0} className="grid gap-3 md:grid-cols-3">
          {activePanel.steps.map((step, index) => (
            <div key={step.label} className="rounded-2xl border border-emerald-100 bg-white/80 p-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                  <CmmIcon icon={step.icon} label={step.label} />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">0{index + 1}</p>
                  <p className="font-black text-slate-950">{step.label}</p>
                </div>
              </div>
              <p className="cmm-text-body mt-3 text-slate-900">{step.description}</p>
            </div>
          ))}
        </div>

        {activePanel.id === "volunteers" ? (
          <CmmButtonGroup>
            <CmmButton href="#spogomi-events" tone="primary">Voir les compétitions</CmmButton>
          </CmmButtonGroup>
        ) : null}
        {activePanel.id === "organizers" && canAccessOrganizerDashboard ? (
          <CmmButtonGroup>
            <CmmButton href="/dashboard/spogomi" tone="primary">Ouvrir l’espace organisateur</CmmButton>
          </CmmButtonGroup>
        ) : null}
        {activePanel.id === "referees" ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm font-semibold leading-6 text-emerald-950">
            Aucun accès arbitre générique n’est ouvert depuis cette page. L’organisateur attribue l’habilitation pour une compétition précise ; les contrôles serveur restent inchangés.
          </p>
        ) : null}
      </CmmCard>
    </section>
  );
}
