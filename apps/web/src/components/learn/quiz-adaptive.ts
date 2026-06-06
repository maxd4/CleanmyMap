type AdaptiveQuestionLike = {
  id: string;
  category: string;
};

function shouldReuseSameQuestion<T extends AdaptiveQuestionLike>(
  deck: readonly T[],
  questionId: string,
  currentIndex: number,
): boolean {
  return deck.slice(currentIndex + 1).some((item) => item.id === questionId);
}

export function insertAdaptiveReinforcement<T extends AdaptiveQuestionLike>(
  deck: readonly T[],
  currentIndex: number,
  question: T,
  errorCountForCategory: number,
  getGroupKey?: (item: T) => string,
): T[] {
  if (currentIndex < 0 || currentIndex >= deck.length) {
    return [...deck];
  }

  const spacing = Math.max(1, 3 - Math.min(2, errorCountForCategory));
  const insertionIndex = Math.min(deck.length, currentIndex + spacing);
  const nextDeck = [...deck];

  if (shouldReuseSameQuestion(nextDeck, question.id, currentIndex)) {
    const existingIndex = nextDeck.findIndex((item, index) => index > currentIndex && item.id === question.id);
    if (existingIndex >= 0) {
      const [existingQuestion] = nextDeck.splice(existingIndex, 1);
      nextDeck.splice(Math.min(insertionIndex, nextDeck.length), 0, existingQuestion);
    }
    return nextDeck;
  }

  const questionGroupKey = getGroupKey ? getGroupKey(question) : question.category;
  const siblingIndex = nextDeck.findIndex((item, index) => {
    if (index <= currentIndex || item.id === question.id) {
      return false;
    }

    const siblingGroupKey = getGroupKey ? getGroupKey(item) : item.category;
    return siblingGroupKey === questionGroupKey;
  });

  if (siblingIndex >= 0) {
    const [siblingQuestion] = nextDeck.splice(siblingIndex, 1);
    nextDeck.splice(Math.min(insertionIndex, nextDeck.length), 0, siblingQuestion);
    return nextDeck;
  }

  return nextDeck;
}

export function buildAdaptiveSessionDeck<T extends AdaptiveQuestionLike>(
  deck: readonly T[],
): T[] {
  return [...deck];
}
