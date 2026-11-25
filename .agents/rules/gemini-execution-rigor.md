# Règles d'exécution Gemini — Rigueur, Stop Conditions, Tests et Documentation

1. **Raisonnement approfondi avant écriture** :
   - Avant toute modification, vérifier les types exacts, les contrats, les callers et les cas limites (valeurs nulles, conflits d'identifiants, troncatures, accès non autorisés).
   - Ne jamais supposer le nom d'un champ ou d'un export : le vérifier dans le fichier source ou via `tsc --noEmit`.

2. **Respect strict des `STOP CONDITION`** :
   - Lister mentalement chaque critère de la `STOP CONDITION` avant de commencer et avant de conclure.
   - Ne jamais déclarer un lot terminé tant qu'un critère fonctionnel, un test, une preuve ou une mise à jour documentaire reste incomplet.

3. **Tests comportementaux et documentation obligatoires** :
   - Tout changement fonctionnel doit être accompagné de tests comportementaux réels couvrant les cas nominaux, limites, conflictuels et de non-régression (jamais d'assertions triviales).
   - Tout contrat modifié doit être reflété dans la documentation `CURRENT` concernée dans le même lot.
