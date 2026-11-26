// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach,describe,expect,it,vi } from "vitest";
import { INITIAL_ANNUAIRE_ENTRIES } from "./seed-index";
import { AnnuaireDirectoryCatalog } from "./annuaire-directory-catalog";
import { DEFAULT_CATALOG_PREFERENCES, type CatalogPreferences } from "./annuaire-catalog.model";
import type { AnnuaireLogic } from "./use-annuaire-logic";
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const entries=INITIAL_ANNUAIRE_ENTRIES.map(entry=>({...entry,distanceKm:null}));
let host:HTMLDivElement|null=null, root:Root|null=null;
afterEach(()=>{act(()=>root?.unmount());host?.remove();root=null;host=null;});
function Harness({onOpen=vi.fn(),onMap=vi.fn(),onInstitution=vi.fn()}={}){
  const [prefs,setPrefs]=React.useState<CatalogPreferences>(DEFAULT_CATALOG_PREFERENCES);
  const [filters,setFilters]=React.useState({searchTerm:"",engagementDomain:"all" as AnnuaireLogic["engagementDomain"],filterContribution:"all" as AnnuaireLogic["filterContribution"],zoneFilter:"all" as AnnuaireLogic["zoneFilter"],actorCardsPage:1});
  const logic={...filters,enrichedEntries:entries,targetArrondissement:5,setSearchTerm:(searchTerm:string)=>setFilters(old=>({...old,searchTerm,actorCardsPage:1})),setEngagementDomain:(engagementDomain:AnnuaireLogic["engagementDomain"])=>setFilters(old=>({...old,engagementDomain})),setFilterContribution:(filterContribution:AnnuaireLogic["filterContribution"])=>setFilters(old=>({...old,filterContribution})),setZoneFilter:(zoneFilter:AnnuaireLogic["zoneFilter"])=>setFilters(old=>({...old,zoneFilter})),setActorCardsPage:(actorCardsPage:number)=>setFilters(old=>({...old,actorCardsPage})),resetFilters:()=>setFilters({searchTerm:"",engagementDomain:"all",filterContribution:"all",zoneFilter:"all",actorCardsPage:1})} as unknown as AnnuaireLogic;
  return <AnnuaireDirectoryCatalog fr logic={logic} preferences={prefs} onPreferences={setPrefs} onOpenProfile={onOpen} onMap={onMap} onInstitution={onInstitution}/>;
}
function mount(element:React.ReactElement){host=document.createElement("div");document.body.append(host);root=createRoot(host);act(()=>root?.render(element));return host;}
function click(container:HTMLElement,label:string){const button=[...container.querySelectorAll("button")].find(el=>el.getAttribute("aria-label")===label||el.textContent?.trim()===label);expect(button).toBeDefined();act(()=>button?.click());}
function change(input:HTMLInputElement|HTMLSelectElement,value:string){const prototype=input instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;act(()=>{Object.getOwnPropertyDescriptor(prototype,"value")?.set?.call(input,value);input.dispatchEvent(new Event(input instanceof HTMLSelectElement?"change":"input",{bubbles:true}));});}

describe("directory search and display",()=>{
  it("keeps search above a single grid and uses featured as a filter rather than a duplicate section",()=>{
    const el=mount(<Harness/>);
    const search=el.querySelector('input[type="search"]')!;
    const row=el.querySelector("[data-catalog-key]")!;
    expect(search.compareDocumentPosition(row)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(el.querySelectorAll('input[type="search"]')).toHaveLength(1);
    click(el,"À la une");
    expect(el.querySelectorAll('[data-catalog-key]').length).toBeGreaterThan(0);
    for(const item of el.querySelectorAll('[data-catalog-key]'))expect(item.textContent).toContain("À la une");
    expect(new Set([...el.querySelectorAll('[data-catalog-key]')].map(item=>item.getAttribute("data-catalog-key"))).size).toBe(el.querySelectorAll('[data-catalog-key]').length);
    click(el,"Liste");
    expect(el.querySelector('button[aria-label="Liste"]')?.getAttribute("aria-pressed")).toBe("true");
  });
  it("searches network-only identities, opens canonical references, and navigates explicitly to the map and institution",()=>{
    const onOpen=vi.fn(),onMap=vi.fn(),onInstitution=vi.fn();
    const el=mount(<Harness onOpen={onOpen} onMap={onMap} onInstitution={onInstitution}/>);
    change(el.querySelector('input[type="search"]') as HTMLInputElement,"Syctom");
    const row=el.querySelector('[data-catalog-key="network:collectivite-syctom"]') as HTMLElement;
    expect(row).toBeTruthy();
    click(row,"Consulter la fiche");
    expect(onOpen).toHaveBeenCalledWith({networkActorId:"collectivite-syctom"});
    const map=row.querySelector('button[aria-label^="Explorer le réseau"]') as HTMLButtonElement;
    act(()=>map.click());
    expect(onMap).toHaveBeenCalledWith("collectivite-syctom");
    const institution=row.querySelector('button[aria-label^="Voir dans les services publics"]') as HTMLButtonElement;
    act(()=>institution.click());
    expect(onInstitution).toHaveBeenCalledWith("syctom");
    change(el.querySelector('input[type="search"]') as HTMLInputElement,"impossible-zzzz-xyz");
    expect(el.querySelectorAll('[data-catalog-key]')).toHaveLength(0);
    expect(el.textContent).toContain("Aucune structure ne correspond");
    click(el,"Réinitialiser");
    expect(el.querySelectorAll('[data-catalog-key]').length).toBeGreaterThan(0);
  });
});
