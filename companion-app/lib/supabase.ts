import 'react-native-url-polyfill/auto';
import { getClerkInstance } from '@clerk/expo';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Variables d'environnement Supabase.
 *
 * En développement : créer un fichier .env à la racine de companion-app/
 * (voir .env.example pour le format).
 *
 * En production (EAS Build) : configurer les secrets via :
 *   eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "..."
 *   eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "..."
 *
 * Les variables préfixées EXPO_PUBLIC_ sont embarquées dans le bundle
 * et visibles côté client — utiliser uniquement la clé anon (jamais la service_role).
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Retourne le token de session Clerk courant pour l'intégration Supabase
 * Third-Party Auth. Aucun token Supabase Auth n'est créé, stocké ou rafraîchi.
 */
export async function getClerkSupabaseAccessToken(): Promise<string | null> {
  try {
    const clerk = getClerkInstance();
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
    'Créer companion-app/.env à partir de .env.example.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
