import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type GitHubRepositoryStats = {
  fullName: string;
  htmlUrl: string;
  isPrivate: boolean;
  defaultBranch: string | null;
  workflowRunsCount30d: number | null;
  dependabotOpenAlertsCount: number | null;
  codeScanningWarningCount: number | null;
  actionsQuotaLabel: string | null;
  actionsNotes: string[];
  source: "api" | "fallback";
};

type GitHubRepositoryResponse = {
  full_name: string;
  html_url: string;
  private: boolean;
  default_branch: string | null;
};

type CodeScanningAlertResponse = {
  rule?: {
    severity?: string | null;
  } | null;
};

type WorkflowRunsResponse = {
  total_count: number;
};

function buildHeaders(token: string | null): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function resolveGitHubToken(): Promise<string | null> {
  const envToken =
    process.env["GITHUB_TOKEN"] ??
    process.env["GH_TOKEN"] ??
    process.env["GITHUB_API_TOKEN"] ??
    null;

  if (envToken && envToken.trim().length > 0) {
    return envToken.trim();
  }

  try {
    const { stdout } = await execFileAsync("gh", ["auth", "token"], {
      windowsHide: true,
      timeout: 5000,
      maxBuffer: 1024 * 1024,
    });
    const token = stdout.trim();
    return token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

async function fetchJson<T>(path: string, token: string | null): Promise<T | null> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: buildHeaders(token),
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as T;
}

async function fetchPaginatedArray<T>(path: string, token: string | null): Promise<T[] | null> {
  const items: T[] = [];
  let nextUrl: string | null = `https://api.github.com${path}${path.includes("?") ? "&" : "?"}per_page=100`;
  let guard = 0;

  while (nextUrl && guard < 10) {
    const response: Response = await fetch(nextUrl, {
      headers: buildHeaders(token),
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return null;
    }

    const chunk = (await response.json()) as T[];
    items.push(...chunk);

    const linkHeader = response.headers.get("link");
    const nextMatch = linkHeader?.match(/<([^>]+)>;\s*rel="next"/);
    nextUrl = nextMatch?.[1] ?? null;
    guard += 1;
  }

  return items;
}

async function fetchWorkflowRunsCount30d(repoFullName: string, token: string | null): Promise<number | null> {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceIso = since.toISOString().slice(0, 10);
  const response = await fetchJson<WorkflowRunsResponse>(
    `/repos/${repoFullName}/actions/runs?status=completed&created=>=${sinceIso}&per_page=1`,
    token,
  );

  if (!response) {
    return null;
  }

  return response.total_count;
}

export async function loadGitHubRepositoryStats(
  repoFullName: string,
): Promise<GitHubRepositoryStats> {
  const token = await resolveGitHubToken();
  const repo = await fetchJson<GitHubRepositoryResponse>(`/repos/${repoFullName}`, token);
  const workflowRunsCount30d = token
    ? await fetchWorkflowRunsCount30d(repoFullName, token)
    : null;
  const dependabotAlerts = token
    ? await fetchPaginatedArray<Record<string, unknown>>(
        `/repos/${repoFullName}/dependabot/alerts?state=open`,
        token,
      )
    : null;
  const codeScanningAlerts = token
    ? await fetchPaginatedArray<CodeScanningAlertResponse>(
        `/repos/${repoFullName}/code-scanning/alerts?state=open`,
        token,
      )
    : null;

  const dependabotOpenAlertsCount = dependabotAlerts ? dependabotAlerts.length : null;
  const codeScanningWarningCount = codeScanningAlerts
    ? codeScanningAlerts.filter((alert) => alert.rule?.severity === "warning").length
    : null;
  const isPrivate = repo?.private ?? false;
  const actionsQuotaLabel = isPrivate
    ? "2000 min/mois sur GitHub Free"
    : "Repo public: runners standards gratuits et illimités";

  return {
    fullName: repo?.full_name ?? repoFullName,
    htmlUrl: repo?.html_url ?? `https://github.com/${repoFullName}`,
    isPrivate,
    defaultBranch: repo?.default_branch ?? null,
    workflowRunsCount30d,
    dependabotOpenAlertsCount,
    codeScanningWarningCount,
    actionsQuotaLabel,
    actionsNotes: isPrivate
      ? [
          "GitHub Free: 2000 min/mois, 500 MB d’artefacts et 10 GB de cache.",
          "Les alertes Dependabot sont bien disponibles sur les dépôts utilisateur.",
          workflowRunsCount30d === null
            ? "Runs GitHub Actions sur 30 jours: NA"
            : `Runs GitHub Actions sur 30 jours: ${workflowRunsCount30d}`,
        ]
      : [
          "Dépôt public: les runners GitHub standard sont gratuits et illimités.",
          "Les quotas minute Actions s’appliquent surtout aux dépôts privés.",
          workflowRunsCount30d === null
            ? "Runs GitHub Actions sur 30 jours: NA"
            : `Runs GitHub Actions sur 30 jours: ${workflowRunsCount30d}`,
        ],
    source: repo ? "api" : "fallback",
  };
}
