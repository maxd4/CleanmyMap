import { describe, expect, it, vi } from "vitest";
import { buildFeedbackCanonicalHref } from "../feedback-section.shared";
import { formatQuestionnaireDescription, submitFeedbackQuestionnaire } from "./feedback-submission";
import { QUESTIONNAIRES } from "./questionnaire-config";

describe("feedback submission contract", () => {
  it.each(["bug", "idea", "improvement", "collaboration"] as const)(
    "formats the %s questionnaire for the existing API contract",
    (type) => {
      const questionnaire = QUESTIONNAIRES.find((candidate) => candidate.id === type);
      expect(questionnaire).toBeDefined();

      const values = Object.fromEntries(
        questionnaire!.fields.map((field) => [field.key, `Valeur ${field.key}`]),
      );
      const description = formatQuestionnaireDescription(
        questionnaire!,
        values,
        `/sections/feedback#${type}`,
        "fr",
      );

      expect(description).toContain(`Type: ${questionnaire!.title.fr}`);
      expect(description).toContain(`Page: /sections/feedback#${type}`);
      expect(description).toContain("Valeur");
    },
  );

  it("keeps the bug prefill and discussion provenance on the canonical link", () => {
    expect(
      buildFeedbackCanonicalHref({
        type: "bug",
        source: "feedback_discussion",
        supportPrefill: {
          subject: "Carte bloquée",
          context: "Mobile",
          steps: "Ouvrir la carte",
          expected: "La carte s'affiche",
        },
      }),
    ).toBe(
      "/sections/feedback?type=bug&subject=Carte+bloqu%C3%A9e&context=Mobile&steps=Ouvrir+la+carte&expected=La+carte+s%27affiche&source=feedback_discussion#bug",
    );
  });

  it("returns the request id from the existing API response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "queued", requestId: "report-42" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const questionnaire = QUESTIONNAIRES.find((candidate) => candidate.id === "idea")!;
    const values = Object.fromEntries(
      questionnaire.fields.map((field) => [field.key, `Valeur ${field.key}`]),
    );

    await expect(
      submitFeedbackQuestionnaire({
        questionnaire,
        values,
        pagePath: "/sections/feedback",
        source: "feedback_section",
        locale: "fr",
        honeypot: "",
        submittedAt: Date.now(),
      }),
    ).resolves.toEqual({ requestId: "report-42" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/community/bug-reports",
      expect.objectContaining({ method: "POST" }),
    );

    vi.unstubAllGlobals();
  });

  it("surfaces an API failure instead of treating it as a submission", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Quota atteint." }), {
          status: 429,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const questionnaire = QUESTIONNAIRES.find((candidate) => candidate.id === "idea")!;
    const values = Object.fromEntries(
      questionnaire.fields.map((field) => [field.key, `Valeur ${field.key}`]),
    );

    await expect(
      submitFeedbackQuestionnaire({
        questionnaire,
        values,
        pagePath: "/sections/feedback",
        source: "feedback_section",
        locale: "fr",
        honeypot: "",
        submittedAt: Date.now(),
      }),
    ).rejects.toThrow("Quota atteint.");

    vi.unstubAllGlobals();
  });
});
