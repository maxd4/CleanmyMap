import { buildDeliverableFilename, type DeliverableExtension } from "./deliverable-name";

export function buildDeliverableHeaders(params: {
  rubrique: string;
  extension: DeliverableExtension;
  contentType: string;
  date?: Date;
  cacheControl?: string;
  extra?: Record<string, string>;
}) {
  const filename = buildDeliverableFilename({
    rubrique: params.rubrique,
    extension: params.extension,
    date: params.date,
  });

  return {
    filename,
    headers: {
      "Content-Type": params.contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": params.cacheControl ?? "no-store",
      "X-Deliverable-Name": filename,
      "X-Deliverable-Format": params.extension,
      ...(params.extra ?? {}),
    } satisfies Record<string, string>,
  };
}
