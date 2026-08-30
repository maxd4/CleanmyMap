import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CmmFeedback } from "./cmm-feedback";

const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
const source = readFileSync(new URL("./cmm-feedback.tsx", import.meta.url), "utf8");

describe("canonical inline feedback", () => {
  it.each([
    ["info", "status"],
    ["success", "status"],
    ["warning", "alert"],
    ["error", "alert"],
  ] as const)("uses role %s for the %s tone", (tone, role) => {
    const markup = renderToStaticMarkup(
      <CmmFeedback tone={tone} title="Information" action={<button type="button">Fermer</button>}>
        Contenu du feedback
      </CmmFeedback>,
    );

    expect(markup).toContain(`class="cmm-feedback"`);
    expect(markup).toContain(`data-feedback-tone="${tone}"`);
    expect(markup).toContain(`role="${role}"`);
    expect(markup).toContain('class="cmm-feedback-title"');
    expect(markup).toContain('class="cmm-feedback-content"');
    expect(markup).toContain('class="cmm-feedback-action"');
  });

  it("keeps feedback separate from field-error composition", () => {
    expect(source).not.toContain("CmmField");
    expect(css).toContain(".cmm-feedback");
    expect(css).toContain(".cmm-feedback-title");
    expect(css).toContain(".cmm-feedback-action");
  });
});
