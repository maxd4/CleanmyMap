import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CmmField, CmmInput, CmmSelect, CmmTextarea } from "./cmm-field";

const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
const source = readFileSync(new URL("./cmm-field.tsx", import.meta.url), "utf8");

describe("canonical form fields", () => {
  it("associates an input with its label, hint and required error state", () => {
    const markup = renderToStaticMarkup(
      <CmmField
        id="email"
        label="Adresse e-mail"
        required
        hint="Utilisée uniquement pour vous répondre."
        error="Saisissez une adresse valide."
      >
        <CmmInput name="email" type="email" placeholder="vous@example.com" />
      </CmmField>,
    );

    expect(markup).toContain('<label class="cmm-field-label" for="email">Adresse e-mail');
    expect(markup).toContain("(requis)");
    expect(markup).toContain('class="cmm-field-control"');
    expect(markup).toContain('data-cmm-field-control="input"');
    expect(markup).toContain('id="email"');
    expect(markup).toContain('aria-required="true"');
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain('aria-describedby="email-hint email-error"');
    expect(markup).toContain('id="email-hint"');
    expect(markup).toContain('id="email-error" role="alert"');
  });

  it("keeps native select props and disabled semantics", () => {
    const markup = renderToStaticMarkup(
      <CmmField id="territory" label="Territoire" hint="Choisissez une zone.">
        <CmmSelect name="territory" defaultValue="fr" disabled>
          <option value="fr">France</option>
        </CmmSelect>
      </CmmField>,
    );

    expect(markup).toContain('for="territory"');
    expect(markup).toContain('data-cmm-field-control="select"');
    expect(markup).toContain('name="territory"');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('aria-describedby="territory-hint"');
  });

  it("renders textarea content and preserves its native attributes", () => {
    const markup = renderToStaticMarkup(
      <CmmField id="message" label="Message">
        <CmmTextarea name="message" rows={6} defaultValue="Bonjour" />
      </CmmField>,
    );

    expect(markup).toContain('data-cmm-field-control="textarea"');
    expect(markup).toContain('name="message"');
    expect(markup).toContain('rows="6"');
    expect(markup).toContain(">Bonjour</textarea>");
  });

  it("keeps refs native and the visual contract CSS-only", () => {
    expect(source).toContain("forwardRef<HTMLInputElement");
    expect(source).toContain("forwardRef<HTMLSelectElement");
    expect(source).toContain("forwardRef<HTMLTextAreaElement");

    for (const token of [
      "--cmm-field-control-height: 2.75rem",
      "--cmm-field-control-padding-x: 0.875rem",
      "--cmm-field-control-radius: var(--radius-sm)",
      "--cmm-field-control-focus-ring: var(--focus-ring)",
      "--cmm-field-control-shadow",
      "--cmm-field-control-transition",
      ".cmm-field-label",
      ".cmm-field-hint",
      ".cmm-field-error",
    ]) {
      expect(css).toContain(token);
    }

    expect(css).toContain('[data-display-mode="minimaliste"] .cmm-field-control');
    expect(css).toContain('[data-display-mode="sobre"] .cmm-field-control');
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");

    const fieldCss = css.slice(css.indexOf("FORM FIELDS - shared geometry"), css.indexOf("FORM FIELD POLISH"));
    expect(fieldCss).not.toContain("gradient");
    expect(fieldCss).not.toContain("blur");
    expect(fieldCss).not.toContain("transform");
  });
});
