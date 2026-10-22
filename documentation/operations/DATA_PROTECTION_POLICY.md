> **CURRENT — précaution interne complémentaire.** La source canonique de sécurité reste [SECURITY.md](../security/SECURITY.md), celle des données [data-governance.md](../architecture/data-governance.md) et les obligations juridiques [legal/](../legal/). Ce texte ne prouve ni conformité juridique, ni consentement, ni accord du fournisseur.
# Politique de Protection des Données et Usage de l'IA

Cette politique définit les règles de sécurité pour le partage de données avec des services d'IA tiers (OpenAI, Anthropic, Google Gemini, etc.) dans le cadre du projet CleanMyMap.

## 1. Classification des Données
- **Niveau 1 : Publiques** (code et documents volontairement publiés) → partage conditionné à la vérification des secrets, licences, données personnelles et de la finalité.
- **Niveau 2 : Internes** (schémas, logs expurgés) → transmission limitée à un besoin justifié, après minimisation et vérification des droits.
- **Niveau 3 : Sensibles** (Secrets API, Variables d'environnement `.env`, Clés privées) -> **PARTAGE INTERDIT**.
- **Niveau 4 : Personnelles** (Emails utilisateurs, Coordonnées précises des bénévoles) -> **PARTAGE INTERDIT**.

## 2. Règles de Partage avec l'IA
- **Anonymisation** : remplacer un email par un placeholder ou arrondir une position ne garantit pas l'anonymat ; rechercher aussi les identifiants indirects. Préférer des cas synthétiques ou des agrégats sans réidentification.
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
