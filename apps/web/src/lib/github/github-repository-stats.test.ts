import { afterEach, describe, expect, it, vi } from "vitest";
import { loadGitHubRepositoryStats } from "./github-repository-stats";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("GitHub repository pagination", () => {
  it("accepts optional whitespace around the next relation and follows every page", async () => {
    vi.stubEnv("GITHUB_TOKEN", "test-token");
    const fetchMock = vi.fn(async (input: string) => {
      if (input.endsWith("/repos/maxd4/CleanmyMap")) {
        return {
          ok: true,
          headers: new Headers(),
          json: async () => ({
            full_name: "maxd4/CleanmyMap",
            html_url: "https://github.com/maxd4/CleanmyMap",
            private: false,
            default_branch: "main",
          }),
        };
      }
      if (input.includes("/actions/runs?")) {
        return { ok: true, headers: new Headers(), json: async () => ({ total_count: 0 }) };
      }
      if (input.includes("dependabot/alerts") && !input.includes("page=2")) {
        return {
          ok: true,
          headers: new Headers({
            link: '<https://api.github.com/dependabot?page=2>;    rel="next", <https://api.github.com/dependabot?page=9>; rel="last"',
          }),
          json: async () => [{ number: 1 }],
        };
      }
      if (input.includes("dependabot?page=2")) {
        return { ok: true, headers: new Headers(), json: async () => [{ number: 2 }] };
      }
      if (input.includes("code-scanning/alerts")) {
        return {
          ok: true,
          headers: new Headers({
            link: '<https://api.github.com/code-scanning?page=2>;rel="next", <https://api.github.com/code-scanning?page=9>; rel="last"',
          }),
          json: async () => [{ rule: { severity: "warning" } }],
        };
      }
      if (input.includes("code-scanning?page=2")) {
        return { ok: true, headers: new Headers(), json: async () => [] };
      }
      throw new Error(`Unexpected GitHub request: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await loadGitHubRepositoryStats("maxd4/CleanmyMap");

    expect(result.dependabotOpenAlertsCount).toBe(2);
    expect(result.codeScanningWarningCount).toBe(1);
    expect(fetchMock.mock.calls.some(([input]) => input.includes("dependabot?page=2"))).toBe(true);
  });

  it("returns a safe public fallback when repository metadata or token-dependent APIs fail", async () => {
    vi.stubEnv("GITHUB_TOKEN", "token");
    const fetchMock = vi.fn(async (input: string) => {
      if (input.endsWith("/repos/example/missing")) {
        return { ok: false, status: 404, headers: new Headers(), json: async () => ({}) };
      }
      return { ok: false, status: 503, headers: new Headers(), json: async () => ({}) };
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(loadGitHubRepositoryStats("example/missing")).resolves.toMatchObject({
      fullName: "example/missing",
      htmlUrl: "https://github.com/example/missing",
      isPrivate: false,
      defaultBranch: null,
      workflowRunsCount30d: null,
      dependabotOpenAlertsCount: null,
      codeScanningWarningCount: null,
      source: "fallback",
    });
  });

  it("keeps private-repository quota guidance and counts warning severities only", async () => {
    vi.stubEnv("GITHUB_TOKEN", "token");
    const fetchMock = vi.fn(async (input: string) => {
      if (input.endsWith("/repos/example/private")) {
        return { ok: true, headers: new Headers(), json: async () => ({ full_name: "example/private", html_url: "https://github.com/example/private", private: true, default_branch: null }) };
      }
      if (input.includes("actions/runs")) return { ok: true, headers: new Headers(), json: async () => ({ total_count: 4 }) };
      if (input.includes("dependabot")) return { ok: true, headers: new Headers(), json: async () => [] };
      return { ok: true, headers: new Headers(), json: async () => [{ rule: null }, { rule: { severity: "error" } }] };
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(loadGitHubRepositoryStats("example/private")).resolves.toMatchObject({
      isPrivate: true,
      defaultBranch: null,
      workflowRunsCount30d: 4,
      dependabotOpenAlertsCount: 0,
      codeScanningWarningCount: 0,
      actionsQuotaLabel: "2000 min/mois sur GitHub Free",
      source: "api",
    });
  });
});
