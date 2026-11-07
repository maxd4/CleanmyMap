import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createInitialFormState } from "../payload";
import { ActionParticipantSection } from "./action-step-identity.participants";

describe("final participant composition fields", () => {
  it("renders the three editable categories without a second total field", () => {
    const form = createInitialFormState("Alice");
    form.adultCount = "2";
    form.retiredCount = "0";
    form.childrenCount = "1";

    const markup = renderToStaticMarkup(
      <ActionParticipantSection
        form={form}
        updateField={vi.fn()}
        userId="user-1"
        variant="counts"
        isActionMode
      />,
    );

    expect(markup).toContain('id="action-adult-count"');
    expect(markup).toContain('placeholder="Adultes"');
    expect(markup).toContain('id="action-retired-count"');
    expect(markup).toContain('placeholder="Retraités"');
    expect(markup).toContain('id="action-children-count"');
    expect(markup).toContain('placeholder="Enfants"');
    expect(markup).not.toContain('id="action-volunteers-count"');
    expect(markup).toContain("Total dérivé : 3 participants");
    expect((markup.match(/aria-hidden="true"/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
