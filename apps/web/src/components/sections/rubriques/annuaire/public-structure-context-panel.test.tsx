import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getActorStructureContext } from "@/lib/partners/public-structure-context";
import { PublicStructureContextPanel } from "./public-structure-context-panel";

describe("public structure context panel", () => {
  it("renders no empty or reassuring placeholder for undocumented structures", () => {
    expect(renderToStaticMarkup(<PublicStructureContextPanel context={null} fr />)).toBe("");
  });
  it("renders sources, qualified metrics and attributed criticism in a compact disclosure", () => {
    const markup = renderToStaticMarkup(<PublicStructureContextPanel context={getActorStructureContext("asso-megots-alcome")} fr />);
    expect(markup).toContain("Limites");
    expect(markup).toContain("Critique publique attribuée");
    expect(markup).toContain("https://cnct.fr/");
    expect(markup).toContain("<details");
    expect(markup).not.toContain("role=\"alert\"");
  });
  it("renders English qualifications and regional scope", () => {
    const markup = renderToStaticMarkup(<PublicStructureContextPanel context={getActorStructureContext("megothon")} fr={false} />);
    expect(markup).toContain("Not established");
    expect(markup).toContain("Île-de-France");
    expect(markup).toContain("Partner announcement");
    expect(markup).toContain("Edition-wide results");
  });
});
