"use client";
import { useMemo } from "react";
import { LayoutGrid, List } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmField } from "@/components/ui/cmm-field";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { PARIS_ARRONDISSEMENTS, type ParisArrondissement } from "@/lib/geo/paris-arrondissements";
import { PARTICIPATION_MODALITY_LABELS } from "@/lib/partners/paris-cleanwalk-network";
import type { CanonicalPublicEntityRef } from "@/lib/partners/public-entity-projection";
import { ACTOR_CARDS_PAGE_SIZE, CONTRIBUTION_FILTERS, ENGAGEMENT_DOMAIN_FILTERS, type ZoneFilter, type EngagementDomainFilter, type ContributionType } from "./annuaire-filters";
import { CATALOG_FAMILIES, DEFAULT_CATALOG_PREFERENCES, buildAnnuaireCatalog, filterAnnuaireCatalog, type CatalogPreferences } from "./annuaire-catalog.model";
import { AnnuairePartnerList } from "./annuaire-partner-list";
import { PUBLIC_WASTE_CHAIN_STAGES } from "./public-waste-chain.model";
import type { AnnuaireLogic } from "./use-annuaire-logic";

type Props={logic:AnnuaireLogic;fr:boolean;preferences:CatalogPreferences;onPreferences:(value:CatalogPreferences)=>void;onOpenProfile:(ref:CanonicalPublicEntityRef)=>void;onMap:(id:string)=>void;onInstitution:(id:string)=>void};

export function AnnuaireDirectoryCatalog({logic,fr,preferences:prefs,onPreferences,onOpenProfile,onMap,onInstitution}:Props){
  const {enrichedEntries,targetArrondissement,searchTerm,setSearchTerm,engagementDomain,setEngagementDomain,filterContribution,setFilterContribution,zoneFilter,setZoneFilter,actorCardsPage,setActorCardsPage,resetFilters}=logic;
  const catalog=useMemo(()=>buildAnnuaireCatalog(enrichedEntries,targetArrondissement),[enrichedEntries,targetArrondissement]);
  const filtered=useMemo(()=>filterAnnuaireCatalog(catalog.rows,{searchTerm,engagementDomain,filterContribution,zoneFilter,targetArrondissement},prefs,fr?"fr":"en"),[catalog,searchTerm,engagementDomain,filterContribution,zoneFilter,targetArrondissement,prefs,fr]);
  const totalPages=Math.ceil(filtered.length/ACTOR_CARDS_PAGE_SIZE);
  const page=Math.max(1,Math.min(actorCardsPage,totalPages||1));
  const set=<K extends keyof CatalogPreferences,>(key:K,value:CatalogPreferences[K])=>{onPreferences({...prefs,[key]:value});if(key!=="layout")setActorCardsPage(1);};
  const reset=()=>{resetFilters();onPreferences({...DEFAULT_CATALOG_PREFERENCES,layout:prefs.layout});};
  const hasFilter=searchTerm!==""||engagementDomain!=="all"||filterContribution!=="all"||zoneFilter!=="all"||prefs.family!=="all"||prefs.origin!=="all"||prefs.scope!=="all"||prefs.participation!=="all"||prefs.stage!=="all"||prefs.relation!=="all";
  return <div data-testid="annuaire-catalog" className="min-w-0 space-y-4">
    <CmmCard tone="slate" variant="outlined" className="space-y-3">
      <CmmField label={fr?"Rechercher une structure":"Search for an organization"}>
        <input type="search" className="cmm-input w-full" placeholder={fr?"Nom, activité, compétence, territoire...":"Name, activity, service, territory..."} value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
      </CmmField>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <CmmField label={fr?"Type de structure":"Structure type"}><select className="cmm-input w-full" value={prefs.family} onChange={e=>set("family",e.target.value as CatalogPreferences["family"])}><option value="all">{fr?"Toutes les structures":"All organizations"}</option>{Object.entries(CATALOG_FAMILIES).map(([id,label])=><option key={id} value={id}>{label[fr?0:1]}</option>)}</select></CmmField>
        <CmmField label={fr?"Domaine d'engagement":"Engagement domain"}><select className="cmm-input w-full" value={engagementDomain} onChange={e=>{setEngagementDomain(e.target.value as EngagementDomainFilter);setActorCardsPage(1);}}>{ENGAGEMENT_DOMAIN_FILTERS.map(option=><option key={option.value} value={option.value}>{fr?option.label:option.englishLabel}</option>)}</select></CmmField>
        <CmmField label={fr?"Arrondissement couvert":"District covered"}><select className="cmm-input w-full" value={String(zoneFilter)} onChange={e=>{const value=e.target.value;setZoneFilter(value==="all"||value==="nearby"?value as ZoneFilter:Number(value) as ParisArrondissement);setActorCardsPage(1);}}><option value="all">{fr?"Tous les territoires":"All territories"}</option>{targetArrondissement?<option value="nearby">{fr?"Proches de mon arrondissement":"Near my district"}</option>:null}{PARIS_ARRONDISSEMENTS.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></CmmField>
      </div>
      <CmmDisclosure size="sm" summary={fr?"Filtres supplémentaires":"More filters"}>
        <div className="grid gap-3 pt-3 sm:grid-cols-2 lg:grid-cols-3">
          <CmmField label={fr?"Portée documentée":"Documented scope"}><select className="cmm-input w-full" value={prefs.scope} onChange={e=>set("scope",e.target.value as CatalogPreferences["scope"])}><option value="all">{fr?"Toutes":"All"}</option><option value="paris">Paris</option><option value="regional">Île-de-France</option><option value="national">{fr?"Nationale":"National"}</option><option value="unknown">{fr?"Non renseignée":"Not provided"}</option></select></CmmField>
          <CmmField label={fr?"Contributions déclarées ou repérées":"Declared or documented contributions"}><select className="cmm-input w-full" value={filterContribution} onChange={e=>{setFilterContribution(e.target.value as ContributionType|"all");setActorCardsPage(1);}}>{CONTRIBUTION_FILTERS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></CmmField>
          <CmmField label={fr?"Filière de déchets":"Waste stream"}><select className="cmm-input w-full" value={prefs.stage} onChange={e=>set("stage",e.target.value as CatalogPreferences["stage"])}><option value="all">{fr?"Toutes":"All"}</option>{PUBLIC_WASTE_CHAIN_STAGES.map(stage=><option key={stage.id} value={stage.id}>{stage.label[fr?0:1]}</option>)}</select></CmmField>
          <CmmField label={fr?"Modalités de participation":"Participation"}><select className="cmm-input w-full" value={prefs.participation} onChange={e=>set("participation",e.target.value as CatalogPreferences["participation"])}><option value="all">{fr?"Toutes":"All"}</option>{Object.entries(PARTICIPATION_MODALITY_LABELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></CmmField>
          <CmmField label={fr?"Relation avec CleanMyMap":"Relationship with CleanMyMap"} hint={fr?"Uniquement les preuves publiques vérifiées du registre ; absence de résultat ne signifie pas absence de relation.":"Only verified public registry evidence; no result does not prove no relationship."}><select className="cmm-input w-full" value={prefs.relation} onChange={e=>set("relation",e.target.value as CatalogPreferences["relation"])}><option value="all">{fr?"Toutes":"All"}</option><option value="support">{fr?"Soutien documenté":"Documented support"}</option><option value="collaboration">{fr?"Collaboration documentée":"Documented collaboration"}</option><option value="contribution">{fr?"Opération commune prouvée":"Proven joint operation"}</option></select></CmmField>
        </div>
      </CmmDisclosure>
      <div role="group" aria-label={fr?"Sélection des fiches":"Profile selection"} className="flex flex-wrap gap-2">{([["all","Toutes","All"],["featured","À la une","Featured"],["published","Fiches publiées","Published profiles"],["editorial","Ressources éditoriales","Editorial resources"]] as const).map(([value,label,en])=><CmmButton key={value} type="button" size="sm" tone={prefs.origin===value?"primary":"tertiary"} variant="pill" ariaPressed={prefs.origin===value} onClick={()=>set("origin",value)}>{fr?label:en}</CmmButton>)}</div>
      {hasFilter?<CmmButton type="button" size="sm" tone="tertiary" variant="ghost" onClick={reset}>{fr?"Réinitialiser les filtres":"Reset filters"}</CmmButton>:null}
    </CmmCard>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p role="status" aria-live="polite" className="text-sm font-semibold cmm-text-primary">{filtered.length} / {catalog.rows.length} {fr?"structures référencées":"listed organizations"}</p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs cmm-text-secondary">{fr?"Trier par":"Sort by"}<select className="cmm-input" value={prefs.sort} onChange={e=>set("sort",e.target.value as CatalogPreferences["sort"])}><option value="relevance">{fr?"Pertinence":"Relevance"}</option><option value="name">{fr?"Nom (A-Z)":"Name (A-Z)"}</option>{targetArrondissement?<option value="distance">{fr?"Distance à mon arrondissement":"Distance to my district"}</option>:null}<option value="connections">{fr?"Voisins documentés":"Documented neighbours"}</option></select></label>
        <div role="group" aria-label={fr?"Mode de présentation":"Display mode"} className="flex gap-1">
          <CmmButton type="button" tone={prefs.layout==="grid"?"primary":"tertiary"} size="sm" ariaLabel={fr?"Grille":"Grid"} ariaPressed={prefs.layout==="grid"} onClick={()=>set("layout","grid")}><LayoutGrid size={17} aria-hidden="true"/></CmmButton>
          <CmmButton type="button" tone={prefs.layout==="list"?"primary":"tertiary"} size="sm" ariaLabel={fr?"Liste":"List"} ariaPressed={prefs.layout==="list"} onClick={()=>set("layout","list")}><List size={17} aria-hidden="true"/></CmmButton>
        </div>
      </div>
    </div>
    {catalog.unresolved?<p role="status" className="text-xs cmm-text-warning">{fr?"Certaines correspondances d'identité ne sont pas établies. Le catalogue peut être partiel.":"Some identity links are unresolved. The catalogue may be incomplete."}</p>:null}
    {filtered.length?<AnnuairePartnerList fr={fr} rows={filtered.slice((page-1)*ACTOR_CARDS_PAGE_SIZE,page*ACTOR_CARDS_PAGE_SIZE)} currentPage={page} totalPages={totalPages} onPageChange={setActorCardsPage} onFocusMap={onMap} onOpenProfile={onOpenProfile} onOpenInstitution={onInstitution} layout={prefs.layout}/>:<CmmCard tone="slate" variant="outlined"><p className="cmm-text-primary">{fr?"Aucune structure ne correspond aux filtres.":"No organization matches the filters."}</p><CmmButton type="button" tone="secondary" onClick={reset}>{fr?"Réinitialiser":"Reset"}</CmmButton></CmmCard>}
  </div>;
}
