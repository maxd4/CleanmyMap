// @vitest-environment jsdom

import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDropdownPlacement } from "./use-dropdown-placement";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Rect = { top: number; bottom: number; left: number; width: number; height: number };

class ResizeObserverProbe {
  static instances: ResizeObserverProbe[] = [];
  readonly observe = vi.fn();
  readonly disconnect = vi.fn();
  readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    ResizeObserverProbe.instances.push(this);
  }

  unobserve() {}
}

function Probe({
  isOpen,
  panelRect,
  triggerRect,
}: {
  isOpen: boolean;
  panelRect: Rect;
  triggerRect: Rect;
}) {
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const placement = useDropdownPlacement({ isOpen, panelRef, triggerRef });

  return (
    <>
      <button
        ref={(node) => {
          triggerRef.current = node;
          if (node) {
            node.getBoundingClientRect = () => triggerRect as DOMRect;
          }
        }}
      >
        trigger
      </button>
      <div
        ref={(node) => {
          panelRef.current = node;
          if (node) {
            node.getBoundingClientRect = () => panelRect as DOMRect;
          }
        }}
        data-open-up={String(placement.openUp)}
        data-trigger-left={String(placement.triggerRect?.left ?? "none")}
        data-panel-width={String(placement.panelWidth)}
        data-viewport-width={String(placement.viewportWidth)}
      />
    </>
  );
}

describe("useDropdownPlacement behavior", () => {
  let host: HTMLDivElement | undefined;
  let root: Root | undefined;

  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    ResizeObserverProbe.instances = [];
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function renderProbe(props: React.ComponentProps<typeof Probe>) {
    host = document.createElement("div");
    document.body.appendChild(host);
    act(() => {
      root = createRoot(host!);
      root.render(<Probe {...props} />);
    });
  }

  it("measures an open panel, observes resize, and reacts to scroll and resize", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
    vi.stubGlobal("ResizeObserver", ResizeObserverProbe);
    vi.useFakeTimers();

    const triggerRect = { top: 700, bottom: 740, left: 300, width: 120, height: 40 };
    const panelRect = { top: 0, bottom: 0, left: 0, width: 280, height: 200 };
    renderProbe({ isOpen: true, panelRect, triggerRect });

    const panel = host!.querySelector<HTMLDivElement>("div")!;
    expect(panel.dataset.openUp).toBe("true");
    expect(panel.dataset.triggerLeft).toBe("300");
    expect(panel.dataset.panelWidth).toBe("280");
    expect(panel.dataset.viewportWidth).toBe("1024");
    expect(ResizeObserverProbe.instances).toHaveLength(1);
    expect(ResizeObserverProbe.instances[0]!.observe).toHaveBeenCalledTimes(1);

    act(() => {
      triggerRect.top = 100;
      triggerRect.bottom = 140;
      window.dispatchEvent(new Event("scroll"));
      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(600);
    });
    expect(panel.dataset.openUp).toBe("false");
  });

  it("cleans timers, listeners and observers when the panel closes", () => {
    vi.stubGlobal("ResizeObserver", ResizeObserverProbe);
    vi.useFakeTimers();
    const triggerRect = { top: 40, bottom: 80, left: 12, width: 120, height: 40 };
    const panelRect = { top: 0, bottom: 0, left: 0, width: 240, height: 120 };
    renderProbe({ isOpen: true, panelRect, triggerRect });
    const observer = ResizeObserverProbe.instances[0]!;

    act(() => {
      root!.render(<Probe isOpen={false} panelRect={panelRect} triggerRect={triggerRect} />);
    });
    expect(observer.disconnect).toHaveBeenCalledTimes(1);

    const currentPanel = host!.querySelector<HTMLDivElement>("div")!;
    const placementBeforeCleanupEvent = currentPanel.dataset.triggerLeft;
    act(() => {
      window.dispatchEvent(new Event("scroll"));
      vi.advanceTimersByTime(600);
    });
    expect(currentPanel.dataset.triggerLeft).toBe(placementBeforeCleanupEvent);
  });

  it("refreshes after fonts settle and ignores a rejected font promise", async () => {
    const originalFonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    const triggerRect = { top: 320, bottom: 360, left: 24, width: 120, height: 40 };
    const panelRect = { top: 0, bottom: 0, left: 0, width: 200, height: 120 };

    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: Promise.resolve() },
    });
    renderProbe({ isOpen: true, panelRect, triggerRect });
    await act(async () => {
      await Promise.resolve();
    });

    let rejectFonts!: (reason?: unknown) => void;
    const rejectedReady = new Promise<void>((_, reject) => {
      rejectFonts = reject;
    });
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: rejectedReady },
    });
    act(() => {
      root!.render(<Probe isOpen={false} panelRect={panelRect} triggerRect={triggerRect} />);
    });
    act(() => {
      root!.render(<Probe isOpen={true} panelRect={panelRect} triggerRect={triggerRect} />);
    });
    rejectFonts(new Error("font probe"));
    await act(async () => {
      await Promise.resolve();
    });

    if (originalFonts === undefined) {
      Reflect.deleteProperty(document, "fonts");
    } else {
      Object.defineProperty(document, "fonts", { configurable: true, value: originalFonts });
    }
  });
});
