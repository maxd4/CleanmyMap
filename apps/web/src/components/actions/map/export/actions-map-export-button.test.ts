import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildActionsCsvFilename } from "@/lib/reports/csv";
import { ActionsMapExportButton } from "./actions-map-export-button";

describe("ActionsMapExportButton", () => {
  it("renders the shared CSV label and filename hint for filtered views", () => {
    const expectedFilename = buildActionsCsvFilename();
    const markup = renderToStaticMarkup(
      React.createElement(ActionsMapExportButton, {
        items: [
          {
            id: "act_1",
            action_date: "2026-05-13",
            location_label: "Paris",
            latitude: 48.8566,
            longitude: 2.3522,
            waste_kg: 12,
            cigarette_butts: 200,
            status: "approved",
          },
        ],
      }),
    );

    expect(markup).toContain("Exporter la vue");
    expect(markup).toContain(expectedFilename);
  });
});
