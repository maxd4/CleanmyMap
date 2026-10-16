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
      qualificationStatus: "accepted",
      qualificationReason: "Retour pertinent.",
    },
  ],
  nextCursor: "2026-08-27T11:00:00.000Z|report-1",
  hasMore: true,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

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
    useUserMock.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: { id: "owner-1" },
    });
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
              qualificationStatus: "duplicate",
              qualificationReason: "Doublon déjà connu.",
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
    expect(textOf(renderer)).toContain("Contribution reconnue pour la progression Amélioration du produit.");
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
    useUserMock.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: { id: "owner-1" },
    });
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

  it("does not present collaboration as product-feedback recognition", async () => {
    useUserMock.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: { id: "owner-1" },
    });
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({
        status: "ok",
        items: [{
          id: "collaboration-1",
          title: "Partenariat local",
          type: "collaboration",
          createdAt: "2026-08-27T11:00:00.000Z",
          status: "treated",
          qualificationStatus: "accepted",
          qualificationReason: "Demande reçue.",
        }],
        nextCursor: null,
        hasMore: false,
      }),
    );

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(<FeedbackHistory locale="fr" />);
      await Promise.resolve();
    });

    expect(textOf(renderer)).toContain("Pertinent");
    expect(textOf(renderer)).not.toContain("Contribution reconnue pour la progression Amélioration du produit.");
  });

  it("does not render a previous owner's history while identities change", async () => {
    const ownerARequest = deferred<Response>();
    const ownerBRequest = deferred<Response>();
    useUserMock.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: { id: "owner-a" },
    });
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockReturnValueOnce(ownerARequest.promise)
      .mockReturnValueOnce(ownerBRequest.promise);

    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<FeedbackHistory locale="fr" />);
    });

    useUserMock.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: { id: "owner-b" },
    });
    act(() => {
      renderer.update(<FeedbackHistory locale="fr" />);
    });
    expect(textOf(renderer)).not.toContain("Retour du compte A");
    expect(textOf(renderer)).toContain("Chargement de vos retours...");

    await act(async () => {
      ownerARequest.resolve(
        Response.json({
          status: "ok",
          items: [
            {
              id: "owner-a-report",
              title: "Retour du compte A",
              type: "bug",
              createdAt: "2026-08-27T11:00:00.000Z",
              status: "new",
              qualificationStatus: "pending",
              qualificationReason: null,
            },
          ],
          nextCursor: null,
          hasMore: false,
        }),
      );
      await Promise.resolve();
    });
    expect(textOf(renderer)).not.toContain("Retour du compte A");

    await act(async () => {
      ownerBRequest.resolve(
        Response.json({
          status: "ok",
          items: [
            {
              id: "owner-b-report",
              title: "Retour du compte B",
              type: "idea",
              createdAt: "2026-08-27T12:00:00.000Z",
              status: "treated",
              qualificationStatus: "rejected",
              qualificationReason: "Pas de changement produit retenu.",
            },
          ],
          nextCursor: null,
          hasMore: false,
        }),
      );
      await Promise.resolve();
    });
    expect(textOf(renderer)).toContain("Retour du compte B");
    expect(textOf(renderer)).not.toContain("Retour du compte A");
  });

  it("hides personal data immediately on sign-out and ignores its late response", async () => {
    const ownerRequest = deferred<Response>();
    useUserMock.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: { id: "owner-a" },
    });
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockReturnValueOnce(ownerRequest.promise);

    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<FeedbackHistory locale="fr" />);
    });

    useUserMock.mockReturnValue({ isLoaded: true, isSignedIn: false, user: null });
    act(() => {
      renderer.update(<FeedbackHistory locale="fr" />);
    });
    expect(textOf(renderer)).toContain("Connectez-vous pour consulter vos retours.");
    expect(textOf(renderer)).not.toContain("Retour du compte A");

    await act(async () => {
      ownerRequest.resolve(
        Response.json({
          status: "ok",
          items: [
            {
              id: "owner-a-report",
              title: "Retour du compte A",
              type: "bug",
              createdAt: "2026-08-27T11:00:00.000Z",
              status: "new",
              qualificationStatus: "pending",
              qualificationReason: null,
            },
          ],
          nextCursor: null,
          hasMore: false,
        }),
      );
      await Promise.resolve();
    });
    expect(textOf(renderer)).not.toContain("Retour du compte A");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not append a late pagination response from the previous owner", async () => {
    const ownerAPageTwo = deferred<Response>();
    useUserMock.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: { id: "owner-a" },
    });
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(Response.json(page))
      .mockReturnValueOnce(ownerAPageTwo.promise)
      .mockResolvedValueOnce(
        Response.json({
          status: "ok",
          items: [
            {
              id: "owner-b-report",
              title: "Retour du compte B",
              type: "idea",
              createdAt: "2026-08-27T12:00:00.000Z",
              status: "new",
              qualificationStatus: "accepted",
              qualificationReason: "Besoin confirmé.",
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
    const loadMore = renderer.root.findAllByType("button").find((button) =>
      String(button.props.children).includes("Voir plus"),
    );
    expect(loadMore).toBeDefined();

    await act(async () => {
      loadMore?.props.onClick();
      await Promise.resolve();
    });

    useUserMock.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: { id: "owner-b" },
    });
    act(() => {
      renderer.update(<FeedbackHistory locale="fr" />);
    });
    expect(textOf(renderer)).not.toContain("Retour du compte A");

    await act(async () => {
      ownerAPageTwo.resolve(
        Response.json({
          status: "ok",
          items: [
            {
              id: "owner-a-page-two",
              title: "Page 2 du compte A",
              type: "idea",
              createdAt: "2026-08-27T10:00:00.000Z",
              status: "treated",
              qualificationStatus: "needs_info",
              qualificationReason: "Merci de préciser le contexte.",
            },
          ],
          nextCursor: null,
          hasMore: false,
        }),
      );
      await Promise.resolve();
    });
    expect(textOf(renderer)).not.toContain("Page 2 du compte A");

    await act(async () => {
      await Promise.resolve();
    });
    expect(textOf(renderer)).toContain("Retour du compte B");
    expect(textOf(renderer)).not.toContain("Page 2 du compte A");
  });

  it("shows product delivery proof separately and keeps needs-info in the owner DM", async () => {
    useUserMock.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: { id: "owner-1" },
    });
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({
        status: "ok",
        items: [
          {
            id: "feedback-shipped",
            title: "Carte corrigée",
            type: "improvement",
            createdAt: "2026-10-16T10:00:00.000Z",
            status: "treated",
            qualificationStatus: "accepted",
            qualificationReason: "Utile",
            qualificationDecidedByUserId: "max-owner",
            description: "La carte ne se chargeait pas.",
            trackingStatus: "shipped",
            trackingPublicSummary: "Le chargement de la carte est corrigé.",
            trackingReference: "2026.10",
            trackingShippedOn: "2026-10-16",
          },
          {
            id: "feedback-needs-info",
            title: "Précision demandée",
            type: "bug",
            createdAt: "2026-10-15T10:00:00.000Z",
            status: "responded",
            qualificationStatus: "needs_info",
            qualificationReason: "Précisez le navigateur.",
            qualificationDecidedByUserId: "max-owner",
            description: "Le bouton ne répond pas.",
            trackingStatus: "not_planned",
            trackingPublicSummary: null,
            trackingReference: null,
            trackingShippedOn: null,
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

    expect(textOf(renderer)).toContain("Suivi produit");
    expect(textOf(renderer)).toContain("Livré");
    expect(textOf(renderer)).toContain("Le chargement de la carte est corrigé.");
    expect(textOf(renderer)).toContain("Ajouter une précision dans le DM");
    expect(renderer.root.findAllByType("a").some((anchor) =>
      String(anchor.props.href).includes("recipientId=max-owner") &&
      String(anchor.props.href).includes("feedbackId=feedback-needs-info"),
    )).toBe(true);
  });
});
