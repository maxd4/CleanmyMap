"use client";

import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import fr from "../../locales/fr.json";
import en from "../../locales/en.json";

type TranslationDictionary = Record<string, unknown>;

const dictionaries: Record<string, TranslationDictionary> = {
  fr: fr as TranslationDictionary,
  en: en as TranslationDictionary,
};

export function useTranslation(namespace: string) {
  const { locale } = useSitePreferences();
  const dict = dictionaries[locale] || dictionaries["fr"];

  const t = (key: string, values?: Record<string, string | number>) => {
    const keys = key.split(".");
    let result: unknown = dict[namespace];

    for (const k of keys) {
      if (result && typeof result === "object") {
        result = (result as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }

    if (typeof result !== "string") {
      return key;
    }

    if (values) {
      return Object.entries(values).reduce
        ? Object.entries(values).reduce((acc, [k, v]) => {
            return acc.replace(new RegExp(`{${k}}`, "g"), String(v));
          }, result)
        : result;
    }

    return result;
  };

  return { t };
}
