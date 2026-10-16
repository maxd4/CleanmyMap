import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0?: { transcript?: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike | undefined;
  };
};

type SpeechRecognitionErrorEventLike = {
  error?: string;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

type ActiveSession = {
  id: number;
  owner: object;
  recognition: SpeechRecognitionLike;
  deactivate: () => void;
};

let nextSessionId = 0;
let activeSession: ActiveSession | null = null;

const subscribeToSpeechSupport = () => () => undefined;
const getSpeechSupportSnapshot = () => Boolean(getSpeechRecognitionConstructor());
const getSpeechSupportServerSnapshot = () => false;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as SpeechRecognitionWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function messageForError(error: string | undefined, locale: "fr" | "en"): string {
  const messages = {
    fr: {
      "not-allowed": "L'autorisation du microphone a été refusée.",
      "service-not-allowed": "La reconnaissance vocale n'est pas autorisée par ce navigateur.",
      "no-speech": "Aucune parole n'a été détectée.",
      "audio-capture": "Le microphone n'est pas disponible.",
      network: "La reconnaissance vocale est momentanément indisponible.",
      default: "La dictée n'a pas pu démarrer.",
    },
    en: {
      "not-allowed": "Microphone permission was denied.",
      "service-not-allowed": "Speech recognition is not allowed by this browser.",
      "no-speech": "No speech was detected.",
      "audio-capture": "The microphone is not available.",
      network: "Speech recognition is temporarily unavailable.",
      default: "Dictation could not start.",
    },
  }[locale];

  if (error === "network") return messages.network;
  return messages[error as keyof typeof messages] ?? messages.default;
}

function unsupportedMessage(locale: "fr" | "en"): string {
  return locale === "fr"
    ? "La dictée n'est pas disponible dans ce navigateur. Vous pouvez saisir le texte au clavier."
    : "Dictation is not available in this browser. You can type the text instead.";
}

function stopActiveSession(): void {
  const session = activeSession;
  if (!session) return;

  activeSession = null;
  session.deactivate();
  try {
    session.recognition.stop();
  } catch {
    try {
      session.recognition.abort?.();
    } catch {
      // The browser may already have ended the session.
    }
  }
}

function stopOwnedSession(owner: object): void {
  if (activeSession?.owner === owner) {
    stopActiveSession();
  }
}

export function useSpeechRecognition({
  locale,
  onFinalTranscript,
}: {
  locale: "fr" | "en";
  onFinalTranscript: (fieldKey: string, transcript: string) => void;
}) {
  const isSupported = useSyncExternalStore(
    subscribeToSpeechSupport,
    getSpeechSupportSnapshot,
    getSpeechSupportServerSnapshot,
  );
  const supportKnown = useSyncExternalStore(
    subscribeToSpeechSupport,
    () => true,
    getSpeechSupportServerSnapshot,
  );
  const [isListening, setIsListening] = useState(false);
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const transcriptHandlerRef = useRef(onFinalTranscript);
  const ownerRef = useRef<object>({});
  useEffect(() => {
    transcriptHandlerRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  const stop = useCallback(() => {
    stopOwnedSession(ownerRef.current);
  }, []);

  const stopIfOtherField = useCallback((fieldKey: string) => {
    if (activeSession && activeFieldKey !== fieldKey) {
      stopActiveSession();
    }
  }, [activeFieldKey]);

  const start = useCallback((fieldKey: string) => {
    setErrorMessage(null);
    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      setErrorMessage(unsupportedMessage(locale));
      return;
    }

    stopActiveSession();
    let recognition: SpeechRecognitionLike;
    try {
      recognition = new Recognition();
    } catch {
      setErrorMessage(messageForError(undefined, locale));
      return;
    }
    const sessionId = ++nextSessionId;
    const finalizedResultIndexes = new Set<number>();
    const session: ActiveSession = {
      id: sessionId,
      owner: ownerRef.current,
      recognition,
      deactivate: () => {
        setIsListening(false);
        setActiveFieldKey(null);
        setInterimTranscript("");
      },
    };

    const isCurrentSession = () => activeSession?.id === sessionId;
    activeSession = session;
    recognition.lang = locale === "fr" ? "fr-FR" : "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onstart = () => {
      if (!isCurrentSession()) return;
      setIsListening(true);
      setActiveFieldKey(fieldKey);
      setInterimTranscript("");
      setErrorMessage(null);
    };
    recognition.onresult = (event) => {
      if (!isCurrentSession()) return;
      const interimParts: string[] = [];
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result?.[0]?.transcript?.trim() ?? "";
        if (!transcript) continue;
        if (result?.isFinal) {
          if (!finalizedResultIndexes.has(index)) {
            finalizedResultIndexes.add(index);
            transcriptHandlerRef.current(fieldKey, transcript);
          }
        } else {
          interimParts.push(transcript);
        }
      }
      setInterimTranscript(interimParts.join(" "));
    };
    recognition.onerror = (event) => {
      if (!isCurrentSession()) return;
      setErrorMessage(messageForError(event.error, locale));
      activeSession = null;
      session.deactivate();
      try {
        recognition.abort?.();
      } catch {
        // The browser may already have terminated the session.
      }
    };
    recognition.onend = () => {
      if (!isCurrentSession()) return;
      activeSession = null;
      session.deactivate();
    };

    try {
      recognition.start();
    } catch {
      if (isCurrentSession()) {
        activeSession = null;
        session.deactivate();
        setErrorMessage(messageForError(undefined, locale));
      }
    }
  }, [locale]);

  useEffect(() => {
    const owner = ownerRef.current;
    return () => {
      stopOwnedSession(owner);
    };
  }, []);

  return {
    activeFieldKey,
    errorMessage,
    interimTranscript,
    isListening,
    isSupported,
    supportKnown,
    start,
    stop,
    stopIfOtherField,
    unsupportedMessage: unsupportedMessage(locale),
  };
}
