const MAX_PAGES = 10_000;

export type BoundedPageRequest = {
  limit: number;
  from: number;
  to: number;
};

export async function readBoundedPages<T>(params: {
  requestedLimit: number | null;
  pageSize: number;
  loadPage: (request: BoundedPageRequest) => Promise<T[]>;
  safetyError: string;
}): Promise<T[]> {
  const rows: T[] = [];
  let offset = 0;
  let terminated = false;

  for (let pageNumber = 0; pageNumber < MAX_PAGES; pageNumber += 1) {
    const remaining = params.requestedLimit === null
      ? params.pageSize
      : Math.min(params.pageSize, params.requestedLimit - rows.length);
    if (remaining <= 0) {
      terminated = true;
      break;
    }

    const page = await params.loadPage({
      limit: remaining,
      from: offset,
      to: offset + remaining - 1,
    });
    if (page.length === 0) {
      terminated = true;
      break;
    }

    rows.push(...page);
    offset += page.length;
    if (params.requestedLimit !== null && rows.length >= params.requestedLimit) {
      terminated = true;
      break;
    }
  }

  if (!terminated) {
    throw new Error(params.safetyError);
  }

  return params.requestedLimit === null ? rows : rows.slice(0, params.requestedLimit);
}
