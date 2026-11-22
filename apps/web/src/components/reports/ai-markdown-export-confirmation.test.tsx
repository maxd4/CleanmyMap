// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiMarkdownExportConfirmation } from "./ai-markdown-export-confirmation";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const request = {
  input: { type: "single_action" as const, actionId: "00000000-0000-4000-8000-000000000001" },
  detailLevel: "default" as const,
  modules: { dataAndCartography: true, transparencyAndMethods: true, rawData: false, detailedFiles: true },
  theme: "impact" as const,
};

const mounted: Array<{ host: HTMLDivElement; root: Root }> = [];

function mount() {
  const host = document.createElement("div");
  document.body.append(host);
  let root!: Root;
  act(() => {
    root = createRoot(host);
    root.render(
      <AiMarkdownExportConfirmation
        request={request}
        triggerLabel="Exporter les données"
        fallbackFilename="cleanmymap-action-00000000-0000-4000-8000-000000000001-rapport-ia.md"
      />,
    );
  });
  mounted.push({ host, root });
  const trigger = host.querySelector<HTMLButtonElement>("button");
  if (!trigger) throw new Error("Export trigger was not rendered.");
  return { host, trigger };
}

afterEach(() => {
  for (const { host, root } of mounted.splice(0)) {
    act(() => root.unmount());
    host.remove();
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("AiMarkdownExportConfirmation", () => {
  it("does not fetch or download until explicit confirmation and supports cancellation", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { trigger } = mount();
    act(() => trigger.click());
    const panel = document.querySelector<HTMLElement>('[role="dialog"]');
    expect(panel?.textContent).toContain("CleanMyMap ne l’envoie pas à un service IA");
    expect(panel?.className).toContain("calc(100vw-1rem)");
    expect(fetchMock).not.toHaveBeenCalled();

    act(() => {
      const cancel = [...document.querySelectorAll("button")].find((button) => button.textContent === "Annuler");
      cancel?.click();
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("opens and closes with keyboard, restoring focus to its trigger", () => {
    const { trigger } = mount();
    trigger.focus();
    act(() => trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })));
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    act(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("downloads the returned Markdown filename and confirms success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("# Brief sûr", {
      headers: { "Content-Disposition": 'attachment; filename="cleanmymap-action-00000000-0000-4000-8000-000000000001-rapport-ia.md"' },
    }));
    const downloadedBlobs: Blob[] = [];
    const createObjectURL = vi.fn((blob: Blob) => { downloadedBlobs.push(blob); return "blob:report"; });
    const revokeObjectURL = vi.fn();
    const clicked: HTMLAnchorElement[] = [];
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) { clicked.push(this); });
    const { trigger } = mount();
    act(() => trigger.click());
    const confirm = [...document.querySelectorAll("button")].find((button) => button.textContent === "Confirmer le téléchargement");
    await act(async () => { confirm?.click(); await Promise.resolve(); });

    expect(fetchMock).toHaveBeenCalledWith("/api/reports/ai-export", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toEqual(request);
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(downloadedBlobs[0]?.size).toBeGreaterThan(0);
    expect(clicked).toHaveLength(1);
    expect(clicked[0]?.download).toBe("cleanmymap-action-00000000-0000-4000-8000-000000000001-rapport-ia.md");
    expect(document.querySelector('[role="status"]')?.textContent).toBe("Téléchargement confirmé.");
  });

  it("shows an independent pending state while the Markdown response is being prepared", async () => {
    let resolveResponse!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => { resolveResponse = resolve; })));
    const { trigger } = mount();
    act(() => trigger.click());
    const confirm = [...document.querySelectorAll("button")].find((button) => button.textContent === "Confirmer le téléchargement");
    act(() => confirm?.click());
    expect(document.querySelector('[role="status"]')?.textContent).toBe("Préparation du téléchargement…");
    expect(confirm?.disabled).toBe(true);

    resolveResponse(new Response(null, { status: 503 }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(document.querySelector('[role="alert"]')?.textContent).toContain("n’a pas pu être généré");
  });

  it("shows a network error without triggering a download", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click");
    const { trigger } = mount();
    act(() => trigger.click());
    const confirm = [...document.querySelectorAll("button")].find((button) => button.textContent === "Confirmer le téléchargement");
    await act(async () => { confirm?.click(); await Promise.resolve(); });
    expect(document.querySelector('[role="alert"]')?.textContent).toContain("Erreur réseau");
    expect(click).not.toHaveBeenCalled();
  });
});
