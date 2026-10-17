import type { ChangeEvent } from "react";
import { FEEDBACK_SCREENSHOT_ACCEPT } from "@/lib/community/feedback-screenshot-client";

export function QuestionnaireScreenshotField({
  file,
  previewUrl,
  error,
  onChange,
  onRemove,
}: {
  file: File | null;
  previewUrl: string | null;
  error: string | null;
  onChange: (file: File | undefined) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] text-slate-200">
            Capture d&apos;écran (facultatif)
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-300">
            Ajoutez une image pour aider à comprendre le bug. JPEG, PNG ou WebP, 5 Mo maximum.
          </p>
        </div>
        <label
          htmlFor="feedback-bug-screenshot"
          className="inline-flex min-h-10 cursor-pointer items-center rounded-xl border border-rose-300/30 bg-rose-400/10 px-3 py-2 text-sm font-semibold text-rose-50 transition hover:bg-rose-400/20 focus-within:outline-none focus-within:ring-2 focus-within:ring-rose-300/50"
        >
          Choisir une image
        </label>
      </div>
      <input
        id="feedback-bug-screenshot"
        type="file"
        accept={FEEDBACK_SCREENSHOT_ACCEPT}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.files?.[0])}
        className="sr-only"
      />
      {file && previewUrl ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/30 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={`Aperçu de ${file.name}`}
            className="h-20 w-20 rounded-lg object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-100">{file.name}</p>
            <p className="mt-1 text-xs text-slate-400">
              {Math.ceil(file.size / 1024)} Ko · aperçu local uniquement avant l&apos;envoi
            </p>
            <button
              type="button"
              className="mt-2 text-sm font-semibold text-rose-200 underline-offset-2 hover:underline"
              onClick={onRemove}
            >
              Retirer la capture
            </button>
          </div>
        </div>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm text-rose-100" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
