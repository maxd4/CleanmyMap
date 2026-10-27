import { describe, expect, it } from "vitest";
import { buildWasteProfile } from "./waste-profile";

type Fixture = { breakdown?: Record<string, unknown> | null };

const withBreakdown = (breakdown: Fixture["breakdown"]): Fixture => ({ breakdown });

describe("buildWasteProfile", () => {
  it("agrège les cinq catégories, convertit les nombres et trie par masse puis actions", () => {
    const profile = buildWasteProfile(
      [
        withBreakdown({ megotsKg: "2", plastiqueKg: 1, verreKg: 3, metalKg: 0, mixteKg: 4 }),
        withBreakdown({ megotsKg: 1, plastiqueKg: 1, verreKg: 0, metalKg: 2, mixteKg: 0 }),
      ],
      (item) => item.breakdown,
    );

    expect(profile).toEqual({
      categories: [
        { key: "mixteKg", label: "Déchets mixtes", kg: 4, actions: 1 },
        { key: "megotsKg", label: "Mégots", kg: 3, actions: 2 },
        { key: "verreKg", label: "Verre", kg: 3, actions: 1 },
        { key: "plastiqueKg", label: "Plastique", kg: 2, actions: 2 },
        { key: "metalKg", label: "Métal", kg: 2, actions: 1 },
      ],
      coveragePercent: 100,
      dominantLabel: "Déchets mixtes",
      dominantKg: 4,
    });
  });

  it("compte la couverture par breakdown présent, y compris un breakdown vide, sans compter les absents", () => {
    const profile = buildWasteProfile(
      [withBreakdown(null), withBreakdown(undefined), withBreakdown({}), withBreakdown({ verreKg: 0 })],
      (item) => item.breakdown,
    );

    expect(profile.coveragePercent).toBe(50);
    expect(profile.categories).toEqual([]);
    expect(profile.dominantLabel).toBe("Déchets non typés");
    expect(profile.dominantKg).toBe(0);
  });

  it("ignore les catégories inconnues, les valeurs nulles, négatives et non numériques", () => {
    const profile = buildWasteProfile(
      [withBreakdown({ unknownKg: 99, megotsKg: null, plastiqueKg: -1, verreKg: "not-a-number", metalKg: 2 })],
      (item) => item.breakdown,
    );

    expect(profile.categories).toEqual([
      { key: "metalKg", label: "Métal", kg: 2, actions: 1 },
    ]);
  });

  it("utilise le nombre d'actions comme départage déterministe à masse égale", () => {
    const profile = buildWasteProfile(
      [
        withBreakdown({ plastiqueKg: 2 }),
        withBreakdown({ verreKg: 1 }),
        withBreakdown({ verreKg: 1 }),
      ],
      (item) => item.breakdown,
    );

    expect(profile.categories).toEqual([
      { key: "verreKg", label: "Verre", kg: 2, actions: 2 },
      { key: "plastiqueKg", label: "Plastique", kg: 2, actions: 1 },
    ]);
  });

  it("retourne le profil vide attendu pour une collection vide", () => {
    expect(buildWasteProfile([], () => null)).toEqual({
      categories: [],
      coveragePercent: 0,
      dominantLabel: "Déchets non typés",
      dominantKg: 0,
    });
  });
});
