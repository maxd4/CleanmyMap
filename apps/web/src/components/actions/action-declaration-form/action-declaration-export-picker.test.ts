import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { initialState } from "../action-declaration-form.model";
import {
  buildActionDeclarationExportFilename,
  buildActionDeclarationShareText,
  getActionDeclarationExportTargets,
} from "@/lib/actions/export-form-media";
import {
  createActionDeclarationExportHistoryEntry,
  mergeActionDeclarationExportHistory,
} from "@/lib/actions/export-form-history";
import {
  getActionDeclarationExportBundleImageTargets,
} from "@/lib/actions/export-form-bundle";
import { ActionDeclarationExportPicker } from "./action-declaration-export-picker";

describe("ActionDeclarationExportPicker", () => {
  it("renders the main export choices", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActionDeclarationExportPicker, {
        isOpen: true,
        onClose: () => undefined,
        form: {
          ...initialState,
          actionDate: "2026-05-20",
          associationName: "Association de test",
          locationLabel: "Quai de Seine",
        },
        actorName: "Alex",
      }),
    );

    expect(markup).toContain("Choisissez le format de sortie");
    expect(markup).toContain("Fichier PDF");
    expect(markup).toContain("PNG");
    expect(markup).toContain("Story Instagram");
    expect(markup).toContain("Publication Facebook");
    expect(markup).toContain("Publication X / Twitter");
  });

  it("exposes the expected export targets and filenames", () => {
    expect(
      getActionDeclarationExportTargets().map((target) => target.label),
    ).toEqual([
      "Fichier PDF",
      "PNG",
      "Story Instagram",
      "Publication Facebook",
      "Publication X / Twitter",
    ]);

    expect(
      buildActionDeclarationExportFilename(
        {
          ...initialState,
          actionDate: "2026-05-20",
        },
        "pdf",
      ),
    ).toBe("cleanmymap-declaration-2026-05-20-pdf.pdf");

    expect(
      buildActionDeclarationExportFilename(
        {
          ...initialState,
          actionDate: "2026-05-20",
        },
        "story-instagram",
      ),
    ).toBe("cleanmymap-declaration-2026-05-20-story-instagram.png");
  });

  it("builds a useful share caption", () => {
    const text = buildActionDeclarationShareText({
      form: {
        ...initialState,
        actionDate: "2026-05-20",
        locationLabel: "Quai de Seine",
        wasteKg: "12.5",
        volunteersCount: "8",
        associationName: "Association de test",
      },
      actorName: "Alex",
      exportLabel: "Story Instagram",
    });

    expect(text).toContain("Story Instagram avec CleanMyMap");
    expect(text).toContain("Date: 20 mai 2026");
    expect(text).toContain("Quai de Seine");
    expect(text).toContain("12.5 kg collectés");
    expect(text).toContain("8 bénévoles mobilisés");
    expect(text).toContain("Déclaré par Alex");
    expect(text).toContain("#CleanMyMap");
  });

  it("builds bundle image targets in bundle order", () => {
    expect(
      getActionDeclarationExportBundleImageTargets("social").map((target) => target.id),
    ).toEqual([
      "story-instagram",
      "png",
      "publication-facebook",
      "publication-x",
    ]);

    expect(
      getActionDeclarationExportBundleImageTargets("institutionnel").map((target) => target.id),
    ).toEqual([
      "publication-facebook",
      "png",
    ]);
  });

  it("keeps export history most recent first and capped", () => {
    const current = createActionDeclarationExportHistoryEntry({
      filename: "current.png",
      label: "PNG",
      sourceLabel: "Réseaux sociaux",
      targetId: "png",
      actorName: "Alex",
      form: initialState,
    });
    current.id = "CURRENT";

    const previous = Array.from({ length: 9 }, (_, index) => {
      const entry = createActionDeclarationExportHistoryEntry({
        filename: `old-${index}.png`,
        label: `PNG ${index}`,
        sourceLabel: "Réseaux sociaux",
        targetId: "png",
        actorName: "Alex",
        form: initialState,
      });
      entry.id = `OLD-${index}`;
      return entry;
    });

    const merged = mergeActionDeclarationExportHistory(previous, [current]);

    expect(merged[0]?.id).toBe("CURRENT");
    expect(merged).toHaveLength(8);
    expect(merged.map((entry) => entry.id)).toContain("OLD-0");
  });
});
