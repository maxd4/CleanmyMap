import { describe, expect, it } from "vitest";
import { INITIAL_ANNUAIRE_ENTRIES } from "./seed-index";
import { PARIS_CLEANWALK_ACTORS } from "@/lib/partners/paris-cleanwalk-network";
import { PARIS_PUBLIC_CLEANLINESS_DATASET } from "@/lib/partners/public-cleanliness-organization";
import type { EnrichedAnnuaireEntry } from "./annuaire-helpers";
import { buildAnnuaireCatalog, filterAnnuaireCatalog, isCatalogInstitution, DEFAULT_CATALOG_PREFERENCES } from "./annuaire-catalog.model";

const entries:EnrichedAnnuaireEntry[]=INITIAL_ANNUAIRE_ENTRIES.map(entry=>({...entry,distanceKm:null}));
const filters={searchTerm:"",engagementDomain:"all",filterContribution:"all",zoneFilter:"all",targetArrondissement:null} as const;

describe("canonical organization catalogue",()=>{
  it("covers the three public registries once per explicit identity",()=>{
    const {rows,unresolved}=buildAnnuaireCatalog(entries,null);
    expect(unresolved).toBe(0);
    expect(new Set(rows.map(row=>row.key)).size).toBe(rows.length);
    for(const entry of entries) expect(rows.filter(row=>row.projection.identity.annuaireEntryId===entry.id)).toHaveLength(1);
    for(const actor of PARIS_CLEANWALK_ACTORS) expect(rows.filter(row=>row.projection.identity.networkActorId===actor.id)).toHaveLength(1);
    for(const node of PARIS_PUBLIC_CLEANLINESS_DATASET.nodes.filter(isCatalogInstitution)) expect(rows.filter(row=>row.projection.identity.institutionId===node.id)).toHaveLength(1);
    expect(rows.some(row=>row.projection.institution?.kind==="person"||row.projection.institution?.kind==="profession"||row.projection.institution?.kind==="position")).toBe(false);
    expect(rows.filter(row=>row.projection.identity.institutionId==="syctom")).toHaveLength(1);
    expect(rows.find(row=>row.projection.identity.institutionId==="syctom")?.projection.identity.networkActorId).toBe("collectivite-syctom");
  });
  it("keeps publication identities and confidentiality distinct, even for identical names",()=>{
    const published:EnrichedAnnuaireEntry={id:"onboarded-catalog-fixture",name:entries[0].name,legalIdentity:"Association",kind:"association",types:[],description:"Déclaration publique",location:"Paris",scope:"local",lat:null,lng:null,coordinatesSource:"derived_coverage",coveredArrondissements:[5],contributionTypes:["materiel"],provenance:"published_partner",verificationStatus:"en_cours",qualificationStatus:"contact_non_qualifie",availability:"Sur demande",lastUpdatedAt:"2026-11-25T00:00:00Z",internalAdminContact:{referentName:"PRIVATE_CONTACT_SENTINEL",email:"private@example.invalid",phone:"PRIVATE_PHONE_SENTINEL"},distanceKm:null};
    const {rows}=buildAnnuaireCatalog([...entries,published],5);
    const found=rows.find(row=>row.projection.identity.annuaireEntryId===published.id)!;
    expect(found.published).toBe(true);
    expect(found.canLocate).toBe(false);
    expect(found.distanceKm).toBeNull();
    expect(found.projection.identity.networkActorId).toBeNull();
    expect(rows.filter(row=>row.projection.identity.name===published.name).length).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(found)).not.toMatch(/PRIVATE_CONTACT_SENTINEL|PRIVATE_PHONE_SENTINEL|private@example.invalid/);
    expect(filterAnnuaireCatalog(rows,filters,{...DEFAULT_CATALOG_PREFERENCES,origin:"published"},"fr").map(row=>row.key)).toEqual([found.key]);
  });
  it("uses real service, actor and evidence filters and never promotes featured resources",()=>{
    const {rows}=buildAnnuaireCatalog(entries,null);
    const featured=filterAnnuaireCatalog(rows,filters,{...DEFAULT_CATALOG_PREFERENCES,origin:"featured"},"fr");
    expect(featured.map(row=>row.key).sort()).toEqual(rows.filter(row=>row.featured).map(row=>row.key).sort());
    expect(featured.every(row=>!row.published)).toBe(true);
    const transport=filterAnnuaireCatalog(rows,filters,{...DEFAULT_CATALOG_PREFERENCES,stage:"transport"},"fr");
    expect(transport.some(row=>row.projection.identity.institutionId==="operator-ckfd")).toBe(true);
    const eco=filterAnnuaireCatalog(rows,filters,{...DEFAULT_CATALOG_PREFERENCES,family:"eco_organisme"},"fr");
    expect(eco.map(row=>row.projection.identity.institutionId).sort()).toEqual(["asso-megots-alcome","eco-organisme-citeo"]);
    const syctom=filterAnnuaireCatalog(rows,{...filters,searchTerm:"syctom"},{...DEFAULT_CATALOG_PREFERENCES},"fr");
    expect(syctom.some(row=>row.projection.identity.networkActorId==="collectivite-syctom")).toBe(true);
    for(const row of filterAnnuaireCatalog(rows,filters,{...DEFAULT_CATALOG_PREFERENCES,relation:"contribution"},"fr")){
      expect(row.projection.relations.some(edge=>edge.relationType==="action_commune"&&edge.source.certainty==="verifie"&&Boolean(edge.operations?.length)&&(edge.sourceId==="cleanmymap"||edge.targetId==="cleanmymap"))).toBe(true);
    }
  });
  it("sorts verified locations ahead of unknowns and uses a stable alphabetical tie breaker",()=>{
    const {rows}=buildAnnuaireCatalog(entries,5);
    const sorted=filterAnnuaireCatalog(rows,filters,{...DEFAULT_CATALOG_PREFERENCES,sort:"distance"},"fr");
    expect(sorted.some(row=>row.distanceKm!==null)).toBe(true);
    const distances=sorted.map(row=>row.distanceKm??Infinity);
    expect(distances.every((distance,i)=>i===0||distance>=distances[i-1])).toBe(true);
    const alphabetical=filterAnnuaireCatalog(rows,filters,{...DEFAULT_CATALOG_PREFERENCES,sort:"name"},"fr");
    expect(alphabetical.every((row,i)=>i===0||alphabetical[i-1].projection.identity.name.localeCompare(row.projection.identity.name,"fr")<=0)).toBe(true);
  });
});
