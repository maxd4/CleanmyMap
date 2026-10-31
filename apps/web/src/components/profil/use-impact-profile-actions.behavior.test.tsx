import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CurrentAccountIdentity } from "@/lib/account/current-account-identity";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { ImpactProfileAuthenticatedView } from "./impact-profile-authenticated-view";
import { useImpactProfileActions } from "./use-impact-profile-actions";

const {
  confettiMock,
  downloadMock,
  generateMock,
  logFailureMock,
  logWarningMock,
  shareMock,
  abortMock,
} = vi.hoisted(() => ({
  confettiMock: vi.fn(),
  downloadMock: vi.fn(),
  generateMock: vi.fn(),
  logFailureMock: vi.fn(),
  logWarningMock: vi.fn(),
  shareMock: vi.fn(),
  abortMock: vi.fn((error: unknown) => error instanceof Error && error.name === "AbortError"),
}));

vi.mock("canvas-confetti", () => ({ default: confettiMock }));
vi.mock("@/lib/logging/failure-log", () => ({
  logFailure: logFailureMock,
  logWarning: logWarningMock,
}));
vi.mock("./impact-card-export", () => ({
  downloadImpactCardPng: downloadMock,
  generateImpactCardPng: generateMock,
  isImpactShareAbortError: abortMock,
  shareOrDownloadImpactCardPng: shareMock,
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

type HookValue = ReturnType<typeof useImpactProfileActions>;

function createHarness(displayName = "Élodie") {
  let latest: HookValue | null = null;
  function Harness() {
    latest = useImpactProfileActions(displayName);
    return null;
  }
  let renderer: ReactTestRenderer;
  act(() => {
    renderer = create(<Harness />);
  });
  return {
    renderer: renderer!,
    get value() {
      if (!latest) throw new Error("Hook has not rendered");
      return latest;
    },
  };
}

function png() {
  return {
    dataUrl: "data:image/png;base64,UE5H",
    blob: new Blob(["PNG"], { type: "image/png" }),
    file: new File(["PNG"], "impact.png", { type: "image/png" }),
    filename: "impact.png",
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("useImpactProfileActions", () => {
  it("branche les boutons réels de la vue authentifiée sur les deux actions distinctes", () => {
    const handleDownload = vi.fn().mockResolvedValue(undefined);
    const handleShare = vi.fn().mockResolvedValue(undefined);
    const identity = {
      userId: "user-impact",
      displayName: "Élodie",
      handle: "elodie",
      firstName: "Élodie",
      username: "elodie",
      email: null,
      currentLevel: 2,
      actorNameOptions: ["Élodie"],
      role: "benevole",
      activeRole: "benevole",
      activeProfile: "act",
      badges: [],
    } as unknown as CurrentAccountIdentity;

    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <ImpactProfileAuthenticatedView
          classes={getBlockClasses("impact")}
          identity={identity}
          prog={undefined}
          validatedRoleHistory={[]}
          actions={{
            activeCardAction: null,
            cardActionMessage: "Carte prête.",
            cardActionError: null,
            handleDownload,
            handleShare,
          }}
        />,
      );
    });

    const buttons = renderer.root.findAll((node) => node.type === "button");
    expect(buttons).toHaveLength(2);
    act(() => {
      buttons[0]?.props.onClick();
      buttons[1]?.props.onClick();
    });
    expect(handleDownload).toHaveBeenCalledOnce();
    expect(handleShare).toHaveBeenCalledOnce();
    expect(renderer.root.findAll((node) => node.children.includes("Carte prête."))).toHaveLength(1);
  });

  it("génère, télécharge, célèbre et réinitialise l'état d'export", async () => {
    const card = png();
    generateMock.mockResolvedValueOnce(card);
    confettiMock.mockReturnValueOnce(Promise.resolve());
    const harness = createHarness("Élodie");

    await act(async () => {
      await harness.value.handleDownload();
    });

    expect(generateMock).toHaveBeenCalledWith("Élodie");
    expect(downloadMock).toHaveBeenCalledWith(card);
    expect(confettiMock).toHaveBeenCalledWith(expect.objectContaining({ particleCount: 100, spread: 70 }));
    expect(harness.value).toMatchObject({
      activeCardAction: null,
      cardActionMessage: "Carte téléchargée.",
      cardActionError: null,
    });
  });

  it("expose l'erreur d'export et journalise l'échec sans conserver le verrou", async () => {
    const error = new Error("capture unavailable");
    generateMock.mockRejectedValueOnce(error);
    const harness = createHarness();

    await act(async () => {
      await harness.value.handleDownload();
    });

    expect(downloadMock).not.toHaveBeenCalled();
    expect(logFailureMock).toHaveBeenCalledWith("ImpactProfile", "Export failed", error);
    expect(harness.value).toMatchObject({
      activeCardAction: null,
      cardActionMessage: null,
      cardActionError: "La carte n’a pas pu être exportée. Réessayez avec l’un des boutons ci-dessus.",
    });
  });

  it.each([
    ["shared", "Carte partagée."],
    ["downloaded", "Partage non disponible ici : la carte a été téléchargée."],
  ])("publie le résultat observable du partage %s", async (result, message) => {
    generateMock.mockResolvedValueOnce(png());
    shareMock.mockResolvedValueOnce(result);
    const harness = createHarness();

    await act(async () => {
      await harness.value.handleShare();
    });

    expect(shareMock).toHaveBeenCalledOnce();
    expect(harness.value).toMatchObject({ activeCardAction: null, cardActionMessage: message, cardActionError: null });
    if (result === "downloaded") {
      expect(confettiMock).toHaveBeenCalledOnce();
    } else {
      expect(confettiMock).not.toHaveBeenCalled();
    }
  });

  it("ignore une annulation utilisateur sans afficher une erreur", async () => {
    const error = Object.assign(new Error("cancelled"), { name: "AbortError" });
    generateMock.mockResolvedValueOnce(png());
    shareMock.mockRejectedValueOnce(error);
    const harness = createHarness();

    await act(async () => {
      await harness.value.handleShare();
    });

    expect(abortMock).toHaveBeenCalledWith(error);
    expect(logFailureMock).not.toHaveBeenCalled();
    expect(harness.value).toMatchObject({ activeCardAction: null, cardActionMessage: null, cardActionError: null });
  });

  it("journalise et expose l'échec d'un partage non annulé", async () => {
    const error = new Error("share unavailable");
    generateMock.mockResolvedValueOnce(png());
    shareMock.mockRejectedValueOnce(error);
    const harness = createHarness();

    await act(async () => {
      await harness.value.handleShare();
    });

    expect(logFailureMock).toHaveBeenCalledWith("ImpactProfile", "Share failed", error);
    expect(harness.value.cardActionError).toBe("La carte n’a pas pu être partagée. Réessayez avec l’un des boutons ci-dessus.");
    expect(harness.value.activeCardAction).toBeNull();
  });

  it("verrouille une seconde action pendant la génération puis réinitialise le verrou", async () => {
    let resolveGeneration!: (value: ReturnType<typeof png>) => void;
    const pending = new Promise<ReturnType<typeof png>>((resolve) => {
      resolveGeneration = resolve;
    });
    generateMock.mockReturnValueOnce(pending);
    const harness = createHarness();

    let firstAction!: Promise<void>;
    act(() => {
      firstAction = harness.value.handleDownload();
    });
    expect(harness.value.activeCardAction).toBe("export");
    await act(async () => {
      await harness.value.handleShare();
    });
    expect(generateMock).toHaveBeenCalledOnce();
    expect(harness.value.activeCardAction).toBe("export");

    resolveGeneration(png());
    await act(async () => {
      await firstAction;
    });
    expect(harness.value.activeCardAction).toBeNull();
    expect(harness.value.cardActionMessage).toBe("Carte téléchargée.");
  });

  it("conserve le succès même si l'animation de célébration échoue", async () => {
    generateMock.mockResolvedValueOnce(png());
    confettiMock.mockReturnValueOnce(Promise.reject(new Error("animation unavailable")));
    const harness = createHarness();

    await act(async () => {
      await harness.value.handleDownload();
      await Promise.resolve();
    });

    expect(harness.value.cardActionMessage).toBe("Carte téléchargée.");
    expect(logWarningMock).toHaveBeenCalledWith("ImpactProfile", "Animation de célébration indisponible.", { errorName: "Error" });
  });
});
