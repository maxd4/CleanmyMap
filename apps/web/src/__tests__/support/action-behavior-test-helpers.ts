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
