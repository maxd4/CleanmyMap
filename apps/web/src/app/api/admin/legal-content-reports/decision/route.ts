import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserIdentity, requireAdminAccess } from "@/lib/authz";
import { buildLegalContentReportInboxItem } from "@/lib/community/creator-inbox";
import { getLegalContentReportById } from "@/lib/legal-content-report/legal-content-report-store";
import {
  LEGAL_CONTENT_REPORT_DECISION_ACTIONS,
  LEGAL_CONTENT_REPORT_DECISION_ORIGINS,
} from "@/lib/legal-content-report/legal-content-report";
import {
  appendDecisionAudit,
  runDecisionWorkflow,
  type DecisionAuditContext,
  type DecisionWorkflowResult,
} from "@/lib/legal-content-report/legal-content-report-decision-workflow";

export const runtime = "nodejs";

const decisionSchema = z
  .object({
    reportId: z.string().trim().min(1),
    action: z.enum(LEGAL_CONTENT_REPORT_DECISION_ACTIONS),
    origin: z.enum(LEGAL_CONTENT_REPORT_DECISION_ORIGINS),
    reason: z.string().trim().min(5).max(2000),
    automatedMeansUsed: z.boolean(),
    legalBasis: z.string().trim().max(1000).optional(),
    termsBasis: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, context) => {
    const hasLegalBasis = Boolean(value.legalBasis);
    const hasTermsBasis = Boolean(value.termsBasis);
    if (hasLegalBasis && hasTermsBasis) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["legalBasis"],
        message: "Choose legalBasis or termsBasis, not both.",
      });
    }
    if (
      (value.action === "content_restricted" || value.action === "content_removed") &&
      !hasLegalBasis &&
      !hasTermsBasis
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["legalBasis"],
        message: "A legal or terms basis is required for a content restriction.",
      });
    }
  });

type DecisionInput = z.infer<typeof decisionSchema>;
type ParsedDecisionInput =
  | { response: NextResponse }
  | { input: DecisionInput };
type LoadedReportResult =
  | { response: NextResponse }
  | { report: NonNullable<Awaited<ReturnType<typeof getLegalContentReportById>>> };

function errorResponse(message: string, status: number, operationId: string) {
  return NextResponse.json({ error: message, operationId }, { status });
}

async function parseDecisionInput(
  request: Request,
  operationId: string,
): Promise<ParsedDecisionInput> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return { response: errorResponse("Invalid JSON payload", 400, operationId) };
  }
  const parsed = decisionSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      response: NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten().fieldErrors, operationId },
        { status: 400 },
      ),
    };
  }
  return { input: parsed.data };
}

async function loadReport(
  reportId: string,
  operationId: string,
): Promise<LoadedReportResult> {
  try {
    const report = await getLegalContentReportById(reportId);
    return report
      ? { report }
      : { response: errorResponse("Legal content report not found.", 404, operationId) };
  } catch {
    return { response: errorResponse("Unable to load legal content report.", 500, operationId) };
  }
}

function decisionResponse(result: DecisionWorkflowResult) {
  if (result.kind === "error") {
    return errorResponse(result.message, result.status, result.operationId);
  }

  const { state } = result;
  const partialWarnings: string[] = [];
  if (state.reportProjectionFailed) {
    partialWarnings.push("The content measure was applied but the report projection failed.");
  }
  if (state.decisionProjectionFailed) {
    partialWarnings.push(
      state.mutationApplied
        ? "The content measure was applied but its execution state projection failed."
        : "The report was projected but its decision state projection failed.",
    );
  }
  if (state.notificationErrors.length > 0) {
    partialWarnings.push("Decision recorded; at least one notification failed.");
  }
  if (partialWarnings.length > 0) {
    return NextResponse.json(
      {
        status: "partial",
        operationId: result.operationId,
        warning: partialWarnings.join(" "),
        item: buildLegalContentReportInboxItem(state.report),
      },
      { status: 207 },
    );
  }
  if (state.decision.executionStatus === "failed") {
    return NextResponse.json(
      {
        status: "failed",
        operationId: result.operationId,
        executionStatus: state.decision.executionStatus,
        executionErrorCode: state.decision.executionErrorCode,
        item: buildLegalContentReportInboxItem(state.report),
      },
      { status: 500 },
    );
  }
  return NextResponse.json(
    {
      status: "ok",
      operationId: result.operationId,
      item: buildLegalContentReportInboxItem(state.report),
    },
    { status: 200 },
  );
}

export async function POST(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return errorResponse(access.error, access.status, randomUUID());
  }

  const identity = await getCurrentUserIdentity({ userId: access.userId });
  if (!identity || identity.userId !== access.userId) {
    return errorResponse("Forbidden", 403, randomUUID());
  }

  const operationId = randomUUID();
  const parsed = await parseDecisionInput(request, operationId);
  if ("response" in parsed) return parsed.response;
  const loaded = await loadReport(parsed.input.reportId, operationId);
  if ("response" in loaded) return loaded.response;
  const { input: decisionInput, report } = { input: parsed.input, report: loaded.report };

  const auditContext: DecisionAuditContext = {
    action: decisionInput.action,
    origin: decisionInput.origin,
    reason: decisionInput.reason,
    automatedMeansUsed: decisionInput.automatedMeansUsed,
    legalBasis: decisionInput.legalBasis ?? null,
    termsBasis: decisionInput.termsBasis ?? null,
    contentUrl: report.contentUrl,
    contentId: report.contentId,
  };

  const result = await runDecisionWorkflow({
    operationId,
    actorUserId: identity.userId,
    reportId: report.id,
    decisionInput,
    report,
    auditContext,
    appendDecisionAudit,
  });
  return decisionResponse(result);
}
