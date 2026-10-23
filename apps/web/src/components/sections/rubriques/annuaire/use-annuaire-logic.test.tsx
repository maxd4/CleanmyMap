// @vitest-environment jsdom

import * as React from "react";
import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: null }),
}));

const useSWRMock = vi.hoisted(() => vi.fn());

vi.mock("swr", () => ({
  default: useSWRMock,
}));

import { useAnnuaireLogic } from "./use-annuaire-logic";

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

function renderHook() {
  let current: ReturnType<typeof useAnnuaireLogic> | null = null;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);

  act(() => {
    root?.render(
      React.createElement(() => {
        current = useAnnuaireLogic();
        return null;
      }),
    );
  });

  return {
    get current() {
      if (!current) throw new Error("Hook was not rendered");
      return current;
    },
  };
}

describe("useAnnuaireLogic canonical results", () => {
  beforeEach(() => {
    useSWRMock.mockReturnValue({
      data: { status: "ok", items: [] },
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    });
  });

  it("keeps the hook invocation in the section owner", () => {
    const explorationSource = readFileSync(
      "src/components/sections/rubriques/annuaire/annuaire-exploration-view.tsx",
      "utf8",
    );

    expect(explorationSource).not.toMatch(/useAnnuaireLogic\s*\(/);
  });

  it("uses one state owner for search, combined filters and pagination", () => {
    const hook = renderHook();
    const target = hook.current.allEntries.find(
      (entry) => entry.tags?.[0] && entry.contributionTypes[0],
    );
    const targetTag = target?.tags?.[0];
    if (!target || !targetTag) {
      throw new Error("Expected a searchable annuaire fixture");
    }

    act(() => {
      hook.current.setSearchTerm(targetTag);
      hook.current.setFilterKind(target.kind);
      hook.current.setFilterContribution(target.contributionTypes[0]);
      hook.current.setActorCardsPage(1);
    });

    expect(hook.current.sortedAndFilteredEntries.map((entry) => entry.id)).toEqual([target.id]);
    expect(hook.current.paginatedEntries.map((entry) => entry.id)).toEqual([target.id]);
    expect(hook.current.totalPages).toBe(1);
    expect(hook.current.filterKey).toContain(targetTag);
  });

  it("resets all filters before a selection that was previously excluded", () => {
    const hook = renderHook();
    const target = hook.current.allEntries[0];
    if (!target) throw new Error("Expected an annuaire fixture");

    act(() => {
      hook.current.setSearchTerm("aucun résultat");
      hook.current.setFilterKind(target.kind);
      hook.current.setFilterContribution(target.contributionTypes[0]);
      hook.current.setZoneFilter(1);
      hook.current.setActorCardsPage(3);
    });
    expect(hook.current.sortedAndFilteredEntries).toHaveLength(0);

    act(() => {
      hook.current.resetFilters();
    });

    expect(hook.current.filterKey).toBe("|all|all|all");
    expect(hook.current.sortedAndFilteredEntries.some((entry) => entry.id === target.id)).toBe(true);
    expect(hook.current.safeActorCardsPage).toBe(1);
  });

  it("distinguishes initial loading, an unavailable source, and stale data", () => {
    const retry = vi.fn();
    const sourceError = new Error("published_directory_unavailable");
    useSWRMock.mockReturnValue({
      data: { status: "ok", items: [] },
      error: sourceError,
      isLoading: false,
      isValidating: false,
      mutate: retry,
    });

    const hook = renderHook();

    expect(hook.current.isLoading).toBe(false);
    expect(hook.current.isPublishedDirectoryUnavailable).toBe(true);
    expect(hook.current.isPublishedDirectoryStale).toBe(true);
    expect(hook.current.publishedDirectoryError).toBe(sourceError);
    expect(hook.current.allEntries.length).toBeGreaterThan(0);

    act(() => hook.current.retryPublishedDirectory());
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("keeps loading distinct from an error while editorial entries remain visible", () => {
    useSWRMock.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      isValidating: true,
      mutate: vi.fn(),
    });

    const hook = renderHook();

    expect(hook.current.isLoading).toBe(true);
    expect(hook.current.isPublishedDirectoryUnavailable).toBe(false);
    expect(hook.current.isPublishedDirectoryStale).toBe(false);
    expect(hook.current.allEntries.length).toBeGreaterThan(0);
  });

  it("keeps editorial entries available while the first partner request is loading or fails without data", () => {
    useSWRMock.mockReturnValue({
      data: undefined,
      error: new Error("published_directory_unavailable"),
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    });

    const hook = renderHook();

    expect(hook.current.isPublishedDirectoryUnavailable).toBe(true);
    expect(hook.current.isPublishedDirectoryStale).toBe(false);
    expect(hook.current.allEntries.length).toBeGreaterThan(0);
  });
});
