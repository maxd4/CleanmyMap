import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
const read=(path:string)=>readFileSync(new URL(path,import.meta.url),"utf8");
describe("Open Data public contract",()=>{
  it("uses the existing bounded API and distinguishes licence and scientific evidence",()=>{
    const section=read("./open-data-section.tsx"),explorer=read("./open-data-explorer.tsx"),model=read("./open-data-research.model.ts");
    expect(section).toContain("<OpenDataExplorer fr={fr}");
    expect(model).toContain("post_action_complete");
    expect(explorer).toContain("sample.isTruncated");
    expect(section).toContain("licence AGPL concerne le code");
    expect(section).not.toMatch(/Swagger|OpenAPI|Télécharger toutes les données/);
  });
  it("keeps canonical route documentation aligned",()=>{
    const doc=read("../../../../../../documentation/pages_site/routes/04-reseau-discussions/open-data/open-data-presentation-detaillee.md");
    expect(doc).toContain("GET /api/actions/map");
    expect(doc).toContain("post_action_complete");
    expect(doc).toContain("licence");
    expect(doc).toContain("isTruncated");
  });
});
