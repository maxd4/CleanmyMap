"use client";

import { useState } from "react";
import type { CreatorInboxItem } from "@/lib/community/creator-inbox";
import {
  buildFeedbackAiExport,
  buildFeedbackMarkdownExport,
} from "@/lib/community/feedback-export";
import type { CreatorInboxLocale } from "./creator-inbox-copy";

type FeedbackExportActionsProps = {
  item: CreatorInboxItem;
  locale: CreatorInboxLocale;
};

export function FeedbackExportActions({ item, locale }: FeedbackExportActionsProps) {
  const [copied, setCopied] = useState<"feedback" | "ai" | null>(null);
  const [error, setError] = useState(false);

  async function copy(kind: "feedback" | "ai") {
    setError(false);
    try {
      await navigator.clipboard.writeText(
        kind === "ai" ? buildFeedbackAiExport(item) : buildFeedbackMarkdownExport(item),
      );
      setCopied(kind);
    } catch {
      setCopied(null);
      setError(true);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
      <button
        type="button"
        onClick={() => void copy("feedback")}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-caption font-semibold cmm-text-secondary hover:bg-slate-100"
      >
        {copied === "feedback"
          ? locale === "fr"
            ? "Copié"
            : "Copied"
          : locale === "fr"
            ? "Copier le retour"
            : "Copy feedback"}
      </button>
      <button
        type="button"
        onClick={() => void copy("ai")}
        className="rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 cmm-text-caption font-semibold text-amber-900 hover:bg-amber-100"
      >
        {copied === "ai"
          ? locale === "fr"
            ? "Copié"
            : "Copied"
          : locale === "fr"
            ? "Copier pour analyse IA"
            : "Copy for AI analysis"}
      </button>
      {error ? (
        <span role="alert" className="cmm-text-caption text-rose-700">
          {locale === "fr"
            ? "Copie impossible dans le presse-papiers."
            : "Unable to copy to clipboard."}
        </span>
      ) : null}
    </div>
  );
}
