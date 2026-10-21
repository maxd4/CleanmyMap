import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExportForm } from "./export-form-contract";
import { exportFormAsPdf } from "./export-form-pdf";

const form: ExportForm = {
  actionDate: "2026-08-23",
  arrivalLocationLabel: "Place de la République",
  associationName: "CleanMyMap",
  departureLocationLabel: "Canal Saint-Martin",
  durationMinutes: "90",
  latitude: "48.8566",
  locationLabel: "Paris 10e",
  longitude: "2.3522",
  notes: "Notes de terrain",
  placeType: "Espace public",
  recordType: "action",
  volunteersCount: "12",
  wasteKg: "18.5",
  wasteMegotsKg: "2.1",
};

describe("exportFormAsPdf", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("writes a functional A4 printable document without remote font imports", () => {
    let renderedHtml = "";
    const popup = {
      document: {
        open: vi.fn(),
        write: vi.fn((html: string) => {
          renderedHtml = html;
        }),
        close: vi.fn(),
      },
    } as unknown as Window;
    const open = vi.fn(() => popup);
    vi.stubGlobal("window", { open });

    expect(exportFormAsPdf(form, "Camille Martin")).toBe(true);
    expect(open).toHaveBeenCalledWith("", "_blank", "noopener,noreferrer");
    expect(popup.document.open).toHaveBeenCalledOnce();
    expect(popup.document.write).toHaveBeenCalledOnce();
    expect(popup.document.close).toHaveBeenCalledOnce();
    expect(renderedHtml).toContain("@page { size: A4; margin: 20mm 18mm; }");
    expect(renderedHtml).toContain(
      "font-family: Segoe UI, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;",
    );
    expect(renderedHtml).not.toContain("fonts.googleapis.com");
    expect(renderedHtml).not.toContain("@import");
    expect(renderedHtml).toContain("Déclaration d'action");
  });

  it("returns false when the browser blocks the printable window", () => {
    vi.stubGlobal("window", { open: vi.fn(() => null) });

    expect(exportFormAsPdf(form, "Camille Martin")).toBe(false);
  });
});
