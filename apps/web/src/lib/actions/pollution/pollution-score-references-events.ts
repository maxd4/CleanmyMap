export const ACTION_POLLUTION_SCORE_REFERENCES_INVALIDATED_EVENT =
  "cmm:actions:pollution-score-references:invalidated";

export function dispatchActionPollutionScoreReferencesInvalidated(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(ACTION_POLLUTION_SCORE_REFERENCES_INVALIDATED_EVENT));
}
