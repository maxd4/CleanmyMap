import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AuthPageShell } from "./auth-page-shell";

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
    expect(markup).toContain('class="rounded-2xl border border-slate-200 bg-white');
    expect(markup).toContain(`href="${switchHref}"`);
  });
});
