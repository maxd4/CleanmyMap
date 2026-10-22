import * as React from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { INITIAL_ANNUAIRE_ENTRIES } from "./seed-index";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

vi.mock("framer-motion", async () => {
  const ReactModule = await import("react");
  const passthrough = ({ children, ...props }: { children?: React.ReactNode }) =>
    ReactModule.createElement("g", props, children);
  return {
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
    motion: new Proxy(
      {},
      {
        get: () => passthrough,
      },
    ),
  };
});

import { AnnuaireNetworkGraph } from "./annuaire-network-graph";

describe("AnnuaireNetworkGraph interactions", () => {
  it("opens the exact actor from keyboard activation", () => {
    const entry = INITIAL_ANNUAIRE_ENTRIES[0];
    if (!entry) throw new Error("Expected an annuaire fixture");
    const onSelectPartner = vi.fn();
    let renderer: ReturnType<typeof create> | undefined;
    act(() => {
      renderer = create(
        <AnnuaireNetworkGraph entries={[entry]} onSelectPartner={onSelectPartner} />,
      );
    });
    const node = renderer!.root.findAllByProps({ role: "button" })[0];
    expect(node?.props["aria-label"]).toContain(entry.name);
    const graph = renderer!.root.findByType("svg");
    expect(graph.props["aria-label"]).toContain("similarités thématiques");
    expect(renderer!.root.findByProps({ children: "Un lien signale des thèmes communs, pas une collaboration vérifiée." })).toBeDefined();

    act(() => {
      node?.props.onKeyDown({
        key: "Enter",
        preventDefault: vi.fn(),
      });
    });

    expect(onSelectPartner).toHaveBeenCalledWith(expect.objectContaining({ id: entry.id }));
  });
});
