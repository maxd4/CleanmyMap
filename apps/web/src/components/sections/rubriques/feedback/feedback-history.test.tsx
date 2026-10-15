import { act, create, type ReactTestRenderer } from "react-test-renderer";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FeedbackHistory } from "./feedback-history";

const useUserMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs", () => ({ useUser: useUserMock }));
vi.mock("@/components/ui/cmm-button", () => ({
  CmmButton: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
    <button {...props}>{children}</button>
  ),
}));

function textOf(renderer: ReactTestRenderer): string {
  return JSON.stringify(renderer.toJSON());
}

const page = {
  status: "ok",
  items: [
    {
      id: "report-1",
      title: "Bug répondu",
      type: "bug",
      createdAt: "2026-08-27T11:00:00.000Z",
      status: "responded",
    },
  ],
  nextCursor: "2026-08-27T11:00:00.000Z|report-1",
  hasMore: true,
};

describe("FeedbackHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUserMock.mockReturnValue({ isLoaded: true, isSignedIn: false });
    vi.stubGlobal("fetch", vi.fn());
  });

  it("shows the sign-in state without querying personal data anonymously", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<FeedbackHistory locale="fr" />);
    });

    expect(textOf(renderer)).toContain("Mes retours");
    expect(textOf(renderer)).toContain("Connectez-vous pour consulter vos retours.");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("loads persisted statuses and requests the next page with the returned cursor", async () => {
    useUserMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(Response.json(page))
      .mockResolvedValueOnce(
        Response.json({
          status: "ok",
          items: [
            {
              id: "report-2",
              title: "Retour archivé",
              type: "idea",
              createdAt: "2026-08-27T10:00:00.000Z",
              status: "archived",
            },
          ],
          nextCursor: null,
          hasMore: false,
        }),
      );

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(<FeedbackHistory locale="fr" />);
      await Promise.resolve();
    });

    expect(textOf(renderer)).toContain("Répondu");
    expect(textOf(renderer)).not.toContain("private@example.com");
    const loadMore = renderer.root.findAllByType("button").find((button) =>
      String(button.props.children).includes("Voir plus"),
    );
    expect(loadMore).toBeDefined();

    await act(async () => {
      loadMore?.props.onClick();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/community/bug-reports?cursor=2026-08-27T11%3A00%3A00.000Z%7Creport-1",
      { cache: "no-store" },
    );
    expect(textOf(renderer)).toContain("Archivé");
    expect(textOf(renderer)).toContain("Bug répondu");
  });

  it("renders an empty state and a safe error state", async () => {
    useUserMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      Response.json({ status: "ok", items: [], nextCursor: null, hasMore: false }),
    );

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(<FeedbackHistory locale="fr" />);
      await Promise.resolve();
    });
    expect(textOf(renderer)).toContain("Aucun retour envoyé pour le moment.");

    fetchMock.mockRejectedValueOnce(new Error("private storage provider detail"));
    await act(async () => {
      renderer.unmount();
      renderer = create(<FeedbackHistory locale="fr" />);
      await Promise.resolve();
    });
    expect(textOf(renderer)).toContain("Impossible de charger vos retours.");
    expect(textOf(renderer)).not.toContain("private storage provider detail");
  });
});
