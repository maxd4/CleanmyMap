"use client";

import { useState } from "react";
import confetti from "canvas-confetti";
import { logFailure, logWarning } from "@/lib/logging/failure-log";
import {
  downloadImpactCardPng,
  generateImpactCardPng,
  isImpactShareAbortError,
  shareOrDownloadImpactCardPng,
} from "@/components/profil/impact-card-export";

export function useImpactProfileActions(displayName: string) {
  const [activeCardAction, setActiveCardAction] = useState<"export" | "share" | null>(null);
  const [cardActionMessage, setCardActionMessage] = useState<string | null>(null);
  const [cardActionError, setCardActionError] = useState<string | null>(null);

  const showCardActionError = (message: string, userMessage: string, error: unknown) => {
    logFailure("ImpactProfile", message, error);
    setCardActionError(userMessage);
  };

  const celebrateDownload = () => {
    const animation = confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#ef4444", "#f87171", "#ffffff"],
    });
    void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ animation?.catch((error: unknown) => {
      logWarning("ImpactProfile", "Animation de célébration indisponible.", {
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
    });
  };

  const handleDownload = async () => {
    if (activeCardAction) return;
    setActiveCardAction("export");
    setCardActionMessage(null);
    setCardActionError(null);
    try {
      const png = await generateImpactCardPng(displayName);
      downloadImpactCardPng(png);
      celebrateDownload();
      setCardActionMessage("Carte téléchargée.");
    } catch (error) {
      showCardActionError(
        "Export failed",
        "La carte n’a pas pu être exportée. Réessayez avec l’un des boutons ci-dessus.",
        error,
      );
    } finally {
      setActiveCardAction(null);
    }
  };

  const handleShare = async () => {
    if (activeCardAction) return;
    setActiveCardAction("share");
    setCardActionMessage(null);
    setCardActionError(null);
    try {
      const png = await generateImpactCardPng(displayName);
      const result = await shareOrDownloadImpactCardPng(png);
      if (result === "downloaded") {
        celebrateDownload();
        setCardActionMessage("Partage non disponible ici : la carte a été téléchargée.");
      } else {
        setCardActionMessage("Carte partagée.");
      }
    } catch (error) {
      if (!isImpactShareAbortError(error)) {
        showCardActionError(
          "Share failed",
          "La carte n’a pas pu être partagée. Réessayez avec l’un des boutons ci-dessus.",
          error,
        );
      }
    } finally {
      setActiveCardAction(null);
    }
  };

  return { activeCardAction, cardActionMessage, cardActionError, handleDownload, handleShare };
}
