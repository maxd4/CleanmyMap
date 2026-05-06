import { cookies } from "next/headers";
import {
  DEFAULT_DISPLAY_MODE,
  DEFAULT_LOCALE,
  STORAGE_KEYS,
  type DisplayMode,
  type Locale,
  LOCALES,
  parseDisplayMode,
} from "./ui/preferences";

export type ServerDisplayModePreference = {
  displayMode: DisplayMode;
  isExplicit: boolean;
};

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
 * La preference reste aussi synchronisee en localStorage cote client.
 */
export async function getServerDisplayModePreference(): Promise<ServerDisplayModePreference> {
  const cookieStore = await cookies();
  const modeCookie = cookieStore.get(STORAGE_KEYS.displayMode)?.value;

  if (modeCookie) {
    return { displayMode: parseDisplayMode(modeCookie), isExplicit: true };
  }

  return { displayMode: DEFAULT_DISPLAY_MODE, isExplicit: false };
}

export async function getServerDisplayMode(): Promise<DisplayMode> {
  const { displayMode } = await getServerDisplayModePreference();
  return displayMode;
}
