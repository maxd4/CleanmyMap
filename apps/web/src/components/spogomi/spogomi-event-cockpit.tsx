"use client";

import { CalendarDays, ClipboardCheck, Eye, FileText, Leaf, Settings2, ShieldCheck, Trophy, Users } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CmmCard } from "@/components/ui/cmm-card";
import { PageHeader } from "@/components/ui/page-header";
import type { SpogomiCapability, SpogomiEventAccessRole } from "@/lib/spogomi/authorization";
import { SpogomiPreparationWorkspace, type SpogomiPreparationWorkspaceSection } from "./spogomi-preparation-workspace";
import { SpogomiObserverCockpitPanel } from "./spogomi-observer-cockpit-panel";
import { SpogomiResultReviewPanel } from "./spogomi-result-review-panel";
import { SpogomiAttendancePanel } from "./spogomi-attendance-panel";
import { SpogomiFieldOperationsPanel } from "./spogomi-field-operations-panel";
import { SpogomiClosureSummary } from "./spogomi-closure-summary";
import type { SpogomiFieldOperationsCapability } from "@/lib/spogomi/field-operations-service";

type CockpitSection = "presentation" | "operations" | SpogomiPreparationWorkspaceSection;

type CockpitEvent = {
  id: string;
  name: string;
  eventSlug: string | null;
  mode: string;
  state: string;
  startsAt: string;
  endsAt: string | null;
  officialTimezone?: string | null;
  publicVisibility: string;
};

const sectionLabels: Record<CockpitSection, string> = {
  presentation: "Présentation",
  teams: "Équipes",
  attendance: "Accueil et présences",
  results: "Résultats",
  arbitration: "Arbitrage",
  bilan: "Bilan",
  settings: "Paramètres",
  operations: "Opérations terrain",
};

const sectionIcons = {
  presentation: FileText,
  teams: Users,
  attendance: ClipboardCheck,
  results: Trophy,
  arbitration: ShieldCheck,
  bilan: Leaf,
  settings: Settings2,
  operations: ClipboardCheck,
} satisfies Record<CockpitSection, typeof FileText>;

function dateLabel(value: string | null, timeZone: string | null | undefined): string {
  if (!value) return "Non renseignée";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: timeZone || "Europe/Paris" }).format(new Date(value));
}

function modeLabel(value: string): string {
  if (value === "world_cup") return "World Cup";
  if (value === "mixed") return "Casual & World Cup";
  return "Casual";
}

function buildCockpitSections(organizer: boolean, referee: boolean, observer: boolean, checkin: boolean, hasFieldOperations: boolean): CockpitSection[] {
  const next: CockpitSection[] = ["presentation"];
  if (organizer) next.push("teams", "attendance", "operations", "results", "arbitration", "bilan", "settings");
  else if (checkin) next.push("attendance");
  else if (referee) next.push("results", "arbitration");
  else if (observer) next.push("teams", "results");
  if (hasFieldOperations && !next.includes("operations")) next.push("operations");
  return next;
}

function CockpitNavigation({ sections, activeSection, setActiveSection }: { sections: CockpitSection[]; activeSection: CockpitSection; setActiveSection: (section: CockpitSection) => void }) {
  return <nav aria-label="Sections de l’espace événementiel" className="sticky top-2 z-10 overflow-x-auto rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur"><ul className="flex min-w-max gap-2">{sections.map((section) => { const Icon = sectionIcons[section]; return <li key={section}><a href={`#${section}`} aria-current={activeSection === section ? "page" : undefined} onClick={() => setActiveSection(section)} className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${activeSection === section ? "bg-emerald-700 text-white" : "text-slate-800 hover:bg-emerald-50 hover:text-emerald-900"}`}><Icon size={16} aria-hidden="true" />{sectionLabels[section]}</a></li>; })}</ul></nav>;
}

type CockpitSectionProps = { section: CockpitSection; activeSection: CockpitSection; event: CockpitEvent; organizer: boolean; referee: boolean; showAdminTeamJoinRequests: boolean; fieldCapabilities: readonly SpogomiFieldOperationsCapability[] };

function cockpitWorkspaceSection(props: CockpitSectionProps, title: string, content: ReactNode) {
  return <section id={props.section} hidden={props.activeSection !== props.section} aria-labelledby={`spogomi-${props.section}-title`}><h2 id={`spogomi-${props.section}-title`} className="sr-only">{title}</h2>{props.activeSection === props.section ? content : null}</section>;
}

function CockpitSectionView(props: CockpitSectionProps) {
  switch (props.section) {
    case "presentation": return <section id="presentation" hidden={props.activeSection !== props.section} aria-labelledby="spogomi-presentation-title"><CmmCard tone="slate" variant="glass" className="space-y-3 p-5"><h2 id="spogomi-presentation-title" className="cmm-text-h3">Présentation</h2><dl className="grid gap-3 text-sm text-slate-800 sm:grid-cols-2"><div><dt className="font-bold">Statut</dt><dd>{props.event.state}</dd></div><div><dt className="font-bold">Mode</dt><dd>{modeLabel(props.event.mode)}</dd></div><div><dt className="font-bold">Début</dt><dd>{dateLabel(props.event.startsAt, props.event.officialTimezone)}</dd></div><div><dt className="font-bold">Fin</dt><dd>{dateLabel(props.event.endsAt, props.event.officialTimezone)}</dd></div></dl>{props.event.eventSlug && props.event.publicVisibility === "published" ? <a className="inline-flex min-h-11 items-center gap-2 font-black text-emerald-800 hover:underline" href={`/spogomi/${encodeURIComponent(props.event.eventSlug)}`}>Voir la fiche publique <Eye size={16} aria-hidden="true" /></a> : null}</CmmCard>{props.organizer ? <SpogomiClosureSummary eventId={props.event.id} /> : null}</section>;
    case "teams": return cockpitWorkspaceSection(props, "Équipes", props.organizer ? <SpogomiPreparationWorkspace eventId={props.event.id} section="teams" showHeader={false} /> : <SpogomiObserverCockpitPanel eventId={props.event.id} view="teams" />);
    case "attendance": return cockpitWorkspaceSection(props, "Accueil et présences", props.organizer ? <SpogomiPreparationWorkspace eventId={props.event.id} section="attendance" showHeader={false} /> : <SpogomiAttendancePanel eventId={props.event.id} />);
    case "operations": return cockpitWorkspaceSection(props, "Opérations terrain", <SpogomiFieldOperationsPanel eventId={props.event.id} capabilities={props.fieldCapabilities} />);
    case "results": return cockpitWorkspaceSection(props, "Résultats", props.organizer ? <SpogomiPreparationWorkspace eventId={props.event.id} section="results" showHeader={false} /> : <SpogomiObserverCockpitPanel eventId={props.event.id} view="results" />);
    case "arbitration": return cockpitWorkspaceSection(props, "Arbitrage", props.organizer ? <SpogomiPreparationWorkspace eventId={props.event.id} section="arbitration" showHeader={false} /> : <CmmCard tone="emerald" variant="glass" className="space-y-4 p-5"><SpogomiResultReviewPanel eventId={props.event.id} allowMutations={props.referee} allowDivisionSelection /></CmmCard>);
    case "bilan": return cockpitWorkspaceSection(props, "Bilan", <SpogomiPreparationWorkspace eventId={props.event.id} section="bilan" showHeader={false} />);
    case "settings": return cockpitWorkspaceSection(props, "Paramètres", <SpogomiPreparationWorkspace eventId={props.event.id} section="settings" showHeader={false} showAdminTeamJoinRequests={props.showAdminTeamJoinRequests} />);
  }
}

function CockpitSections(props: Omit<Parameters<typeof CockpitSectionView>[0], "section"> & { sections: CockpitSection[] }) {
  return <>{props.sections.map((section) => <CockpitSectionView key={section} {...props} section={section} />)}</>;
}

export function SpogomiEventCockpit({ event, role, capabilities, fieldCapabilities = [], activeRole }: { event: CockpitEvent; role: SpogomiEventAccessRole | null; capabilities: readonly SpogomiCapability[]; fieldCapabilities?: readonly SpogomiFieldOperationsCapability[]; activeRole?: string | null }) {
  const capabilitySet = useMemo(() => new Set(capabilities), [capabilities]);
  const organizer = capabilitySet.has("manage");
  const referee = capabilitySet.has("arbitrate");
  const observer = capabilitySet.has("observe");
  const checkin = capabilitySet.has("checkin");
  const hasFieldOperations = fieldCapabilities.length > 0;
  const showAdminTeamJoinRequests = activeRole === "admin" || activeRole === "max";
  const [activeSection, setActiveSection] = useState<CockpitSection>("presentation");
  const sections = useMemo(() => buildCockpitSections(organizer, referee, observer, checkin, hasFieldOperations), [checkin, hasFieldOperations, observer, organizer, referee]);

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.slice(1) as CockpitSection;
      if (sections.includes(hash)) setActiveSection(hash);
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [sections]);

  return <main className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-orange-50 px-4 py-10">
    <div className="cmm-page-width space-y-6">
      <PageHeader tone="stone" title={event.name} subtitle={`${modeLabel(event.mode)} · ${event.publicVisibility === "published" ? "publication publique" : "édition privée"}`} />
      <CmmCard tone="slate" variant="glass" className="space-y-3 p-5"><div className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-700"><CalendarDays size={17} aria-hidden="true" />{dateLabel(event.startsAt, event.officialTimezone)}{event.endsAt ? ` → ${dateLabel(event.endsAt, event.officialTimezone)}` : " · durée ouverte"}<span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-800">{role === "organizer" ? "Organisateur" : role === "referee" ? "Arbitre habilité" : role === "checkin" ? "Accueil habilité" : "Observateur habilité"}</span></div><p className="text-sm text-slate-700">Cet espace adapte ses vues aux habilitations vérifiées de cet événement. Chaque lecture et chaque action restent contrôlées par le serveur.</p></CmmCard>
      <CockpitNavigation sections={sections} activeSection={activeSection} setActiveSection={setActiveSection} />
      <CockpitSections sections={sections} activeSection={activeSection} event={event} organizer={organizer} referee={referee} showAdminTeamJoinRequests={showAdminTeamJoinRequests} fieldCapabilities={fieldCapabilities} />
    </div>
  </main>;
}
