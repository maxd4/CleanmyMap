# Déclarer une action

## Fiche canonique

- **Route** : `/actions/new`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/actions/new/page.tsx`
- **Type fonctionnel** : page d'action
- **Famille / bloc fonctionnel** : Agir (bloc)
- **Statut** : protégé
- **Contexte nécessaire** : Compte connecté, parfois rôle ou profil spécifique
- **Objectif utilisateur principal** : Préparer une action à venir ou déclarer les résultats terrain d'une action réalisée.
- **Action principale attendue** : Choisir directement entre la préparation avant action, avec inscriptions éventuelles, et la déclaration après action, avec les résultats terrain.
- **Règle de séparation** : le parcours avant action prépare seulement l'organisation; les champs de récolte, d'impact et de validation scientifique restent réservés au formulaire complet après action.
- **Règle de modération** : un profil `admin`, `elu` ou `max` peut auto-valider sa propre action, mais un formulaire de groupe normal reste soumis au flux habituel et n'est jamais considéré comme une collecte validée tant que la déclaration finale n'est pas complétée.
- **Pré-formulaire avant action** : titre de l'action, description courte, commune ou zone, point de rendez-vous précis avec localisation si disponible, zone cible prévue, date prévue, heure de rendez-vous, heure de départ prévue, durée estimée, type d'action prévue, type de zone, nombre de bénévoles attendus, difficulté estimée, accessibilité, message pour les participants, consignes de sécurité, matériel conseillé, commentaire logistique, checklist avant départ, organisateur ou référent, membres ajoutés manuellement via `participantAccounts`, autorisation de rejoindre le groupe, lien de partage du formulaire de groupe et statut du formulaire.
- **Contrat de publication** : le pré-formulaire reste fermé par défaut ; seule une publication explicite via `groupJoinEnabled = true` permet son affichage dans la page Formulaire de groupe. Les champs de récolte finale restent exclus de ce parcours.
- **Palette attendue** : emerald
- **Scope** : point d'entrée nettoyé, métier des formulaires conservé
- **Terminée** : oui pour le contrat du point d'entrée
- **Couleurs actuellement détectées** : emerald — canvas #e8f8ef, halo rgba(34, 197, 94, 0.22)
- **Incohérences de couleurs** : Aucune incohérence de couleur détectée avec la règle actuelle.
- **Risque de conflit avec les couleurs existantes** : moyen : le vert doit rester distinct des panneaux de support et des surfaces techniques.
- **Niveau de surcharge textuelle** : moyen
- **Textes à conserver** :
- Titre de tâche
- champs utiles
- CTA principal
- validation et erreurs
- choix de parcours
- **Textes à réduire ou supprimer** :
- Aides répétées
- cartes descriptives redondantes
- contextes décoratifs
- promesses de validation avant terrain
- **Bulles / cartes / contextes trop nombreux** : Les formulaires et cartes de guidance peuvent multiplier les micro-blocs.
- **Composants UI concernés** :
- Formulaires
- cards d'aide
- CTA
- résultats de validation
- navigation de section
- écran de choix de parcours
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : faible


## États à documenter

- **loading** : fond `slate`, skeletons sobres, loader discret uniquement pendant l'hydratation d'un `actionId` ou le handoff après une vraie écriture.
- **empty state** : fond `slate` doux, ton encourageant, CTA utile unique.
- **access refused** : `slate` avec léger `red` / `orange`, ton neutre et professionnel, pas de dramatisation.
- **choice initial** : deux cartes de parcours, lecture rapide, retour au choix possible; la sélection affiche directement le parcours choisi.
- **success** : affichage direct de la préparation avant action ou de la déclaration des résultats terrain après action, puis passage possible vers les résultats terrain après la préparation.
- **error** : panneau compact avec retour au choix.
- **Architecture commune** : `SystemStateLayout`, `SystemStateIcon`, `SystemStateTitle`, `SystemStateDescription`, `SystemStateAction`, `SystemStateMeta`.
- **Variantes** : `variant="loading"`, `variant="empty"`, `variant="forbidden"`.
- **Règle** : aucune route de ce type ne doit avoir un état vide sans CTA utile.



## Références legacy

- [declarer_action.md](../../../../2-BLOC-AGIR/declarer_action.md)

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Le point d'entrée commence par le choix entre déclaration après action et préparation avant action.
- Choisir un parcours ne crée encore aucune action.
- Le parcours sélectionné s'affiche directement; un état de chargement est réservé à l'hydratation d'un enregistrement ou au handoff après une vraie écriture.
- La revue du formulaire affiche une aide à la relecture et des points d'attention concrets; elle ne présente pas de score ou de grade local comme une mesure de qualité démontrée.
- La masse de déchets saisie reste la mesure déclarée. `estimateWasteKg()` fournit seulement un repère indicatif séparé, sans pénaliser une valeur qui s'en écarte.
- Les statuts, anomalies et provenances du contrat de données restent définis par `apps/web/src/lib/actions/data-quality.ts`; la revue locale ne les duplique pas.
- Le parcours avant action crée un pré-formulaire léger, visible ensuite dans la page Formulaire de groupe uniquement s'il est explicitement publié.
- Les membres ajoutés avant publication sont conservés dans `participantAccounts` puis synchronisés en tant que participations `manual_add`.
- Les champs de récolte, de validation finale et les calculs d'impact restent réservés au formulaire après action.
- Le formulaire complet réutilise les données communes et n'expose plus le contrôle de publication du groupe.
- Le parcours avant action conserve l'état `pending` jusqu'à la complétion du formulaire complet.
- Le parcours avant action propose ensuite un passage fluide vers le formulaire complet sans perte de données.
- Le passage vers le formulaire complet doit réutiliser les données déjà saisies et n'exige pas de recommencer la préparation.
- Le pré-formulaire n'est jamais traité comme une collecte validée tant que la déclaration finale n'a pas complété les champs de récolte.
- L'absence de valeur pour `groupJoinEnabled` est interprétée comme une fermeture de la visibilité publique.
- Une soumission `quick` ordinaire reste `pending`; seule une action créée par un profil `admin`, `elu` ou `max` pour son propre compte peut être auto-approuvée.
- Les corrections admin d'impact exigent un motif, journalisent les valeurs avant/après et recalculent la progression de manière idempotente pour les organisateurs concernés.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
