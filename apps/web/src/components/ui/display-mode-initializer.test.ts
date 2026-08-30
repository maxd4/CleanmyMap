import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { DISPLAY_MODE_INITIALIZER_SCRIPT } from "./display-mode-initializer";

function runInitializer(values: Record<string, string | null>) {
  const documentElement = {
    lang: "",
    dataset: {} as Record<string, string>,
  };
  const context = {
    window: {
      localStorage: {
        getItem: (key: string) => values[key] ?? null,
      },
    },
    document: { documentElement },
  };

  runInNewContext(DISPLAY_MODE_INITIALIZER_SCRIPT, context);
  return documentElement;
}

describe("display mode initializer", () => {
  it("only reads allowlisted UI preferences before paint", () => {
    expect(DISPLAY_MODE_INITIALIZER_SCRIPT).toContain(
      'window.localStorage.getItem("cleanmymap.locale")',
    );
    expect(DISPLAY_MODE_INITIALIZER_SCRIPT).toContain(
      '["fr","en"]',
    );
    expect(DISPLAY_MODE_INITIALIZER_SCRIPT).toContain(
      'window.localStorage.getItem("cleanmymap.theme")',
    );
    expect(DISPLAY_MODE_INITIALIZER_SCRIPT).toContain(
      '["mixed","dark"]',
    );
    expect(DISPLAY_MODE_INITIALIZER_SCRIPT).toContain(
      'window.localStorage.getItem("cleanmymap.display_mode")',
    );
    expect(DISPLAY_MODE_INITIALIZER_SCRIPT).toContain(
      '["exhaustif","minimaliste","sobre"]',
    );
    expect(DISPLAY_MODE_INITIALIZER_SCRIPT).toContain("document.documentElement.lang");
    expect(DISPLAY_MODE_INITIALIZER_SCRIPT).toContain("document.documentElement.dataset.theme");
    expect(DISPLAY_MODE_INITIALIZER_SCRIPT).toContain("document.documentElement.dataset.displayMode");
    expect(DISPLAY_MODE_INITIALIZER_SCRIPT).not.toContain("document.cookie");
    expect(DISPLAY_MODE_INITIALIZER_SCRIPT).not.toContain("fetch(");
  });

  it("restores each valid browser preference", () => {
    expect(
      runInitializer({
        "cleanmymap.locale": "en",
        "cleanmymap.theme": "dark",
        "cleanmymap.display_mode": "minimaliste",
      }),
    ).toEqual({
      lang: "en",
      dataset: {
        theme: "dark",
        displayMode: "minimaliste",
      },
    });
  });

  it("falls back safely for invalid browser preferences", () => {
    expect(
      runInitializer({
        "cleanmymap.locale": "de",
        "cleanmymap.theme": "light",
        "cleanmymap.display_mode": "compact",
      }),
    ).toEqual({
      lang: "fr",
      dataset: {
        theme: "mixed",
        displayMode: "exhaustif",
      },
    });
  });
});
