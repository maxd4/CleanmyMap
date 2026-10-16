"use client";

import { useState } from "react";

type ScreenshotResponse = {
  status?: unknown;
  screenshot?: {
    signedUrl?: unknown;
    originalName?: unknown;
  };
  error?: unknown;
};

export function FeedbackScreenshotViewer({ feedbackId }: { feedbackId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [image, setImage] = useState<{ url: string; name: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadScreenshot() {
    setState("loading");
    setErrorMessage(null);
    try {
      const response = await fetch(
        `/api/community/bug-reports/${encodeURIComponent(feedbackId)}/screenshot`,
        { headers: { Accept: "application/json" }, cache: "no-store" },
      );
      const body = (await response.json().catch(() => null)) as ScreenshotResponse | null;
      if (
        !response.ok ||
        body?.status !== "ok" ||
        typeof body.screenshot?.signedUrl !== "string" ||
        !body.screenshot.signedUrl
      ) {
        throw new Error(
          typeof body?.error === "string"
            ? body.error
            : "La capture ne peut pas être chargée.",
        );
      }
      setImage({
        url: body.screenshot.signedUrl,
        name: typeof body.screenshot.originalName === "string" ? body.screenshot.originalName : "capture",
      });
      setState("ready");
    } catch (error) {
      setImage(null);
      setErrorMessage(error instanceof Error ? error.message : "La capture ne peut pas être chargée.");
      setState("error");
    }
  }

  if (state === "ready" && image) {
    return (
      <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
        {/* Signed URLs are short-lived and are intentionally rendered without Next image optimization. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.url} alt={`Capture jointe : ${image.name}`} className="max-h-80 w-full rounded-md object-contain" />
        <button
          type="button"
          onClick={() => {
            setState("idle");
            setImage(null);
          }}
          className="mt-2 text-xs font-semibold text-slate-700 underline-offset-2 hover:underline"
        >
          Masquer la capture
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => void loadScreenshot()}
        disabled={state === "loading"}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60"
      >
        {state === "loading" ? "Chargement de la capture…" : "Charger la capture"}
      </button>
      {state === "error" ? (
        <p className="mt-2 text-sm text-rose-700" role="alert">
          {errorMessage ?? "La capture ne peut pas être chargée."}
        </p>
      ) : null}
    </div>
  );
}
