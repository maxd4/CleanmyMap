import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const remoteMock = vi.hoisted(() => ({
  loadRemoteAddressSuggestions: vi.fn(async () => [
    { label: "12 Rue de Rivoli, 75004 Paris", subtitle: "75004 Paris", latitude: 48.8557, longitude: 2.3562 },
  ]),
}));

vi.mock("./action-address-autocomplete.model", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./action-address-autocomplete.model")>();
  return {
    ...actual,
    loadRemoteAddressSuggestions: remoteMock.loadRemoteAddressSuggestions,
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
    expect(remoteMock.loadRemoteAddressSuggestions).not.toHaveBeenCalled();

    // 2. Typing an address query triggers 1 remote request; blur + refocus on unchanged query triggers 0 additional requests
    await act(async () => {
      input().props.onChange({ target: { value: "12 Rue de Rivoli" } });
      renderer.update(<ActionAddressAutocomplete id="address" label="Adresse" placeholder="Adresse" value="12 Rue de Rivoli" onChange={onChange} helperText="Suggestions" />);
    });
    await act(async () => { vi.advanceTimersByTime(250); await Promise.resolve(); });
    expect(remoteMock.loadRemoteAddressSuggestions).toHaveBeenCalledTimes(1);

    await act(async () => { input().props.onBlur(); vi.advanceTimersByTime(150); });
    await act(async () => { input().props.onFocus(); vi.advanceTimersByTime(250); await Promise.resolve(); });
    expect(remoteMock.loadRemoteAddressSuggestions).toHaveBeenCalledTimes(1);

    // 3. Selecting a suggestion and refocusing triggers 0 additional requests
    const suggestionButton = renderer.root.findAllByType("button").find((button) => button.props.id?.endsWith("option-1"));
    expect(suggestionButton).toBeDefined();
    await act(async () => {
      suggestionButton!.props.onMouseDown({ preventDefault: vi.fn() });
      renderer.update(<ActionAddressAutocomplete id="address" label="Adresse" placeholder="Adresse" value="12 Rue de Rivoli, 75004 Paris" onChange={onChange} helperText="Suggestions" />);
    });
    await act(async () => { input().props.onFocus(); vi.advanceTimersByTime(250); await Promise.resolve(); });
    expect(remoteMock.loadRemoteAddressSuggestions).toHaveBeenCalledTimes(1);

    renderer.unmount();
  });
});
