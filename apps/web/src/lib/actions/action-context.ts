import {
  getVolunteerActionCompositionValidationMessage,
} from "./volunteer-participation";

export const ACTION_CONTEXT_VALUES = ["citizen", "company", "school"] as const;
export type ActionContext = (typeof ACTION_CONTEXT_VALUES)[number];

export const ACTION_CONTEXT_SOURCE_VALUES = [
  "explicit",
  "automatic_children_ratio",
] as const;
export type ActionContextSource = (typeof ACTION_CONTEXT_SOURCE_VALUES)[number];

export type ActionContextClassification = {
  context: ActionContext | null;
  source: ActionContextSource | null;
  isVerifiedFinalComposition: boolean;
  isSchoolAutoActivated: boolean;
};

export type ActionContextComposition = {
  volunteersCount: number | null | undefined;
  childrenCount: number | null | undefined;
  retiredCount: number | null | undefined;
};

export function isActionContext(value: unknown): value is ActionContext {
  return typeof value === "string" && ACTION_CONTEXT_VALUES.includes(value as ActionContext);
}

export function isActionContextSource(value: unknown): value is ActionContextSource {
  return (
    typeof value === "string" &&
    ACTION_CONTEXT_SOURCE_VALUES.includes(value as ActionContextSource)
  );
}

/**
 * Strict school rule: 3E > 2N, where N is the declared final total and E
 * the declared number of children. The comparison stays in integer space.
 */
export function hasStrictSchoolChildrenMajority(
  composition: ActionContextComposition,
): boolean | null {
  if (getVolunteerActionCompositionValidationMessage(composition) !== null) {
    return null;
  }

  const volunteersCount = composition.volunteersCount as number;
  const childrenCount = composition.childrenCount as number;
  return 3 * childrenCount > 2 * volunteersCount;
}

function automaticClassification(
  composition: ActionContextComposition,
): ActionContextClassification {
  const isSchool = hasStrictSchoolChildrenMajority(composition);
  if (isSchool === null) {
    return {
      context: null,
      source: null,
      isVerifiedFinalComposition: false,
      isSchoolAutoActivated: false,
    };
  }

  return {
    context: isSchool ? "school" : "citizen",
    source: "automatic_children_ratio",
    isVerifiedFinalComposition: true,
    isSchoolAutoActivated: isSchool,
  };
}

/**
 * Resolves the persisted final context. An explicit choice has priority and
 * remains stable until the caller explicitly resets it to automatic mode.
 */
export function resolveActionContext(params: {
  composition: ActionContextComposition;
  explicitContext?: ActionContext | null;
  currentContext?: ActionContext | null;
  currentSource?: ActionContextSource | null;
  resetExplicitChoice?: boolean;
}): ActionContextClassification {
  const hasExplicitCurrentChoice =
    params.currentSource === "explicit" && isActionContext(params.currentContext);

  if (!params.resetExplicitChoice && hasExplicitCurrentChoice && params.explicitContext === undefined) {
    return {
      context: params.currentContext as ActionContext,
      source: "explicit",
      isVerifiedFinalComposition: false,
      isSchoolAutoActivated: false,
    };
  }

  if (isActionContext(params.explicitContext)) {
    return {
      context: params.explicitContext,
      source: "explicit",
      isVerifiedFinalComposition: false,
      isSchoolAutoActivated: false,
    };
  }

  return automaticClassification(params.composition);
}

/**
 * Pre-action guidance may suggest School from the forecast, but it is not a
 * verified persisted classification until a final composition is supplied.
 */
export function suggestPreActionContext(
  composition: ActionContextComposition,
): ActionContextClassification {
  const classification = automaticClassification(composition);
  return {
    ...classification,
    isVerifiedFinalComposition: false,
    isSchoolAutoActivated: classification.context === "school",
  };
}
