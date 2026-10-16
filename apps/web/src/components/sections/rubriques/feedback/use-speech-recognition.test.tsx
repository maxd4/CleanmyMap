import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useSpeechRecognition } from "./use-speech-recognition";

type FakeResult = { isFinal: boolean; transcript: string };

class FakeSpeechRecognition {
  static instances: FakeSpeechRecognition[] = [];

  lang = "";
  interimResults = false;
  continuous = false;
  onstart: (() => void) | null = null;
  onresult: ((event: { resultIndex: number; results: unknown }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  stopped = false;

  constructor() {
    FakeSpeechRecognition.instances.push(this);
  }

  start() {
    this.onstart?.();
  }

  stop() {
    this.stopped = true;
  }

  abort() {
    this.stopped = true;
    this.onend?.();
  }

  emitResult(results: FakeResult[], resultIndex = 0) {
    const list = Array.from({ length: resultIndex + results.length }, () => ({
      isFinal: false,
      0: { transcript: "" },
    }));
    results.forEach((result, offset) => {
      list[resultIndex + offset] = {
        isFinal: result.isFinal,
        0: { transcript: result.transcript },
      };
    });
    (list as unknown as { length: number }).length = list.length;
    this.onresult?.({ resultIndex, results: list });
  }

  emitEnd() {
    this.onend?.();
  }

  emitError(error: string) {
    this.onerror?.({ error });
  }
}

function SpeechHarness({
  locale,
  onFinalTranscript,
}: {
  locale: "fr" | "en";
  onFinalTranscript: (fieldKey: string, transcript: string) => void;
}) {
  const speech = useSpeechRecognition({ locale, onFinalTranscript });
  return (
    <div>
      <output data-testid="supported">{String(speech.isSupported)}</output>
      <output data-testid="known">{String(speech.supportKnown)}</output>
      <output data-testid="listening">{String(speech.isListening)}</output>
      <output data-testid="stopping">{String(speech.isStopping)}</output>
      <output data-testid="interim">{speech.interimTranscript}</output>
      <output data-testid="error">{speech.errorMessage ?? ""}</output>
      <button type="button" onClick={() => speech.start("steps")}>start</button>
      <button type="button" onClick={() => speech.stopIfOtherField("expected")}>change-field</button>
      <button type="button" onClick={speech.stop}>stop</button>
    </div>
  );
}

function output(renderer: ReactTestRenderer, testId: string): string {
  return renderer.root.findByProps({ "data-testid": testId }).children.join("");
}

const originalWindow = (globalThis as { window?: unknown }).window;

beforeEach(() => {
  FakeSpeechRecognition.instances = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {},
  });
});

afterEach(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: originalWindow,
  });
});

describe("useSpeechRecognition", () => {
  it("reports unsupported browsers without starting a session", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<SpeechHarness locale="fr" onFinalTranscript={() => undefined} />);
    });

    expect(output(renderer, "known")).toBe("true");
    expect(output(renderer, "supported")).toBe("false");
    expect(FakeSpeechRecognition.instances).toHaveLength(0);
  });

  it("uses the site language, exposes interim text, deduplicates final results and stops", () => {
    Object.assign(globalThis.window, { SpeechRecognition: FakeSpeechRecognition });
    const transcripts: Array<[string, string]> = [];
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <SpeechHarness
          locale="fr"
          onFinalTranscript={(fieldKey, transcript) => transcripts.push([fieldKey, transcript])}
        />,
      );
    });

    act(() => {
      renderer.root.findByProps({ children: "start" }).props.onClick();
    });
    const recognition = FakeSpeechRecognition.instances[0];
    expect(recognition.lang).toBe("fr-FR");
    expect(recognition.interimResults).toBe(true);
    expect(recognition.continuous).toBe(true);
    expect(output(renderer, "listening")).toBe("true");

    act(() => {
      recognition.emitResult([{ isFinal: false, transcript: "La carte" }]);
    });
    expect(output(renderer, "interim")).toBe("La carte");
    expect(transcripts).toEqual([]);

    act(() => {
      recognition.emitResult([{ isFinal: true, transcript: "La carte est visible" }]);
      recognition.emitResult([{ isFinal: true, transcript: "La carte est visible" }]);
    });
    expect(transcripts).toEqual([["steps", "La carte est visible"]]);
    expect(output(renderer, "interim")).toBe("");

    act(() => {
      renderer.root.findByProps({ children: "stop" }).props.onClick();
    });
    expect(recognition.stopped).toBe(true);
    expect(output(renderer, "listening")).toBe("false");
    act(() => {
      recognition.emitEnd();
    });
  });

  it("keeps the final result emitted between a manual stop and end", () => {
    Object.assign(globalThis.window, { SpeechRecognition: FakeSpeechRecognition });
    const transcripts: string[] = [];
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <SpeechHarness
          locale="fr"
          onFinalTranscript={(_, transcript) => transcripts.push(transcript)}
        />,
      );
    });

    act(() => {
      renderer.root.findByProps({ children: "start" }).props.onClick();
      FakeSpeechRecognition.instances[0].emitResult([
        { isFinal: false, transcript: "Dernier fragment" },
      ]);
      renderer.root.findByProps({ children: "stop" }).props.onClick();
    });
    expect(output(renderer, "stopping")).toBe("true");

    act(() => {
      FakeSpeechRecognition.instances[0].emitResult([
        { isFinal: true, transcript: "Dernier fragment définitif" },
      ]);
      FakeSpeechRecognition.instances[0].emitEnd();
    });

    expect(transcripts).toEqual(["Dernier fragment définitif"]);
    expect(output(renderer, "stopping")).toBe("false");
  });

  it("uses en-US and exposes a permission error without submitting anything", () => {
    Object.assign(globalThis.window, { webkitSpeechRecognition: FakeSpeechRecognition });
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<SpeechHarness locale="en" onFinalTranscript={() => undefined} />);
    });
    act(() => {
      renderer.root.findByProps({ children: "start" }).props.onClick();
    });
    const recognition = FakeSpeechRecognition.instances[0];
    expect(recognition.lang).toBe("en-US");

    act(() => {
      recognition.emitError("not-allowed");
      recognition.emitResult([{ isFinal: true, transcript: "late" }]);
    });
    expect(output(renderer, "error")).toContain("Microphone permission was denied");
    expect(output(renderer, "listening")).toBe("false");
  });

  it("stops the active recognition when its component is unmounted", () => {
    Object.assign(globalThis.window, { SpeechRecognition: FakeSpeechRecognition });
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<SpeechHarness locale="fr" onFinalTranscript={() => undefined} />);
    });
    act(() => {
      renderer.root.findByProps({ children: "start" }).props.onClick();
    });
    const recognition = FakeSpeechRecognition.instances[0];

    act(() => {
      renderer.unmount();
    });
    expect(recognition.stopped).toBe(true);
  });

  it("stops the active recognition when focus moves to another field", () => {
    Object.assign(globalThis.window, { SpeechRecognition: FakeSpeechRecognition });
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<SpeechHarness locale="fr" onFinalTranscript={() => undefined} />);
    });
    act(() => {
      renderer.root.findByProps({ children: "start" }).props.onClick();
    });
    const recognition = FakeSpeechRecognition.instances[0];

    act(() => {
      renderer.root.findByProps({ children: "change-field" }).props.onClick();
      recognition.emitResult([{ isFinal: true, transcript: "late" }]);
    });
    expect(recognition.stopped).toBe(true);
    expect(output(renderer, "listening")).toBe("false");
  });

  it("ignores a late result after unmount", () => {
    Object.assign(globalThis.window, { SpeechRecognition: FakeSpeechRecognition });
    const transcripts: string[] = [];
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <SpeechHarness
          locale="fr"
          onFinalTranscript={(_, transcript) => transcripts.push(transcript)}
        />,
      );
    });
    act(() => {
      renderer.root.findByProps({ children: "start" }).props.onClick();
    });
    const recognition = FakeSpeechRecognition.instances[0];

    act(() => {
      renderer.unmount();
    });
    recognition.emitResult([{ isFinal: true, transcript: "late" }]);

    expect(transcripts).toEqual([]);
  });

  it("allows a replacement session only after the previous session is canceled", () => {
    Object.assign(globalThis.window, { SpeechRecognition: FakeSpeechRecognition });
    const transcripts: string[] = [];
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <SpeechHarness
          locale="fr"
          onFinalTranscript={(_, transcript) => transcripts.push(transcript)}
        />,
      );
    });

    act(() => {
      renderer.root.findByProps({ children: "start" }).props.onClick();
    });
    const firstRecognition = FakeSpeechRecognition.instances[0];
    act(() => {
      renderer.root.findByProps({ children: "start" }).props.onClick();
    });
    const secondRecognition = FakeSpeechRecognition.instances[1];

    act(() => {
      firstRecognition.emitResult([{ isFinal: true, transcript: "old" }]);
      secondRecognition.emitResult([{ isFinal: true, transcript: "new" }]);
    });

    expect(FakeSpeechRecognition.instances).toHaveLength(2);
    expect(transcripts).toEqual(["new"]);
  });

  it("does not start twice while a manual stop is finalizing", () => {
    Object.assign(globalThis.window, { SpeechRecognition: FakeSpeechRecognition });
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<SpeechHarness locale="fr" onFinalTranscript={() => undefined} />);
    });
    act(() => {
      renderer.root.findByProps({ children: "start" }).props.onClick();
      renderer.root.findByProps({ children: "stop" }).props.onClick();
      renderer.root.findByProps({ children: "start" }).props.onClick();
    });
    expect(FakeSpeechRecognition.instances).toHaveLength(1);

    act(() => {
      FakeSpeechRecognition.instances[0].emitEnd();
      renderer.root.findByProps({ children: "start" }).props.onClick();
    });
    expect(FakeSpeechRecognition.instances).toHaveLength(2);
  });

  it("accepts identical words from distinct final result indexes", () => {
    Object.assign(globalThis.window, { SpeechRecognition: FakeSpeechRecognition });
    const transcripts: string[] = [];
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <SpeechHarness
          locale="fr"
          onFinalTranscript={(_, transcript) => transcripts.push(transcript)}
        />,
      );
    });
    act(() => {
      renderer.root.findByProps({ children: "start" }).props.onClick();
      FakeSpeechRecognition.instances[0].emitResult([
        { isFinal: true, transcript: "même texte" },
      ], 0);
      FakeSpeechRecognition.instances[0].emitResult([
        { isFinal: true, transcript: "même texte" },
      ], 1);
    });
    expect(transcripts).toEqual(["même texte", "même texte"]);
  });

  it("allows only one active recognition session across form instances", () => {
    Object.assign(globalThis.window, { SpeechRecognition: FakeSpeechRecognition });
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <div>
          <SpeechHarness locale="fr" onFinalTranscript={() => undefined} />
          <SpeechHarness locale="fr" onFinalTranscript={() => undefined} />
        </div>,
      );
    });
    const startButtons = renderer.root.findAllByProps({ children: "start" });
    act(() => {
      startButtons[0].props.onClick();
    });
    const firstRecognition = FakeSpeechRecognition.instances[0];
    act(() => {
      startButtons[1].props.onClick();
    });

    expect(firstRecognition.stopped).toBe(true);
    expect(FakeSpeechRecognition.instances).toHaveLength(2);
  });
});
