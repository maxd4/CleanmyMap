import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CmmToast } from "./cmm-toast";

const source = readFileSync(new URL("./cmm-toast.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../../styles/states-feedback.css", import.meta.url), "utf8");

describe("CmmToast", () => {
  it("renders title, message, icon, actions and an accessible close button", () => {
    const markup = renderToStaticMarkup(
      <CmmToast
        title="Connexion"
        icon={<span>!</span>}
        actions={<button type="button">Réessayer</button>}
        onClose={() => undefined}
        closeLabel="Fermer la notification"
      >
        Le service est momentanément indisponible.
      </CmmToast>,
    );

    expect(markup).toContain('class="cmm-toast"');
    expect(markup).toContain('data-toast-tone="neutral"');
    expect(markup).toContain('class="cmm-toast__icon"');
    expect(markup).toContain('class="cmm-toast__title cmm-text-caption"');
    expect(markup).toContain('class="cmm-toast__message cmm-text-small"');
    expect(markup).toContain('class="cmm-toast__actions"');
    expect(markup).toContain('aria-label="Fermer la notification"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('>Connexion</p>');
    expect(markup).toContain("Le service est momentanément indisponible.");
    expect(markup).toContain(">Réessayer</button>");
  });

  it.each([
    ["polite", "status"],
    ["assertive", "alert"],
  ] as const)("maps announcement %s to role %s", (announcement, role) => {
    const markup = renderToStaticMarkup(
      <CmmToast announcement={announcement} message="Contenu" />,
    );

    expect(markup).toContain(`role="${role}"`);
  });

  it("does not create a live region when announcement is none", () => {
    const markup = renderToStaticMarkup(
      <CmmToast announcement="none" message="Contenu discret" />,
    );

    expect(markup).not.toContain("role=");
    expect(markup).not.toContain("aria-live");
  });

  it("keeps presentation separate from lifecycle and side effects", () => {
    for (const forbiddenMarker of [
      "setTimeout",
      "setInterval",
      "addEventListener",
      "dispatchEvent",
      "onRetry",
      "dedupeKey",
      "confetti",
    ]) {
      expect(source).not.toContain(forbiddenMarker);
    }
  });

  it("keeps canonical caption sizing and display-mode motion adaptations", () => {
    expect(source).toContain("cmm-text-caption");
    expect(source).toContain("cmm-text-small");
    expect(source).not.toContain("text-[10px]");
    expect(css).toContain(".cmm-toast");
    expect(css).toContain('[data-display-mode="minimaliste"] .cmm-toast');
    expect(css).toContain('[data-display-mode="sobre"] .cmm-toast');
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).not.toContain(".cmm-toast {\n    animation");
  });
});
