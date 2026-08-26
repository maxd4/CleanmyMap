export const CHAT_POLL_MIN_OPTIONS = 2;
export const CHAT_POLL_MAX_OPTIONS = 6;
export const CHAT_POLL_OPTION_LABEL_MAX_LENGTH = 200;

export type ChatPollOption = {
  id: string;
  position: number;
  label: string;
};

export function createInitialChatPollOptionDraft(): string[] {
  return ["", ""];
}

export function normalizeChatPollOptionLabels(
  labels: readonly string[],
): string[] {
  return labels.map((label) => label.trim());
}

export function getChatPollOptionsValidationError(
  labels: readonly string[],
): string | null {
  if (labels.length < CHAT_POLL_MIN_OPTIONS) {
    return `Ajoutez au moins ${CHAT_POLL_MIN_OPTIONS} options.`;
  }

  if (labels.length > CHAT_POLL_MAX_OPTIONS) {
    return `Un sondage ne peut pas dépasser ${CHAT_POLL_MAX_OPTIONS} options.`;
  }

  const normalizedLabels = normalizeChatPollOptionLabels(labels);
  if (
    normalizedLabels.some(
      (label) =>
        label.length === 0 || label.length > CHAT_POLL_OPTION_LABEL_MAX_LENGTH,
    )
  ) {
    return `Chaque option doit contenir entre 1 et ${CHAT_POLL_OPTION_LABEL_MAX_LENGTH} caractères.`;
  }

  const uniqueLabels = new Set(normalizedLabels.map((label) => label.toLocaleLowerCase("fr-FR")));
  if (uniqueLabels.size !== normalizedLabels.length) {
    return "Les options d’un sondage doivent être différentes.";
  }

  return null;
}
