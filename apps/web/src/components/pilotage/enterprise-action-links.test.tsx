import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EnterpriseActionLinks } from "./enterprise-action-links";

vi.mock("@/components/ui/cmm-card", () => ({ CmmCard: ({ children }: { children: ReactNode }) => <article>{children}</article> }));
vi.mock("@/components/ui/cmm-button", () => ({ CmmButton: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));

describe("enterprise action resources", () => {
  it("links action creation, participation, history and reports", () => {
    const html = renderToStaticMarkup(<EnterpriseActionLinks locale="fr" view="actions" />);
    for (const path of ["/actions/new?tab=before", "/sections/rejoindre-une-action", "/actions/history", "/reports"]) expect(html).toContain(path);
  });
  it("links local opportunities without granting pilotage or admin", () => {
    const html = renderToStaticMarkup(<EnterpriseActionLinks locale="en" view="opportunities" />);
    for (const path of ["/actions/map", "/sections/annuaire", "/partners/onboarding", "/learn/bonnes-pratiques"]) expect(html).toContain(path);
    expect(html).not.toContain("/partners/dashboard");
    expect(html).not.toContain("/pilotage");
  });
});
