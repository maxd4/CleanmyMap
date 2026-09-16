import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { getProfileSubtitle, type AppProfile } from "@/lib/profiles";
import { AccountSetupDisplayModeGrid, AccountSetupLocationFields, AccountSetupProfileGrid } from "./account-setup-sections";

describe("account setup choice controls", () => {
  it("renders profile choices as native radios with canonical subtitles", () => {
    const options: AppProfile[] = ["benevole", "coordinateur"];
    const markup = renderToStaticMarkup(
      <AccountSetupProfileGrid
        options={options}
        selectedProfile="benevole"
        locale="fr"
        onChange={vi.fn()}
      />,
    );

    expect(markup.match(/type="radio"/g)).toHaveLength(options.length);
    expect(markup).not.toContain('role="radio"');
    for (const profile of options) {
      expect(markup).toContain(getProfileSubtitle(profile, "fr"));
    }
  });

  it("renders display modes as native radios in one accessible group", () => {
    const markup = renderToStaticMarkup(
      <AccountSetupDisplayModeGrid
        selectedMode="exhaustif"
        locale="fr"
        onChange={vi.fn()}
        ariaLabelledBy="display-mode-title"
      />,
    );

    expect(markup.match(/type="radio"/g)).toHaveLength(3);
    expect(markup.match(/name="account-setup-display-mode"/g)).toHaveLength(3);
    expect(markup).toContain('role="radiogroup"');
    expect(markup).not.toContain('role="radio"');
  });

  it("uses the accessible location labels", () => {
    const markup = renderToStaticMarkup(
      <AccountSetupLocationFields
        residence={null}
        work={null}
        residenceEnabled={false}
        workEnabled={false}
        noneSelected={true}
        setResidence={vi.fn()}
        setWork={vi.fn()}
        setResidenceEnabled={vi.fn()}
        setWorkEnabled={vi.fn()}
        setNoneSelected={vi.fn()}
      />,
    );

    expect(markup).toContain("Ville de résidence");
    expect(markup).toContain("Ville de travail");
    expect(markup).toContain("Ne pas renseigner de lieu");
  });
});
