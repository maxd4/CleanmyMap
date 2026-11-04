export const TERRITORIAL_LEGEND_PAGE_SIZE = 500;
export const TERRITORIAL_LEGEND_MAX_PAGES = 200;

export class TerritorialLegendFactsIncompleteError extends Error {
  readonly code = "TERRITORIAL_LEGEND_FACTS_INCOMPLETE";

  constructor(resource: string, reason: string) {
    super(`Impossible de charger exhaustivement les faits territoriaux (${resource}) : ${reason}`);
    this.name = "TerritorialLegendFactsIncompleteError";
  }
}

type PageResult<T> = {
  data: T[] | null;
  error: { message?: string } | null;
};

export async function loadTerritorialLegendPages<T>(params: {
  resource: string;
  loadPage: (from: number, to: number) => Promise<PageResult<T>>;
}): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 0; page < TERRITORIAL_LEGEND_MAX_PAGES; page += 1) {
    const from = page * TERRITORIAL_LEGEND_PAGE_SIZE;
    const result = await params.loadPage(from, from + TERRITORIAL_LEGEND_PAGE_SIZE - 1);
    if (result.error) throw result.error;
    if (!Array.isArray(result.data)) {
      throw new TerritorialLegendFactsIncompleteError(params.resource, "réponse de page invalide");
    }
    rows.push(...result.data);
    if (result.data.length < TERRITORIAL_LEGEND_PAGE_SIZE) return rows;
  }
  throw new TerritorialLegendFactsIncompleteError(
    params.resource,
    `limite de ${TERRITORIAL_LEGEND_MAX_PAGES} pages atteinte`,
  );
}
