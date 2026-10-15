import { act, create } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QRCodeDialog } from "./qrcode-dialog";

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderDialog(writeText: ReturnType<typeof vi.fn>) {
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  vi.stubGlobal("document", { body: { style: {} } });
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <QRCodeDialog
        isOpen
        onClose={() => undefined}
        value="https://cleanmymap.fr/spogomi"
        title="Partager"
      />,
    );
  });
  return renderer;
}

describe("QRCodeDialog clipboard feedback", () => {
  it("announces a copy failure instead of reporting a false success", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("clipboard denied"));
    const renderer = renderDialog(writeText);
    const copyButton = renderer.root.findAllByType("button").find((button) => button.props.children === "Copier le lien");

    await act(async () => {
      await copyButton?.props.onClick();
    });

    expect(writeText).toHaveBeenCalledWith("https://cleanmymap.fr/spogomi");
    expect(renderer.root.findByProps({ role: "alert" }).props.children).toContain("Copie indisponible");
    act(() => renderer.unmount());
  });

  it("keeps the success feedback after a real clipboard resolution", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const renderer = renderDialog(writeText);
    const copyButton = renderer.root.findAllByType("button").find((button) => button.props.children === "Copier le lien");

    await act(async () => {
      await copyButton?.props.onClick();
    });

    expect(renderer.root.findAllByType("button").some((button) => button.props.children === "✓ Copié")).toBe(true);
    act(() => renderer.unmount());
  });
});
