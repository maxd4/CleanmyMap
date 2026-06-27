import fr from "../../locales/fr.json";
import en from "../../locales/en.json";

type TranslationDictionary = Record<string, unknown>;

const dictionaries: Record<string, TranslationDictionary> = {
  fr,
  en,
};

function getNestedTranslationValue(
  dictionary: TranslationDictionary,
  namespace: string,
  key: string,
): string | undefined {
  let result: unknown = dictionary[namespace];

  for (const part of key.split(".")) {
    if (!result || typeof result !== "object") {
      return undefined;
    }
    result = (result as Record<string, unknown>)[part];
  }

  return typeof result === "string" ? result : undefined;
}

export function getTranslation(namespace: string, locale: string) {
  const dict = dictionaries[locale] || dictionaries["fr"];

  const t = (key: string, values?: Record<string, string | number>) => {
    const result = getNestedTranslationValue(dict, namespace, key);
    if (!result) {
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
