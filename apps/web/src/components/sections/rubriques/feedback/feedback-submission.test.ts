import { describe, expect, it, vi } from "vitest";
import { buildFeedbackCanonicalHref } from "../feedback-section.shared";
import {
  buildSuggestedFeedbackTitle,
  FEEDBACK_DESCRIPTION_MAX_LENGTH,
  formatQuestionnaireDescription,
  isFeedbackDescriptionWithinLimit,
  submitFeedbackQuestionnaire,
} from "./feedback-submission";
import { QUESTIONNAIRES } from "./questionnaire-config";

describe("feedback submission contract", () => {
  function valuesForDescriptionLength(
    type: (typeof QUESTIONNAIRES)[number]["id"],
    targetLength: number,
  ) {
    const questionnaire = QUESTIONNAIRES.find((candidate) => candidate.id === type)!;
    const values = Object.fromEntries(
      questionnaire.fields.map((field) => [field.key, "x".repeat(field.minLength ?? 1)]),
    );
    const pagePath = `/sections/feedback#${type}`;
    const currentLength = formatQuestionnaireDescription(
      questionnaire,
      values,
      pagePath,
      "fr",
    ).length;
    const firstField = questionnaire.fields[0].key;
    values[firstField] += "x".repeat(targetLength - currentLength);
    return { questionnaire, values, pagePath };
  }

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

  it("suggests an editable title from the first useful answer when the title is blank", () => {
    const questionnaire = QUESTIONNAIRES.find((candidate) => candidate.id === "bug")!;
    const values = {
      subject: "",
      context: "J'ouvrais la carte depuis Missions",
      steps: "La carte restait vide",
      expected: "La carte devait apparaître",
    };

    expect(buildSuggestedFeedbackTitle(questionnaire, values, "fr")).toBe(
      "Bug signalé — J'ouvrais la carte depuis Missions",
    );
  });

  it("keeps an explicitly edited title instead of replacing it", () => {
    const questionnaire = QUESTIONNAIRES.find((candidate) => candidate.id === "bug")!;
    expect(
      buildSuggestedFeedbackTitle(
        questionnaire,
        { subject: "Titre choisi", context: "Autre contexte" },
        "fr",
      ),
    ).toBe("Titre choisi");
  });

  it("submits an explicitly edited collaboration title", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ requestId: "collaboration-42" }), { status: 201 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const questionnaire = QUESTIONNAIRES.find((candidate) => candidate.id === "collaboration")!;
    const values = Object.fromEntries(
      questionnaire.fields.map((field) => [field.key, `Valeur ${field.key}`]),
    );
    values.subject = "Partenariat terrain choisi";

    await submitFeedbackQuestionnaire({
      questionnaire,
      values,
      pagePath: "/sections/feedback",
      source: "feedback_section",
      locale: "fr",
      honeypot: "",
      submittedAt: Date.now(),
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as { title: string };
    expect(body.title).toBe("Partenariat terrain choisi");
    vi.unstubAllGlobals();
  });

  it("suggests a collaboration title when the optional title is absent", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ requestId: "collaboration-43" }), { status: 201 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const questionnaire = QUESTIONNAIRES.find((candidate) => candidate.id === "collaboration")!;
    const values = Object.fromEntries(
      questionnaire.fields.map((field) => [field.key, `Valeur ${field.key}`]),
    );
    values.subject = "";

    await submitFeedbackQuestionnaire({
      questionnaire,
      values,
      pagePath: "/sections/feedback",
      source: "feedback_section",
      locale: "fr",
      honeypot: "",
      submittedAt: Date.now(),
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as { title: string };
    expect(body.title).toBe("Collaboration proposée — Valeur organization");
    vi.unstubAllGlobals();
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
    ).resolves.toEqual({
      requestId: "report-42",
      screenshot: "not_requested",
      screenshotError: null,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/community/bug-reports",
      expect.objectContaining({ method: "POST" }),
    );

    vi.unstubAllGlobals();
  });

  it("accepts a serialized description exactly at the API limit", () => {
    const { questionnaire, values, pagePath } = valuesForDescriptionLength(
      "improvement",
      FEEDBACK_DESCRIPTION_MAX_LENGTH,
    );
    const description = formatQuestionnaireDescription(
      questionnaire,
      values,
      pagePath,
      "fr",
    );

    expect(description).toHaveLength(FEEDBACK_DESCRIPTION_MAX_LENGTH);
    expect(isFeedbackDescriptionWithinLimit(description)).toBe(true);
  });

  it("blocks a serialized description one character over the API limit before fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { questionnaire, values } = valuesForDescriptionLength(
      "improvement",
      FEEDBACK_DESCRIPTION_MAX_LENGTH + 1,
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
    ).rejects.toThrow("Votre retour est trop long");
    expect(fetchMock).not.toHaveBeenCalled();

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
