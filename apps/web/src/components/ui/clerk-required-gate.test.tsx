import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildSignInRedirectHref } from "@/lib/auth/redirect-url";
import { ClerkRequiredGate } from "./clerk-required-gate";

describe("ClerkRequiredGate sign-in return href", () => {
  it.each(["blur", "disabled"] as const)(
    "renders the provided sign-in href in %s mode and keeps the sign-up fallback",
    (mode) => {
      const signInHref = buildSignInRedirectHref(
        "/sections/route?tab=history&filter=water",
      );
      const markup = renderToStaticMarkup(
        <ClerkRequiredGate
          isAuthenticated={false}
          mode={mode}
          signInHref={signInHref}
        >
          <div>Contenu réservé</div>
        </ClerkRequiredGate>,
      );

      expect(markup).toContain(`href="${signInHref}"`);
      expect(markup).toContain('href="/sign-up"');
    },
  );
});
