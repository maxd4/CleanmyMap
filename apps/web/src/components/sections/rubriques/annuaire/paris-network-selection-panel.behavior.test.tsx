// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { PARIS_CLEANWALK_ACTORS, PARIS_CLEANWALK_RELATIONS } from "@/lib/partners/paris-cleanwalk-network";
import { ParisNetworkSelectionPanel } from "./paris-network-selection-panel";

it("opens a source-backed historical relation and keeps the direction and endpoints explicit", () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const select = vi.fn();
  const onSelectActor = vi.fn();
  const actor = PARIS_CLEANWALK_ACTORS.find(item => item.id === "asso-featured-1")!;
  const relation = PARIS_CLEANWALK_RELATIONS.find(item => item.id === "rel-brigade-verte-jagis")!;
  const props = { actors: PARIS_CLEANWALK_ACTORS, relations: PARIS_CLEANWALK_RELATIONS, fr: true, onSelectActor, onSelectRelation: select, onClose: vi.fn() };
  try {
    act(() => root.render(<ParisNetworkSelectionPanel {...props} actor={actor} relation={undefined} />));
    const button = [...host.querySelectorAll("button")].find(item => item.textContent?.includes(relation.title))!;
    act(() => button.click());
    expect(select).toHaveBeenCalledWith(relation.id);
    act(() => root.render(<ParisNetworkSelectionPanel {...props} actor={null} relation={relation} />));
    expect(host.textContent).toContain("Publie :");
    expect(host.textContent).toContain("Plateforme :");
    expect([...host.querySelectorAll("a")].some(link => link.getAttribute("href") === relation.source.url)).toBe(true);
    const peer = [...host.querySelectorAll("button")].find(item => item.textContent === actor.name)!;
    act(() => peer.click());
    expect(onSelectActor).toHaveBeenCalledWith(actor.id);
  } finally {
    act(() => root.unmount());
    host.remove();
  }
});
