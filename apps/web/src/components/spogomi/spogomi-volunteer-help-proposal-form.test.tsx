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
});
