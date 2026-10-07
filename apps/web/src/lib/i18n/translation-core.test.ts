import { describe, expect, it } from "vitest";

import { resolveTranslation, type TranslationDictionary } from "./translation-core";

const dictionary: TranslationDictionary = {
  page: {
    title: "Bonjour",
    nested: {
      label: "Libellé imbriqué",
    },
    count: 3,
    greeting: "Bonjour {name}",
    summary: "{name} a {count} actions",
  },
};

describe("resolveTranslation", () => {
  it("resolves a simple key", () => {
    expect(resolveTranslation(dictionary, "page", "title")).toBe("Bonjour");
  });

  it("resolves a dotted key", () => {
    expect(resolveTranslation(dictionary, "page", "nested.label")).toBe("Libellé imbriqué");
  });

  it("falls back to the key when the key is absent", () => {
    expect(resolveTranslation(dictionary, "page", "missing.value")).toBe("missing.value");
  });

  it("falls back to the key for a non-string value", () => {
    expect(resolveTranslation(dictionary, "page", "count")).toBe("count");
  });

  it("interpolates one value", () => {
    expect(resolveTranslation(dictionary, "page", "greeting", { name: "Ada" })).toBe("Bonjour Ada");
  });

  it("interpolates multiple values", () => {
    expect(resolveTranslation(dictionary, "page", "summary", { name: "Ada", count: 2 })).toBe("Ada a 2 actions");
  });
});
