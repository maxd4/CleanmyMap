"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useUser } from "@clerk/nextjs";
import {
  buildPrefillText,
  buildSubmissionTitle,
  getTopicById,
  localize,
  type FeedbackSectionProps,
  type FeedbackTopicId,
  type Locale,
} from "./feedback-section.shared";

export type FeedbackSectionDashboardProps = {
  pagePath: string;
  source: FeedbackSectionProps["source"];
  supportPrefill: Partial<Record<string, string>> | null;
  locale: Locale;
};

function readFormStartedAt(ref: { current: number | null }): number {
  ref.current ??= Date.now();
  return ref.current;
}

export function useFeedbackDashboardController({
  pagePath,
  source,
  supportPrefill,
  locale,
}: FeedbackSectionDashboardProps) {
  const fr = locale === "fr";
  const { isLoaded, isSignedIn } = useUser();
  const [topicIdOverride, setTopicIdOverride] = useState<FeedbackTopicId>();
  const [messageOverride, setMessageOverride] = useState<string>();
  const topicId = topicIdOverride ?? (supportPrefill ? "signalement" : "all");
  const message = messageOverride ?? buildPrefillText(supportPrefill, locale);
  const setTopicId = (value: FeedbackTopicId) => setTopicIdOverride(value);
  const [honeypot, setHoneypot] = useState("");
  const formStartedAt = useRef<number | null>(null);
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "success" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSubmittedTitle, setLastSubmittedTitle] = useState<string | null>(null);
  const setMessage = (value: string) => {
    if (submitState !== "idle") {
      setSubmitState("idle");
      setErrorMessage(null);
    }
    setMessageOverride(value);
  };

  const activeTopic = getTopicById(topicId);
  const canSubmit = message.trim().length >= 10 && submitState !== "submitting";

  useEffect(() => {
    formStartedAt.current = Date.now();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded || !isSignedIn || !canSubmit) {
      return;
    }

    setSubmitState("submitting");
    setErrorMessage(null);

    try {
      const title = buildSubmissionTitle(message, localize(locale, activeTopic.label));
      const response = await fetch("/api/community/bug-reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reportType: activeTopic.reportType,
          title,
          description: [
            `${fr ? "Catégorie" : "Category"}: ${localize(locale, activeTopic.label)}`,
            `Page: ${pagePath}`,
            "",
            message.trim(),
          ].join("\n"),
          pagePath,
          source,
          honeypot,
          submittedAt: readFormStartedAt(formStartedAt),
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string; message?: string; kind?: string }
          | null;
        throw new Error(
          body?.message ??
            body?.error ??
            (fr ? "Impossible d'envoyer le retour." : "Unable to send the feedback."),
        );
      }

      setSubmitState("success");
      setLastSubmittedTitle(title);
      setMessageOverride("");
    } catch (error) {
      setSubmitState("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : fr
            ? "Une erreur inattendue est survenue."
            : "An unexpected error occurred.",
      );
    }
  }

  return {
    fr,
    isLoaded,
    isSignedIn,
    topicId,
    message,
    setTopicId,
    setMessage,
    honeypot,
    setHoneypot,
    activeTopic,
    canSubmit,
    submitState,
    errorMessage,
    lastSubmittedTitle,
    handleSubmit,
  };
}

export type FeedbackDashboardController = ReturnType<typeof useFeedbackDashboardController>;
