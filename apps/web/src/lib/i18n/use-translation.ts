import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import fr from "../../locales/fr.json";
import en from "../../locales/en.json";

const dictionaries: Record<string, any> = {
  fr,
  en,
};

export function useTranslation(namespace: string) {
  const { locale } = useSitePreferences();
  const dict = dictionaries[locale] || dictionaries.fr;

  const t = (key: string, values?: Record<string, string | number>) => {
    const keys = key.split(".");
    let result = dict[namespace];

    for (const k of keys) {
      if (result && typeof result === "object") {
        result = result[k];
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
