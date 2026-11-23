// @vitest-environment jsdom

import { act } from "react";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ActionMediaReadItem } from "@/lib/actions/action-media/action-media-contract";
import { ActionRouteReferenceImage } from "./action-route-reference-image";

const mediaClient = vi.hoisted(() => ({
  deleteActionRouteReference: vi.fn(),
  readActionRouteReferences: vi.fn(),
  uploadActionRouteReference: vi.fn(),
}));
vi.mock("@/lib/actions/action-media/action-route-reference-client", () => mediaClient);
vi.mock("next/image", () => ({ default: (props: Record<string, unknown>) => createElement("span", { "aria-label": props.alt as string }) }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const media = (id: string, overrides: Partial<ActionMediaReadItem> = {}): ActionMediaReadItem => ({
  id, actionId: "action-1", createdAt: "2026-11-23T10:00:00.000Z", createdByClerkId: "owner",
  clientUploadId: `client-${id}`, storageBucket: "action-photos", storagePath: `action-1/${id}.jpg`,
  originalName: `${id}.jpg`, mimeType: "image/jpeg", sizeBytes: 1200, width: 800, height: 600,
  sortOrder: 0, uploadState: "ready", purpose: "route_reference", signedUrl: `https://signed.test/${id}`,
  ...overrides,
});

let host: HTMLDivElement;
let root: Root;
let selected: string | null;
const render = async (items: ActionMediaReadItem[], selectedId: string | null = "old") => {
  selected = selectedId;
  mediaClient.readActionRouteReferences.mockResolvedValue(items);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => { root.render(<ActionRouteReferenceImage actionId="action-1" mediaId={selected} onMediaIdChange={(id) => { selected = id; }} />); });
  return host;
};

async function click(button: HTMLButtonElement | null) {
  if (!button) throw new Error("button not found");
  await act(async () => { button.click(); await Promise.resolve(); });
}

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("ActionRouteReferenceImage recovery", () => {
  it("completes a replacement and refreshes the list without the removed image", async () => {
    const old = media("old");
    const next = media("next");
    const mounted = await render([old]);
    mediaClient.uploadActionRouteReference.mockResolvedValue(next);
    mediaClient.readActionRouteReferences.mockResolvedValueOnce([old, next]).mockResolvedValueOnce([next]);
    mediaClient.deleteActionRouteReference.mockResolvedValue(undefined);
    const input = mounted.querySelector<HTMLInputElement>('input[type="file"]')!;
    await act(async () => {
      Object.defineProperty(input, "files", { configurable: true, value: [new File(["photo"], "next.jpg", { type: "image/jpeg" })] });
      input.dispatchEvent(new Event("change", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mediaClient.deleteActionRouteReference).toHaveBeenCalledWith("action-1", "old");
    expect(mounted.textContent).toContain("next.jpg");
    expect(mounted.textContent).not.toContain("old.jpg");
  });

  it("keeps an old ready image visible after replacement cleanup fails", async () => {
    const old = media("old");
    const next = media("next");
    const mounted = await render([old]);
    mediaClient.uploadActionRouteReference.mockResolvedValue(next);
    mediaClient.readActionRouteReferences.mockResolvedValueOnce([old, next]).mockResolvedValueOnce([old, next]);
    mediaClient.deleteActionRouteReference.mockRejectedValue(new Error("La suppression SQL a échoué."));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const input = mounted.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(["photo"], "parcours.jpg", { type: "image/jpeg" });
    await act(async () => {
      Object.defineProperty(input, "files", { configurable: true, value: [file] });
      input.dispatchEvent(new Event("change", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(selected).toBe("next");
    expect(mounted.textContent).toContain("old.jpg");
    expect(mounted.textContent).toContain("next.jpg");
    expect(mounted.textContent).toContain("La suppression SQL a échoué.");
  });

  it("offers retry after reload for a disabled cleanup tombstone", async () => {
    const pending = media("old", { uploadState: "failed", signedUrl: "", cleanupPending: true });
    const mounted = await render([pending]);
    mediaClient.deleteActionRouteReference.mockResolvedValue(undefined);
    mediaClient.readActionRouteReferences.mockResolvedValue([]);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await click([...mounted.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.includes("Réessayer le nettoyage")) ?? null);
    expect(mediaClient.deleteActionRouteReference).toHaveBeenCalledWith("action-1", "old");
    expect(mounted.textContent).not.toContain("old.jpg");
  });

  it("can remove an older unselected reference without clearing the current selection", async () => {
    const old = media("old");
    const current = media("current");
    const mounted = await render([old, current], "current");
    mediaClient.deleteActionRouteReference.mockResolvedValue(undefined);
    mediaClient.readActionRouteReferences.mockResolvedValue([current]);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const oldCard = [...mounted.querySelectorAll("div.rounded-xl")].find((node) => node.textContent?.includes("old.jpg"));
    await click([...oldCard?.querySelectorAll<HTMLButtonElement>("button") ?? []].find((button) => button.textContent === "Supprimer") ?? null);
    expect(mediaClient.deleteActionRouteReference).toHaveBeenCalledWith("action-1", "old");
    expect(selected).toBe("current");
    expect(mounted.textContent).not.toContain("old.jpg");
  });
});
