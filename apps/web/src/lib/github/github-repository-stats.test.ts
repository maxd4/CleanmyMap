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
});
