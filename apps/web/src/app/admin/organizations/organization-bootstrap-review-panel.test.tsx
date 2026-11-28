// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrganizationBootstrapReviewPanel } from "./organization-bootstrap-review-panel";

const application = {
  entryId: "accepted-alpha",
  organizationName: "Entreprise Alpha",
  legalIdentity: "alpha-ref",
  organizationType: "entreprise" as const,
  applicantEmail: "owner@example.test",
  applicantAccountAvailable: true,
};

let host: HTMLDivElement;
let root: Root;
let responseQueue: Response[];

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  responseQueue = [new Response(JSON.stringify({ applications: [application], hasMore: true }), { status: 200 })];
  vi.stubGlobal("fetch", vi.fn(async () => responseQueue.shift() ?? new Response("{}", { status: 200 })));
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

async function render(locale: "fr" | "en" = "fr") {
  await act(async () => {
    root.render(<OrganizationBootstrapReviewPanel locale={locale} />);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe("organization mandate review", () => {
  it("shows the bounded queue notice and blocks activation until an account and mandate are verified", async () => {
    await render();
    expect(host.textContent).toContain("Vérification du mandat");
    expect(host.textContent).toContain("Les 100 premières demandes sont affichées.");
    const select = host.querySelector("select") as HTMLSelectElement;
    const setSelect = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    setSelect?.call(select, application.entryId);
    await act(async () => { select.dispatchEvent(new Event("change", { bubbles: true })); });
    const activate = [...host.querySelectorAll("button")].find((button) => button.textContent === "Vérifier et activer");
    expect(activate?.disabled).toBe(true);
    expect(host.textContent).toContain("alpha-ref");

    const checkbox = host.querySelector('input[type="checkbox"]') as HTMLInputElement;
    await act(async () => { checkbox.click(); });
    expect(activate?.disabled).toBe(false);
    await act(async () => {
      activate?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const postCall = vi.mocked(fetch).mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(String(postCall?.[1]?.body))).toMatchObject({
      entryId: "accepted-alpha", organizerRef: "alpha-ref", mandateVerified: true,
    });
    expect(host.textContent).toContain("Organisation activée.");
    expect(host.textContent).not.toContain("Entreprise Alpha");
  });

  it("does not allow activation when the applicant's Clerk account is unavailable", async () => {
    responseQueue = [new Response(JSON.stringify({ applications: [{ ...application, applicantAccountAvailable: false, applicantEmail: null }], hasMore: false }), { status: 200 })];
    await render("en");
    const select = host.querySelector("select") as HTMLSelectElement;
    const setSelect = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    setSelect?.call(select, application.entryId);
    await act(async () => { select.dispatchEvent(new Event("change", { bubbles: true })); });
    expect(host.textContent).toContain("Account unavailable");
    expect((host.querySelector('input:not([type="checkbox"])') as HTMLInputElement).disabled).toBe(true);
    expect([...host.querySelectorAll("button")].find((button) => button.textContent === "Verify and activate")?.disabled).toBe(true);
  });

  it("shows a safe failure when the mandate activation is refused", async () => {
    responseQueue = [
      new Response(JSON.stringify({ applications: [application], hasMore: false }), { status: 200 }),
      new Response("{}", { status: 409 }),
    ];
    await render();
    const select = host.querySelector("select") as HTMLSelectElement;
    const setSelect = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    setSelect?.call(select, application.entryId);
    await act(async () => { select.dispatchEvent(new Event("change", { bubbles: true })); });
    const checkbox = host.querySelector('input[type="checkbox"]') as HTMLInputElement;
    await act(async () => { checkbox.click(); });
    const activate = [...host.querySelectorAll("button")].find((button) => button.textContent === "Vérifier et activer");
    await act(async () => {
      activate?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("Vérification ou activation refusée");
    expect(host.textContent).toContain("Entreprise Alpha");
  });
});
