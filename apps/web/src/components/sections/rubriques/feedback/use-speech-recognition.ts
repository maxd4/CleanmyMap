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
  status: "active" | "stopping";
  deactivate: () => void;
  markStopping: () => void;
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

function cancelActiveSession(): void {
  const session = activeSession;
  if (!session) return;

  activeSession = null;
  session.deactivate();
  try {
    if (session.recognition.abort) {
      session.recognition.abort();
    } else {
      session.recognition.stop();
    }
  } catch {
    try {
      session.recognition.stop();
    } catch {
      // The browser may already have ended the session.
    }
  }
}

function stopActiveSession(): void {
  const session = activeSession;
  if (!session || session.status === "stopping") return;

  session.status = "stopping";
  session.markStopping();
  try {
    session.recognition.stop();
  } catch {
    cancelActiveSession();
  }
}

function stopOwnedSession(owner: object): void {
  if (activeSession?.owner === owner) {
    stopActiveSession();
  }
}

function cancelOwnedSession(owner: object): void {
  if (activeSession?.owner === owner) {
    cancelActiveSession();
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
  const [isStopping, setIsStopping] = useState(false);
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

  const cancel = useCallback(() => {
    cancelOwnedSession(ownerRef.current);
  }, []);

  const stopIfOtherField = useCallback((fieldKey: string) => {
    if (activeSession && activeFieldKey !== fieldKey) {
      cancelActiveSession();
    }
  }, [activeFieldKey]);

  const start = useCallback((fieldKey: string) => {
    setErrorMessage(null);
    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      setErrorMessage(unsupportedMessage(locale));
      return;
    }

    if (activeSession?.status === "stopping") return;
    cancelActiveSession();
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
      status: "active",
      deactivate: () => {
        setIsListening(false);
        setIsStopping(false);
        setActiveFieldKey(null);
        setInterimTranscript("");
      },
      markStopping: () => {
        setIsListening(false);
        setIsStopping(true);
        setInterimTranscript("");
      },
    };

    const isCurrentSession = () => activeSession?.id === sessionId;
    activeSession = session;
    recognition.lang = locale === "fr" ? "fr-FR" : "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onstart = () => {
      if (!isCurrentSession() || session.status === "stopping") return;
      setIsListening(true);
      setIsStopping(false);
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
      cancelActiveSession();
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
        cancelActiveSession();
        setErrorMessage(messageForError(undefined, locale));
      }
    }
  }, [locale]);

  useEffect(() => {
    const owner = ownerRef.current;
    return () => {
      cancelOwnedSession(owner);
    };
  }, []);

  return {
    activeFieldKey,
    errorMessage,
    interimTranscript,
    isListening,
    isStopping,
    isSupported,
    supportKnown,
    start,
    stop,
    cancel,
    stopIfOtherField,
    unsupportedMessage: unsupportedMessage(locale),
  };
}
