/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SpogomiVolunteerHelpProposalForm } from "./spogomi-volunteer-help-proposal-form";

const authMock = vi.hoisted(() => vi.fn());
vi.mock("@clerk/nextjs", () => ({ useAuth: authMock }));
const testEmail = ["ada", "example.test"].join("@");

function setValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(element.constructor.prototype, "value")?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("SpogomiVolunteerHelpProposalForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ proposals: [] }), { status: 200, headers: { "content-type": "application/json" } })));
  });

  it("keeps the help proposal visibly separate from the sports quiz and sends only the assistance payload", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => { root.render(<SpogomiVolunteerHelpProposalForm eventId="event-1" signInHref="/sign-in" />); });
    expect(container.textContent).toContain("Proposer mon aide à l’organisation");
    expect(container.textContent).not.toContain("quiz");
    const firstName = container.querySelector("input") as HTMLInputElement;
    const textareas = container.querySelectorAll("textarea");
    setValue(firstName, "Ada");
    setValue(container.querySelectorAll("input")[1]!, "Lovelace");
    setValue(container.querySelectorAll("input")[2]!, testEmail);
    setValue(textareas[0]!, "Je souhaite aider l’équipe locale.");
    setValue(textareas[1]!, "Organisation.");
    await act(async () => { (container.querySelector("form") as HTMLFormElement).requestSubmit(); });
    const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
    const post = calls.find((call) => (call[1] as RequestInit | undefined)?.method === "POST");
    expect(post).toBeTruthy();
    const payload = JSON.parse(String((post?.[1] as RequestInit).body)) as Record<string, unknown>;
    expect(payload).toMatchObject({ contactFirstName: "Ada", contactLastName: "Lovelace", contactEmail: testEmail, motivation: "Je souhaite aider l’équipe locale.", usefulSkills: "Organisation." });
    expect(payload).not.toHaveProperty("quizVersion");
    await act(async () => root.unmount());
    container.remove();
  });

  it("reuses the same idempotency key after a lost response", async () => {
    let postCount = 0;
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method !== "POST") return Promise.resolve(new Response(JSON.stringify({ proposals: [] }), { status: 200 }));
      postCount += 1;
      if (postCount === 1) return Promise.reject(new Error("network lost"));
      return Promise.resolve(new Response(JSON.stringify({ proposal: { id: "proposal-1", status: "pending", decisionNote: null, createdAt: "2026-11-09T10:00:00.000Z" } }), { status: 201 }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => { root.render(<SpogomiVolunteerHelpProposalForm eventId="event-1" signInHref="/sign-in" />); });
    setValue(container.querySelectorAll("input")[0]!, "Ada");
    setValue(container.querySelectorAll("input")[1]!, "Lovelace");
    setValue(container.querySelectorAll("input")[2]!, testEmail);
    const textareas = container.querySelectorAll("textarea");
    setValue(textareas[0]!, "Je souhaite aider l’équipe locale.");
    setValue(textareas[1]!, "Organisation.");
    const form = container.querySelector("form") as HTMLFormElement;
    await act(async () => { form.requestSubmit(); });
    await act(async () => { form.requestSubmit(); });
    const posts = fetchMock.mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method === "POST");
    const first = JSON.parse(String((posts[0]![1] as RequestInit).body)) as { idempotencyKey: string };
    const second = JSON.parse(String((posts[1]![1] as RequestInit).body)) as { idempotencyKey: string };
    expect(second.idempotencyKey).toBe(first.idempotencyKey);
    await act(async () => root.unmount());
    container.remove();
  });

  it("does not announce success when the server rejects a changed replay", async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method !== "POST") return Promise.resolve(new Response(JSON.stringify({ proposals: [] }), { status: 200 }));
      return Promise.resolve(new Response(JSON.stringify({ error: "Cette clé de rejeu est déjà associée à un autre contenu." }), { status: 409 }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => { root.render(<SpogomiVolunteerHelpProposalForm eventId="event-1" signInHref="/sign-in" />); });
    setValue(container.querySelectorAll("input")[0]!, "Ada");
    setValue(container.querySelectorAll("input")[1]!, "Lovelace");
    setValue(container.querySelectorAll("input")[2]!, testEmail);
    const textareas = container.querySelectorAll("textarea");
    setValue(textareas[0]!, "Je souhaite aider l’équipe locale.");
    setValue(textareas[1]!, "Organisation.");
    await act(async () => { (container.querySelector("form") as HTMLFormElement).requestSubmit(); });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("clé de rejeu");
    expect(container.querySelector('[role="status"]')?.textContent ?? "").not.toContain("transmise");
    await act(async () => root.unmount());
    container.remove();
  });
});
