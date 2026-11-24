"use client";

import { useMemo, useState, type ReactNode } from "react";
import { getArrondissementCityCount, getArrondissementCityOptions, getArrondissementMunicipalLabel, type ArrondissementCity } from "@/lib/geo/paris-arrondissements";
import { CmmSectionGroup } from "@/components/ui/cmm-section";
import { cn } from "@/lib/utils";
import {
  filterPublicCleanlinessNodes,
  getPublicCleanlinessCityDataset,
  type PublicCleanlinessFilters,
  type PublicCleanlinessOrganizationNode,
  type PublicCleanlinessOrganizationRelation,
} from "@/lib/partners/public-cleanliness-organization";

const SERVICE_LABELS: Record<PublicCleanlinessOrganizationNode["service"] | "all", string> = {
  all: "Tous les services", governance: "Gouvernance", cleaning: "Nettoiement", collection: "Collecte",
  emergency: "Urgence Propreté", prevention: "Prévention et tri", coordination: "Coordination territoriale",
  police: "Police municipale et prévention", provider: "Traitement et prestataires",
};

function nodeStatusLabel(status: PublicCleanlinessOrganizationNode["assignment"]): string {
  return status === "confirmed" ? "Organisation ou métier documenté" : status === "historical" ? "Structure ou poste décrit par une source historique" : "Affectation inconnue";
}

function relationKindLabel(kind: PublicCleanlinessOrganizationRelation["kind"]): string {
  return kind === "hierarchy" ? "rattachement hiérarchique" : kind === "coordination" ? "coordination fonctionnelle" : kind === "programme" ? "programme" : "prestation ou service";
}

function relationStatusLabel(status: PublicCleanlinessOrganizationRelation["status"]): string {
  return status === "confirmed" ? "confirmé par la source" : status === "historical" ? "historique à la date de la source" : "inconnu";
}

export function PublicCleanlinessOrganization({ fr = true }: { fr?: boolean }) {
  const [filters, setFilters] = useState<PublicCleanlinessFilters>({ city: "Paris", arrondissement: null, service: "all", query: "" });
  const [selectedId, setSelectedId] = useState("dpe");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const cityOptions = getArrondissementCityOptions();
  const dataset = getPublicCleanlinessCityDataset(filters.city);
  const visibleNodes = useMemo(() => filterPublicCleanlinessNodes(filters), [filters]);
  const visibleIds = new Set(visibleNodes.map((node) => node.id));
  const nodes = dataset?.nodes ?? [];
  const relations = dataset?.relations ?? [];
  const sources = dataset?.sources ?? [];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const childrenById = new Map<string, string[]>();
  for (const relation of relations.filter((edge) => edge.kind === "hierarchy")) {
    const children = childrenById.get(relation.from) ?? [];
    children.push(relation.to);
    childrenById.set(relation.from, children);
  }
  const includedIds = new Set(visibleIds);
  for (const id of visibleIds) {
    let current = id;
    const traversed = new Set<string>();
    while (!traversed.has(current)) {
      traversed.add(current);
      const parent = relations.find((edge) => edge.kind === "hierarchy" && edge.to === current)?.from;
      if (!parent) break;
      includedIds.add(parent);
      current = parent;
    }
  }
  const keepForTree = (id: string): boolean => {
    return includedIds.has(id);
  };
  const roots = nodes.filter((node) => !relations.some((edge) => edge.kind === "hierarchy" && edge.to === node.id) && keepForTree(node.id));
  const selected = nodeById.get(selectedId);
  const selectedRelations = relations.filter((edge) => edge.from === selectedId || edge.to === selectedId);

  const updateFilter = <K extends keyof PublicCleanlinessFilters>(key: K, value: PublicCleanlinessFilters[K]) => setFilters((current) => ({ ...current, [key]: value }));
  const renderNode = (node: PublicCleanlinessOrganizationNode, depth: number): ReactNode => {
    const children = (childrenById.get(node.id) ?? []).filter(keepForTree).map((id) => nodeById.get(id)).filter((value): value is PublicCleanlinessOrganizationNode => Boolean(value));
    const isCollapsed = collapsed[node.id] ?? false;
    return <li key={node.id}>
      <div className="flex items-start gap-2" style={{ marginInlineStart: `${Math.min(depth, 8) * 1.25}rem` }}>
        {children.length > 0 ? <button type="button" aria-label={`${isCollapsed ? "Déplier" : "Replier"} ${node.name}`} aria-expanded={!isCollapsed} aria-controls={`org-children-${node.id}`} onClick={() => setCollapsed((current) => ({ ...current, [node.id]: !isCollapsed }))} className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/15 text-slate-200 hover:bg-white/10">{isCollapsed ? "+" : "−"}</button> : <span className="mt-1 inline-block h-7 w-7 shrink-0" aria-hidden="true" />}
        <button type="button" aria-current={selectedId === node.id ? "true" : undefined} onClick={() => setSelectedId(node.id)} className={cn("min-w-0 flex-1 rounded-xl border px-3 py-2 text-left transition", selectedId === node.id ? "border-violet-300/60 bg-violet-400/15" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.08]")}>
          <span className="flex flex-wrap items-center gap-2"><span className="font-bold text-white">{node.name}</span><span className="rounded-full border border-white/15 px-2 py-0.5 text-xs text-slate-300">{node.kind}</span><span className={cn("rounded-full px-2 py-0.5 text-xs", node.assignment === "confirmed" ? "bg-emerald-400/10 text-emerald-200" : node.assignment === "historical" ? "bg-amber-400/10 text-amber-200" : "bg-slate-400/10 text-slate-300")}>{nodeStatusLabel(node.assignment)}</span></span>
        </button>
      </div>
      {children.length > 0 && !isCollapsed ? <ul id={`org-children-${node.id}`} className="mt-2 list-none space-y-2">{children.map((child) => renderNode(child, depth + 1))}</ul> : null}
    </li>;
  };

  return <CmmSectionGroup>
    <section data-testid="public-cleanliness-organization" aria-labelledby="public-cleanliness-heading" className="rounded-3xl border border-sky-300/15 bg-slate-950/50 p-5 md:p-8">
      <div className="mb-6 max-w-3xl space-y-3">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-200">Référentiel institutionnel sourcé · Paris documenté en premier</p>
        <h2 id="public-cleanliness-heading" className="text-3xl font-black text-white">{fr ? "Organisation des services publics" : "Public service organization"}</h2>
        <p className="text-sm leading-6 text-slate-300">{fr ? "Cette vue décrit des organisations, des métiers et des liens documentés. Elle n&apos;affiche ni effectifs inventés, ni partenariat CleanMyMap, ni mandat municipal." : "This view describes sourced organizations, occupations and relationships. It does not imply CleanMyMap partnerships, staffing numbers or municipal mandates."}</p>
      </div>
      <div className="mb-5 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-xs leading-5 text-slate-300 md:grid-cols-2">
        <p><strong className="text-white">Types :</strong> organisation et unité administrative ; poste/fonction, métier, équipe et personne sont des catégories distinctes. Les agents de terrain sont regroupés collectivement.</p>
        <p><strong className="text-white">Périmètre :</strong> l&apos;employeur/rattachement est indiqué séparément du territoire d&apos;intervention. Une unité mutualisée n&apos;apparaît qu&apos;une fois avec plusieurs territoires.</p>
        <p><strong className="text-white">Relations :</strong> hiérarchie, coordination fonctionnelle, programme et prestation ont des libellés séparés ; coordination et prestation ne créent pas de hiérarchie.</p>
        <p><strong className="text-white">Preuve :</strong> organisation documentée, structure historique ou affectation inconnue sont affichées séparément. Une offre d&apos;emploi n&apos;établit jamais qui occupe le poste aujourd&apos;hui.</p>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-bold text-slate-300">Ville<select aria-label="Sélectionner une ville" value={filters.city} onChange={(event) => setFilters((current) => ({ ...current, city: event.target.value, arrondissement: null }))} className="mt-1 block w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white">{cityOptions.map((city) => <option key={city.value} value={city.value}>{city.label}</option>)}</select></label>
        <label className="text-xs font-bold text-slate-300">Arrondissement<select aria-label="Filtrer par arrondissement" value={filters.arrondissement ?? ""} onChange={(event) => updateFilter("arrondissement", event.target.value ? Number(event.target.value) : null)} className="mt-1 block w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"><option value="">Tous</option>{Array.from({ length: getArrondissementCityCount(filters.city as ArrondissementCity) }, (_, index) => index + 1).map((n) => <option key={n} value={n}>{getArrondissementMunicipalLabel(filters.city as ArrondissementCity, n)}</option>)}</select></label>
        <label className="text-xs font-bold text-slate-300">Service<select aria-label="Filtrer par service" value={filters.service} onChange={(event) => updateFilter("service", event.target.value as PublicCleanlinessFilters["service"])} className="mt-1 block w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white">{Object.entries(SERVICE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-xs font-bold text-slate-300">Recherche<input type="search" aria-label="Rechercher dans l&apos;organigramme" value={filters.query} onChange={(event) => updateFilter("query", event.target.value)} placeholder="DPE, REQ, division…" className="mt-1 block w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500" /></label>
      </div>

      {!dataset ? <p role="status" className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm text-amber-100">Aucun référentiel institutionnel n&apos;a encore été validé pour {filters.city}. Le moteur accepte d&apos;autres villes ; leurs données doivent être documentées avant affichage.</p> : <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
        <div className="min-w-0 overflow-x-auto rounded-2xl border border-white/10 p-3 md:p-4">
          {roots.length ? <ul aria-label="Arborescence des services publics de propreté" className="min-w-[34rem] list-none space-y-2">{roots.map((root) => renderNode(root, 0))}</ul> : <p role="status" className="p-5 text-sm text-slate-300">Aucune fiche ne correspond aux filtres. Les affectations non établies restent indiquées comme inconnues.</p>}
        </div>
        <aside aria-live="polite" aria-label="Fiche détaillée" className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          {selected ? <>
            <p className="text-xs font-black uppercase tracking-widest text-sky-200">Fiche détaillée · {selected.kind}</p>
            <h3 className="mt-2 text-xl font-black text-white">{selected.name}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">{selected.description}</p>
            <p className="mt-3 text-xs font-bold text-slate-200">État : {nodeStatusLabel(selected.assignment)}</p>
            {selected.territoryIds.length ? <p className="mt-2 text-xs text-slate-300">Territoires : {selected.territoryIds.map((id) => id.replace("Paris:", "Paris ")).join(", ")}</p> : <p className="mt-2 text-xs text-slate-300">Territoire d&apos;affectation : inconnu</p>}
            {selected.employerId ? <p className="mt-2 text-xs text-slate-300">Employeur/rattachement de référence : {nodeById.get(selected.employerId)?.name ?? "inconnu"}</p> : null}
            {selected.directoryId ? <p className="mt-2 text-xs text-slate-300">Identifiant réutilisé de l&apos;annuaire : <code>{selected.directoryId}</code></p> : null}
            {selectedRelations.length ? <div className="mt-4"><h4 className="text-xs font-black uppercase tracking-wider text-slate-200">Relations documentées</h4><ul className="mt-2 space-y-2">{selectedRelations.map((edge) => <li key={edge.id} className="text-xs text-slate-300">{relationKindLabel(edge.kind)} : {nodeById.get(edge.from)?.name} → {nodeById.get(edge.to)?.name} <span className="text-slate-400">({relationStatusLabel(edge.status)})</span></li>)}</ul></div> : null}
            <div className="mt-4"><h4 className="text-xs font-black uppercase tracking-wider text-slate-200">Sources et preuve</h4><ul className="mt-2 space-y-2">{selected.sourceIds.map((id) => sources.find((item) => item.id === id)).filter((item): item is (typeof sources)[number] => Boolean(item)).map((item) => <li key={item.id}><a href={item.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-sky-200 underline underline-offset-2">{item.label}</a><p className="mt-0.5 text-xs text-slate-400">{item.sourceContentDate ? `Mise à jour publiée le ${item.sourceContentDate} · ` : ""}consulté le {item.verifiedAt} · preuve : {item.evidence}</p></li>)}</ul></div>
          </> : null}
        </aside>
      </div>}
      <p className="mt-5 text-xs leading-5 text-slate-400">Les divisions mutualisées apparaissent une fois avec plusieurs territoires. Les relations « coordination », « programme » et « prestation » ne sont pas des rattachements hiérarchiques. Sources vérifiées le 24 novembre 2026 ; une fiche de poste décrit un poste et ne prouve pas son titulaire actuel.</p>
    </section>
  </CmmSectionGroup>;
}
