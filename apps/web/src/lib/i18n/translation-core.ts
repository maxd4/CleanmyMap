export type TranslationDictionary = Record<string, unknown>;
export type TranslationValues = Record<string, string | number>;

function resolveNestedTranslationValue(
  dictionary: TranslationDictionary,
  namespace: string,
  key: string,
): unknown {
  let result: unknown = dictionary[namespace];

  for (const part of key.split(".")) {
    if (!result || typeof result !== "object") {
      return undefined;
    }
    result = (result as Record<string, unknown>)[part];
  }

  return result;
}

export function resolveTranslation(
  dictionary: TranslationDictionary,
  namespace: string,
  key: string,
  values?: TranslationValues,
): string {
  const result = resolveNestedTranslationValue(dictionary, namespace, key);
  if (typeof result !== "string" || !result) {
    return key;
  }

  if (!values) {
    return result;
  }

  return Object.entries(values).reduce((acc, [name, value]) => {
    return acc.replace(new RegExp(`{${name}}`, "g"), String(value));
  }, result);
}
