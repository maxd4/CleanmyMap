import { act, create, type ReactTestInstance } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import { getQuizSchoolWorkshopAssessment } from "@/lib/learning/quiz/school/quiz-school-workshop-assessment";
import { QuizSchoolWorkshopSession } from "./quiz-school-workshop-session";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

type ButtonProps = {
  children?: unknown;
  disabled?: boolean;
  onClick?: () => void;
  "aria-pressed"?: boolean;
};

function textOf(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(textOf).join("");
  if (value && typeof value === "object" && "children" in value) {
    return textOf((value as { children?: unknown }).children);
  }
  if (value && typeof value === "object" && "props" in value) {
    return textOf((value as { props?: { children?: unknown } }).props?.children);
  }
  return "";
}

function propsOf(node: ReactTestInstance): ButtonProps {
  return node.props as unknown as ButtonProps;
}

function buttonWithText(renderer: ReturnType<typeof create>, fragment: string): ReactTestInstance {
  const button = renderer.root.findAllByType("button").find((node) => textOf(propsOf(node).children).includes(fragment));
  if (!button) throw new Error(`Button not found: ${fragment}`);
  return button;
}

function choiceButton(renderer: ReturnType<typeof create>): ReactTestInstance {
  const choice = renderer.root.findAllByType("button").find((node) => propsOf(node)["aria-pressed"] !== undefined);
  if (!choice) throw new Error("Choice button not found");
  return choice;
}

function renderWorkshop(overrides: Partial<React.ComponentProps<typeof QuizSchoolWorkshopSession>> = {}) {
  let renderer!: ReturnType<typeof create>;
  const onRestart = vi.fn();
  const onChooseFormat = vi.fn();

  act(() => {
    renderer = create(
      <QuizSchoolWorkshopSession
        locale="fr"
        level="4e"
        questions={[]}
        onRestart={onRestart}
        onChooseFormat={onChooseFormat}
        {...overrides}
      />,
    );
  });

  return { renderer, onRestart, onChooseFormat };
}

function clickChoice(renderer: ReturnType<typeof create>, label: string) {
  const choice = renderer.root.findAllByType("button").find((node) => textOf(propsOf(node).children) === label);
  if (!choice) throw new Error(`Choice not found: ${label}`);
  act(() => { propsOf(choice).onClick?.(); });
}

function answerCurrentQuestion(renderer: ReturnType<typeof create>, choiceLabel?: string) {
  if (choiceLabel) clickChoice(renderer, choiceLabel);
  else act(() => { propsOf(choiceButton(renderer)).onClick?.(); });
  act(() => { propsOf(buttonWithText(renderer, "Révéler la réponse")).onClick?.(); });
  act(() => { propsOf(buttonWithText(renderer, "Question suivante")).onClick?.(); });
}

function completeWorkshop(
  renderer: ReturnType<typeof create>,
  level: "6e" | "5e" | "4e" | "3e",
  mode: "mixed" | "first",
) {
  const pre = getQuizSchoolWorkshopAssessment(level, "pre-quiz");
  const post = getQuizSchoolWorkshopAssessment(level, "post-quiz");

  for (const [index, item] of pre.entries()) {
    const options = Object.entries(item.options);
    const selectedId = mode === "mixed" && index === 0
      ? item.correctOptionId
      : options.find(([id]) => id !== item.correctOptionId)?.[0] ?? item.correctOptionId;
    answerCurrentQuestion(renderer, item.options[selectedId]?.fr);
  }

  expect(textOf(renderer.toJSON())).toContain("Activité");
  expect(textOf(renderer.toJSON())).toContain("30 min");

  while (textOf(renderer.toJSON()).includes("Activité suivante")) {
    act(() => { propsOf(buttonWithText(renderer, "Activité suivante")).onClick?.(); });
  }
  act(() => { propsOf(buttonWithText(renderer, "Lancer le post-quiz")).onClick?.(); });
  expect(textOf(renderer.toJSON())).toContain("Post-quiz");

  for (const item of post) {
    const selectedId = item.isTransfer
      ? item.correctOptionId
      : Object.keys(item.options).find((id) => id !== item.correctOptionId) ?? item.correctOptionId;
    answerCurrentQuestion(renderer, item.options[selectedId]?.fr);
  }
}

describe("QuizSchoolWorkshopSession behavior", () => {
  it("locks a revealed answer, preserves it when going back, and does not invent a score", () => {
    const { renderer } = renderWorkshop();
    const firstChoice = choiceButton(renderer);
    const reveal = buttonWithText(renderer, "Révéler la réponse");

    expect(propsOf(reveal).disabled).toBe(true);
    act(() => { propsOf(firstChoice).onClick?.(); });
    expect(propsOf(buttonWithText(renderer, "Révéler la réponse")).disabled).toBe(false);

    act(() => { propsOf(buttonWithText(renderer, "Révéler la réponse")).onClick?.(); });
    expect(propsOf(choiceButton(renderer)).disabled).toBe(true);
    expect(textOf(renderer.toJSON())).toContain("L’éco-citoyenneté consiste");

    act(() => { propsOf(buttonWithText(renderer, "Révéler la réponse")).onClick?.(); });
    expect(textOf(renderer.toJSON())).toContain("1 / 8");

    act(() => { propsOf(buttonWithText(renderer, "Question suivante")).onClick?.(); });
    expect(textOf(renderer.toJSON())).toContain("2 / 8");
    act(() => { propsOf(buttonWithText(renderer, "Étape précédente")).onClick?.(); });
    expect(textOf(renderer.toJSON())).toContain("1 / 8");
    expect(propsOf(choiceButton(renderer))["aria-pressed"]).toBe(true);
  });

  it("executes the full atelier-60 sequence with separate transfer and restart actions", () => {
    const { renderer, onRestart, onChooseFormat } = renderWorkshop();
    const level = "4e" as const;

    completeWorkshop(renderer, level, "mixed");

    expect(textOf(renderer.toJSON())).toContain("Bilan collectif");
    expect(textOf(renderer.toJSON())).toContain("Transfert — séparé");
    act(() => { propsOf(buttonWithText(renderer, "Relancer au même niveau")).onClick?.(); });
    expect(onRestart).toHaveBeenCalledOnce();
    expect(textOf(renderer.toJSON())).toContain("Pré-quiz");

    // The format callback remains a separate terminal action from restarting.
    completeWorkshop(renderer, level, "first");
    act(() => { propsOf(buttonWithText(renderer, "Choisir un autre format")).onClick?.(); });
    expect(onChooseFormat).toHaveBeenCalledOnce();
  });
});
