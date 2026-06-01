"use client";

import { useMemo, useState } from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { buildAnswer } from "./assistant-utils";

export function useRecyclingAssistant() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const [question, setQuestion] = useState("");
  const answer = useMemo(() => buildAnswer(question, locale), [question, locale]);

  const copy = fr
    ? {
        title: "Assistant de tri",
        subtitle: "Pose une question en langage simple: dans quelle poubelle, déchèterie ou point de collecte spécifique ?",
        placeholder: "Ex. : dans quelle poubelle je mets une pile usagée ?",
        helper: "Tu peux aussi demander si un objet se signale sur DansMaRue ou s'il faut plutôt une filière dédiée.",
        examples: "Exemples rapides",
        clear: "Effacer",
        answerTitle: "Réponse",
        answerNext: "Prochaine étape",
        noteTitle: "À garder en tête",
        cta: "Voir les ressources",
        yourQuestion: "Ta question",
        hint: "Tu peux taper un objet, un lieu ou un cas d'usage.",
        footerNote: "Les règles locales peuvent varier. En cas de doute, le principe de base reste: propre et vide pour le recyclage, filière dédiée pour les piles, batteries et déchets spéciaux, et poubelle grise si le tri conseillé est impossible."
      }
    : {
        title: "Sorting assistant",
        subtitle: "Ask in plain language: which bin, recycling center or dedicated collection point?",
        placeholder: "Ex. : which bin for a used battery?",
        helper: "You can also ask whether an item should be reported on DansMaRue or sent to a dedicated stream.",
        examples: "Quick examples",
        clear: "Clear",
        answerTitle: "Answer",
        answerNext: "Next step",
        noteTitle: "Keep in mind",
        cta: "Open the resources",
        yourQuestion: "Your question",
        hint: "You can type an item, a place or a use case.",
        footerNote: "Local rules can vary. When in doubt, the base rule is: clean and empty for recycling, dedicated streams for batteries and special waste, and the residual bin if the recommended sorting is not possible."
      };

  return {
    locale,
    fr,
    question,
    setQuestion,
    answer,
    copy
  };
}
