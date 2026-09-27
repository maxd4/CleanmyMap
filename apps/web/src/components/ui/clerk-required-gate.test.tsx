import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildSignInRedirectHref } from "@/lib/auth/redirect-url";
import { ClerkRequiredGate } from "./clerk-required-gate";

describe("ClerkRequiredGate sign-in return href", () => {
  it.each(["blur", "disabled"] as const)("keeps the supplied links in %s mode", (mode) => {
    const signInHref = buildSignInRedirectHref(
      "/sections/route?tab=history&filter=water",
    );
    const markup = renderToStaticMarkup(
      <ClerkRequiredGate
        isAuthenticated={false}
        mode={mode}
        signInHref={signInHref}
        signUpHref="/sign-up?source=gate"
      >
        <div>Contenu réservé</div>
      </ClerkRequiredGate>,
    );

    expect(markup).toContain(`href="${signInHref}"`);
    expect(markup).toContain('href="/sign-up?source=gate"');
    expect(markup.indexOf(`href="${signInHref}"`)).toBeLessThan(
      markup.indexOf('href="/sign-up?source=gate"'),
    );
    expect(markup).toContain(">Se connecter</a>");
    expect(
      [...markup.matchAll(/data-cmm-button-tone="(critical|primary)"/g)].map(
        ([, tone]) => tone,
      ),
    ).toEqual(["critical", "primary"]);
    expect(
      [...markup.matchAll(/data-cmm-button-variant="([^"]+)"/g)].map(
        ([, variant]) => variant,
      ),
    ).toEqual(["pill", "pill"]);
    expect(markup).toContain(">S&#x27;inscrire</a>");
    expect(markup).not.toContain("Créer un compte");
  });

  it("supports the alternative sign-up label without changing its contract", () => {
    const markup = renderToStaticMarkup(
      <ClerkRequiredGate
        isAuthenticated={false}
        signInHref="/sign-in?redirect_url=%2Fprofil"
        signUpHref="/sign-up?redirect_url=%2Fprofil"
        signUpLabel="Créer un compte"
      >
        <div>Contenu réservé</div>
      </ClerkRequiredGate>,
    );

    expect(markup).toContain('href="/sign-in?redirect_url=%2Fprofil"');
    expect(markup).toContain('href="/sign-up?redirect_url=%2Fprofil"');
    expect(markup).toContain(">Créer un compte</a>");
  });

  it("uses one shared auth card while blur and disabled only change the preview treatment", () => {
    const renderGate = (mode: "blur" | "disabled") =>
      renderToStaticMarkup(
        <ClerkRequiredGate isAuthenticated={false} mode={mode}>
          <div>Contenu réservé</div>
        </ClerkRequiredGate>,
      );
    const blurMarkup = renderGate("blur");
    const disabledMarkup = renderGate("disabled");

    expect(blurMarkup).toContain('data-auth-gate-mode="blur"');
    expect(disabledMarkup).toContain('data-auth-gate-mode="disabled"');
    expect(blurMarkup.match(/data-auth-gate-card="true"/g)).toHaveLength(1);
    expect(disabledMarkup.match(/data-auth-gate-card="true"/g)).toHaveLength(1);
    expect(blurMarkup).toContain("blur-sm");
    expect(disabledMarkup).toContain("opacity-60");
    expect(blurMarkup).toContain('data-cmm-button-tone="critical"');
    expect(disabledMarkup).toContain('data-cmm-button-tone="critical"');
  });
});
