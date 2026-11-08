// @vitest-environment jsdom

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildActionsCsvFilename } from "@/lib/reports/csv";
import type { ActionMapItem } from "@/lib/actions/types";
import { ActionsMapExportButton } from "./actions-map-export-button";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const activeRoots: Array<{ host: HTMLDivElement; root: Root }> = [];

const exportItems: ActionMapItem[] = [{
  id: "act_1",
  action_date: "2026-05-13",
  location_label: "Paris",
  latitude: 48.8566,
  longitude: 2.3522,
  waste_kg: 12,
  cigarette_butts: 200,
  status: "approved",
}];

function mountExportButton(items = exportItems) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  let root!: Root;
  act(() => {
    root = createRoot(host);
    root.render(React.createElement(ActionsMapExportButton, { items: [...items] }));
  });
  activeRoots.push({ host, root });
  return host;
}

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

beforeEach(() => {
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
});

afterEach(() => {
  for (const { host, root } of activeRoots.splice(0)) {
    act(() => root.unmount());
    host.remove();
  }
  document.body.innerHTML = "";
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
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));

    const host = mountExportButton();
    const trigger = host.querySelector<HTMLButtonElement>("button[title]");
    expect(trigger).not.toBeNull();

    await act(async () => {
      trigger!.click();
      await Promise.resolve();
    });
    const menuItems = [...document.querySelectorAll<HTMLButtonElement>("#actions-map-export-menu-panel [role=menuitem]")];
    expect(menuItems).toHaveLength(3);

    await act(async () => {
      menuItems[0]?.click();
      await Promise.resolve();
    });
    expect(createObjectURL).toHaveBeenCalledOnce();
    const csvBlob = createObjectURL.mock.calls[0]?.[0];
    if (!csvBlob) throw new Error("CSV blob was not created");
    expect(csvBlob).toBeInstanceOf(Blob);
    expect(csvBlob?.type).toBe("text/csv;charset=utf-8;");
    expect(await readBlob(csvBlob)).toContain("act_1");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:map-export");

    await act(async () => {
      trigger!.click();
      await Promise.resolve();
    });
    const geoJsonItem = document.querySelector<HTMLButtonElement>("#actions-map-export-menu-panel [role=menuitem]:nth-of-type(3)");
    await act(async () => {
      geoJsonItem?.click();
      await Promise.resolve();
    });
    expect(createObjectURL).toHaveBeenCalledTimes(2);
    const geoJsonBlob = createObjectURL.mock.calls[1]?.[0];
    if (!geoJsonBlob) throw new Error("GeoJSON blob was not created");
    expect(geoJsonBlob?.type).toBe("application/geo+json;charset=utf-8;");
    expect(JSON.parse(await readBlob(geoJsonBlob)).features[0].id).toBe("act_1");
  });

  it("starts keyboard traversal on the first export action", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    const host = mountExportButton();
    const trigger = host.querySelector<HTMLButtonElement>("button[title]");
    expect(trigger).not.toBeNull();
    trigger!.focus();

    act(() => {
      trigger!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    });

    const firstMenuItem = document.querySelector<HTMLButtonElement>("#actions-map-export-menu-panel [role=menuitem]");
    expect(firstMenuItem).not.toBeNull();
    expect(document.activeElement).toBe(firstMenuItem);
  });

  it("reports a missing capture target and keeps the PNG action observable", async () => {
    const alertMock = vi.fn();
    vi.stubGlobal("alert", alertMock);
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));

    const host = mountExportButton([{
      ...exportItems[0],
      waste_kg: null,
      cigarette_butts: null,
    }]);
    const trigger = host.querySelector<HTMLButtonElement>("button[title]");
    expect(trigger).not.toBeNull();
    await act(async () => {
      trigger!.click();
      await Promise.resolve();
    });
    const pngItem = document.querySelectorAll<HTMLButtonElement>("#actions-map-export-menu-panel [role=menuitem]")[1];
    await act(async () => {
      await pngItem?.click();
      await Promise.resolve();
    });

    expect(alertMock).toHaveBeenCalledWith("Impossible de générer l'image PNG de la carte.");
    expect(trigger?.textContent).toContain("Exporter la vue");
  });
});
