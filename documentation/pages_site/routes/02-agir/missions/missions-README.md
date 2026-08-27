# Missions

## Fiche canonique

- **Route** : `/missions/[id]`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/missions/[id]/page.tsx`
- **Type fonctionnel** : dynamique — mission
- **Famille / bloc fonctionnel** : Agir (bloc)
- **Statut** : dynamique
- **Contexte nécessaire** : Paramètre de route requis (profil, id, section, mission...)
- **Objectif utilisateur principal** : Consulter les données réellement enregistrées pour une mission terrain existante.
- **Action principale attendue** : Lire le statut, les horaires de début et de fin, la durée, la distance et le tracé GPS lorsqu'il est disponible.
- **Comportement réel du lot 1** : Une mission inexistante n'affiche aucun contenu de démonstration et une erreur de lecture n'est pas remplacée par des données fictives. Une mission sans points GPS affiche `Aucun tracé enregistré`.
- **Mesures environnementales** : La page n'affiche aucune mesure de CO₂ évité ou d'eau préservée déduite de la distance GPS. Elle conserve uniquement le statut, le début, la fin, la durée, la distance et les points GPS portés par le contrat mission.
- **Données de l'application mobile** : Le tracé et les horaires sont décrits comme des données enregistrées par l'application mobile lorsqu'elles sont disponibles ; aucune garantie d'authenticité n'est déduite de leur présence.
- **Accès et ownership** : La route est protégée par AuthN Clerk. La lecture de la mission et de ses GPS est autorisée au `volunteer_id` propriétaire ainsi qu'aux profils `admin` et `max`, après décision serveur. Les autres profils, y compris `elu`, n'y ont pas accès ; `created_by` reste une provenance et non une permission.
- **Ordre de lecture sécurisé** : Le rôle et la mission ciblée sont vérifiés avant tout chargement de `gps_points`. Le `service_role`, lorsqu'il est utilisé côté serveur, est un moyen technique et ne suffit jamais à autoriser l'accès.
- **Confidentialité** : La lecture mission/GPS n'utilise pas de cache partagé par identifiant de mission. Aucun partage public n'est prévu sans future vue sanitizée et contrat explicite ; l'ADR-004 documente le contrat historique et gelé de l'identité mobile.
- **Palette attendue** : emerald
- **Scope** : à corriger
- **Terminée** : non
- **Couleurs actuellement détectées** : emerald — canvas #e8f8ef, halo rgba(34, 197, 94, 0.22)
- **Incohérences de couleurs** : Aucune incohérence de couleur détectée avec la règle actuelle.
- **Risque de conflit avec les couleurs existantes** : moyen : le vert doit rester distinct des panneaux de support et des surfaces techniques.
- **Niveau de surcharge textuelle** : moyen
- **Textes à conserver** :
- Titre de tâche
- champs utiles
- CTA principal
- validation et erreurs
- **Textes à réduire ou supprimer** :
- Aides répétées
- cartes descriptives redondantes
- contextes décoratifs
- **Bulles / cartes / contextes trop nombreux** : Les formulaires et cartes de guidance peuvent multiplier les micro-blocs.
- **Composants UI concernés** :
- Formulaires
- cards d'aide
- CTA
- résultats de validation
- navigation de section
- **Captures attendues** : desktop, mobile, état paramétré
- **Priorité de correction** : moyenne
- **Exemple canonique** : `/missions/terrain-2026`

## États à documenter

- **loading** : fond `slate`, skeletons sobres, loader discret, même largeur et mêmes espacements que les autres états.
- **empty state** : fond `slate` doux, ton encourageant, CTA utile unique.
- **access refused** : `slate` avec léger `red` / `orange`, ton neutre et professionnel, pas de dramatisation.
- **Architecture commune** : `SystemStateLayout`, `SystemStateIcon`, `SystemStateTitle`, `SystemStateDescription`, `SystemStateAction`, `SystemStateMeta`.
- **Variantes** : `variant="loading"`, `variant="empty"`, `variant="forbidden"`.
- **Règle** : aucune route de ce type ne doit avoir un état vide sans CTA utile.



## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
