import { cookies } from "next/headers";
import { DEFAULT_LOCALE, STORAGE_KEYS, type Locale, LOCALES } from "./ui/preferences";

/**
 * Recupere la langue preferee de l'utilisateur cote serveur via les cookies.
 */
export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(STORAGE_KEYS.locale)?.value;

  if (localeCookie && LOCALES.includes(localeCookie as Locale)) {
    return localeCookie as Locale;
  }

  return DEFAULT_LOCALE;
}
