import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AUTH_CLERK_APPEARANCE, AuthPageShell } from "./auth-page-shell";

describe("AuthPageShell", () => {
  it.each([
    ["sign-in", "Retrouvez votre espace d’action", "/sign-up"],
    ["sign-up", "Rejoignez la communauté écologique", "/sign-in"],
  ] as const)("keeps the %s route in the shared auth composition", (variant, title, switchHref) => {
    const markup = renderToStaticMarkup(
      <AuthPageShell variant={variant}>
        <p>Clerk surface</p>
      </AuthPageShell>,
    );

    expect(markup).toContain(`data-auth-page="${variant}"`);
    expect(markup).toContain(title);
    expect(markup).toContain('class="rounded-2xl border border-emerald-100 bg-white');
    expect(markup).toContain(`href="${switchHref}"`);
    expect(markup).toContain(">Accueil</span>");
    expect(markup).toContain("logo-grand-sombre.png");
    expect(markup).toContain("logo-court.png");
    expect(markup).not.toContain("Famille autonome Auth");
    expect(markup).not.toContain("bg-slate-950");
    expect(markup).not.toContain("bg-indigo");
  });

  it("uses supported Clerk appearance elements for one shell-level switch", () => {
    expect(AUTH_CLERK_APPEARANCE.elements.footerAction).toBe("hidden");
    expect(AUTH_CLERK_APPEARANCE.elements.headerSubtitle).toBe("hidden");
    expect(AUTH_CLERK_APPEARANCE.variables.colorPrimary).toBe("#a06c00");
    expect(AUTH_CLERK_APPEARANCE.elements.formButtonPrimary).toContain("bg-[#a06c00]");
  });
});
