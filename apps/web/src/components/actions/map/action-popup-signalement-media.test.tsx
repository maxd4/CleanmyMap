import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSignalementMediaReadController,
  fetchSignalementMedia,
  SignalementMediaReadError,
} from "@/lib/actions/signalement-media-client";
import type { SignalementMediaReadItem } from "@/lib/actions/signalement-media-contract";
import {
  SignalementMediaProofs,
  SignalementMediaProofsView,
} from "./action-popup-signalement-media";

function mediaItem(overrides: Partial<SignalementMediaReadItem> = {}): SignalementMediaReadItem {
  return {
    id: "media-1",
    signalementId: "signalement-1",
    createdAt: "2026-08-25T10:00:00.000Z",
    createdByClerkId: "user-1",
    clientUploadId: "client-1",
    storageBucket: "signalement-evidence",
    storagePath: "signalement-1/media-1.jpg",
    originalName: "preuve.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 1024,
    width: 1200,
    height: 800,
    sortOrder: 0,
    uploadState: "ready",
    signedUrl: "https://storage.example/signed-media-1",
    ...overrides,
  };
}

describe("signalement media popup", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the read request idle until the explicit load callback", async () => {
    const fetcher = vi.fn(async () => [mediaItem()]);
    const changes: string[] = [];
    const controller = createSignalementMediaReadController(
      "signalement-1",
      (snapshot) => changes.push(snapshot.status),
      fetcher,
    );

    expect(controller.getSnapshot().status).toBe("idle");
    expect(fetcher).not.toHaveBeenCalled();

    await controller.load();
    await controller.load();

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(changes).toEqual(["loading", "ready"]);
    expect(controller.getSnapshot().items[0]?.signedUrl).toBe(
      "https://storage.example/signed-media-1",
    );
  });

  it("does not fetch while the popup only renders its idle control", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const markup = renderToStaticMarkup(
      React.createElement(SignalementMediaProofs, {
        signalementId: "signalement-1",
      }),
    );

    expect(markup).toContain("Voir les preuves photo");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows an explicit retry after a read error", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(
        new SignalementMediaReadError("Temporary failure", "request"),
      )
      .mockResolvedValueOnce([mediaItem({ id: "media-2" })]);
    const controller = createSignalementMediaReadController(
      "signalement-1",
      () => undefined,
      fetcher,
    );

    await controller.load();
    expect(controller.getSnapshot().status).toBe("error");

    await controller.retry();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(controller.getSnapshot().status).toBe("ready");
  });

  it("maps a forbidden response to the non-public state", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SignalementMediaProofsView, {
        snapshot: {
          status: "forbidden",
          items: [],
          error: new SignalementMediaReadError("Forbidden", "forbidden"),
        },
        onLoad: () => undefined,
        onRetry: () => undefined,
      }),
    );

    expect(markup).toContain("Les preuves photo ne sont pas publiques");
    expect(markup).not.toContain("Voir les preuves photo");
  });

  it("renders an empty state and a retryable error state", () => {
    const emptyMarkup = renderToStaticMarkup(
      React.createElement(SignalementMediaProofsView, {
        snapshot: { status: "empty", items: [], error: null },
        onLoad: () => undefined,
        onRetry: () => undefined,
      }),
    );
    const errorMarkup = renderToStaticMarkup(
      React.createElement(SignalementMediaProofsView, {
        snapshot: {
          status: "error",
          items: [],
          error: new SignalementMediaReadError("Request failed", "request"),
        },
        onLoad: () => undefined,
        onRetry: () => undefined,
      }),
    );

    expect(emptyMarkup).toContain("Aucune preuve photo disponible.");
    expect(errorMarkup).toContain("Les preuves photo n&#x27;ont pas pu être chargées.");
    expect(errorMarkup).toContain("Réessayer");
  });

  it("renders up to three ready media with dimensions, neutral alt text and ephemeral URLs", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SignalementMediaProofsView, {
        snapshot: {
          status: "ready",
          items: [
            mediaItem(),
            mediaItem({
              id: "media-2",
              signedUrl: "https://storage.example/signed-media-2",
              width: 800,
              height: 800,
            }),
            mediaItem({
              id: "media-3",
              signedUrl: "https://storage.example/signed-media-3",
              width: null,
              height: null,
            }),
            mediaItem({ id: "media-4" }),
          ],
          error: null,
        },
        onLoad: () => undefined,
        onRetry: () => undefined,
      }),
    );

    expect(markup.match(/alt="Preuve photo/g)).toHaveLength(3);
    expect(markup).toContain('width="1200"');
    expect(markup).toContain('height="800"');
    expect(markup).toContain("signed-media-1");
    expect(markup).toContain("signed-media-2");
    expect(markup).toContain("signed-media-3");
    expect(markup).not.toContain("signed-media-4");
    expect(markup).toContain('target="_blank"');
  });

  it("reads signed URLs from the API without introducing persistent client storage", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ status: "ok", items: [mediaItem()] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const items = await fetchSignalementMedia("signalement-1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/signalements/signalement-1/media",
      expect.objectContaining({ method: "GET", cache: "no-store" }),
    );
    expect(items[0]?.signedUrl).toBe("https://storage.example/signed-media-1");
  });

  it("maps an API 403 to the forbidden read error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "forbidden" }), { status: 403 })),
    );

    await expect(fetchSignalementMedia("signalement-1")).rejects.toMatchObject({
      code: "forbidden",
    });
  });
});
