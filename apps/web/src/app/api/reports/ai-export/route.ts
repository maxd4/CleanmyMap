import { randomUUID } from "node:crypto";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { buildAiMarkdownExport, MAX_AI_MARKDOWN_EXPORT_BYTES } from "@/lib/reports/ai-markdown-export";
import { createServerRateLimitResponse, verifyRateLimit } from "@/lib/rate-limit/server";
import {
  parseReportGenerationRequest,
  resolveReportGenerationInput,
} from "../generations/route.input";

export const runtime = "nodejs";

function privateResponse(body: BodyInit | null, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store");
  return new Response(body, { ...init, headers });
}

export async function POST(request: Request): Promise<Response> {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    const response = unauthorizedJsonResponse({ hint: access.error });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  const rateLimit = await verifyRateLimit(request, { limit: 5, window: 60 });
  const rateLimitResponse = createServerRateLimitResponse(
    rateLimit.allowed,
    rateLimit.retryAfter,
    rateLimit,
  );
  if (rateLimitResponse) {
    rateLimitResponse.headers.set("Cache-Control", "private, no-store");
    return rateLimitResponse;
  }

  const operationId = `report-ai-export-${randomUUID()}`;
  const parsed = await parseReportGenerationRequest(request, operationId, access.userId, { auditFailures: false });
  if ("response" in parsed) {
    parsed.response.headers.set("Cache-Control", "private, no-store");
    return parsed.response;
  }

  const resolved = await resolveReportGenerationInput(
    parsed.request,
    operationId,
    access.userId,
    randomUUID(),
    { auditFailures: false },
  );
  if ("response" in resolved) {
    resolved.response.headers.set("Cache-Control", "private, no-store");
    return resolved.response;
  }

  const markdown = buildAiMarkdownExport(resolved.input);
  if (Buffer.byteLength(markdown, "utf8") > MAX_AI_MARKDOWN_EXPORT_BYTES) {
    return privateResponse(JSON.stringify({ error: "L’export Markdown dépasse la taille maximale autorisée." }), {
      status: 413,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const day = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return privateResponse(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="cleanmymap-rapport-ia-${day}.md"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
