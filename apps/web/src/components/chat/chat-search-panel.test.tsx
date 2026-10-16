import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { ChatSearchPanel } from "./chat-search-panel";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function renderSearchPanel(overrides: Partial<React.ComponentProps<typeof ChatSearchPanel>> = {}) {
  return renderToStaticMarkup(
    React.createElement(ChatSearchPanel, {
      query: "map",
      results: [],
      isLoading: false,
      error: null,
      hasMore: false,
      isLoadingMore: false,
      loadMoreError: null,
      onQueryChange: vi.fn(),
      onClose: vi.fn(),
      onSelectResult: vi.fn(),
      onLoadMore: vi.fn(),
      tone: "light",
      ...overrides,
    }),
  );
}

describe("ChatSearchPanel state primitives", () => {
  it("uses a skeleton for structural loading", () => {
    const markup = renderSearchPanel({ isLoading: true });

    expect(markup).toContain('data-skeleton-animation="pulse"');
    expect(markup).toContain("Recherche en cours…");
  });

  it("uses alert feedback for search errors", () => {
    const markup = renderSearchPanel({ error: new Error("Recherche impossible") });

    expect(markup).toContain('data-feedback-tone="error"');
    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Recherche impossible");
  });

  it("uses status feedback for empty and short-query information", () => {
    const emptyMarkup = renderSearchPanel();
    const shortQueryMarkup = renderSearchPanel({ query: "m" });

    expect(emptyMarkup).toContain('data-feedback-tone="info"');
    expect(emptyMarkup).toContain('role="status"');
    expect(emptyMarkup).toContain("Aucun message trouvé dans ce fil.");
    expect(shortQueryMarkup).toContain("Saisissez au moins 2 caractères.");
    expect(shortQueryMarkup).toContain('data-feedback-tone="info"');
    expect(emptyMarkup).not.toMatch(/autofocus/i);
  });

  it("focuses only when the search panel is mounted, including after reopening", () => {
    const focus = vi.fn();
    const createNodeMock = () => ({ focus });
    let renderer!: ReactTestRenderer;

    act(() => {
      renderer = create(<div />, { createNodeMock });
      renderer.update(<ChatSearchPanel {...({
        query: "map",
        results: [],
        isLoading: false,
        error: null,
        hasMore: false,
        isLoadingMore: false,
        loadMoreError: null,
        onQueryChange: vi.fn(),
        onClose: vi.fn(),
        onSelectResult: vi.fn(),
        onLoadMore: vi.fn(),
        tone: "light",
      } satisfies React.ComponentProps<typeof ChatSearchPanel>)} />);
    });

    expect(focus).toHaveBeenCalledTimes(1);

    act(() => {
      renderer.update(<ChatSearchPanel {...({
        query: "maps",
        results: [],
        isLoading: false,
        error: null,
        hasMore: false,
        isLoadingMore: false,
        loadMoreError: null,
        onQueryChange: vi.fn(),
        onClose: vi.fn(),
        onSelectResult: vi.fn(),
        onLoadMore: vi.fn(),
        tone: "light",
      } satisfies React.ComponentProps<typeof ChatSearchPanel>)} />);
    });
    expect(focus).toHaveBeenCalledTimes(1);

    act(() => renderer.update(<></>));
    expect(focus).toHaveBeenCalledTimes(1);

    act(() => {
      renderer.update(<ChatSearchPanel {...({
        query: "",
        results: [],
        isLoading: false,
        error: null,
        hasMore: false,
        isLoadingMore: false,
        loadMoreError: null,
        onQueryChange: vi.fn(),
        onClose: vi.fn(),
        onSelectResult: vi.fn(),
        onLoadMore: vi.fn(),
        tone: "light",
      } satisfies React.ComponentProps<typeof ChatSearchPanel>)} />);
    });
    expect(focus).toHaveBeenCalledTimes(2);

    act(() => renderer.unmount());
  });
});
