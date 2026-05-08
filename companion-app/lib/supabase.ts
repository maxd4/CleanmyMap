import { AppState } from 'react-native';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

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
 *
 * TODO : Ajouter expo-constants si un accès runtime aux variables est nécessaire
 * sans rebuild (ex: multi-env staging/production).
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Supabase] Variables EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY manquantes.\n' +
    'Créer companion-app/.env à partir de .env.example.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Désactivé — pas de browser redirect en RN
  },
});

// Pause/reprise du refresh token selon l'état de l'app (batterie + connexion)
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
