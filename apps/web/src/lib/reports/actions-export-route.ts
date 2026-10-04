export { buildDeliverableHeaders } from "./http";
export * from "./actions-export";
export * from "./actions-export-source";
import type { UnifiedSourceHealth } from "@/lib/actions/unified-source/types";

export function buildActionsExportWarningHeaders(
  responseHeaders: Record<string, string>,
  isTruncated: boolean,
  sourceHealth: UnifiedSourceHealth,
): Record<string, string> {
  const headers = { ...responseHeaders };
  if (isTruncated) headers["X-Export-Warning"] = "Dataset truncated to limit";
  if (sourceHealth.partial) headers["X-Data-Warning"] = sourceHealth.warnings.join(" |");
  return headers;
}
