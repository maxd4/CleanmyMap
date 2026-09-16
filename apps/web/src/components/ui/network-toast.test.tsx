import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NetworkToast } from "./network-toast";

const source = readFileSync(new URL("./network-toast.tsx", import.meta.url), "utf8");

describe("NetworkToast métier", () => {
  it("composes CmmToast while preserving retry, refresh and close actions", () => {
    const markup = renderToStaticMarkup(
      <NetworkToast
        title="Connexion perdue"
        message="Impossible de joindre le service."
        retryLabel="Réessayer maintenant"
        refreshLabel="Rafraîchir"
        onRetry={() => undefined}
        onRefresh={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(markup).toContain('class="cmm-toast');
    expect(markup).toContain('data-toast-tone="error"');
    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Impossible de joindre le service.");
    expect(markup).toContain("Réessayer maintenant");
    expect(markup).toContain("Rafraîchir");
    expect(markup).toContain('aria-label="Fermer l&#x27;alerte réseau"');
  });

  it("keeps event subscription and auto-dismiss in NetworkToastHost", () => {
    expect(source).toContain("NETWORK_TOAST_EVENT");
    expect(source).toContain("window.addEventListener");
    expect(source).toContain("window.removeEventListener");
    expect(source).toContain("toast.durationMs ?? 7000");
    expect(source).toContain("onRetry={toast.onRetry}");
    expect(source).toContain("onRefresh={toast.onRefresh}");
    expect(source).toContain("onClose={() => setToast(null)}");
  });
});
