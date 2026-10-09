import { describe, expect, it, vi } from "vitest";
import {
  getAddressSuggestionHighlightIndex,
  loadRemoteAddressSuggestions,
} from "./action-address-autocomplete.model";

const localSuggestion = {
  label: "Rue locale, Paris",
  subtitle: "75001 Paris",
  latitude: 48.85,
  longitude: 2.35,
  importance: 0.8,
};

describe("action address autocomplete model", () => {
  it("wraps keyboard navigation across the visible suggestion list", () => {
    expect(getAddressSuggestionHighlightIndex({ key: "ArrowDown", currentIndex: 1, suggestionCount: 2 })).toBe(0);
    expect(getAddressSuggestionHighlightIndex({ key: "ArrowUp", currentIndex: 0, suggestionCount: 2 })).toBe(1);
    expect(getAddressSuggestionHighlightIndex({ key: "Enter", currentIndex: 0, suggestionCount: 2 })).toBeNull();
    expect(getAddressSuggestionHighlightIndex({ key: "ArrowDown", currentIndex: -1, suggestionCount: 0 })).toBeNull();
  });

  it("merges remote results after local results, removes duplicates, and caps the list", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({
        status: "ok",
        query: "rue",
        items: [
          localSuggestion,
          { ...localSuggestion, label: "Rue distante 1, Paris", longitude: 2.36 },
          { ...localSuggestion, label: "Rue distante 2, Paris", longitude: 2.37 },
          { ...localSuggestion, label: "Rue distante 3, Paris", longitude: 2.38 },
          { ...localSuggestion, label: "Rue distante 4, Paris", longitude: 2.39 },
          { ...localSuggestion, label: "Rue distante 5, Paris", longitude: 2.4 },
        ],
      }), { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    const result = await loadRemoteAddressSuggestions({
      query: "rue de",
      localSuggestions: [localSuggestion],
      signal: new AbortController().signal,
      fetcher,
    });

    expect(fetcher).toHaveBeenCalledWith(
      "/api/geo/address-suggestions?q=rue%20de&limit=6",
      expect.objectContaining({ method: "GET", headers: { Accept: "application/json" } }),
    );
    expect(result).toHaveLength(6);
    expect(result?.[0]).toEqual(localSuggestion);
    expect(result?.filter((suggestion) => suggestion.label === localSuggestion.label)).toHaveLength(1);
  });

  it("falls back locally on network failure and stops quietly when aborted", async () => {
    const controller = new AbortController();
    const fallback = [localSuggestion];
    const failingFetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("network down"));

    await expect(loadRemoteAddressSuggestions({
      query: "rue",
      localSuggestions: fallback,
      signal: new AbortController().signal,
      fetcher: failingFetcher,
    })).resolves.toEqual(fallback);

    controller.abort();
    const abortedFetcher = vi.fn<typeof fetch>().mockRejectedValue(new DOMException("aborted", "AbortError"));
    await expect(loadRemoteAddressSuggestions({
      query: "rue",
      localSuggestions: fallback,
      signal: controller.signal,
      fetcher: abortedFetcher,
    })).resolves.toBeNull();
  });

  it("does not retry or lose free-entry support when geocoding is quota-limited or empty", async () => {
    const quotaFetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("quota", { status: 429 }),
    );
    await expect(loadRemoteAddressSuggestions({
      query: "entrée non répertoriée",
      localSuggestions: [],
      signal: new AbortController().signal,
      fetcher: quotaFetcher,
    })).resolves.toEqual([]);
    expect(quotaFetcher).toHaveBeenCalledTimes(1);

    const emptyFetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok", query: "inconnu", items: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(loadRemoteAddressSuggestions({
      query: "inconnu",
      localSuggestions: [],
      signal: new AbortController().signal,
      fetcher: emptyFetcher,
    })).resolves.toEqual([]);
  });
});
