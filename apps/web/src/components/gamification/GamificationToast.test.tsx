import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import GamificationToast from "./GamificationToast";

const toastSource = readFileSync(new URL("./GamificationToast.tsx", import.meta.url), "utf8");
const hostSource = readFileSync(new URL("./GamificationCelebrationHost.tsx", import.meta.url), "utf8");

const tones = ["explorer", "forms", "clean-zones", "actions", "generic"] as const;

describe("GamificationToast métier", () => {
  it.each(tones)("keeps the %s domain tone while composing the common shell", (tone) => {
    const markup = renderToStaticMarkup(
      <GamificationToast title="Palier atteint" message="Bravo" tone={tone} />,
    );

    expect(markup).toContain('class="cmm-toast');
    expect(markup).toContain('data-toast-tone="neutral"');
    expect(markup).toContain("Bravo");
  });

  it("uses a polite announcement and keeps close behavior", () => {
    const markup = renderToStaticMarkup(
      <GamificationToast message="Bravo" onClose={() => undefined} />,
    );

    expect(markup).toContain('role="status"');
    expect(markup).toContain("Fermer la notification de gamification");
    expect(toastSource).toContain('announcement="polite"');
    expect(toastSource).not.toContain("text-[10px]");
  });

  it("keeps lifecycle, deduplication and side effects in the host", () => {
    for (const marker of [
      "GAMIFICATION_CELEBRATION_EVENT",
      "dedupeKey",
      "durationMs",
      "confetti",
      "sound",
      "AnimatePresence",
      "motion.div",
    ]) {
      expect(hostSource).toContain(marker);
    }

    expect(toastSource).not.toContain("setTimeout");
    expect(toastSource).not.toContain("dedupeKey");
    expect(toastSource).not.toContain("confetti");
  });
});
