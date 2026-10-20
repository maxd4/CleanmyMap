// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SiteTooltips } from "./site-tooltips";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const SHOW_DELAY_MS = 300;
const TOOLTIP_ID = "cmm-global-tooltip";

type RectValues = Partial<DOMRect> & Pick<DOMRect, "width" | "height">;

function rect(values: RectValues): DOMRect {
  const left = values.left ?? 0;
  const top = values.top ?? 0;
  return {
    bottom: top + values.height,
    height: values.height,
    left,
    right: left + values.width,
    top,
    width: values.width,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

function setEventProperty(event: Event, name: string, value: unknown) {
  Object.defineProperty(event, name, { configurable: true, value });
}

function firePointer(
  target: EventTarget,
  type: "pointerover" | "pointerout" | "pointerdown" | "pointerup",
  options: { pointerType?: string; relatedTarget?: EventTarget | null } = {},
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  setEventProperty(event, "pointerType", options.pointerType ?? "mouse");
  setEventProperty(event, "relatedTarget", options.relatedTarget ?? null);
  act(() => target.dispatchEvent(event));
}

function fireFocus(target: EventTarget, type: "focusin" | "focusout", relatedTarget: EventTarget | null = null) {
  const event = new FocusEvent(type, { bubbles: true, relatedTarget });
  act(() => target.dispatchEvent(event));
}

function tooltip() {
  return document.querySelector<HTMLElement>(`#${TOOLTIP_ID}`);
}

describe("SiteTooltips DOM behavior", () => {
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;
  const rects = new WeakMap<Element, DOMRect>();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this.id === TOOLTIP_ID) {
        return rect({ width: 120, height: 40 });
      }
      return rects.get(this) ?? rect({ width: 40, height: 20 });
    });
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 800 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 600 });
  });

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
    }
    host?.remove();
    root = null;
    host = null;
    document.body.querySelectorAll(`#${TOOLTIP_ID}`).forEach((node) => node.remove());
    vi.restoreAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  function mount() {
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() => root?.render(<SiteTooltips />));
  }

  function addTrigger(
    content: { title?: string; data?: string; placement?: string; describedBy?: string },
    triggerRect: RectValues = { width: 40, height: 20, left: 100, top: 100 },
  ) {
    const trigger = document.createElement("button");
    if (content.title !== undefined) trigger.title = content.title;
    if (content.data !== undefined) trigger.dataset.tooltipContent = content.data;
    if (content.placement !== undefined) trigger.dataset.tooltipPlacement = content.placement;
    if (content.describedBy !== undefined) trigger.setAttribute("aria-describedby", content.describedBy);
    rects.set(trigger, rect(triggerRect));
    document.body.append(trigger);
    return trigger;
  }

  async function advance(ms = SHOW_DELAY_MS) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  }

  it("opens native title and data-content triggers after the delay and restores accessibility attributes", async () => {
    mount();
    const titleTrigger = addTrigger({ title: "  Helpful text. More details" }, { width: 80, height: 20, left: 100, top: 120 });
    const dataTrigger = addTrigger({ data: "Data tooltip content." }, { width: 80, height: 20, left: 200, top: 120 });

    firePointer(titleTrigger, "pointerover");
    expect(titleTrigger.getAttribute("title")).toBeNull();
    expect(tooltip()).toBeNull();
    await advance();
    expect(tooltip()?.textContent).toBe("Helpful text.");
    expect(titleTrigger.getAttribute("aria-describedby")).toBe(TOOLTIP_ID);

    firePointer(titleTrigger, "pointerout");
    expect(tooltip()).toBeNull();
    expect(titleTrigger.getAttribute("title")).toBe("  Helpful text. More details");
    expect(titleTrigger.hasAttribute("aria-describedby")).toBe(false);

    firePointer(dataTrigger, "pointerover");
    await advance();
    expect(tooltip()?.textContent).toBe("Data tooltip content.");
    expect(dataTrigger.getAttribute("aria-describedby")).toBe(TOOLTIP_ID);
    firePointer(dataTrigger, "pointerout");
    expect(dataTrigger.hasAttribute("data-tooltip-source")).toBe(false);
    expect(dataTrigger.hasAttribute("aria-describedby")).toBe(false);

    const longTrigger = addTrigger({ data: `${"Long tooltip content ".repeat(12)}.` }, { width: 80, height: 20, left: 300, top: 120 });
    firePointer(longTrigger, "pointerover");
    await advance();
    expect(tooltip()?.textContent).toMatch(/…$/);
  });

  it("ignores empty content and cancels a pending hover when leaving or moving within one trigger", async () => {
    mount();
    const empty = addTrigger({ title: "   " });
    const absent = document.createElement("button");
    document.body.append(absent);
    firePointer(absent, "pointerover");
    await advance();
    expect(tooltip()).toBeNull();

    firePointer(empty, "pointerover");
    await advance();
    expect(tooltip()).toBeNull();
    expect(empty.getAttribute("title")).toBe("   ");

    const parent = addTrigger({ title: "Parent tooltip" });
    const child = document.createElement("span");
    parent.append(child);
    firePointer(parent, "pointerover");
    firePointer(parent, "pointerout");
    await advance();
    expect(tooltip()).toBeNull();
    expect(parent.getAttribute("title")).toBe("Parent tooltip");

    firePointer(parent, "pointerover");
    await advance();
    firePointer(child, "pointerover", { relatedTarget: parent });
    firePointer(child, "pointerout", { relatedTarget: parent });
    expect(tooltip()?.textContent).toBe("Parent tooltip");
    expect(parent.getAttribute("title")).toBeNull();
  });

  it("opens from keyboard focus, closes on focus loss, and preserves an existing aria description", async () => {
    mount();
    const trigger = addTrigger({ data: "Keyboard help.", describedBy: "existing-description" });
    fireFocus(trigger, "focusin");
    await advance();
    expect(tooltip()?.getAttribute("role")).toBe("tooltip");
    expect(trigger.getAttribute("aria-describedby")).toBe(TOOLTIP_ID);

    fireFocus(trigger, "focusout");
    expect(tooltip()).toBeNull();
    expect(trigger.getAttribute("aria-describedby")).toBe("existing-description");
  });

  it("handles touch cancellation, touch release, outside pointer dismissal, and Escape", async () => {
    mount();
    const trigger = addTrigger({ data: "Touch help." });
    const outside = document.createElement("div");
    document.body.append(outside);

    firePointer(trigger, "pointerover", { pointerType: "touch" });
    await advance();
    expect(tooltip()).toBeNull();

    firePointer(outside, "pointerdown", { pointerType: "touch" });
    await advance();
    expect(tooltip()).toBeNull();

    firePointer(trigger, "pointerdown", { pointerType: "touch" });
    firePointer(trigger, "pointerup", { pointerType: "touch" });
    await advance();
    expect(tooltip()).toBeNull();

    firePointer(trigger, "pointerdown", { pointerType: "touch" });
    await advance();
    expect(tooltip()).not.toBeNull();
    firePointer(trigger, "pointerup", { pointerType: "touch" });
    expect(tooltip()).toBeNull();

    firePointer(trigger, "pointerover");
    await advance();
    expect(tooltip()).not.toBeNull();
    firePointer(outside, "pointerdown");
    expect(tooltip()).toBeNull();

    firePointer(trigger, "pointerover");
    await advance();
    act(() => document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" })));
    expect(tooltip()).toBeNull();
  });

  it("switches triggers without leaving the first tooltip or its title mutation behind", async () => {
    mount();
    const first = addTrigger({ title: "First tooltip" }, { width: 40, height: 20, left: 100, top: 100 });
    const second = addTrigger({ title: "Second tooltip" }, { width: 40, height: 20, left: 200, top: 100 });

    firePointer(first, "pointerover");
    await advance();
    expect(tooltip()?.textContent).toBe("First tooltip");
    firePointer(second, "pointerover");
    expect(first.getAttribute("title")).toBe("First tooltip");
    await advance();
    expect(tooltip()?.textContent).toBe("Second tooltip");
    expect(first.hasAttribute("aria-describedby")).toBe(false);
    expect(second.getAttribute("aria-describedby")).toBe(TOOLTIP_ID);
  });

  it("chooses a collision-safe placement and clamps the tooltip near viewport edges", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 320 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 200 });
    mount();
    const trigger = addTrigger({ title: "Edge tooltip", placement: "top" }, { width: 40, height: 20, left: 2, top: 2 });

    firePointer(trigger, "pointerover");
    await advance();
    const node = tooltip();
    expect(node?.style.left).toBe("12px");
    expect(node?.style.top).toBe("34px");
    expect(node?.querySelector("span[aria-hidden='true']")?.getAttribute("class")).toContain("top-[-5px]");
  });

  it("falls back from an invalid preferred placement when no side has enough space", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 100 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 50 });
    mount();
    const trigger = addTrigger({ data: "Fallback placement.", placement: "diagonal" }, { width: 20, height: 20, left: 40, top: 15 });

    firePointer(trigger, "pointerover");
    await advance();
    expect(tooltip()?.style.left).toBe("12px");
    expect(tooltip()?.style.top).toBe("-2px");
  });

  it("recomputes placement after scroll and resize", async () => {
    mount();
    const trigger = addTrigger({ data: "Moveable tooltip." }, { width: 60, height: 20, left: 100, top: 100 });
    firePointer(trigger, "pointerover");
    await advance();
    const node = tooltip();
    const initialTop = node?.style.top;
    rects.set(trigger, rect({ width: 60, height: 20, left: 300, top: 300 }));
    await act(async () => {
      window.dispatchEvent(new Event("scroll"));
      window.dispatchEvent(new Event("resize"));
    });
    expect(node?.style.top).not.toBe(initialTop);
    expect(node?.style.left).toBe("270px");
  });

  it("cleans timers, listeners, portal state, and title restoration on unmount", async () => {
    mount();
    const trigger = addTrigger({ title: "Cleanup tooltip" });
    firePointer(trigger, "pointerover");
    act(() => root?.unmount());
    root = null;
    await advance();
    expect(tooltip()).toBeNull();
    expect(trigger.getAttribute("title")).toBe("Cleanup tooltip");
    expect(trigger.hasAttribute("aria-describedby")).toBe(false);

    const afterUnmount = addTrigger({ title: "Should stay hidden" });
    firePointer(afterUnmount, "pointerover");
    await advance();
    expect(tooltip()).toBeNull();
    expect(afterUnmount.getAttribute("title")).toBe("Should stay hidden");
  });
});
