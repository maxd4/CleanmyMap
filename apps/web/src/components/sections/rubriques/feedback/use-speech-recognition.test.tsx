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
    this.onend?.();
  }

  abort() {
    this.stopped = true;
    this.onend?.();
  }

  emitResult(results: FakeResult[], resultIndex = 0) {
    const list = results.map((result) => ({
      isFinal: result.isFinal,
      0: { transcript: result.transcript },
    }));
    (list as unknown as { length: number }).length = list.length;
    this.onresult?.({ resultIndex, results: list });
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
    });
    expect(recognition.stopped).toBe(true);
    expect(output(renderer, "listening")).toBe("false");
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
