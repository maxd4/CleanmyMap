# Section dynamique

## Fiche canonique

- **Route** : `/sections/[sectionId]`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/sections/[sectionId]/page.tsx`
- **Type fonctionnel** : dynamique — section
- **Famille / bloc fonctionnel** : Système & Utilitaires (hors bloc)
- **Statut** : dynamique
- **Contexte nécessaire** : Paramètre de route requis (profil, id, section, mission...)
- **Objectif utilisateur principal** : Exposer des outils de support, de contrôle ou de prévisualisation.
- **Action principale attendue** : Configurer, comparer ou vérifier un état technique.
- **Palette attendue** : sky / slate
- **Scope** : à corriger
- **Terminée** : non
- **Couleurs actuellement détectées** : slate — canvas #eef0f3, halo rgba(148, 163, 184, 0.18)
- **Incohérences de couleurs** : Écart détecté: attendu sky / slate, code actuel slate / neutral.
- **Risque de conflit avec les couleurs existantes** : moyen : garder une mood layer autonome et éviter tout retour aux couleurs de bloc principales.
- **Niveau de surcharge textuelle** : moyen
- **Textes à conserver** :
- Contrôles
- résultats
- messages système
- CTA utilitaires
- **Textes à réduire ou supprimer** :
- Explications longues
- duplication d'état
- cartes de contexte inutiles
- **Bulles / cartes / contextes trop nombreux** : Les outils peuvent accumuler des états et des micro-interfaces.
- **Composants UI concernés** :
- Outils
- tableaux de bord
- panneaux système
- prévisualisations
- contrôles
- **Captures attendues** : desktop, mobile, état paramétré
- **Priorité de correction** : moyenne
- **Exemple canonique** : `/sections/route`

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
