import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toPng } from "html-to-image";
import {
  downloadImpactCardPng,
  generateImpactCardPng,
  isImpactShareAbortError,
  shareOrDownloadImpactCardPng,
} from "./impact-card-export";

vi.mock("html-to-image", () => ({
  toPng: vi.fn(),
}));

const toPngMock = vi.mocked(toPng);
const pngDataUrl = "data:image/png;base64,UE5H";

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

class FakeElement {}

type FakeAnchor = FakeElement & {
  href: string;
  download: string;
  rel: string;
  click: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
};

function createAnchor(): FakeAnchor {
  return Object.assign(new FakeElement(), {
    href: "",
    download: "",
    rel: "",
    click: vi.fn(),
    remove: vi.fn(),
  });
}

function installBrowserStubs(options?: { navigator?: object; anchor?: FakeAnchor }) {
  const card = new FakeElement();
  const anchor = options?.anchor ?? createAnchor();
  const documentStub = {
    getElementById: vi.fn(() => card),
    createElement: vi.fn(() => anchor),
    body: { appendChild: vi.fn() },
  };

  vi.stubGlobal("HTMLElement", FakeElement);
  vi.stubGlobal("document", documentStub);
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => "blob:impact-card"),
    revokeObjectURL: vi.fn(),
  });
  vi.stubGlobal("navigator", options?.navigator ?? {});

  return { anchor, documentStub };
}

describe("impact card export", () => {
  it("génère une seule fois le PNG depuis la source DOM impact-card", async () => {
    const { documentStub } = installBrowserStubs();
    toPngMock.mockResolvedValueOnce(pngDataUrl);

    const result = await generateImpactCardPng("Élodie / CleanMyMap");

    expect(documentStub.getElementById).toHaveBeenCalledWith("impact-card");
    expect(toPngMock).toHaveBeenCalledTimes(1);
    expect(toPngMock).toHaveBeenCalledWith(
      expect.any(FakeElement),
      expect.objectContaining({ cacheBust: true, backgroundColor: "#450a0a" }),
    );
    expect(result.filename).toBe("CleanMyMap-Impact-Elodie-CleanMyMap.png");
    expect(result.file.name).toBe(result.filename);
    expect(result.file.type).toBe("image/png");
  });

  it("déclenche effectivement le téléchargement du PNG", () => {
    const anchor = createAnchor();
    installBrowserStubs({ anchor });
    const png = {
      dataUrl: pngDataUrl,
      blob: new Blob(["PNG"], { type: "image/png" }),
      file: new File(["PNG"], "CleanMyMap-Impact-Test.png", { type: "image/png" }),
      filename: "CleanMyMap-Impact-Test.png",
    };

    downloadImpactCardPng(png);

    expect(anchor.download).toBe(png.filename);
    expect(anchor.href).toBe("blob:impact-card");
    expect(anchor.click).toHaveBeenCalledOnce();
    expect(anchor.remove).toHaveBeenCalledOnce();
  });

  it("partage le fichier image via Web Share API quand il est supporté", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    installBrowserStubs({ navigator: { share, canShare } });
    const file = new File(["PNG"], "CleanMyMap-Impact-Test.png", { type: "image/png" });
    const png = {
      dataUrl: pngDataUrl,
      blob: file,
      file,
      filename: file.name,
    };

    const result = await shareOrDownloadImpactCardPng(png);

    expect(result).toBe("shared");
    expect(canShare).toHaveBeenCalledWith({ files: [file] });
    expect(share).toHaveBeenCalledWith({
      title: "Ma carte d’impact CleanMyMap",
      text: "Voici ma carte d’impact CleanMyMap.",
      files: [file],
    });
    expect(JSON.stringify(share.mock.calls)).not.toContain("/profil/impact");
  });

  it("télécharge le PNG si le partage de fichier n’est pas supporté", async () => {
    const anchor = createAnchor();
    installBrowserStubs({ anchor, navigator: {} });
    const file = new File(["PNG"], "CleanMyMap-Impact-Test.png", { type: "image/png" });
    const png = {
      dataUrl: pngDataUrl,
      blob: file,
      file,
      filename: file.name,
    };

    const result = await shareOrDownloadImpactCardPng(png);

    expect(result).toBe("downloaded");
    expect(anchor.click).toHaveBeenCalledOnce();
    expect(anchor.download).toBe(file.name);
  });

  it("reconnaît AbortError sans le transformer en erreur utilisateur", () => {
    expect(isImpactShareAbortError({ name: "AbortError" })).toBe(true);
    expect(isImpactShareAbortError(new Error("other"))).toBe(false);
  });

  it("ne garde plus de ref morte ni de génération PNG dupliquée dans la page", () => {
    const source = readFileSync(new URL("./impact-profile-page.tsx", import.meta.url), "utf8");

    expect(source).not.toContain("cardRef");
    expect(source).not.toContain("toPng");
    expect(source).toContain("generateImpactCardPng");
    expect(source.match(/generateImpactCardPng\(displayName\)/g)).toHaveLength(2);
    expect(source).toContain('"Partager la carte"');
    expect(source.match(/disabled=\{Boolean\(activeCardAction\)\}/g)).toHaveLength(2);
    expect(source).toContain('role="alert"');
    expect(source).toContain("Carte téléchargée.");
    expect(source).toContain("Partage non disponible ici : la carte a été téléchargée.");
    expect(source).toContain("La carte n’a pas pu être exportée.");
    expect(source).toContain("La carte n’a pas pu être partagée.");
    expect(source).not.toContain('href="/profil/impact"');
  });
});
