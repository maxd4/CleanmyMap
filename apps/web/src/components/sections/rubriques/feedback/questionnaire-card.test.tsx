import type { ReactNode } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

class CardSpeechRecognition {
  static instances: CardSpeechRecognition[] = [];

  lang = "";
  interimResults = false;
  continuous = false;
  onstart: (() => void) | null = null;
  onresult: ((event: { resultIndex: number; results: unknown }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;

  constructor() {
    CardSpeechRecognition.instances.push(this);
  }

  start() {
    this.onstart?.();
  }

  stop() {
    this.onend?.();
  }

  abort() {
    this.onend?.();
  }

  emitFinal(transcript: string, resultIndex = 0) {
    const results = Array.from({ length: resultIndex + 1 }, () => ({
      isFinal: false,
      0: { transcript: "" },
    }));
    results[resultIndex] = { isFinal: true, 0: { transcript } };
    (results as unknown as { length: number }).length = results.length;
    this.onresult?.({ resultIndex, results });
  }
}

const originalWindow = (globalThis as { window?: unknown }).window;

describe("QuestionnaireCard serialized description validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
    vi.unstubAllGlobals();
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
    const collaborationQuestionnaire = QUESTIONNAIRES.find((candidate) => candidate.id === "collaboration")!;
    let bugRenderer!: ReactTestRenderer;
    let ideaRenderer!: ReactTestRenderer;
    let collaborationRenderer!: ReactTestRenderer;

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
      collaborationRenderer = create(
        <QuestionnaireCard
          questionnaire={collaborationQuestionnaire}
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
    expect(bugRenderer.root.findAllByType("button").filter((button) => button.props.ariaLabel === "Dicter")).toHaveLength(2);
    expect(ideaRenderer.root.findAllByType("button").filter((button) => button.props.ariaLabel === "Dicter")).toHaveLength(2);
    expect(collaborationRenderer.root.findAllByType("button").filter((button) => button.props.ariaLabel === "Dicter")).toHaveLength(0);
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

  it("appends final dictation without overwriting text and keeps manual editing without submitting", () => {
    CardSpeechRecognition.instances = [];
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        SpeechRecognition: CardSpeechRecognition,
        location: { href: "http://localhost/sections/feedback" },
      },
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const bugQuestionnaire = QUESTIONNAIRES.find((candidate) => candidate.id === "bug")!;
    let renderer!: ReactTestRenderer;

    act(() => {
      renderer = create(
        <QuestionnaireCard
          questionnaire={bugQuestionnaire}
          pagePath="/sections/feedback"
          source="feedback_section"
          initialValues={{
            context: "J'ouvrais la carte",
            steps: "Texte déjà saisi",
            expected: "La carte devait s'afficher",
          }}
        />,
      );
    });

    const dictateButton = renderer.root.findAllByType("button").find(
      (button) => button.props.ariaLabel === "Dicter",
    );
    expect(dictateButton).toBeDefined();
    act(() => {
      dictateButton?.props.onClick();
    });
    const recognition = CardSpeechRecognition.instances[0];
    expect(recognition.lang).toBe("fr-FR");

    const textareas = renderer.root.findAllByType("textarea");
    const stepsTextarea = textareas.find((textarea) => textarea.props.id === "feedback-bug-steps");
    expect(stepsTextarea?.props.value).toBe("Texte déjà saisi");

    act(() => {
      recognition.emitFinal("ajouté par dictée");
      recognition.emitFinal("ajouté par dictée");
      recognition.emitFinal("ajouté par dictée", 1);
    });
    expect(stepsTextarea?.props.value).toBe(
      "Texte déjà saisi ajouté par dictée ajouté par dictée",
    );

    act(() => {
      stepsTextarea?.props.onChange({ target: { value: "Correction manuelle" } });
    });
    expect(stepsTextarea?.props.value).toBe("Correction manuelle");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("cancels dictation before submission so a late result is not inserted", async () => {
    CardSpeechRecognition.instances = [];
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        SpeechRecognition: CardSpeechRecognition,
        location: { href: "http://localhost/sections/feedback" },
      },
    });
    let resolveFetch!: (response: { ok: boolean; json: () => Promise<{ requestId: string }> }) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise((resolve) => {
      resolveFetch = resolve;
    })));
    const bugQuestionnaire = QUESTIONNAIRES.find((candidate) => candidate.id === "bug")!;
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <QuestionnaireCard
          questionnaire={bugQuestionnaire}
          pagePath="/sections/feedback"
          source="feedback_section"
          initialValues={{
            context: "J'ouvrais la carte",
            steps: "Texte déjà saisi",
            expected: "La carte devait s'afficher",
          }}
        />,
      );
    });

    act(() => {
      renderer.root.findAllByType("button").find(
        (button) => button.props.ariaLabel === "Dicter",
      )?.props.onClick();
    });
    const recognition = CardSpeechRecognition.instances[0];
    const form = renderer.root.findByType("form");

    await act(async () => {
      void form.props.onSubmit({ preventDefault: () => undefined });
      await Promise.resolve();
    });
    act(() => {
      recognition.emitFinal("résultat tardif");
    });

    const stepsTextarea = renderer.root.findAllByType("textarea").find(
      (textarea) => textarea.props.id === "feedback-bug-steps",
    );
    expect(stepsTextarea?.props.value).toBe("Texte déjà saisi");

    await act(async () => {
      resolveFetch({ ok: true, json: async () => ({ requestId: "req-1" }) });
    });
  });
});
