import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ReactTestRenderer } from "react-test-renderer";

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function rendererText(renderer: ReactTestRenderer): string {
  return renderer.root
    .findAll((node) => node.children.some((child) => typeof child === "string"))
    .map((node) => node.children.filter((child) => typeof child === "string").join(" "))
    .join(" ");
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

export function createReactDomHarness() {
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  return {
    mount(node: ReactNode): HTMLDivElement {
      const mountedHost = document.createElement("div");
      document.body.append(mountedHost);
      host = mountedHost;
      root = createRoot(mountedHost);
      act(() => root?.render(node));
      return mountedHost;
    },
    render(node: ReactNode): void {
      act(() => root?.render(node));
    },
    async flush(): Promise<void> {
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
    },
    cleanup(): void {
      if (root) act(() => root?.unmount());
      host?.remove();
      root = null;
      host = null;
    },
  };
}
