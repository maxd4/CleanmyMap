import path from "node:path";
import { ROBOTS_NOINDEX_VALUE } from "@/lib/seo/indexability";

export function getDocumentationContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".webp") return "image/webp";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".gif") return "image/gif";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".md") return "text/html; charset=utf-8";
  return "text/plain; charset=utf-8";
}

export function markDocumentationNoindex(response: Response): Response {
  response.headers.set("X-Robots-Tag", ROBOTS_NOINDEX_VALUE);
  return response;
}
