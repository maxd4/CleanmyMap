// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { PARIS_CLEANWALK_ACTORS } from "@/lib/partners/paris-cleanwalk-network";
import { ParisNetworkActorSearch } from "./paris-network-actor-search";

it("finds actors without accents, selects an exact identity and clears only the lookup", () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const select = vi.fn();
  try {
    act(() => root.render(<ParisNetworkActorSearch actors={PARIS_CLEANWALK_ACTORS} fr onSelectActor={select} />));
    const input = host.querySelector<HTMLInputElement>('input[type="search"]')!;
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    act(() => {
      setValue.call(input, "ecole voltaire");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const result = [...host.querySelectorAll("button")].find(button => button.textContent?.includes("Voltaire"));
    expect(result).toBeDefined();
    act(() => result?.click());
    expect(select).toHaveBeenCalledWith("school-uai-0751241s");
    expect(input.value).toBe("");
    expect(host.querySelector("ul")).toBeNull();
  } finally {
    act(() => root.unmount());
    host.remove();
  }
});
