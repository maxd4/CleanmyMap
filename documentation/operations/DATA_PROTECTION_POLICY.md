# Politique de Protection des Données et Usage de l'IA

Cette politique définit les règles de sécurité pour le partage de données avec des services d'IA tiers (OpenAI, Anthropic, Google Gemini, etc.) dans le cadre du projet CleanMyMap.

## 1. Classification des Données
- **Niveau 1 : Publiques** (Code source open source, documentation publique) -> **Partage Autorisé**.
- **Niveau 2 : Internes** (Schémas de base de données non sensibles, logs techniques anonymisés) -> **Anonymisation Minimale Requise**.
- **Niveau 3 : Sensibles** (Secrets API, Variables d'environnement `.env`, Clés privées) -> **PARTAGE INTERDIT**.
- **Niveau 4 : Personnelles** (Emails utilisateurs, Coordonnées précises des bénévoles) -> **PARTAGE INTERDIT**.

## 2. Règles de Partage avec l'IA
- **Anonymisation** : Avant de soumettre un log ou une base de données à une IA, remplacez tout email par `user@example.com` et toute donnée de localisation précise par des coordonnées génériques.
- **Dépouillement de Code** : Ne jamais copier-coller un fichier entier contenant des clés d'API. Utilisez des placeholders (ex: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...`).
- **Isolation des Sessions** : Préférez l'usage d'environnements de développement isolés pour tester les intégrations IA.

## 3. Checklist de Contrôle avant Partage
- [ ] J'ai vérifié que le texte ne contient aucune clé d'API ou secret.
- [ ] J'ai supprimé toute référence à des noms réels de personnes ou d'utilisateurs.
- [ ] J'ai vérifié que le partage est nécessaire pour résoudre le problème (IUR).

## 4. Procédure en cas d'Exposition Accidentelle
1. **Révocation immédiate** des clés ou secrets exposés.
2. **Signalement** au Responsable Sobriété & Sécurité.
3. **Nettoyage de l'historique** de conversation du service d'IA (si possible).
4. **Mise à jour** des procédures pour éviter la récurrence.
