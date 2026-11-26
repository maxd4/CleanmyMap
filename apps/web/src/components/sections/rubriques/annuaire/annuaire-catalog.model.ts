import { projectPublicEntity, type CanonicalPublicEntityRef, type CanonicalPublicEntityProjection } from "@/lib/partners/public-entity-projection";
import { PARIS_CLEANWALK_ACTORS, isSafeHttpUrl, isPrivateOrUnauthorizedInviteUrl, type ParticipationModality } from "@/lib/partners/paris-cleanwalk-network";
import { PARIS_PUBLIC_CLEANLINESS_DATASET, type PublicCleanlinessOrganizationNode } from "@/lib/partners/public-cleanliness-organization";
import { distanceToParisArrondissementKm, type ParisArrondissement } from "@/lib/geo/paris-arrondissements";
import { buildGeoNetworkEntities, VERIFIED_PRINCIPAL_LOCATIONS, isInFranceMetropolitaine } from "./annuaire-geo-network.model";
import { getAnnuairePublicDestination, isNationalAnnuaireEntry, matchesAnnuaireEngagementDomain, matchesAnnuaireSearch, normalizeAnnuaireSearchText, tokenizeAnnuaireSearchQuery, formatAnnuaireCoverage, type EnrichedAnnuaireEntry } from "./annuaire-helpers";
import { getNetworkPublicLogo } from "@/lib/partners/public-network-identity-media";
import type { ContributionType, EngagementDomainFilter, ZoneFilter } from "./annuaire-filters";
import { PUBLIC_WASTE_CHAIN_STAGES } from "./public-waste-chain.model";

export const CATALOG_FAMILIES = {
  association:["Association","Association"], collectif:["Collectif","Collective"],
  entreprise:["Entreprise","Company"], commerce:["Commerce","Business"],
  eco_organisme:["Éco-organisme","EPR organization"], provider:["Opérateur / prestataire","Service provider"],
  institution:["Collectivité / institution","Public institution"], public_service:["Service public","Public service"],
  school:["Établissement scolaire","School"], platform:["Plateforme numérique","Digital platform"],
  event:["Programme / réseau événementiel","Event programme / network"],
} as const;
type Family = keyof typeof CATALOG_FAMILIES;
type Origin = "all"|"featured"|"published"|"editorial";
type Scope = "all"|"paris"|"regional"|"national"|"unknown";
type Relation = "all"|"support"|"collaboration"|"contribution";
type Sort = "relevance"|"name"|"distance"|"connections";
type Stage = typeof PUBLIC_WASTE_CHAIN_STAGES[number]["id"];
export type CatalogPreferences = {
  family:Family|"all"; origin:Origin; scope:Scope; participation:ParticipationModality|"all";
  stage:Stage|"all"; relation:Relation; sort:Sort; layout:"grid"|"list";
};
export const DEFAULT_CATALOG_PREFERENCES:CatalogPreferences = {family:"all",origin:"all",scope:"all",participation:"all",stage:"all",relation:"all",sort:"relevance",layout:"grid"};
export type CatalogRow = {
  key:string; ref:CanonicalPublicEntityRef; projection:CanonicalPublicEntityProjection;
  family:Family; featured:boolean; published:boolean; territoryLabel:string; districts:number[];
  scope:Exclude<Scope,"all">; mapId:string|null; canLocate:boolean; distanceKm:number|null;
  neighbourCount:number|null; logo:ReturnType<typeof getNetworkPublicLogo>;
  destination:string|null; summary:string; searchFields:string[];
};
const ECO_ORGANISMS = new Set(["asso-megots-alcome","eco-organisme-citeo"]);

export function isCatalogInstitution(node:PublicCleanlinessOrganizationNode):boolean {
  if (["person","position","profession","team"].includes(node.kind)) return false;
  if(node.id==="private-collectors") return false;
  if(node.kind==="unit") return Boolean(node.publicContact||node.directoryId||node.networkActorId||node.service==="provider");
  return true;
}
function familyOf(p:CanonicalPublicEntityProjection):Family {
  const {publicActor:actor,institution:node,directoryEntry:entry}=p;
  if(ECO_ORGANISMS.has(node?.id??actor?.id??entry?.id??""))return "eco_organisme";
  if(node?.kind==="city"||actor?.category==="collectivite_mairie")return "institution";
  if(node?.kind==="provider")return "provider";
  if(node)return "public_service";
  if(actor?.category==="plateforme_mise_en_relation")return "platform";
  if(actor?.category==="etablissement_enseignement"||entry?.kind==="etablissement_enseignement")return "school";
  if(entry?.kind==="commerce")return "commerce";
  if(entry?.kind==="entreprise"||actor?.category==="entreprise_rse")return "entreprise";
  if(entry?.kind==="groupe_parole")return "collectif";
  if(entry?.kind==="evenement"||actor?.category==="reseau_evenement")return "event";
  return "association";
}
function keyOf(p:CanonicalPublicEntityProjection):string {
  const id=p.identity;
  return id.annuaireEntryId ? "directory:"+id.annuaireEntryId : id.networkActorId ? "network:"+id.networkActorId : "institution:"+id.institutionId;
}
export function resolveCatalogEntity(ref:CanonicalPublicEntityRef, entries:readonly EnrichedAnnuaireEntry[]) {
  const projected=projectPublicEntity(ref);
  const id=ref.annuaireEntryId??projected?.identity.annuaireEntryId;
  const published=id?entries.find(e=>e.id===id&&e.provenance==="published_partner"):undefined;
  return published?.provenance==="published_partner"?projectPublicEntity({...ref,annuaireEntryId:published.id},published):projected;
}
function safeDestination(...urls:(string|undefined|null)[]):string|null {
  return urls.find((url):url is string=>Boolean(url&&isSafeHttpUrl(url)&&!isPrivateOrUnauthorizedInviteUrl(url)))??null;
}

export function buildAnnuaireCatalog(entries:EnrichedAnnuaireEntry[],target:ParisArrondissement|null):{rows:CatalogRow[];unresolved:number} {
  const geos=buildGeoNetworkEntities(entries,entries);
  const projections=new Map<string,{ref:CanonicalPublicEntityRef;p:CanonicalPublicEntityProjection}>();
  let unresolved=0;
  const add=(ref:CanonicalPublicEntityRef)=>{
    const p=resolveCatalogEntity(ref,entries);
    if(!p){unresolved++;return;}
    const key=keyOf(p),previous=projections.get(key);
    if(previous){
      const a=previous.p.identity,b=p.identity;
      if(a.annuaireEntryId!==b.annuaireEntryId||a.networkActorId!==b.networkActorId||a.institutionId!==b.institutionId)unresolved++;
      return;
    }
    projections.set(key,{ref,p});
  };
  entries.forEach(e=>add({annuaireEntryId:e.id}));
  PARIS_CLEANWALK_ACTORS.forEach(a=>add({networkActorId:a.id}));
  PARIS_PUBLIC_CLEANLINESS_DATASET.nodes.filter(isCatalogInstitution).forEach(n=>add({institutionId:n.id}));
  const rows=[...projections.entries()].map(([key,{ref,p}]):CatalogRow=>{
    const {directoryEntry:entry,publicActor:actor,institution:node}=p;
    const geo=geos.find(g=>Boolean((p.identity.annuaireEntryId&&g.annuaireEntryId===p.identity.annuaireEntryId||p.identity.networkActorId&&g.networkActorId===p.identity.networkActorId)&&g.networkActorId===p.identity.networkActorId));
    const national=Boolean(entry&&isNationalAnnuaireEntry(entry));
    const districts=[...new Set([...(entry&&!national?entry.coveredArrondissements:[]),...(actor?.parisZone.arrondissements??[]),...(node?.territoryIds??[]).flatMap(id=>{const m=/^Paris:(\d+)$/.exec(id);return m?[Number(m[1])]:[];})])].sort((a,b)=>a-b);
    const territoryLabel=[entry?formatAnnuaireCoverage(entry):null,actor?.parisZone.label,node?.territoryIds.length?"Paris · "+districts.join(", "):null].filter(Boolean).filter((s,i,a)=>a.indexOf(s)===i).join(" · ");
    const regional=normalizeAnnuaireSearchText(territoryLabel).includes("ile de france");
    const localParis=entry?.scope==="local"&&normalizeAnnuaireSearchText(entry.location).startsWith("paris");
    const scope:CatalogRow["scope"]=national?"national":regional?"regional":districts.length||actor?.parisZone.isIntramuros||localParis?"paris":"unknown";
    const canLocate=Boolean(geo?.coords&&geo.addressStatus!=="contradictory"&&isInFranceMetropolitaine(geo.coords.lat,geo.coords.lng)&&(Object.hasOwn(VERIFIED_PRINCIPAL_LOCATIONS,geo.id)||entry?.coordinatesSource==="verified"));
    const distanceKm=canLocate&&geo?.coords&&target?distanceToParisArrondissementKm(geo.coords.lat,geo.coords.lng,target):null;
    const summary=entry?.description??node?.description??actor?.activities[0]??"";
    const searchFields=[p.identity.name,entry?.name,entry?.legalIdentity,entry?.description,node?.name,node?.description,...(node?.searchTerms??[]),actor?.name,...(actor?.activities??[]),actor?.equipmentAvailability.summary,...(actor?.equipmentAvailability.items??[]),territoryLabel,geo?.publicAddressLabel,entry?.associationProfile?.mission,...(entry?.tags??[]),...(entry?.associationProfile?.recurringNeeds??[])].filter((s):s is string=>typeof s==="string").map(normalizeAnnuaireSearchText);
    return {key,ref,projection:p,family:familyOf(p),featured:Boolean(entry?.isFeatured),published:entry?.provenance==="published_partner",territoryLabel,districts,scope,mapId:geo?.id??null,canLocate,distanceKm,neighbourCount:actor?geo?.indicators.documentedNeighborsCount??null:null,logo:getNetworkPublicLogo(p.identity.networkActorId??p.identity.annuaireEntryId??p.identity.institutionId),destination:safeDestination(entry?getAnnuairePublicDestination(entry)?.url:undefined,actor?.officialWebsite,p.institutionalContact?.url),summary,searchFields};
  });
  return {rows,unresolved};
}
type SharedFilters={searchTerm:string;engagementDomain:EngagementDomainFilter;filterContribution:ContributionType|"all";zoneFilter:ZoneFilter;targetArrondissement:ParisArrondissement|null};
function matchesCleanMyMapRelation(row:CatalogRow,filter:Relation):boolean {
  if(filter==="all")return true;
  if(row.projection.identity.networkActorId==="cleanmymap")return false;
  return row.projection.relations.some(rel=>{
    if(rel.relationType==="collaboration_programmee"||rel.source.certainty!=="verifie")return false;
    if(rel.sourceId!=="cleanmymap"&&rel.targetId!=="cleanmymap")return false;
    if(filter==="support")return rel.relationType==="soutien_rse"&&rel.targetId==="cleanmymap";
    if(filter==="contribution")return rel.relationType==="action_commune"&&Boolean(rel.operations?.length);
    return rel.relationType==="partenariat"||rel.relationType==="action_commune"||rel.relationType==="appui_logistique";
  });
}
function contributionMatches(row:CatalogRow,filter:SharedFilters["filterContribution"]):boolean{
  if(filter==="all")return true;
  const {directoryEntry:entry,publicActor:actor}=row.projection;
  if(entry?.contributionTypes.includes(filter))return true;
  if(filter==="materiel")return actor?.equipmentAvailability.status==="fournit_materiel"&&actor.equipmentAvailability.certainty==="verifie";
  if(filter==="financement")return Boolean(actor?.roles.includes("financeur"));
  if(filter==="communication")return Boolean(actor?.roles.includes("relais"));
  return false;
}
export function filterAnnuaireCatalog(rows:readonly CatalogRow[],shared:SharedFilters,prefs:CatalogPreferences,locale:"fr"|"en"):CatalogRow[]{
  const terms=tokenizeAnnuaireSearchQuery(shared.searchTerm);
  const result=rows.filter(row=>{
    const {directoryEntry:entry,publicActor:actor,institution:node}=row.projection;
    if(terms.length&&!terms.every(term=>row.searchFields.some(field=>field.includes(term))||(entry&&matchesAnnuaireSearch(entry,[term]))))return false;
    if(prefs.family!=="all"&&row.family!==prefs.family)return false;
    if(prefs.origin==="featured"&&!row.featured||prefs.origin==="published"&&!row.published||prefs.origin==="editorial"&&row.published)return false;
    if(prefs.scope!=="all"&&row.scope!==prefs.scope)return false;
    if(shared.engagementDomain!=="all"&&(entry?!matchesAnnuaireEngagementDomain(entry,shared.engagementDomain):shared.engagementDomain!=="unclassified"))return false;
    if(!contributionMatches(row,shared.filterContribution))return false;
    if(shared.zoneFilter==="nearby"&&(shared.targetArrondissement===null||row.scope==="national"||!row.districts.includes(shared.targetArrondissement)&&(row.distanceKm===null||row.distanceKm>4.5)))return false;
    if(typeof shared.zoneFilter==="number"&&!row.districts.includes(shared.zoneFilter))return false;
    if(prefs.participation!=="all"&&!actor?.participationModalities.includes(prefs.participation))return false;
    if(prefs.stage!=="all"&&!PUBLIC_WASTE_CHAIN_STAGES.some(stage=>stage.id===prefs.stage&&node&&stage.ids.some(id=>id===node.id)))return false;
    return matchesCleanMyMapRelation(row,prefs.relation);
  });
  const alpha=(a:CatalogRow,b:CatalogRow)=>a.projection.identity.name.localeCompare(b.projection.identity.name,locale)||a.key.localeCompare(b.key);
  const relevance=(row:CatalogRow)=>terms.length?terms.filter(term=>normalizeAnnuaireSearchText(row.projection.identity.name).includes(term)).length:0;
  return result.sort((a,b)=>{
    if(prefs.sort==="name")return alpha(a,b);
    if(prefs.sort==="distance")return (a.distanceKm??Infinity)-(b.distanceKm??Infinity)||alpha(a,b);
    if(prefs.sort==="connections")return (b.neighbourCount??-1)-(a.neighbourCount??-1)||alpha(a,b);
    return relevance(b)-relevance(a)||Number(b.featured)-Number(a.featured)||alpha(a,b);
  });
}
