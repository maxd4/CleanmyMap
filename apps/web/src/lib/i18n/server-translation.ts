import fr from "../../locales/fr.json";
import en from "../../locales/en.json";
import { resolveTranslation, type TranslationDictionary, type TranslationValues } from "./translation-core";

const dictionaries: Record<string, TranslationDictionary> = {
  fr,
  en,
};

export function getTranslation(namespace: string, locale: string) {
  const dict = dictionaries[locale] || dictionaries["fr"];

  const t = (key: string, values?: TranslationValues) => resolveTranslation(dict, namespace, key, values);

  return { t };
}
