import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { INITIAL_ANNUAIRE_ENTRIES } from "./seed-index";
import { buildAnnuaireCatalog, type CatalogRow } from "./annuaire-catalog.model";
import { AnnuaireActorCard } from "./annuaire-actor-card";
const entries=INITIAL_ANNUAIRE_ENTRIES.map(entry=>({...entry,distanceKm:null}));
const render=(row:CatalogRow)=>renderToStaticMarkup(<AnnuaireActorCard row={row} fr onOpen={vi.fn()} onMap={vi.fn()} onInstitution={vi.fn()}/>);

describe("compact catalogue card",()=>{
  it("renders a neutral card and source qualification instead of internal identifiers or trust claims",()=>{
    const {rows}=buildAnnuaireCatalog(entries,null);
    const row=rows.find(item=>item.projection.identity.annuaireEntryId===entries[0].id)!;
    const markup=render(row);
    expect(markup).toContain('data-cmm-card-tone="slate"');
    expect(markup).toContain('data-cmm-card-variant="outlined"');
    expect(markup).toContain("Ressource éditoriale");
    expect(markup).toContain("Consulter la fiche");
    expect(markup).not.toMatch(/CERTIFIÉ|Partenaire actif|Dernière action|ID:|Disponibilité déclarée/);
  });
  it("always opens a fiche without offering a fictitious localization",()=>{
    const {rows}=buildAnnuaireCatalog(entries,null);
    const row=rows.find(item=>!item.canLocate&&item.mapId!==null)!;
    const markup=render(row);
    expect(markup).toContain("Consulter la fiche");
    expect(markup).toContain("Explorer le réseau de");
    expect(markup).not.toMatch(/aria-label="Localiser |Position indisponible/);
  });
  it("offers the existing institution action to a shared network identity",()=>{
    const {rows}=buildAnnuaireCatalog(entries,null);
    const row=rows.find(item=>item.projection.identity.institutionId==="syctom")!;
    const markup=render(row);
    expect(markup).toContain("Voir dans les services publics");
    expect(markup).toContain("Explorer le réseau de");
  });
});
