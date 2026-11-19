import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AUTH_CLERK_APPEARANCE, AuthPageShell } from "./auth-page-shell";

describe("AuthPageShell", () => {
  it.each([
    ["sign-in", "Retrouvez votre espace d’action", "/sign-up"],
    ["sign-up", "Rejoignez la communauté écologique", "/sign-in"],
  ] as const)("keeps the %s route in the shared sober two-column auth composition", (variant, title, switchHref) => {
    const markup = renderToStaticMarkup(
      <AuthPageShell variant={variant}>
        <p>Clerk surface</p>
      </AuthPageShell>,
    );

    expect(markup).toContain(`data-auth-page="${variant}"`);
    expect(markup).toContain(title);
    expect(markup).toContain("max-w-[1060px]");
    expect(markup).toContain("lg:grid-cols-[minmax(0,38fr)_minmax(0,62fr)]");
    expect(markup).not.toContain('class="rounded-2xl border border-emerald-100 bg-white');
    expect(markup).not.toContain("Bénéfices CleanMyMap");
    expect(markup).toContain(`href="${switchHref}"`);
    expect(markup).toContain('href="/conditions-generales-utilisation"');
    expect(markup).toContain('href="/politique-confidentialite"');
    expect(markup).toContain(">Accueil</span>");
    expect(markup).toContain("logo-grand-sombre.png");
    expect(markup).toContain("logo-court.png");
    expect(markup).not.toContain("<h1");
    expect(markup).not.toContain("bg-slate-950");
    expect(markup).not.toContain("bg-indigo");
  });

  it("uses emerald Clerk appearance with visible subtitle and single shell-level switch", () => {
    expect(AUTH_CLERK_APPEARANCE.elements.footerAction).toContain("hidden");
    expect(AUTH_CLERK_APPEARANCE.elements.logoBox).toContain("hidden");
    expect(AUTH_CLERK_APPEARANCE.elements.headerSubtitle).not.toContain("hidden");
    expect(AUTH_CLERK_APPEARANCE.variables.colorPrimary).toBe("#059669");
    expect(AUTH_CLERK_APPEARANCE.elements.formButtonPrimary).toContain("bg-emerald-600");
  });
});
