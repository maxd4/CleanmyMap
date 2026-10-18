import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuestionnaireScreenshotField } from "./questionnaire-card-screenshot";

describe("QuestionnaireScreenshotField preview boundary", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders a local blob preview while keeping a hostile file name as text", () => {
    vi.stubGlobal("window", { location: { origin: "https://cleanmymap.test" } });
    const file = new File(["png"], '"><img src=x onerror="alert(1)">.png', {
      type: "image/png",
    });

    const markup = renderToStaticMarkup(
      <QuestionnaireScreenshotField
        file={file}
        previewUrl="blob:https://cleanmymap.test/preview-1"
        error={null}
        onChange={() => undefined}
        onRemove={() => undefined}
      />,
    );

    expect(markup).toContain('src="blob:https://cleanmymap.test/preview-1"');
    expect(markup).toContain("&quot;&gt;&lt;img src=x onerror=&quot;alert(1)&quot;&gt;.png");
    expect(markup.match(/<img /g)).toHaveLength(1);
  });

  it("does not render a preview for an arbitrary URL", () => {
    vi.stubGlobal("window", { location: { origin: "https://cleanmymap.test" } });
    const file = new File(["png"], "capture.png", { type: "image/png" });

    const markup = renderToStaticMarkup(
      <QuestionnaireScreenshotField
        file={file}
        previewUrl="https://attacker.test/preview.png"
        error={null}
        onChange={() => undefined}
        onRemove={() => undefined}
      />,
    );

    expect(markup).not.toContain("https://attacker.test/preview.png");
    expect(markup).not.toContain('alt="Aperçu de capture.png"');
  });
});
