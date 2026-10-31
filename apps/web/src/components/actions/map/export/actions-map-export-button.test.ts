import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { act, create } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildActionsCsvFilename } from "@/lib/reports/csv";
import { ActionsMapExportButton } from "./actions-map-export-button";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

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

  it("downloads the produced CSV and GeoJSON blobs from the real menu actions", async () => {
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => "blob:map-export");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    vi.stubGlobal("window", {
      matchMedia: vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
      setTimeout,
      clearTimeout,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal("document", {
      createElement: vi.fn(() => ({ href: "", download: "", rel: "", click: vi.fn(), remove: vi.fn() })),
      body: { appendChild: vi.fn() },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(React.createElement(ActionsMapExportButton, {
        items: [{
          id: "act_1",
          action_date: "2026-05-13",
          location_label: "Paris",
          latitude: 48.8566,
          longitude: 2.3522,
          waste_kg: 12,
          cigarette_butts: 200,
          status: "approved",
        }],
      }));
    });
    const trigger = renderer.root.find((node) => node.type === "button" && node.props.title);

    await act(async () => {
      trigger.props.onClick({ preventDefault: vi.fn(), stopPropagation: vi.fn() });
    });
    const menuItems = renderer.root.findAll((node) => node.props.role === "menuitem");
    expect(menuItems).toHaveLength(3);

    await act(async () => {
      menuItems[0]?.props.onClick();
    });
    expect(createObjectURL).toHaveBeenCalledOnce();
    const csvBlob = createObjectURL.mock.calls[0]?.[0];
    if (!csvBlob) throw new Error("CSV blob was not created");
    expect(csvBlob).toBeInstanceOf(Blob);
    expect(csvBlob?.type).toBe("text/csv;charset=utf-8;");
    expect(await csvBlob?.text()).toContain("act_1");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:map-export");

    await act(async () => {
      trigger.props.onClick({ preventDefault: vi.fn(), stopPropagation: vi.fn() });
    });
    const geoJsonItem = renderer.root.findAll((node) => node.props.role === "menuitem")[2];
    await act(async () => {
      geoJsonItem?.props.onClick();
    });
    expect(createObjectURL).toHaveBeenCalledTimes(2);
    const geoJsonBlob = createObjectURL.mock.calls[1]?.[0];
    if (!geoJsonBlob) throw new Error("GeoJSON blob was not created");
    expect(geoJsonBlob?.type).toBe("application/geo+json;charset=utf-8;");
    expect(JSON.parse(await geoJsonBlob.text()).features[0].id).toBe("act_1");
  });

  it("reports a missing capture target and keeps the PNG action observable", async () => {
    const alertMock = vi.fn();
    vi.stubGlobal("alert", alertMock);
    vi.stubGlobal("window", {
      matchMedia: vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
      setTimeout,
      clearTimeout,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal("document", {
      createElement: vi.fn(() => ({ href: "", download: "", rel: "", click: vi.fn(), remove: vi.fn() })),
      body: { appendChild: vi.fn() },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(React.createElement(ActionsMapExportButton, {
        items: [{
          id: "act_1",
          action_date: "2026-05-13",
          location_label: "Paris",
          latitude: 48.8566,
          longitude: 2.3522,
          waste_kg: null,
          cigarette_butts: null,
          status: "approved",
        }],
      }));
    });
    const trigger = renderer.root.find((node) => node.type === "button" && node.props.title);
    await act(async () => {
      trigger.props.onClick({ preventDefault: vi.fn(), stopPropagation: vi.fn() });
    });
    const pngItem = renderer.root.findAll((node) => node.props.role === "menuitem")[1];
    await act(async () => {
      await pngItem?.props.onClick();
    });

    expect(alertMock).toHaveBeenCalledWith("Impossible de générer l'image PNG de la carte.");
    expect(renderer.root.find((node) => node.type === "button" && node.props.title).children).toContain("Exporter la vue");
  });
});
