import * as React from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { INITIAL_ANNUAIRE_ENTRIES } from "./seed-index";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

vi.mock("@/components/ui/cmm-card", () => ({
  CmmCard: ({ children }: { children: React.ReactNode }) =>
    React.createElement("article", null, children),
}));

vi.mock("@/components/ui/cmm-button", () => ({
  CmmButton: ({ children, onClick, ariaLabel }: {
    children: React.ReactNode;
    onClick?: () => void;
    ariaLabel?: string;
  }) => React.createElement("button", { onClick, "aria-label": ariaLabel }, children),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children }: { children?: React.ReactNode }) =>
      React.createElement("div", null, children),
  },
}));

vi.mock("lucide-react", () => {
  const Icon = () => React.createElement("span");
  return { ArrowRight: Icon, MapPin: Icon, Quote: Icon, Star: Icon };
});

import { AnnuaireFeaturedSection } from "./annuaire-featured-section";

describe("AnnuaireFeaturedSection interactions", () => {
  it("passes the clicked featured actor id to the map selection", () => {
    const entry = INITIAL_ANNUAIRE_ENTRIES[0];
    if (!entry) throw new Error("Expected an annuaire fixture");
    const onFocusMap = vi.fn();
    let renderer: ReturnType<typeof create> | undefined;
    act(() => {
      renderer = create(
        <AnnuaireFeaturedSection
          entries={[{ ...entry, distanceKm: null }]}
          onFocusMap={onFocusMap}
          fr
        />,
      );
    });
    const button = renderer!.root.findByType("button");

    act(() => {
      button.props.onClick();
    });

    expect(onFocusMap).toHaveBeenCalledWith(entry.id);
    expect(button.props["aria-label"]).toContain(entry.name);
  });
});
