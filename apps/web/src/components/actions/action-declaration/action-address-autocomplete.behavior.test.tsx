import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RemoteAddressSuggestionsResult } from "./action-address-autocomplete.model";

const remoteMock = vi.hoisted(() => ({
  loadRemoteAddressSuggestions: vi.fn(async () => [
    { label: "12 Rue de Rivoli, 75004 Paris", subtitle: "75004 Paris", latitude: 48.8557, longitude: 2.3562, importance: 0.8 },
  ]),
  loadRemoteAddressSuggestionsWithStatus: vi.fn<
    (params: { query: string }) => Promise<RemoteAddressSuggestionsResult>
  >(async () => ({
    status: "ok",
    items: [
      { label: "12 Rue de Rivoli, 75004 Paris", subtitle: "75004 Paris", latitude: 48.8557, longitude: 2.3562, importance: 0.8 },
    ],
  })),
}));

vi.mock("./action-address-autocomplete.model", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./action-address-autocomplete.model")>();
  return {
    ...actual,
    loadRemoteAddressSuggestions: remoteMock.loadRemoteAddressSuggestions,
    loadRemoteAddressSuggestionsWithStatus: remoteMock.loadRemoteAddressSuggestionsWithStatus,
  };
});

import { ActionAddressAutocomplete } from "./action-address-autocomplete";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis, window: globalThis });

describe("ActionAddressAutocomplete free address behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("confirms typed text as an address without coordinates by mouse or keyboard", async () => {
    const onChange = vi.fn();
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(<ActionAddressAutocomplete id="address" label="Adresse" placeholder="Adresse" value="" onChange={onChange} helperText="Suggestions" />);
    });
    const input = renderer.root.findByProps({ role: "combobox" });
    await act(async () => { input.props.onChange({ target: { value: "Lieu non répertorié" } }); });
    await act(async () => {
      renderer.update(<ActionAddressAutocomplete id="address" label="Adresse" placeholder="Adresse" value="Lieu non répertorié" onChange={onChange} helperText="Suggestions" />);
    });
    const freeOption = renderer.root.findAllByType("button").find((button) => button.props.id?.endsWith("option-0"));
    expect(freeOption).toBeDefined();
    expect(renderer.root.findAll((node) => node.type === "p" && node.children.includes("Adresse sans coordonnées")).length).toBe(1);
    await act(async () => { input.props.onKeyDown({ key: "Enter", preventDefault: vi.fn() }); });
    expect(onChange).toHaveBeenLastCalledWith("Lieu non répertorié", null);
    renderer.unmount();
  });

  it("skips redundant remote lookups on Google Maps URLs, selected suggestions, and unchanged refocus", async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(<ActionAddressAutocomplete id="address" label="Adresse" placeholder="Adresse" value="" onChange={onChange} helperText="Suggestions" />);
    });
    const input = () => renderer.root.findByProps({ role: "combobox" });

    // 1. Pasting a Google Maps URL triggers 0 remote requests
    await act(async () => {
      input().props.onFocus();
      input().props.onChange({ target: { value: "https://www.google.com/maps/search/?api=1&query=48.8566,2.3522" } });
      renderer.update(<ActionAddressAutocomplete id="address" label="Adresse" placeholder="Adresse" value="https://www.google.com/maps/search/?api=1&query=48.8566,2.3522" onChange={onChange} helperText="Suggestions" />);
    });
    await act(async () => { vi.advanceTimersByTime(300); await Promise.resolve(); });
    expect(remoteMock.loadRemoteAddressSuggestionsWithStatus).not.toHaveBeenCalled();

    // 2. Typing an address query triggers 1 remote request; blur + refocus on unchanged query triggers 0 additional requests
    await act(async () => {
      input().props.onChange({ target: { value: "12 Rue de Rivoli" } });
      renderer.update(<ActionAddressAutocomplete id="address" label="Adresse" placeholder="Adresse" value="12 Rue de Rivoli" onChange={onChange} helperText="Suggestions" />);
    });
    await act(async () => { vi.advanceTimersByTime(250); await Promise.resolve(); });
    expect(remoteMock.loadRemoteAddressSuggestionsWithStatus).toHaveBeenCalledTimes(1);

    await act(async () => { input().props.onBlur(); vi.advanceTimersByTime(150); });
    await act(async () => { input().props.onFocus(); vi.advanceTimersByTime(250); await Promise.resolve(); });
    expect(remoteMock.loadRemoteAddressSuggestionsWithStatus).toHaveBeenCalledTimes(1);

    // 3. Selecting a suggestion and refocusing triggers 0 additional requests
    const suggestionButton = renderer.root.findAllByType("button").find((button) => button.props.id?.endsWith("option-1"));
    expect(suggestionButton).toBeDefined();
    await act(async () => {
      suggestionButton!.props.onMouseDown({ preventDefault: vi.fn() });
      renderer.update(<ActionAddressAutocomplete id="address" label="Adresse" placeholder="Adresse" value="12 Rue de Rivoli, 75004 Paris" onChange={onChange} helperText="Suggestions" />);
    });
    await act(async () => { input().props.onFocus(); vi.advanceTimersByTime(250); await Promise.resolve(); });
    expect(remoteMock.loadRemoteAddressSuggestionsWithStatus).toHaveBeenCalledTimes(1);

    renderer.unmount();
  });

  it("restores A suggestions on A -> B (aborted) -> A without refetching and ignores late B response", async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    let resolveB!: (value: RemoteAddressSuggestionsResult) => void;

    remoteMock.loadRemoteAddressSuggestionsWithStatus.mockImplementation(async ({ query }) => {
      if (query === "Rue Alpha") {
        return {
          status: "ok" as const,
          items: [{ label: "Rue Alpha, 75001 Paris", subtitle: "75001 Paris", latitude: 48.85, longitude: 2.35, importance: 0.8 }],
        };
      }
      return new Promise((resolve) => {
        resolveB = resolve;
      });
    });

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(<ActionAddressAutocomplete id="address" label="Adresse" placeholder="Adresse" value="" onChange={onChange} helperText="Suggestions" />);
    });
    const input = () => renderer.root.findByProps({ role: "combobox" });

    // Search A succeeds
    await act(async () => {
      input().props.onFocus();
      input().props.onChange({ target: { value: "Rue Alpha" } });
      renderer.update(<ActionAddressAutocomplete id="address" label="Adresse" placeholder="Adresse" value="Rue Alpha" onChange={onChange} helperText="Suggestions" />);
    });
    await act(async () => { vi.advanceTimersByTime(250); await Promise.resolve(); });
    expect(remoteMock.loadRemoteAddressSuggestionsWithStatus).toHaveBeenCalledTimes(1);
    expect(renderer.root.findAll((node) => node.type === "span" && node.children.includes("Rue Alpha, 75001 Paris")).length).toBe(1);

    // Search B starts and stays pending
    await act(async () => {
      input().props.onChange({ target: { value: "Rue Beta" } });
      renderer.update(<ActionAddressAutocomplete id="address" label="Adresse" placeholder="Adresse" value="Rue Beta" onChange={onChange} helperText="Suggestions" />);
    });
    await act(async () => { vi.advanceTimersByTime(250); await Promise.resolve(); });
    expect(remoteMock.loadRemoteAddressSuggestionsWithStatus).toHaveBeenCalledTimes(2);

    // Return to A before B resolves -> restores A from cache with 0 new requests
    await act(async () => {
      input().props.onChange({ target: { value: "Rue Alpha" } });
      renderer.update(<ActionAddressAutocomplete id="address" label="Adresse" placeholder="Adresse" value="Rue Alpha" onChange={onChange} helperText="Suggestions" />);
    });
    await act(async () => { vi.advanceTimersByTime(250); await Promise.resolve(); });
    expect(remoteMock.loadRemoteAddressSuggestionsWithStatus).toHaveBeenCalledTimes(2);
    expect(renderer.root.findAll((node) => node.type === "span" && node.children.includes("Rue Alpha, 75001 Paris")).length).toBe(1);

    // Late resolution of B must not overwrite A
    await act(async () => {
      resolveB({
        status: "ok",
        items: [{ label: "Rue Beta, 69001 Lyon", subtitle: "69001 Lyon", latitude: 45.76, longitude: 4.83, importance: 0.8 }],
      });
      await Promise.resolve();
    });
    expect(renderer.root.findAll((node) => node.type === "span" && node.children.includes("Rue Alpha, 75001 Paris")).length).toBe(1);
    expect(renderer.root.findAll((node) => node.type === "span" && node.children.includes("Rue Beta, 69001 Lyon")).length).toBe(0);

    renderer.unmount();
  });

  it("clears loading and suggestions when pasting coordinates after an in-flight search", async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    let resolveSearch!: (value: RemoteAddressSuggestionsResult) => void;

    remoteMock.loadRemoteAddressSuggestionsWithStatus.mockImplementation(
      () => new Promise((resolve) => { resolveSearch = resolve; }),
    );

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(<ActionAddressAutocomplete id="address" label="Adresse" placeholder="Adresse" value="" onChange={onChange} helperText="Suggestions" />);
    });
    const input = () => renderer.root.findByProps({ role: "combobox" });

    await act(async () => {
      input().props.onFocus();
      input().props.onChange({ target: { value: "Rue en cours" } });
      renderer.update(<ActionAddressAutocomplete id="address" label="Adresse" placeholder="Adresse" value="Rue en cours" onChange={onChange} helperText="Suggestions" />);
    });
    await act(async () => { vi.advanceTimersByTime(250); await Promise.resolve(); });
    expect(renderer.root.findAll((node) => String(node.props?.className ?? "").includes("animate-spin")).length).toBeGreaterThan(0);

    // Paste GPS coordinates while search is still pending
    await act(async () => {
      input().props.onChange({ target: { value: "48.8566, 2.3522" } });
      renderer.update(<ActionAddressAutocomplete id="address" label="Adresse" placeholder="Adresse" value="48.8566, 2.3522" onChange={onChange} helperText="Suggestions" />);
    });
    expect(renderer.root.findAll((node) => String(node.props?.className ?? "").includes("animate-spin")).length).toBe(0);

    // Late resolution of aborted search must not restore stale suggestions or loading state
    await act(async () => {
      resolveSearch({
        status: "ok",
        items: [{ label: "Rue en cours, Paris", subtitle: "75001 Paris", latitude: 48.85, longitude: 2.35, importance: 0.8 }],
      });
      await Promise.resolve();
    });
    expect(renderer.root.findAll((node) => node.type === "span" && node.children.includes("Rue en cours, Paris")).length).toBe(0);
    expect(renderer.root.findAll((node) => String(node.props?.className ?? "").includes("animate-spin")).length).toBe(0);

    renderer.unmount();
  });

  it("refetches when countryCode changes and retries after a temporary error", async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();

    remoteMock.loadRemoteAddressSuggestionsWithStatus
      .mockResolvedValueOnce({ status: "error", items: [] })
      .mockResolvedValueOnce({
        status: "ok",
        items: [{ label: "Rue Neuve, 1000 Bruxelles", subtitle: "1000 Bruxelles", latitude: 50.85, longitude: 4.35, importance: 0.8 }],
      })
      .mockResolvedValueOnce({
        status: "ok",
        items: [{ label: "Rue Neuve, 75002 Paris", subtitle: "75002 Paris", latitude: 48.86, longitude: 2.34, importance: 0.8 }],
      });

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(<ActionAddressAutocomplete id="address" label="Adresse" placeholder="Adresse" value="" countryCode="BE" onChange={onChange} helperText="Suggestions" />);
    });
    const input = () => renderer.root.findByProps({ role: "combobox" });

    // First attempt fails -> must NOT be cached
    await act(async () => {
      input().props.onFocus();
      input().props.onChange({ target: { value: "Rue Neuve" } });
      renderer.update(<ActionAddressAutocomplete id="address" label="Adresse" placeholder="Adresse" value="Rue Neuve" countryCode="BE" onChange={onChange} helperText="Suggestions" />);
    });
    await act(async () => { vi.advanceTimersByTime(250); await Promise.resolve(); });
    expect(remoteMock.loadRemoteAddressSuggestionsWithStatus).toHaveBeenCalledTimes(1);

    // Blur and refocus -> retries and succeeds
    await act(async () => { input().props.onBlur(); });
    await act(async () => { vi.advanceTimersByTime(150); });
    await act(async () => { input().props.onFocus(); });
    await act(async () => { vi.advanceTimersByTime(250); await Promise.resolve(); });
    expect(remoteMock.loadRemoteAddressSuggestionsWithStatus).toHaveBeenCalledTimes(2);
    expect(renderer.root.findAll((node) => node.type === "span" && node.children.includes("Rue Neuve, 1000 Bruxelles")).length).toBe(1);

    // Country change BE -> FR must fetch FR instead of reusing BE cache
    await act(async () => {
      renderer.update(<ActionAddressAutocomplete id="address" label="Adresse" placeholder="Adresse" value="Rue Neuve" countryCode="FR" onChange={onChange} helperText="Suggestions" />);
    });
    await act(async () => { vi.advanceTimersByTime(250); await Promise.resolve(); });
    expect(remoteMock.loadRemoteAddressSuggestionsWithStatus).toHaveBeenCalledTimes(3);
    expect(renderer.root.findAll((node) => node.type === "span" && node.children.includes("Rue Neuve, 75002 Paris")).length).toBe(1);

    renderer.unmount();
  });
});
