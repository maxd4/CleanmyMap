"use client";

import { useImperativeHandle, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import { PublicCleanlinessCoverageTable } from "./public-cleanliness-coverage-table";
import { PublicCleanlinessNeedPanel } from "./public-cleanliness-need-panel";
import { PublicCleanlinessOrgChart } from "./public-cleanliness-org-chart";
import { getPublicInstitutionalContributions } from "@/lib/partners/public-cleanliness-needs";
import { getPublicInstitutionalPeople } from "@/lib/partners/public-cleanliness-people";
import { getInstitutionStructureContext } from "@/lib/partners/public-structure-context";
import { projectPublicEntity } from "@/lib/partners/public-entity-projection";
import { PARIS_CLEANWALK_ACTORS } from "@/lib/partners/paris-cleanwalk-network";
import { PublicStructureContextPanel } from "./public-structure-context-panel";
import { getArrondissementCityOptions, getArrondissementMunicipalLabel, type ArrondissementCity } from "@/lib/geo/paris-arrondissements";
import { CmmSectionGroup } from "@/components/ui/cmm-section";
import { cn } from "@/lib/utils";
import {
  filterPublicCleanlinessNodes,
  getPublicCleanlinessContact,
  getPublicCleanlinessCityDataset,
  PUBLIC_CLEANLINESS_CITY_DATASETS,
  PARIS_PUBLIC_CLEANLINESS_DATASET,
  type PublicCleanlinessCityDatasets,
  type PublicCleanlinessFilters,
  type PublicCleanlinessOrganizationNode,
  type PublicCleanlinessOrganizationRelation,
} from "@/lib/partners/public-cleanliness-organization";

const COPY = {
  fr: {
    eyebrow: "Référentiel institutionnel sourcé · Paris documenté en premier",
    title: "Organisation des services publics",
    intro: "Trouvez les interlocuteurs utiles et explorez les responsabilités des services publics.",
    types: "Types", typesBody: "Organisation et unité administrative ; poste/fonction, métier, équipe et personne sont des catégories distinctes. Les agents de terrain sont représentés par métier, sauf fonctions nominatives publiquement attestées et pertinentes.",
    scope: "Périmètre", scopeBody: "Employeur juridique, unité de rattachement et territoire d’intervention sont distingués. Une unité mutualisée n’apparaît qu’une fois avec plusieurs territoires.",
    relations: "Relations", relationsBody: "Seul le rattachement hiérarchique construit l’arbre. Mandat, affectation, coordination, coopération, programme et prestation restent des relations distinctes.",
    evidence: "Preuve", evidenceBody: "Organisation documentée, structure historique ou affectation inconnue sont affichées séparément. Une offre d’emploi n’établit jamais qui occupe le poste aujourd’hui.",
    city: "Ville", cityAria: "Sélectionner une ville", district: "Arrondissement", districtAria: "Filtrer par arrondissement", all: "Tous", service: "Service", serviceAria: "Filtrer par service", search: "Recherche", searchAria: "Rechercher dans l’organigramme", searchPlaceholder: "DPE, REQ, division…",
    noDataset: "Aucun référentiel institutionnel n’a encore été validé pour", noDatasetTail: "Le moteur accepte d’autres villes ; leurs données doivent être documentées avant affichage.",
    noResults: "Aucune fiche ne correspond aux filtres. Les affectations non établies restent indiquées comme inconnues.",
    tree: "Arborescence des services publics de propreté", zoom: "Zoom de l’arborescence", zoomOut: "Réduire le zoom", zoomIn: "Augmenter le zoom", zoomReset: "Réinitialiser le zoom",
    levels: "Navigation par niveau", levelNext: "Unités du niveau suivant", selected: "Fiche détaillée", relationsTitle: "Structures associées et relations", sources: "Sources et preuve", legalEmployer: "Employeur juridique", unit: "Unité de rattachement", territory: "Territoire d’intervention", assignmentUnknown: "Territoire d’affectation inconnu", annuaireId: "Identifiant Annuaire", kind: "Type", status: "État", sourceUpdated: "Mise à jour publiée le", verified: "vérifié le", proof: "preuve", relationSource: "Sources de cette relation", explore: "Explorer", collapse: "Replier", expand: "Déplier", noLevelChildren: "Aucun rattachement hiérarchique supplémentaire à ce niveau.", footer: "Une division mutualisée n’apparaît qu’une fois. Les mandats, affectations et autres relations non hiérarchiques sont accessibles depuis les fiches. Les lacunes ne signifient pas une absence de service.",
    serviceLabels: { all: "Tous les services", governance: "Gouvernance", cleaning: "Nettoiement", collection: "Collecte", emergency: "Urgence Propreté", prevention: "Prévention et tri", coordination: "Coordination territoriale", police: "Police municipale et prévention", provider: "Traitement et prestataires" },
    kinds: { city: "Ville", direction: "Direction", service: "Service", unit: "Unité", team: "Équipe", position: "Poste / fonction", profession: "Métier", person: "Personne", provider: "Prestataire" },
    assignment: { confirmed: "Documenté par la source", historical: "Historique à la date de la source", unknown: "Affectation inconnue" },
    relationKinds: { hierarchy: "Rattachement hiérarchique", mandate: "Mandat politique", assignment: "Affectation", coordination: "Coordination fonctionnelle", cooperation: "Coopération documentée", programme: "Programme", service: "Prestation ou service" },
    relationStatus: { confirmed: "confirmé par la source", historical: "historique à la date de la source", unknown: "inconnu" },
    evidenceLabels: { official_current: "source institutionnelle actuelle", official_historical: "source institutionnelle historique", official_job_profile: "fiche de poste officielle", operator_statement: "offre déclarée par l’opérateur", professional_self_statement: "déclaration professionnelle publique de l’intéressé" },
    kindLegend: "Légende des états", cityName: "Ville", arrSuffix: "arrondissement", standalone: "Mandats, fonctions et personnes", contact: "Canal institutionnel public",
  },
  en: {
    eyebrow: "Sourced institutional registry · Paris documented first",
    title: "Public services organization",
    intro: "Find relevant contacts and explore public service responsibilities.",
    types: "Entity types", typesBody: "Organizations and administrative units are distinct from roles, occupations, teams and people. Field occupations are represented collectively unless an individual role is publicly documented and relevant.",
    scope: "Scope", scopeBody: "Legal employer, reporting unit and service territory are separate. A shared unit appears once with several territories.",
    relations: "Relationships", relationsBody: "Only hierarchical reporting builds the tree. Mandates, assignments, coordination, cooperation, programmes and services remain distinct.",
    evidence: "Evidence", evidenceBody: "Documented organization, historical structure and unknown assignment are shown separately. A job listing never proves who currently holds a role.",
    city: "City", cityAria: "Select a city", district: "District", districtAria: "Filter by district", all: "All", service: "Service", serviceAria: "Filter by service", search: "Search", searchAria: "Search the organization chart", searchPlaceholder: "DPE, REQ, division…",
    noDataset: "No institutional registry has been validated for", noDatasetTail: "The engine supports other cities; their data must be documented before display.",
    noResults: "No records match these filters. Unverified assignments remain marked unknown.",
    tree: "Public cleanliness services tree", zoom: "Tree zoom", zoomOut: "Zoom out", zoomIn: "Zoom in", zoomReset: "Reset zoom",
    levels: "Navigate by level", levelNext: "Units at the next level", selected: "Details", relationsTitle: "Related organizations and relationships", sources: "Sources and evidence", legalEmployer: "Legal employer", unit: "Reporting unit", territory: "Service territory", assignmentUnknown: "Assignment territory unknown", annuaireId: "Directory ID", kind: "Type", status: "Status", sourceUpdated: "Source updated", verified: "verified", proof: "evidence", relationSource: "Sources for this relationship", explore: "Explore", collapse: "Collapse", expand: "Expand", noLevelChildren: "No further hierarchical unit at this level.", footer: "Shared divisions appear once with all territories. Mandates, assignments and other non-hierarchical relationships are accessible from the records. Gaps do not establish absence of service.",
    serviceLabels: { all: "All services", governance: "Governance", cleaning: "Street cleaning", collection: "Waste collection", emergency: "Urgent cleanliness", prevention: "Prevention and sorting", coordination: "Territorial coordination", police: "Municipal police and prevention", provider: "Treatment and contractors" },
    kinds: { city: "City", direction: "Directorate", service: "Service", unit: "Unit", team: "Team", position: "Role", profession: "Occupation", person: "Person", provider: "Provider" },
    assignment: { confirmed: "Documented by source", historical: "Historical at source date", unknown: "Assignment unknown" },
    relationKinds: { hierarchy: "Hierarchical reporting", mandate: "Political mandate", assignment: "Assignment", coordination: "Functional coordination", cooperation: "Documented cooperation", programme: "Programme", service: "Service provision" },
    relationStatus: { confirmed: "confirmed by source", historical: "historical at source date", unknown: "unknown" },
    evidenceLabels: { official_current: "current institutional source", official_historical: "historical institutional source", official_job_profile: "official job profile", operator_statement: "provider-reported offer", professional_self_statement: "public professional self-statement" },
    kindLegend: "Evidence status", cityName: "City", arrSuffix: "district", standalone: "Mandates, roles and people", contact: "Public institutional channel",
  },
} as const;

const NAME_EN: Record<string, string> = {
  "city-paris": "City of Paris", dpe: "Paris Department of Cleanliness and Water (DPE)", stpp: "Technical Service for Paris Cleanliness (STPP)",
  "brigade-urgence-proprete": "Urgent Cleanliness Response Teams", "dpe-field-agents": "Field staff — street cleaning and waste collection", "tson-position": "Operational Street-Cleaning Services Technician (TSON)",
  "division-17-sectors": "Territorial sectors and workshops (structure described for Division 17)", "division-17-supervisors": "Division and sector supervisor roles", "specialized-cleaning-services": "Specialist cleanliness services", eboueurs: "Street cleaners", "collection-drivers": "Collection and cleaning vehicle operators",
  ddct: "Department of Democracy, Citizens and Territories (DDCT)", "borough-mayors": "Arrondissement town halls", dgaep: "Deputy Directors General for Public Space (DGAEP)", "dgs-19": "Directorate General of Services — 19th arrondissement town hall", "dgaep-19": "DGAEP — 19th arrondissement town hall", req: "Neighborhood Maintenance Representatives (REQ)", "municipal-police": "Municipal Police and Prevention (DPMP)", "prevention-sorting": "Prevention, awareness and sorting", "private-collectors": "Private waste collection providers",
};

const DESCRIPTION_EN: Record<string, string> = {
  "city-paris": "Local authority; overall scope of the Paris registry.",
  dpe: "Directorate responsible for street cleaning and municipal collection in the sectors it operates.",
  stpp: "DPE service responsible for public-space cleaning and waste collection.",
  "brigade-urgence-proprete": "Mobile teams deployed for targeted needs reported by town halls and residents.",
  "dpe-field-agents": "Collective representation of field staff; no invented headcount or individual identity is shown.",
  "tson-position": "Job profile attached to Division 17; it describes a role and team structure, not a current incumbent.",
  "division-17-sectors": "The 2025 job profile describes three territorial sectors and eight workshops, plus one functional sector with two workshops. Incumbents are not listed.",
  "division-17-supervisors": "The job profile describes a division head, two deputies and a sector supervisor; no identity or current assignment is inferred.",
  "specialized-cleaning-services": "The City documents specialist interventions, including underground roads and riverbanks. Detailed units and reporting lines are not all published here.",
  eboueurs: "Occupation represented collectively, without invented people or headcounts.",
  "collection-drivers": "Occupation represented collectively; local assignments are unknown.",
  ddct: "DDCT launched the REQ rollout; this alone does not describe an operational reporting line.",
  "borough-mayors": "Local municipal level; no individual assignment is inferred.",
  dgaep: "The 20th arrondissement REQ posting states a reporting link to the borough DGAEP; its incumbent is not identified here.",
  "dgs-19": "The DGAEP job profile describes the DGS within the 19th arrondissement town hall's directorate general of services. No incumbent is named.",
  "dgaep-19": "Role described in a September 2026 job posting. It does not establish the identity of a current incumbent.",
  req: "Job posting for the 20th arrondissement and a programme rollout led by DDCT. Current assignments, neighbourhood coverage and incumbents are not established by this posting.",
  "municipal-police": "Directorate cited as a service REQs may contact; no shared chain of command is represented.",
  "prevention-sorting": "Public function documented in this ecosystem; the administrative reporting unit is not established by the sources used here.",
  syctom: "Waste treatment syndicate; service relationship, not a municipal reporting line.",
  "private-collectors": "Private companies collect municipal waste in some arrondissements. Contractors and exact scopes are not named here.",
};

const STATUS_STYLE = {
  confirmed: "border-emerald-500/30 bg-emerald-500/10 cmm-text-success",
  historical: "border-amber-500/30 bg-amber-500/10 cmm-text-warning",
  unknown: "border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background-muted)] cmm-text-secondary",
} as const;

const EMPTY_NODES: readonly PublicCleanlinessOrganizationNode[] = [];
const EMPTY_RELATIONS: readonly PublicCleanlinessOrganizationRelation[] = [];
const EMPTY_SOURCES: readonly { id: string; label: string; url: string; sourceContentDate?: string; verifiedAt: string; evidence: "official_current" | "official_historical" | "official_job_profile" | "operator_statement" | "professional_self_statement" }[] = [];

export type PublicCleanlinessNavigation = { openNode: (id: string) => boolean };

export function PublicCleanlinessOrganization({
  fr = true,
  datasets = PUBLIC_CLEANLINESS_CITY_DATASETS,
  navigationRef,
  getNetworkActorId,
  onOpenNetworkActor,
}: {
  fr?: boolean;
  datasets?: PublicCleanlinessCityDatasets;
  navigationRef?: Ref<PublicCleanlinessNavigation>;
  getNetworkActorId?: (node: PublicCleanlinessOrganizationNode) => string | null;
  onOpenNetworkActor?: (actorId: string) => void;
}) {
  const text = fr ? COPY.fr : COPY.en;
  const cityOptions = getArrondissementCityOptions();
  const initialCity = cityOptions.find((city) => getPublicCleanlinessCityDataset(city.value, datasets))?.value ?? cityOptions[0]?.value ?? "Paris";
  const [filters, setFilters] = useState<PublicCleanlinessFilters>(() => ({ city: initialCity, arrondissement: null, service: "all", query: "" }));
  const [selectedId, setSelectedId] = useState("dpe");
  const [viewMode, setViewMode] = useState<"chart" | "list">("chart");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [zoom, setZoom] = useState(1);
  const detailsRef = useRef<HTMLElement>(null);
  const dataset = getPublicCleanlinessCityDataset(filters.city, datasets);
  const visibleNodes = useMemo(() => filterPublicCleanlinessNodes(filters, datasets), [filters, datasets]);
  const visibleIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const nodes = dataset?.nodes ?? EMPTY_NODES;
  const relations = dataset?.relations ?? EMPTY_RELATIONS;
  const sources = dataset?.sources ?? EMPTY_SOURCES;
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const childrenById = new Map<string, string[]>();
  const parentById = new Map<string, string>();
  for (const relation of relations) {
    if (relation.kind !== "hierarchy") continue;
    const childIds = childrenById.get(relation.from) ?? [];
    childIds.push(relation.to);
    childrenById.set(relation.from, childIds);
    parentById.set(relation.to, relation.from);
  }
  const includedIds = new Set(visibleIds);
  for (const id of visibleIds) {
    let current = id;
    const visited = new Set<string>();
    while (!visited.has(current)) {
      visited.add(current);
      const parent = parentById.get(current);
      if (!parent) break;
      includedIds.add(parent);
      current = parent;
    }
  }
  const roots = nodes.filter((node) => !parentById.has(node.id) && includedIds.has(node.id));
  const mandateNodes = new Set(relations.filter(edge => edge.kind === "mandate").flatMap(edge => [edge.from, edge.to]));
  const standaloneRoots = roots.filter(node => node.kind === "person" || node.kind === "position" || (node.kind === "unit" && mandateNodes.has(node.id)));
  const standaloneRootIds = new Set(standaloneRoots.map(node => node.id));
  const administrativeRoots = roots.filter(node => !standaloneRootIds.has(node.id));
  const selected = (includedIds.has(selectedId) ? nodeById.get(selectedId) : undefined) ?? visibleNodes[0] ?? null;
  const selectedRelations = selected ? relations.filter((edge) => edge.from === selected.id || edge.to === selected.id) : [];
  const institutionalPeople = selected && dataset ? getPublicInstitutionalPeople(dataset, selected.id) : [];
  const documentedContributions = selected && dataset ? getPublicInstitutionalContributions(dataset, selected.id) : [];
  const selectedContact = selected ? getPublicCleanlinessContact(selected, sources) : null;

  const getPath = (nodeId: string): PublicCleanlinessOrganizationNode[] => {
    const path: PublicCleanlinessOrganizationNode[] = [];
    const visited = new Set<string>();
    let current: string | undefined = nodeId;
    while (current && !visited.has(current)) {
      visited.add(current);
      const node = nodeById.get(current);
      if (node) path.push(node);
      current = parentById.get(current);
    }
    return path.reverse();
  };
  const selectedPath = selected ? getPath(selected.id) : [];
  const nextLevelNodes = selected
    ? (childrenById.get(selected.id) ?? []).filter((id) => includedIds.has(id)).map((id) => nodeById.get(id)).filter((node): node is PublicCleanlinessOrganizationNode => Boolean(node))
    : [];

  const displayName = (node: PublicCleanlinessOrganizationNode) => {
    if (fr) return node.name;
    if (NAME_EN[node.id]) return NAME_EN[node.id];
    if (node.id.startsWith("division-")) return node.name.replace("Division territoriale", "Territorial division");
    return node.name;
  };
  const displayDescription = (node: PublicCleanlinessOrganizationNode) => fr ? node.description : DESCRIPTION_EN[node.id] ?? node.description;
  const kindLabel = (kind: PublicCleanlinessOrganizationNode["kind"]) => text.kinds[kind];
  const statusLabel = (status: PublicCleanlinessOrganizationNode["assignment"]) => text.assignment[status];
  const relationKindLabel = (kind: PublicCleanlinessOrganizationRelation["kind"]) => text.relationKinds[kind];
  const relationStatusLabel = (status: PublicCleanlinessOrganizationRelation["status"]) => text.relationStatus[status];

  const updateFilters = (nextFilters: PublicCleanlinessFilters) => {
    setFilters(nextFilters);
    const nextVisible = filterPublicCleanlinessNodes(nextFilters, datasets);
    setSelectedId((current) => nextVisible.some((node) => node.id === current) ? current : nextVisible[0]?.id ?? "");
  };
  const updateFilter = <K extends keyof PublicCleanlinessFilters>(key: K, value: PublicCleanlinessFilters[K]) => updateFilters({ ...filters, [key]: value });
  const selectRelatedNode = (nodeId: string) => {
    const related = nodeById.get(nodeId);
    if (!related) return;
    if (includedIds.has(nodeId)) {
      setSelectedId(nodeId);
      setCollapsed(current => {
        const next = { ...current };
        for (const node of getPath(nodeId)) next[node.id] = false;
        return next;
      });
      return;
    }
    const nextFilters = {
      ...filters,
      arrondissement: filters.arrondissement === null || related.territoryIds.length === 0 || related.territoryIds.includes(`${filters.city}:${filters.arrondissement}`) ? filters.arrondissement : null,
      service: "all",
      query: "",
    } satisfies PublicCleanlinessFilters;
    updateFilters(nextFilters);
    setSelectedId(nodeId);
    setCollapsed((current) => {
      const next = { ...current };
      for (const node of getPath(nodeId)) next[node.id] = false;
      return next;
    });
  };
  useImperativeHandle(navigationRef, () => ({
    openNode(id) {
      const paris = getPublicCleanlinessCityDataset("Paris", datasets);
      if (!paris?.nodes.some(node => node.id === id)) return false;
      if (filters.city === "Paris") {
        selectRelatedNode(id);
      } else {
        setFilters({ city: "Paris", arrondissement: null, service: "all", query: "" });
        setSelectedId(id);
        setCollapsed({});
      }
      return true;
    },
  }));
  const linkedActorId = selected && dataset?.city === "Paris" ? getNetworkActorId?.(selected) : null;
  const selectTreeNode = (nodeId: string) => includedIds.has(nodeId) ? setSelectedId(nodeId) : selectRelatedNode(nodeId);
  const isSearching = filters.query.trim().length > 0;

  const renderNode = (node: PublicCleanlinessOrganizationNode, depth: number): ReactNode => {
    const children = (childrenById.get(node.id) ?? []).filter((id) => includedIds.has(id)).map((id) => nodeById.get(id)).filter((value): value is PublicCleanlinessOrganizationNode => Boolean(value));
    const isCollapsed = !isSearching && (collapsed[node.id] ?? false);
    const stateLabel = statusLabel(node.assignment);
    return <li key={node.id}>
      <div className="flex items-start gap-2" style={{ marginInlineStart: `${Math.min(depth, 4) * 0.5}rem` }}>
        {children.length > 0 && !isSearching ? <button type="button" aria-label={`${isCollapsed ? text.expand : text.collapse} ${displayName(node)}`} aria-expanded={!isCollapsed} aria-controls={`org-children-${node.id}`} onClick={() => setCollapsed((current) => ({ ...current, [node.id]: !isCollapsed }))} className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--cmm-surface-border)] cmm-text-primary hover:bg-violet-500/10">{isCollapsed ? "+" : "−"}</button> : <span className="mt-1 inline-block h-8 w-8 shrink-0" aria-hidden="true" />}
        <button type="button" aria-current={selected?.id === node.id ? "true" : undefined} data-assignment={node.assignment} onClick={() => selectTreeNode(node.id)} className={cn("min-w-0 flex-1 rounded-xl border px-3 py-2 text-left transition", selected?.id === node.id ? "border-violet-500 bg-violet-500/10" : "border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background-muted)] hover:border-violet-500/40")}>
          <span className="flex flex-wrap items-center gap-2"><span className="font-bold cmm-text-primary">{displayName(node)}</span><span className="rounded-full border border-[var(--cmm-surface-border)] px-2 py-0.5 text-xs cmm-text-secondary">{kindLabel(node.kind)}</span><span className={cn("rounded-full border px-2 py-0.5 text-xs", STATUS_STYLE[node.assignment])}>{stateLabel}</span></span>
        </button>
      </div>
      {children.length > 0 && !isCollapsed ? <ul id={`org-children-${node.id}`} className="mt-2 list-none space-y-2">{children.map((child) => renderNode(child, depth + 1))}</ul> : null}
    </li>;
  };

  const districtCount = cityOptions.find((city) => city.value === filters.city)?.arrondissementCount ?? 0;
  const districtLabel = (number: number) => fr
    ? getArrondissementMunicipalLabel(filters.city as ArrondissementCity, number)
    : `${filters.city} ${number}${number === 1 ? "st" : "th"} ${text.arrSuffix}`;

  return <CmmSectionGroup>
    <section data-testid="public-cleanliness-organization" aria-labelledby="public-cleanliness-heading" className="rounded-3xl border border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background)] p-4 md:p-6">
      <div className="mb-6 max-w-3xl space-y-3">
        <p className="text-xs font-black uppercase tracking-[0.22em] cmm-text-info">{text.eyebrow}</p>
        <h2 id="public-cleanliness-heading" className="text-3xl font-black cmm-text-primary">{text.title}</h2>
        <p className="text-sm leading-6 cmm-text-primary">{text.intro}</p>
      </div>
      <details className="mb-5 rounded-xl border border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background-muted)] p-3 text-xs cmm-text-primary">
        <summary className="cursor-pointer font-semibold">{fr ? "Comprendre les relations et les sources" : "Understand relationships and sources"}</summary>
        <div className="mt-3 grid gap-3 leading-5 md:grid-cols-2">
        <p><strong className="cmm-text-primary">{text.types}:</strong> {text.typesBody}</p>
        <p><strong className="cmm-text-primary">{text.scope}:</strong> {text.scopeBody}</p>
        <p><strong className="cmm-text-primary">{text.relations}:</strong> {text.relationsBody}</p>
        <p><strong className="cmm-text-primary">{text.evidence}:</strong> {text.evidenceBody}</p>
        </div>
      </details>

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold cmm-text-secondary">{text.city}<select aria-label={text.cityAria} value={filters.city} onChange={(event) => updateFilters({ ...filters, city: event.target.value, arrondissement: null })} className="cmm-input mt-1 block w-full">{cityOptions.map((city) => <option key={city.value} value={city.value}>{city.label}</option>)}</select></label>
        <label className="text-xs font-bold cmm-text-secondary">{text.district}<select aria-label={text.districtAria} value={filters.arrondissement ?? ""} onChange={(event) => updateFilter("arrondissement", event.target.value ? Number(event.target.value) : null)} className="cmm-input mt-1 block w-full"><option value="">{text.all}</option>{Array.from({ length: districtCount }, (_, index) => index + 1).map((number) => <option key={number} value={number}>{districtLabel(number)}</option>)}</select></label>

      </div>

      {dataset?.city === "Paris" ? <PublicCleanlinessNeedPanel dataset={dataset} district={filters.arrondissement} fr={fr} onSelect={nodeId => {
        selectRelatedNode(nodeId);
        detailsRef.current?.focus();
      }} /> : null}

      {!dataset ? <p role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm cmm-text-warning">{text.noDataset} {filters.city}. {text.noDatasetTail}</p> : <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.75fr)]">
        <div className="min-w-0 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold cmm-text-secondary">{text.service}<select aria-label={text.serviceAria} value={filters.service} onChange={(event) => updateFilter("service", event.target.value as PublicCleanlinessFilters["service"])} className="cmm-input mt-1 block w-full">{Object.entries(text.serviceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-xs font-bold cmm-text-secondary">{text.search}<input type="search" aria-label={text.searchAria} value={filters.query} onChange={(event) => updateFilter("query", event.target.value)} placeholder={text.searchPlaceholder} className="cmm-input mt-1 block w-full" /></label>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[var(--cmm-surface-border)] p-3 md:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-black cmm-text-primary">{text.tree}</h3>
              <div className="flex flex-wrap items-center gap-2">
                <div role="group" aria-label={fr ? "Mode d'affichage de l'organigramme" : "Organization chart view mode"} className="flex items-center gap-1 rounded-xl border border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background-muted)] p-1">
                  <button type="button" aria-pressed={viewMode === "chart"} onClick={() => { setViewMode("chart"); setZoom(1); }} className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", viewMode === "chart" ? "bg-violet-500/20 cmm-text-primary" : "cmm-text-secondary")}>
                    {fr ? "Organigramme" : "Org chart"}
                  </button>
                  <button type="button" aria-pressed={viewMode === "list"} onClick={() => { setViewMode("list"); setZoom(1); }} className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", viewMode === "list" ? "bg-violet-500/20 cmm-text-primary" : "cmm-text-secondary")}>
                    {fr ? "Liste" : "List"}
                  </button>
                </div>
                <div role="group" aria-label={text.zoom} className="flex items-center gap-2">
                  <button type="button" aria-label={text.zoomOut} onClick={() => setZoom((value) => Math.max(viewMode === "chart" ? 0.2 : 0.7, Math.round((value - 0.1) * 10) / 10))} className="rounded-lg border border-[var(--cmm-surface-border)] px-3 py-2 text-sm cmm-text-primary">−</button>
                  <button type="button" aria-label={text.zoomReset} onClick={() => setZoom(1)} className="min-w-16 rounded-lg border border-[var(--cmm-surface-border)] px-3 py-2 text-xs font-bold cmm-text-primary">{Math.round(zoom * 100)}%</button>
                  <button type="button" aria-label={text.zoomIn} onClick={() => setZoom((value) => Math.min(viewMode === "chart" ? 60 : 1.4, Math.round((value + 0.1) * 10) / 10))} className="rounded-lg border border-[var(--cmm-surface-border)] px-3 py-2 text-sm cmm-text-primary">+</button>
                </div>
              </div>
            </div>
            {roots.length ? (
              <div className="space-y-3">
                {viewMode === "chart" ? (
                  <PublicCleanlinessOrgChart
                    fr={fr}
                    administrativeRoots={roots}
                    childrenById={childrenById}
                    nodeById={nodeById}
                    relations={relations}
                    includedIds={includedIds}
                    selectedId={selected?.id ?? null}
                    collapsed={collapsed}
                    isSearching={isSearching}
                    zoom={zoom}
                    treeLabel={text.tree}
                    expandLabel={text.expand}
                    collapseLabel={text.collapse}
                    fitLabel={fr ? "Cadrer" : "Fit"}
                    legendLabels={{
                      confirmed: text.assignment.confirmed,
                      historical: text.assignment.historical,
                      unknown: text.assignment.unknown,
                      nonHierarchyNote: fr ? "Les autres relations ne constituent pas des rattachements" : "Other links are not reporting lines",
                    }}
                    displayName={displayName}
                    kindLabel={kindLabel}
                    statusLabel={statusLabel}
                    statusStyle={STATUS_STYLE}
                    onSelect={selectTreeNode}
                    onToggleCollapse={(nodeId, next) => setCollapsed((current) => ({ ...current, [nodeId]: next }))}
                    onResetView={() => setZoom(1)}
                    onZoomChange={setZoom}
                  />
                ) : (
                  <div className="max-h-[38rem] overflow-auto">
                    <div className="min-w-0" style={{ fontSize: `${zoom}rem` }}>
                      <ul aria-label={text.tree} className="list-none space-y-2">{administrativeRoots.map(rootNode => renderNode(rootNode, 0))}</ul>
                    </div>
                  </div>
                )}
                {viewMode === "list" && standaloneRoots.length ? <details className="rounded-xl border border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background-muted)] p-2" open={Boolean(filters.query.trim()) || Boolean(selectedPath[0] && standaloneRootIds.has(selectedPath[0].id))}>
                  <summary className="cursor-pointer text-sm font-semibold cmm-text-info">{text.standalone} ({standaloneRoots.length})</summary>
                  <ul aria-label={text.standalone} className="mt-2 list-none space-y-2">{standaloneRoots.map(rootNode => renderNode(rootNode, 0))}</ul>
                </details> : null}
              </div>
            ) : <p role="status" className="p-5 text-sm cmm-text-primary">{text.noResults}</p>}
          </div>

          <section aria-label={text.levels} className="rounded-2xl border border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background-muted)] p-4">
            <h3 className="text-sm font-black cmm-text-primary">{text.levels}</h3>
            {selectedPath.length ? <nav aria-label={text.levels} className="mt-3 flex flex-wrap items-center gap-2">{selectedPath.map((node, index) => <span key={node.id} className="flex items-center gap-2">{index > 0 ? <span aria-hidden="true" className="cmm-text-secondary">›</span> : null}<button type="button" aria-current={index === selectedPath.length - 1 ? "location" : undefined} onClick={() => selectTreeNode(node.id)} className="rounded-lg border border-[var(--cmm-surface-border)] px-3 py-2 text-left text-xs font-bold cmm-text-primary hover:bg-violet-500/10">{displayName(node)}</button></span>)}</nav> : <p className="mt-3 text-xs cmm-text-secondary">{text.noResults}</p>}
            <h4 className="mt-4 text-xs font-bold uppercase tracking-wide cmm-text-secondary">{text.levelNext}</h4>
            {nextLevelNodes.length ? <ul className="mt-2 flex flex-wrap gap-2">{nextLevelNodes.map((node) => <li key={node.id}><button type="button" onClick={() => selectTreeNode(node.id)} className="rounded-xl border border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background)] px-3 py-2 text-left text-xs font-semibold cmm-text-primary hover:border-violet-500/40">{text.explore}: {displayName(node)} <span className={cn("ml-1 inline-block rounded-full border px-2 py-0.5", STATUS_STYLE[node.assignment])}>{statusLabel(node.assignment)}</span></button></li>)}</ul> : <p className="mt-2 text-xs cmm-text-secondary">{text.noLevelChildren}</p>}
          </section>
        </div>

        <aside ref={detailsRef} tabIndex={-1} aria-live="polite" aria-label={text.selected} className="rounded-2xl border border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background-muted)] p-4">
          {selected ? <>
            <p className="text-xs font-black uppercase tracking-widest cmm-text-info">{text.selected} · {kindLabel(selected.kind)}</p>
            <h3 className="mt-2 text-xl font-black cmm-text-primary">{displayName(selected)}</h3>
            <p className="mt-3 text-sm leading-6 cmm-text-primary">{displayDescription(selected)}</p>
            {linkedActorId && onOpenNetworkActor ? <button type="button" onClick={() => onOpenNetworkActor(linkedActorId)} className="mt-3 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-left text-sm font-semibold cmm-text-primary hover:bg-violet-500/20 focus-visible:ring-2 focus-visible:ring-violet-400">{fr ? "Voir dans le réseau des acteurs" : "View in the actor network"}</button> : null}
            <p data-assignment={selected.assignment} className={cn("mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-bold", STATUS_STYLE[selected.assignment])}>{text.status}: {statusLabel(selected.assignment)}</p>
            {selected.territoryIds.length ? <p className="mt-2 text-xs cmm-text-secondary">{text.territory}: {selected.territoryIds.map((id) => id.replace(`${filters.city}:`, `${filters.city} `)).join(", ")}</p> : <p className="mt-2 text-xs cmm-text-secondary">{text.assignmentUnknown}</p>}
            {selected.legalEmployerId ? <p className="mt-2 text-xs cmm-text-secondary">{text.legalEmployer}: {nodeById.has(selected.legalEmployerId) ? displayName(nodeById.get(selected.legalEmployerId)!) : selected.legalEmployerId}</p> : null}
            {selected.unitId ? <p className="mt-2 text-xs cmm-text-secondary">{text.unit}: {nodeById.has(selected.unitId) ? displayName(nodeById.get(selected.unitId)!) : selected.unitId}</p> : null}
            {selectedContact ? <p className="mt-2 text-xs cmm-text-secondary">{text.contact}: <a href={selectedContact.url} target="_blank" rel="noreferrer" className="cmm-text-info underline underline-offset-2">{selectedContact.label}</a></p> : null}
            {institutionalPeople.length ? <section className="mt-4"><h4 className="text-xs font-black uppercase tracking-wider cmm-text-primary">{fr ? "Personnes et affectations documentées" : "Documented people and assignments"}</h4><ul className="mt-2 space-y-2">{institutionalPeople.map(({ person, assignments }) => <li key={person.id} className="rounded-xl border border-[var(--cmm-surface-border)] p-3 text-xs cmm-text-primary"><button type="button" onClick={() => selectRelatedNode(person.id)} className="font-bold cmm-text-info underline">{displayName(person)}</button><ul className="mt-1 space-y-1">{assignments.map(({ role, relation, status }) => <li key={relation.id}>{displayName(role)} · {relationStatusLabel(status)}</li>)}</ul></li>)}</ul></section> : null}
            {selectedRelations.length ? <section className="mt-4"><h4 className="text-xs font-black uppercase tracking-wider cmm-text-primary">{text.relationsTitle}</h4><ul className="mt-2 space-y-3">{selectedRelations.map((edge) => {
              const relatedId = edge.from === selected.id ? edge.to : edge.from;
              const related = nodeById.get(relatedId);
              const relationSources = edge.sourceIds.map((id) => sources.find((source) => source.id === id)).filter((source): source is (typeof sources)[number] => Boolean(source));
              return <li key={edge.id} className="rounded-xl border border-[var(--cmm-surface-border)] p-3 text-xs cmm-text-primary">
                <p>{relationKindLabel(edge.kind)} · <span className={cn("inline-flex rounded-full border px-2 py-0.5", STATUS_STYLE[edge.status])}>{relationStatusLabel(edge.status)}</span></p>
                {edge.validFrom || edge.validUntil ? <p className="mt-1 cmm-text-secondary">{fr ? "Période publiée" : "Published period"}: {edge.validFrom ?? "?"} → {edge.validUntil ?? "?"}</p> : null}
                {related ? <button type="button" onClick={() => selectRelatedNode(related.id)} className="mt-2 text-left font-bold cmm-text-info underline underline-offset-2">{text.explore}: {displayName(related)}</button> : null}
                <div className="mt-2"><span className="font-bold cmm-text-primary">{text.relationSource}:</span><ul className="mt-1 space-y-1">{relationSources.map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer" className="cmm-text-info underline underline-offset-2">{source.label}</a><span className="cmm-text-secondary"> · {text.verified} {source.verifiedAt}</span></li>)}</ul></div>
              </li>;
            })}</ul></section> : null}
            {documentedContributions.length ? <section className="mt-4 text-xs cmm-text-primary"><h4 className="font-black uppercase tracking-wider cmm-text-primary">{fr ? "Contributions publiques documentées" : "Documented public contributions"}</h4><p className="mt-1 cmm-text-secondary">{fr ? "Relations reprises du réseau public, pas un partenariat CleanMyMap ni un engagement actuel." : "Relations from the public network; not a CleanMyMap partnership or current commitment."}</p><ul className="mt-2 space-y-2">{documentedContributions.map(item => <li key={item.id} className="rounded-xl border border-[var(--cmm-surface-border)] p-3">
              <p className="font-semibold cmm-text-primary">{item.title}</p><button type="button" onClick={() => selectRelatedNode(item.otherId)} className="cmm-text-info underline">{item.otherName}</button><p className="mt-1">{item.summary}</p><p><a href={item.source.url} target="_blank" rel="noreferrer" className="cmm-text-info underline">{item.source.label}</a> · {item.source.verifiedAt}</p>
            </li>)}</ul></section> : null}
            {dataset ? <PublicStructureContextPanel key={selected.id} context={dataset === PARIS_PUBLIC_CLEANLINESS_DATASET ? projectPublicEntity({ institutionId: selected.id })?.structureContext ?? null : getInstitutionStructureContext(dataset, selected, PARIS_CLEANWALK_ACTORS)} fr={fr} /> : null}
            <div className="mt-4"><h4 className="text-xs font-black uppercase tracking-wider cmm-text-primary">{text.sources}</h4><ul className="mt-2 space-y-2">{selected.sourceIds.map((id) => sources.find((item) => item.id === id)).filter((item): item is (typeof sources)[number] => Boolean(item)).map((item) => <li key={item.id}><a href={item.url} target="_blank" rel="noreferrer" className="text-xs font-semibold cmm-text-info underline underline-offset-2">{item.label}</a><p className="mt-0.5 text-xs cmm-text-secondary">{item.sourceContentDate ? `${text.sourceUpdated} ${item.sourceContentDate} · ` : ""}{text.verified} {item.verifiedAt} · {text.proof}: {text.evidenceLabels[item.evidence]}</p></li>)}</ul></div>
          </> : <p role="status" className="text-sm cmm-text-primary">{text.noResults}</p>}
        </aside>
      </div>}
      {dataset ? <PublicCleanlinessCoverageTable dataset={dataset} fr={fr} onSelect={nodeId => {
        selectRelatedNode(nodeId);
        detailsRef.current?.focus();
      }} /> : null}
      <p className="mt-5 text-xs leading-5 cmm-text-secondary">{text.footer}</p>
    </section>
  </CmmSectionGroup>;
}
