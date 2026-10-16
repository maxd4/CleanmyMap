import { Mic, Square } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import type { Locale } from "../feedback-section.shared";
import type { QuestionnaireConfig } from "./questionnaire-config";
import { useSpeechRecognition } from "./use-speech-recognition";

type SpeechState = ReturnType<typeof useSpeechRecognition>;

export function QuestionnaireSpeechNotice({
  locale,
  speech,
}: {
  locale: Locale;
  speech: SpeechState;
}) {
  return (
    <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-sm leading-relaxed text-slate-300">
        {locale === "fr"
          ? "La dictée utilise la reconnaissance vocale du navigateur. Selon le navigateur, un fournisseur externe peut être utilisé ; aucun audio n'est enregistré par CleanMyMap."
          : "Dictation uses your browser's speech recognition. Depending on the browser, an external provider may be used; CleanMyMap does not record audio."}
      </p>
      {speech.supportKnown && !speech.isSupported ? (
        <p className="text-sm text-amber-100" role="status">
          {speech.unsupportedMessage}
        </p>
      ) : null}
      {speech.errorMessage ? (
        <p className="text-sm text-rose-100" role="alert">
          {speech.errorMessage}
        </p>
      ) : null}
    </div>
  );
}

export function QuestionnaireFields({
  questionnaire,
  locale,
  values,
  submitState,
  speech,
  onUpdateField,
}: {
  questionnaire: QuestionnaireConfig;
  locale: Locale;
  values: Record<string, string>;
  submitState: "idle" | "submitting" | "success" | "error";
  speech: SpeechState;
  onUpdateField: (fieldKey: string, value: string) => void;
}) {
  return (
    <div className="grid gap-3">
      {questionnaire.fields.map((field) => {
        const fieldId = `feedback-${questionnaire.id}-${field.key}`;
        const canDictate = questionnaire.id !== "collaboration" && field.rows !== undefined;
        const fieldIsListening = speech.isListening && speech.activeFieldKey === field.key;

        return (
          <div key={field.key} className="block space-y-1.5">
            <label htmlFor={fieldId} className="block">
              <span className="cmm-text-caption font-semibold uppercase tracking-[0.14em] text-slate-200">
                {field.label[locale]}
              </span>
            </label>
            <textarea
              id={fieldId}
              value={values[field.key] ?? ""}
              onChange={(event) => onUpdateField(field.key, event.target.value)}
              onFocus={() => speech.stopIfOtherField(field.key)}
              placeholder={field.placeholder[locale]}
              rows={field.rows ?? 2}
              maxLength={800}
              className="min-h-[88px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-[1.625] text-slate-100 placeholder:text-slate-400 focus:border-cyan-300/50 focus:outline-none focus:ring-2 focus:ring-cyan-300/20"
            />
            {canDictate ? (
              <div className="flex flex-wrap items-center gap-2">
                <CmmButton
                  type="button"
                  ariaLabel={fieldIsListening
                    ? locale === "fr" ? "Arrêter la dictée" : "Stop dictation"
                    : locale === "fr" ? "Dicter" : "Dictate"}
                  ariaControls={fieldId}
                  title={speech.supportKnown && !speech.isSupported ? speech.unsupportedMessage : undefined}
                  disabled={speech.isStopping || (speech.isListening
                    ? false
                    : !speech.supportKnown || !speech.isSupported || submitState === "submitting")}
                  onClick={() => {
                    if (fieldIsListening) {
                      speech.stop();
                    } else {
                      speech.start(field.key);
                    }
                  }}
                  tone="secondary"
                  variant="pill"
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {fieldIsListening ? <Square className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
                  {fieldIsListening
                    ? locale === "fr" ? "Arrêter" : "Stop"
                    : locale === "fr" ? "Dicter" : "Dictate"}
                </CmmButton>
                {fieldIsListening && speech.interimTranscript ? (
                  <p className="text-sm text-cyan-100" aria-live="polite">
                    {locale === "fr" ? "En cours : " : "In progress: "}
                    {speech.interimTranscript}
                  </p>
                ) : null}
              </div>
            ) : null}
            {field.helper ? (
              <p className="cmm-text-caption text-slate-400">
                {field.helper[locale]}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
