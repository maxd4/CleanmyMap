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

/**
 * Recupere le mode d'affichage de l'utilisateur cote serveur via les cookies.
 */
export async function getServerDisplayMode() {
  const cookieStore = await cookies();
  const modeCookie = cookieStore.get(STORAGE_KEYS.displayMode)?.value;
  
  if (modeCookie && (modeCookie === "sobre" || modeCookie === "exhaustif" || modeCookie === "simplifie")) {
    return modeCookie;
  }

  return "exhaustif";
}
