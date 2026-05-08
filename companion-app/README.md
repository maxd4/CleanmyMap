# companion-app — CleanMyMap GPS Tracker

Application mobile minimaliste de suivi GPS pour les missions bénévoles CleanMyMap.

**Stack** : Expo 54 · React Native 0.81 · TypeScript · Supabase

---

## Pourquoi pas le navigateur web ?

Un site web classique (Next.js, navigateur Chrome/Safari) **ne peut pas** maintenir un suivi GPS fiable téléphone éteint pour deux raisons fondamentales :

1. **Suspension du navigateur** : lorsque l'écran s'éteint ou que l'onglet passe en arrière-plan, le navigateur suspend les timers JavaScript (`setInterval`, `setTimeout`). Le suivi GPS s'arrête donc en pratique après quelques secondes.

2. **Pas d'accès au Foreground Service** : seules les applications natives (ou React Native via `expo-location`) peuvent déclarer un *Foreground Service* sur Android (notification persistante + priorité OS) ou utiliser `allowsBackgroundLocationUpdates` sur iOS. Ces APIs ne sont pas disponibles dans un WebView ou un onglet de navigateur.

→ Une app native compilée (Expo/React Native) est le seul moyen fiable d'assurer un suivi GPS toutes les 5 minutes, même téléphone verrouillé.

---

## Comment le site et l'app mobile communiquent

```
Site Next.js                     Supabase                  App Mobile (Expo)
──────────────                   ────────                  ─────────────────
Créer mission      → INSERT missions (status='pending')
Générer QR code    → encode https://cleanmymap.fr/mission/start?id={uuid}
                                                   ← Scanne QR / deep link
                                                   ← GET missions (vérif)
                                                   ← UPDATE status='tracking'
                                                   ← INSERT gps_points (× N)
                                                   ← UPDATE status='completed'
                                                   ← RPC compute_mission_distance()
Afficher tracé     ← SELECT gps_points ORDER BY recorded_at
Afficher stats     ← SELECT missions (distance_m, duration_s)
```

Le **même projet Supabase** est partagé entre le site et l'app mobile. Ils utilisent la même URL et la même clé anon — seule la variable préfixe change (`NEXT_PUBLIC_` vs `EXPO_PUBLIC_`).

---

## Variables d'environnement

Créer `companion-app/.env` à partir de `.env.example` :

```bash
cp companion-app/.env.example companion-app/.env
```

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | URL du projet Supabase (Settings > API) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Clé anon publique (jamais la `service_role`) |

Ces valeurs sont **identiques** à `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` utilisées par `apps/web`.

Pour EAS Build (CI/CD) :
```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "..."
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "..."
```

---

## Structure des fichiers

```
companion-app/
├── App.tsx                  # Écran principal (start/stop mission, statut, GPS)
├── index.ts                 # Entrée : enregistre gps-task AVANT registerRootComponent
├── app.json                 # Config Expo (deep links, permissions iOS, schéma URI)
├── .env.example             # Template des variables d'environnement
├── lib/
│   ├── supabase.ts          # Client Supabase (EXPO_PUBLIC_ vars)
│   ├── storage.ts           # Buffer local AsyncStorage (hors ligne)
│   └── tracking-service.ts  # startTracking / stopTracking / saveLocationPoint
├── tasks/
│   └── gps-task.ts          # Tâche TaskManager background (GPS → Supabase)
└── types/
    └── mission.ts           # Types TS : Mission, MissionLocation, TrackingStatus
```

---

## Démarrage en développement

```bash
cd companion-app
cp .env.example .env
# Remplir .env avec vos clés Supabase

npm install
npm start          # Expo Go (scan QR avec l'app Expo Go sur votre téléphone)
npm run android    # Émulateur Android
npm run ios        # Simulateur iOS (macOS requis)
```

> **Note** : le GPS background ne fonctionne **pas** dans Expo Go. Un *development build* est nécessaire :
> ```bash
> npx expo run:android   # ou run:ios
> ```

---

## Tables Supabase requises

Voir `architecture_gps_companion.md` § 2 pour le SQL complet. En résumé :

```sql
-- Exécuter dans l'éditeur SQL Supabase
CREATE TABLE public.missions ( ... );
CREATE TABLE public.gps_points ( ... );
CREATE FUNCTION public.compute_mission_distance(p_mission_id uuid) RETURNS integer ...;
```

Les politiques RLS assurent qu'un bénévole ne voit et ne modifie que ses propres missions.

---

## Prochaines étapes — Plugin géolocalisation arrière-plan

Le fichier `lib/tracking-service.ts` utilise actuellement `expo-location.startLocationUpdatesAsync`.

### Pour une fiabilité maximale en production :

1. **Générer un development build** (obligatoire pour tester le GPS background) :
   ```bash
   npx expo install expo-dev-client
   npx expo run:android   # ou run:ios
   ```

2. **Android — déclarer le Foreground Service** dans `app.json` :
   ```json
   {
     "expo": {
       "android": {
         "permissions": [
           "ACCESS_FINE_LOCATION",
           "ACCESS_BACKGROUND_LOCATION",
           "FOREGROUND_SERVICE_LOCATION"
         ]
       }
     }
   }
   ```

3. **iOS — permissions plist** (déjà configuré dans `app.json`) :
   ```json
   "infoPlist": {
     "NSLocationAlwaysAndWhenInUseUsageDescription": "CleanMyMap suit votre parcours de nettoyage même écran éteint.",
     "UIBackgroundModes": ["location", "fetch"]
   }
   ```

4. **iOS background amélioré** : combiner `significantLocationChange` pour les réveils fiables. Voir `architecture_gps_companion.md` § 4 — Contraintes iOS.

5. **Publication** :
   ```bash
   npm install -g eas-cli
   eas build --platform android   # APK / AAB
   eas build --platform ios       # IPA (certificat Apple requis)
   ```

---

## Relation avec apps/web

| | `apps/web` (Next.js) | `companion-app` (Expo) |
|---|---|---|
| **Rôle** | Interface principale, admin, carte | Suivi GPS mobile uniquement |
| **Supabase** | Même projet, même anon key | Même projet, même anon key |
| **Auth** | Clerk | Supabase Auth directement |
| **Déploiement** | Vercel | App Store / Play Store (EAS) |
| **Workspace npm** | `apps/web` (inclus) | Isolé (hors monorepo) |

Les deux apps ne partagent pas de code source — elles communiquent uniquement via Supabase.
