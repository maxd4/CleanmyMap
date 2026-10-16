const STOP_WORDS = new Set([
  "avec",
  "dans",
  "des",
  "les",
  "pour",
  "que",
  "qui",
  "une",
  "est",
  "sur",
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
]);

export type FeedbackSimilarityCandidate = {
  id: string;
  title: string;
  text: string;
};

export type FeedbackSimilarityMatch<T extends FeedbackSimilarityCandidate> = T & {
  score: number;
};

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase()
      .match(/[a-z0-9]{3,}/g)
      ?.filter((token) => !STOP_WORDS.has(token))
      .slice(0, 80) ?? [],
  );
}

export function findPotentiallySimilarFeedback<T extends FeedbackSimilarityCandidate>(
  query: FeedbackSimilarityCandidate,
  candidates: T[],
  limit = 3,
): FeedbackSimilarityMatch<T>[] {
  const queryTokens = tokenize(`${query.title} ${query.text}`);
  if (queryTokens.size < 2) return [];

  return candidates
    .filter((candidate) => candidate.id !== query.id)
    .map((candidate) => {
      const candidateTokens = tokenize(`${candidate.title} ${candidate.text}`);
      const overlap = [...queryTokens].filter((token) => candidateTokens.has(token)).length;
      const score = overlap / Math.min(queryTokens.size, candidateTokens.size || 1);
      return { ...candidate, score };
    })
    .filter((candidate) => candidate.score >= 0.4)
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .slice(0, Math.max(0, Math.min(5, Math.trunc(limit))));
}
