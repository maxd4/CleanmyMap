"use client";

import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import fr from "../../locales/fr.json";
import en from "../../locales/en.json";
import { resolveTranslation, type TranslationDictionary, type TranslationValues } from "./translation-core";

const dictionaries: Record<string, TranslationDictionary> = {
  fr: fr as TranslationDictionary,
  en: en as TranslationDictionary,
};

export function useTranslation(namespace: string) {
  const { locale } = useSitePreferences();
  const dict = dictionaries[locale] || dictionaries["fr"];

  const t = (key: string, values?: TranslationValues) => resolveTranslation(dict, namespace, key, values);

  return { t };
}
