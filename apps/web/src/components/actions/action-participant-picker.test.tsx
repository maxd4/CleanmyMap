import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionAccountSelector, ActionParticipantPicker } from "./action-participant-picker";
import {
  appendParticipantId,
  getAccountPickerKeyAction,
  getPickerSearchKeyAction,
  normalizeParticipantIds,
  removeParticipantId,
} from "./action-participant-picker-model";
import { fetchParticipantPage } from "./action-participant-picker-search";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("action participant picker model", () => {
  it("normalizes initial values by trimming, deduplicating and excluding the current user", () => {
    expect(normalizeParticipantIds([" user-1 ", "user-1", "current", ""], "current", false)).toEqual(["user-1"]);
    expect(normalizeParticipantIds([" current ", "user-1", "user-1"], "current", true)).toEqual(["current", "user-1"]);
  });

  it("preserves add, duplicate, self-exclusion and removal outcomes", () => {
    expect(appendParticipantId(["user-1"], "user-2", "current", false)).toEqual({ ids: ["user-1", "user-2"], message: null });
    expect(appendParticipantId(["user-1"], "user-1", "current", false).message).toBe("Ce membre est déjà sélectionné.");
    expect(appendParticipantId(["user-1"], "current", "current", false).message).toBe("Vous ne pouvez pas vous ajouter vous-même.");
    expect(removeParticipantId(["user-1", "user-2"], "user-1")).toEqual(["user-2"]);
  });

  it("keeps the keyboard actions explicit for search and account controls", () => {
    expect(getPickerSearchKeyAction("Enter")).toBe("submit");
    expect(getPickerSearchKeyAction("Escape")).toBe("close");
    expect(getPickerSearchKeyAction("ArrowDown")).toBeNull();
    expect(getAccountPickerKeyAction("ArrowDown")).toBe("open");
    expect(getAccountPickerKeyAction(" ")).toBe("open");
    expect(getAccountPickerKeyAction("Escape")).toBe("close");
  });
});

describe("action participant picker search adapter", () => {
  it("forwards the query and removes duplicate search results", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        users: [
          { id: "user-1", handle: "alice", display_name: "Alice" },
          { id: "user-1", handle: "alice", display_name: "Alice" },
          { id: "user-2", handle: null, display_name: "Bob" },
        ],
        nextOffset: 20,
        hasMore: true,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchParticipantPage("/api/chat/users", "alice", 0)).resolves.toEqual({
      items: [
        { id: "user-1", handle: "alice", display_name: "Alice" },
        { id: "user-2", handle: null, display_name: "Bob" },
      ],
      nextOffset: 20,
      hasMore: true,
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/chat/users?offset=0&q=alice", { cache: "no-store", signal: undefined });
  });

  it("preserves empty responses and server errors as explicit states", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Recherche indisponible" }) });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchParticipantPage("/api/chat/users", "", 0)).resolves.toEqual({ items: [], nextOffset: null, hasMore: false });
    await expect(fetchParticipantPage("/api/chat/users", "bob", 0)).rejects.toThrow("Recherche indisponible");
  });
});

describe("action participant picker rendering", () => {
  it("keeps initial values, empty state and removal accessibility visible", () => {
    const html = renderToStaticMarkup(
      React.createElement(ActionParticipantPicker, {
        currentUserId: "current",
        value: [" user-1 ", "user-1", "current"],
        onChange: vi.fn(),
      }),
    );

    expect(html).toContain("1 membre");
    expect(html).toContain('aria-label="Retirer user-1"');
    expect(html).toContain('type="search"');

    const emptyHtml = renderToStaticMarkup(
      React.createElement(ActionParticipantPicker, {
        currentUserId: "current",
        value: [],
        onChange: vi.fn(),
      }),
    );
    expect(emptyHtml).toContain("Aucun membre ajouté pour le moment.");
  });

  it("keeps the organizer combobox keyboard and aria contract", () => {
    const html = renderToStaticMarkup(
      React.createElement(ActionAccountSelector, {
        currentUserId: "current",
        value: [],
        onChange: vi.fn(),
        onOther: vi.fn(),
      }),
    );

    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-readonly="true"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="action-organizer-account-options"');
  });
});
