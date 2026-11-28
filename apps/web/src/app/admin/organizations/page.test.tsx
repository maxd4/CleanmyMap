import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireAdminAccess: vi.fn(), redirect: vi.fn(), getServerLocale: vi.fn() }));
vi.mock("@/lib/authz", () => ({ requireAdminAccess: mocks.requireAdminAccess }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/server-preferences", () => ({ getServerLocale: mocks.getServerLocale }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdminAccess.mockResolvedValue({ ok: true, userId: "admin-session" });
  mocks.getServerLocale.mockResolvedValue("fr");
  mocks.redirect.mockImplementation((path: string) => { throw new Error(`redirect:${path}`); });
});

describe("admin organization mandate page", () => {
  it("requires administrator access before rendering the private review page", async () => {
    mocks.requireAdminAccess.mockResolvedValue({ ok: false, status: 403 });
    const { default: page } = await import("./page");
    await expect(page()).rejects.toThrow("redirect:/");
    expect(mocks.getServerLocale).toHaveBeenCalled();
  });

  it("renders the review panel in the current server locale", async () => {
    mocks.getServerLocale.mockResolvedValue("en");
    const { default: page } = await import("./page");
    const result = await page();
    expect(result.props.children[1].props.locale).toBe("en");
  });
});
