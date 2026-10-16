import type { ReactNode } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QuestionnaireCard } from "./questionnaire-card";
import {
  FEEDBACK_DESCRIPTION_MAX_LENGTH,
  formatQuestionnaireDescription,
} from "./feedback-submission";
import { QUESTIONNAIRES } from "./questionnaire-config";

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ isLoaded: true, isSignedIn: true }),
}));
vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ locale: "fr" }),
}));
vi.mock("@/components/ui/cmm-card", () => ({
  CmmCard: ({ children, header }: { children: ReactNode; header: ReactNode }) => (
    <section>
      {header}
      {children}
    </section>
  ),
}));
vi.mock("@/components/ui/cmm-button", () => ({
  CmmButton: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
    <button {...props}>{children}</button>
  ),
}));
vi.mock("@/lib/auth/redirect-url", () => ({
  buildSignInRedirectHref: (href: string) => href,
}));

function valuesForDescriptionLength(targetLength: number) {
  const questionnaire = QUESTIONNAIRES.find((candidate) => candidate.id === "improvement")!;
  const values = Object.fromEntries(
    questionnaire.fields.map((field) => [field.key, "x".repeat(field.minLength ?? 1)]),
  );
  const pagePath = "/sections/feedback";
  const currentLength = formatQuestionnaireDescription(
    questionnaire,
    values,
    `${pagePath}#improvement`,
    "fr",
  ).length;
  values[questionnaire.fields[0].key] += "x".repeat(targetLength - currentLength);
  return { questionnaire, values };
}

function submitButton(renderer: ReactTestRenderer) {
  return renderer.root.findAllByType("button").find(
    (button) => button.props.type === "submit",
  );
}

describe("QuestionnaireCard serialized description validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the submit button enabled exactly at the API limit", () => {
    const { questionnaire, values } = valuesForDescriptionLength(
      FEEDBACK_DESCRIPTION_MAX_LENGTH,
    );
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <QuestionnaireCard
          questionnaire={questionnaire}
          pagePath="/sections/feedback"
          source="feedback_section"
          initialValues={values}
        />,
      );
    });

    expect(submitButton(renderer)?.props.disabled).toBe(false);
  });

  it("disables submit and explains the overflow after one extra character", () => {
    const { questionnaire, values } = valuesForDescriptionLength(
      FEEDBACK_DESCRIPTION_MAX_LENGTH + 1,
    );
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <QuestionnaireCard
          questionnaire={questionnaire}
          pagePath="/sections/feedback"
          source="feedback_section"
          initialValues={values}
        />,
      );
    });

    expect(submitButton(renderer)?.props.disabled).toBe(true);
    expect(JSON.stringify(renderer.toJSON())).toContain(
      "Votre retour dépasse la limite de 3000 caractères",
    );
  });

  it("shows the optional private screenshot control only for Bug", () => {
    const bugQuestionnaire = QUESTIONNAIRES.find((candidate) => candidate.id === "bug")!;
    const ideaQuestionnaire = QUESTIONNAIRES.find((candidate) => candidate.id === "idea")!;
    let bugRenderer!: ReactTestRenderer;
    let ideaRenderer!: ReactTestRenderer;

    act(() => {
      bugRenderer = create(
        <QuestionnaireCard
          questionnaire={bugQuestionnaire}
          pagePath="/sections/feedback"
          source="feedback_section"
        />,
      );
      ideaRenderer = create(
        <QuestionnaireCard
          questionnaire={ideaQuestionnaire}
          pagePath="/sections/feedback"
          source="feedback_section"
        />,
      );
    });

    expect(JSON.stringify(bugRenderer.toJSON())).toContain("Capture d'écran (facultatif)");
    expect(bugRenderer.root.findByProps({ type: "file" }).props.accept).toBe(
      "image/jpeg,image/png,image/webp",
    );
    expect(JSON.stringify(ideaRenderer.toJSON())).not.toContain("Capture d'écran (facultatif)");
  });

  it("keeps the four collaboration fields and adds an optional editable title", () => {
    const collaboration = QUESTIONNAIRES.find((candidate) => candidate.id === "collaboration")!;

    expect(collaboration.fields.map((field) => field.key)).toEqual([
      "subject",
      "organization",
      "purpose",
      "contribution",
      "nextStep",
    ]);
    expect(collaboration.fields[0]).toMatchObject({ key: "subject", minLength: 0 });
  });
});
