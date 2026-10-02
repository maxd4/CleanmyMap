import 'react-native-url-polyfill/auto';
import { getClerkInstance } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Variables d'environnement Supabase.
 *
 * En développement : créer un fichier .env à la racine de apps/mobile/
 * (voir .env.example pour le format).
 *
 * En production (EAS Build) : configurer les secrets via :
 *   eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "..."
 *   eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "..."
 *
 * Les variables préfixées EXPO_PUBLIC_ sont embarquées dans le bundle
 * et visibles côté client — utiliser uniquement la clé anon, jamais une clé
 * serveur privée.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';
let clerkLoadPromise: Promise<void> | null = null;

function getConfiguredClerkInstance() {
  try {
    return getClerkInstance();
  } catch {
    if (!clerkPublishableKey) return null;
    return getClerkInstance({ publishableKey: clerkPublishableKey, tokenCache });
  }
}

async function ensureClerkLoaded() {
  const clerk = getConfiguredClerkInstance();
  if (!clerk || typeof clerk.load !== 'function' || clerk.loaded) return clerk;

  clerkLoadPromise ??= clerk.load().finally(() => {
    clerkLoadPromise = null;
  });
  await clerkLoadPromise;
  return clerk;
}

/**
 * Retourne le token de session Clerk courant pour l'intégration Supabase
 * Third-Party Auth. Aucun token Supabase Auth n'est créé, stocké ou rafraîchi.
 */
export async function getClerkSupabaseAccessToken(): Promise<string | null> {
  try {
    const clerk = await ensureClerkLoaded();
    if (!clerk) return null;
    return (await clerk.session?.getToken()) ?? null;
  } catch {
    // En background headless, Clerk peut ne pas être initialisé ou disposer
    // d'une session valide. Le caller doit alors conserver ses données en buffer.
    return null;
  }
}

async function requireClerkSupabaseAccessToken(): Promise<string> {
  const token = await getClerkSupabaseAccessToken();
  if (!token) {
    throw new Error('Clerk session token unavailable for Supabase request.');
  }

  return token;
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Supabase] Variables EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY manquantes.\n' +
    'Créer apps/mobile/.env à partir de .env.example.'
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  // Throwing on token absence prevents supabase-js from falling back to the
  // public anon key as an Authorization bearer value.
  accessToken: requireClerkSupabaseAccessToken,
});

/**
 * Garde d'accès unique pour les appels de données du companion.
 * La clé anon reste une clé de transport publique : elle ne remplace jamais
 * le token Clerk courant.
 */
export async function getAuthenticatedSupabaseClient(): Promise<SupabaseClient | null> {
  const token = await getClerkSupabaseAccessToken();
  return token ? supabase : null;
}
