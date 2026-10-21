import {
  getReportGenerationSnapshotById,
  InvalidReportGenerationIdError,
} from "@/lib/reports/report-generation-history-store";
import {
  buildReportGenerationResumeConfig,
  type ReportGenerationResumeConfig,
} from "@/lib/reports/report-generation-resume";
import {
  getSingleActionReportScopeLabel,
  resolveSingleActionReportContract,
  SingleActionReportTargetUnavailableError,
} from "@/lib/reports/single-action-report";
import {
  projectPublicActionContract,
  type PublicActionContract,
} from "@/lib/actions/public-dto";

export type SingleActionReportPageContext = {
  actionId: string;
  contract: PublicActionContract;
  scopeLabel: string;
};

export type SingleActionReportPageError = "not_admissible" | "unavailable";

export type ReportsResumeStatus =
  | "not_found"
  | "invalid"
  | "unavailable"
  | "action_unavailable";

export type ReportsResumeContext = {
  config: ReportGenerationResumeConfig | null;
  status: ReportsResumeStatus | null;
  singleAction: SingleActionReportPageContext | null;
};

export type ReportsGenerationContext = {
  singleAction: SingleActionReportPageContext | null;
  singleActionError: SingleActionReportPageError | null;
  resumeContext: Promise<ReportsResumeContext>;
};

export function buildSingleActionGenerationData(contract: PublicActionContract) {
  return {
    contracts: [contract],
    isTruncated: false,
    sourceHealth: {
      partial: false,
      failedSources: [],
      availableSources: ["actions" as const],
      warnings: [],
    },
    communityEvents: [],
    communityEventsAvailability: "unavailable" as const,
    actionMediaReadyCountByActionId: {},
    actionMediaAvailability: "available" as const,
  };
}

async function resolveSingleActionContext(
  actionId: string | null,
): Promise<Pick<ReportsGenerationContext, "singleAction" | "singleActionError">> {
  if (!actionId) {
    return { singleAction: null, singleActionError: null };
  }

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      actionId,
    )
  ) {
    return { singleAction: null, singleActionError: "not_admissible" };
  }

  try {
    const resolvedContract = await resolveSingleActionReportContract(actionId);
    return {
      singleAction: {
        actionId,
        contract: projectPublicActionContract(resolvedContract),
        scopeLabel: getSingleActionReportScopeLabel(resolvedContract),
      },
      singleActionError: null,
    };
  } catch (error) {
    return {
      singleAction: null,
      singleActionError:
        error instanceof SingleActionReportTargetUnavailableError
          ? "not_admissible"
          : "unavailable",
    };
  }
}

function resolveResumeContext(
  resumeId: string | null,
  userId: string,
): Promise<ReportsResumeContext> {
  if (!resumeId) {
    return Promise.resolve({ config: null, status: null, singleAction: null });
  }

  return getReportGenerationSnapshotById(resumeId, userId)
    .then(async (record) => {
      if (!record) {
        return { config: null, status: "not_found" as const, singleAction: null };
      }

      const config = buildReportGenerationResumeConfig(record);
      if (config.scope?.kind !== "single_action") {
        return { config, status: null, singleAction: null };
      }

      try {
        const contract = await resolveSingleActionReportContract(config.scope.value);
        return {
          config,
          status: null,
          singleAction: {
            actionId: config.scope.value,
            contract: projectPublicActionContract(contract),
            scopeLabel: getSingleActionReportScopeLabel(contract),
          },
        };
      } catch (error) {
        return {
          config,
          status:
            error instanceof SingleActionReportTargetUnavailableError
              ? ("action_unavailable" as const)
              : ("unavailable" as const),
          singleAction: null,
        };
      }
    })
    .catch((error) => ({
      config: null,
      status:
        error instanceof InvalidReportGenerationIdError
          ? ("invalid" as const)
          : ("unavailable" as const),
      singleAction: null,
    }));
}

export async function resolveReportsGenerationContext({
  requestedActionId,
  resumeId,
  userId,
}: {
  requestedActionId: string | null;
  resumeId: string | null;
  userId: string;
}): Promise<ReportsGenerationContext> {
  const { singleAction, singleActionError } =
    await resolveSingleActionContext(requestedActionId);

  return {
    singleAction,
    singleActionError,
    resumeContext: resolveResumeContext(resumeId, userId),
  };
}
