import { z } from "zod";
import type {
  EnvironmentalImpactEstimateInput,
  EnvironmentalImpactValidationIssue,
  EnvironmentalImpactValidationState,
} from "./types";

const quantitySchema = z.number().finite().min(0).max(1_000_000_000);

const scopeInputSchema = z
  .object({
    pageViews: quantitySchema.nullable().optional(),
    storedImages: quantitySchema.nullable().optional(),
    apiRequests: quantitySchema.nullable().optional(),
    pdfExports: quantitySchema.nullable().optional(),
    maps: quantitySchema.nullable().optional(),
    storageGbMonths: quantitySchema.nullable().optional(),
    aiCalls: quantitySchema.nullable().optional(),
    accountCreatedAt: z.string().trim().min(1).max(120).nullable().optional(),
    measuredAt: z.string().trim().min(1).max(120).nullable().optional(),
  })
  .strict();

const infrastructureMetricsInputSchema = z
  .object({
    vercelPageViews: quantitySchema.nullable().optional(),
    vercelFunctionInvocations: quantitySchema.nullable().optional(),
    vercelDeployments: quantitySchema.nullable().optional(),
    vercelBandwidthGb: quantitySchema.nullable().optional(),
    githubWorkflowRunsCount30d: quantitySchema.nullable().optional(),
    supabaseDbRequests: quantitySchema.nullable().optional(),
    supabaseAuthEvents: quantitySchema.nullable().optional(),
    supabaseStorageGbMonths: quantitySchema.nullable().optional(),
    supabaseRealtimeEvents: quantitySchema.nullable().optional(),
    supabaseEgressGb: quantitySchema.nullable().optional(),
    resendEmailsSent: quantitySchema.nullable().optional(),
    resendBatchRequests: quantitySchema.nullable().optional(),
    chatgptConversationHours: quantitySchema.nullable().optional(),
    clerkAuthEvents: quantitySchema.nullable().optional(),
    clerkSessionRefreshes: quantitySchema.nullable().optional(),
    posthogEvents: quantitySchema.nullable().optional(),
    sentryErrorEvents: quantitySchema.nullable().optional(),
    upstashOperations: quantitySchema.nullable().optional(),
    pineconeQueries: quantitySchema.nullable().optional(),
    stripePaymentOperations: quantitySchema.nullable().optional(),
    lwsDomainYears: quantitySchema.nullable().optional(),
    lwsDnsQueries: quantitySchema.nullable().optional(),
  })
  .strict();

const usageProfileInputSchema = z
  .object({
    monthlyPageViews: quantitySchema.nullable().optional(),
    monthlyActiveUsers: quantitySchema.nullable().optional(),
    monthlySessions: quantitySchema.nullable().optional(),
    monthlyEmailsSent: quantitySchema.nullable().optional(),
    monthlyDeployments: quantitySchema.nullable().optional(),
    monthlyPdfExports: quantitySchema.nullable().optional(),
    monthlyMapViews: quantitySchema.nullable().optional(),
    monthlyAiCalls: quantitySchema.nullable().optional(),
    monthlyChatgptConversationHours: quantitySchema.nullable().optional(),
    monthlyCodexSessions: quantitySchema.nullable().optional(),
    monthlyCodexConversationTurns: quantitySchema.nullable().optional(),
    monthlyCodexToolActions: quantitySchema.nullable().optional(),
    monthlyCodexShellCommands: quantitySchema.nullable().optional(),
    monthlyCodexFilesTouched: quantitySchema.nullable().optional(),
    monthlyCodexTestsRun: quantitySchema.nullable().optional(),
    monthlyCodexChangedLines: quantitySchema.nullable().optional(),
    monthlyCodexActiveMinutes: quantitySchema.nullable().optional(),
    monthlyStorageGbMonths: quantitySchema.nullable().optional(),
    monthlyApiRequests: quantitySchema.nullable().optional(),
    monthlyAuthEvents: quantitySchema.nullable().optional(),
    monthlyRealtimeEvents: quantitySchema.nullable().optional(),
    monthlyEgressGb: quantitySchema.nullable().optional(),
    monthlyBandwidthGb: quantitySchema.nullable().optional(),
    monthlyErrorEvents: quantitySchema.nullable().optional(),
    growthRateMonthly: z.number().finite().min(-0.5).max(1).nullable().optional(),
    seasonalityAmplitude: z.number().finite().min(0).max(0.8).nullable().optional(),
    horizonMonths: z.number().int().min(1).max(120).nullable().optional(),
  })
  .strict();

const dateLikeSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Doit être une date ISO valide.",
  });

const infrastructureInputSchema = z
  .object({
    launchedAt: dateLikeSchema.nullable().optional(),
    referencePeriodMonths: z.number().int().min(1).max(240).nullable().optional(),
    metrics: infrastructureMetricsInputSchema.nullable().optional(),
    usage: usageProfileInputSchema.nullable().optional(),
  })
  .strict();

const estimateInputSchema = z
  .object({
    generatedAt: dateLikeSchema.nullable().optional(),
    site: scopeInputSchema.nullable().optional(),
    user: scopeInputSchema.nullable().optional(),
    infrastructure: infrastructureInputSchema.nullable().optional(),
  })
  .strict();

function formatIssuePath(path: ReadonlyArray<PropertyKey>): string {
  if (path.length === 0) {
    return "root";
  }

  return path
    .map((segment) => (typeof segment === "symbol" ? segment.description ?? segment.toString() : String(segment)))
    .join(".");
}

export function normalizeEnvironmentalImpactEstimateInput(
  input: unknown,
): {
  validation: EnvironmentalImpactValidationState;
  input: EnvironmentalImpactEstimateInput;
} {
  if (input === undefined || input === null) {
    return {
      validation: { valid: true, issues: [] },
      input: {},
    };
  }

  const parsed = estimateInputSchema.safeParse(input);

  if (parsed.success) {
    return {
      validation: { valid: true, issues: [] },
      input: parsed.data,
    };
  }

  const issues: EnvironmentalImpactValidationIssue[] = parsed.error.issues.map(
    (issue) => ({
      path: formatIssuePath(issue.path),
      message: issue.message,
    }),
  );

  return {
    validation: { valid: false, issues },
    input: {},
  };
}
