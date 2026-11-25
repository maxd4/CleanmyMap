import { describe, expect, it } from "vitest";
import { PARIS_CLEANWALK_ACTORS } from "./paris-cleanwalk-network";
import { PARIS_PUBLIC_CLEANLINESS_DATASET as data } from "./public-cleanliness-organization";
import { getActorStructureContext, getInstitutionStructureContext, getPublicStructureSource, validatePublicStructureContexts } from "./public-structure-context";

describe("public structure context", () => {
  it("validates referenced entities, metrics, sources and attributed criticisms", () => {
    expect(validatePublicStructureContexts(PARIS_CLEANWALK_ACTORS, data)).toEqual([]);
    expect(getPublicStructureSource("constructor")).toBeNull();
    expect(getActorStructureContext("unlisted-actor")).toBeNull();
  });
  it("preserves national vs regional scope and reported recovery without a made-up Paris result", () => {
    const context = getActorStructureContext("megothon")!;
    expect(context.metrics?.find(item => item.id === "2025-valorisation")).toMatchObject({ value: 10, unit: "percent", scope: "edition", quality: "approximate" });
    expect(context.metrics?.find(item => item.id === "2024-people")?.value).toBe(2166);
    expect(context.metrics?.filter(item => item.scope === "paris")).toEqual([expect.objectContaining({ id: "2024-paris-events", value: 6, unit: "count" })]);
    expect(context.metrics?.some(item => item.scope === "national")).toBe(false);
    expect(context.limits.find(item => item.id === "water-equivalence")?.basis).toBe("documented");
    expect(context.limits.find(item => item.id === "cpm-accounting-proof")?.basis).toBe("not_established");
    expect(getPublicStructureSource("megothon-2026-partner")?.label).toContain("ALCOME");
    expect(context.limits.find(item => item.id === "cpm-proof")?.basis).toBe("not_established");
  });
  it("keeps World Cleanup Day results separate from Mégothon", () => {
    const context = getActorStructureContext("world-cleanup-day-france")!;
    expect(context.metrics?.find(item => item.id === "wcd-2024-recovery")).toMatchObject({ value: 750000, scope: "edition", unit: "count" });
    expect(context.metrics?.some(item => item.id === "2025-valorisation")).toBe(false);
    expect(context.metrics?.some(item => item.id === "wcd-2025-recovery")).toBe(false);
  });
  it("reuses the same evidence for explicit common identities, not their subsidiaries or lookalikes", () => {
    const get = (id: string) => getInstitutionStructureContext(data, data.nodes.find(node => node.id === id)!, PARIS_CLEANWALK_ACTORS);
    expect(get("asso-megots-alcome")).toBe(getActorStructureContext("asso-megots-alcome"));
    expect(get("dpe")).toBe(getActorStructureContext("evt-paris-nettoyages"));
    expect(get("asso-megots-cyclope")).toBe(getActorStructureContext("asso-megots-cyclope"));
    expect(get("division-17")).toBeNull();
    expect(get("asso-megots-tchaomegot")?.limits[0].id).toBe("tchao-route");
    const dpe = data.nodes.find(node => node.id === "dpe")!;
    expect(getInstitutionStructureContext({ ...data, city: "Lyon" }, dpe, PARIS_CLEANWALK_ACTORS)).toBeNull();
    expect(getInstitutionStructureContext(data, { ...dpe, networkActorId: "asso-megots-alcome" }, PARIS_CLEANWALK_ACTORS)).toBeNull();
  });
  it("covers the current network without creating a general rating", () => {
    for (const actor of PARIS_CLEANWALK_ACTORS) expect(getActorStructureContext(actor.id), actor.id).not.toBeNull();
    expect(getActorStructureContext("eco-organisme-citeo")?.limits.find(item => item.id === "packaging-lobby-debate")?.basis).toBe("attributed_critique");
    expect(getActorStructureContext("asso-aremacs-idf")?.limits.some(item => item.basis === "attributed_critique")).toBe(false);
    expect(getActorStructureContext("asso-runners-laveurs")?.limits[0].basis).toBe("not_established");
    const cyclo = data.nodes.find(node => node.id === "operator-carton-plein-cyclo")!;
    expect(getInstitutionStructureContext(data, cyclo, PARIS_CLEANWALK_ACTORS)).toBe(getActorStructureContext("operator-carton-plein-cyclo"));
    const citeo = data.nodes.find(node => node.id === "eco-organisme-citeo")!;
    expect(getInstitutionStructureContext(data, citeo, PARIS_CLEANWALK_ACTORS)).toBe(getActorStructureContext("eco-organisme-citeo"));
    const ivry = data.nodes.find(node => node.id === "syctom-uve-ivry")!;
    expect(getInstitutionStructureContext(data, ivry, PARIS_CLEANWALK_ACTORS)?.limits[0].id).toBe("site-specific-monitoring");
    const issy = data.nodes.find(node => node.id === "syctom-uve-issy")!;
    expect(getInstitutionStructureContext(data, issy, PARIS_CLEANWALK_ACTORS)).toBeNull();
  });
  it("keeps the criticism attributed to CNCT and does not label recipients as guilty", () => {
    expect(getActorStructureContext("asso-megots-alcome")?.limits.some(item => item.basis === "attributed_critique")).toBe(true);
    expect(getActorStructureContext("world-cleanup-day-france")?.limits.some(item => item.basis === "attributed_critique")).toBe(false);
    expect(getActorStructureContext("asso-gestes-propres")?.limits.filter(item => item.basis === "attributed_critique").map(item => item.id)).toEqual(["packaging-interest-debate"]);
  });
});
