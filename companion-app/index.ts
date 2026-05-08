/**
 * index.ts — Point d'entrée de l'app Expo
 *
 * IMPORTANT : l'import de gps-task DOIT précéder registerRootComponent.
 * La tâche background doit être enregistrée au niveau module avant que
 * l'OS ne tente de la réveiller en arrière-plan.
 */

// 1. Enregistrement de la tâche background (doit être en premier)
import './tasks/gps-task';

// 2. Polyfill URL (requis par supabase-js en RN)
import 'react-native-url-polyfill/auto';

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
