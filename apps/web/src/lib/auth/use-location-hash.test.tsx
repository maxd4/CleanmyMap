import React from "react";
import { act, create } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLocationHash } from "./use-location-hash";

type Listener = () => void;

function HashProbe() {
  return React.createElement("output", null, useLocationHash());
}

describe("useLocationHash", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("refreshes the current route when only the hash changes", () => {
    const listeners = new Map<string, Listener>();
    const location = { hash: "#first" };
    const browser = {
      location,
      addEventListener: (event: string, listener: Listener) => listeners.set(event, listener),
      removeEventListener: (event: string) => listeners.delete(event),
    } as unknown as Window & typeof globalThis;
    vi.stubGlobal("window", browser);
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);

    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<HashProbe />);
    });
    expect(renderer.root.findByType("output").children).toEqual(["#first"]);

    act(() => {
      location.hash = "#second";
      listeners.get("hashchange")?.();
    });

    expect(renderer.root.findByType("output").children).toEqual(["#second"]);
    renderer.unmount();
  });
});
