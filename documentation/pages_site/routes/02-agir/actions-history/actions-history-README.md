# Historique des actions

## Fiche canonique

- **Route** : `/actions/history`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/actions/history/page.tsx`
- **Type fonctionnel** : page d'action
- **Famille / bloc fonctionnel** : Agir (bloc)
- **Statut** : protégé
- **Contexte nécessaire** : Compte connecté, parfois rôle ou profil spécifique
- **Objectif utilisateur principal** : Permettre l'action terrain, la déclaration et la préparation rapide.
- **Action principale attendue** : Lancer une action, signaler ou compléter un formulaire.
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
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : faible

## Preuves terrain

La supervision de l'historique peut afficher les preuves photo associées à un
signalement `spot` ou `clean_place`. Les enregistrements `action` ne sont pas
concernés par ce bloc.

- Aucun média n'est chargé avec la liste ni lors d'un simple changement de
  sélection.
- Le chargement démarre uniquement après l'action explicite « Voir les preuves
  photo » et appelle `GET /api/signalements/{signalementId}/media`.
- Le résultat est conservé dans l'instance du panneau après une réponse vide
  ou réussie ; une erreur propose un retry explicite et un refus d'accès est
  distingué comme preuve non publique.
- Les règles d'accès restent celles du service média : auteur/admin pour un
  signalement `new`, lecture publique signée pour `validated`/`cleaned`.
- Les URLs signées sont éphémères et ne sont jamais persistées côté client.

## Préconfiguration future d'un rapport d'impact

Lorsqu'une action est réellement validée, son interface pourra proposer le
bouton « Générer un rapport d'impact ». Ce bouton ne génère pas directement un
PDF : il ouvre `/reports` avec une configuration initiale préparée pour cette
action validée uniquement.

Le parcours cible est :

```txt
action validée
      ↓
« Générer un rapport d'impact »
      ↓
/reports
      ↓
configuration préremplie
      ↓
périmètre = cette action uniquement
      ↓
vérification éventuelle par l'utilisateur
      ↓
génération normale du rapport
```

Invariants du point d'entrée :

- la source de vérité reste le générateur canonique de `/reports` ; cette page
  ne possède aucun moteur de rapport spécifique aux actions ;
- le bouton ne fait que préparer le périmètre initial du générateur ;
- l'identifiant canonique de l'action est transmis explicitement et de manière
  typée au contrat de préconfiguration ; le format final de l'URL reste à
  définir ;
- la présence du bouton correspond à l'état réellement validé de l'action, et
  non à une simple présence dans une liste ou à une valeur reconstruite côté
  client ;
- seules les actions admissibles selon les règles métier et d'autorisation
  peuvent ouvrir ce parcours et produire un rapport ;
- la configuration préparée sélectionne exactement cette action, jamais les
  autres actions du même organisateur, territoire ou jour ;
- aucune donnée du rapport n'est reconstruite depuis les paramètres de
  navigation lorsqu'une source canonique backend existe ; `/reports` doit
  résoudre l'identifiant vers l'action réelle et vérifier qu'elle est
  exploitable.

Les paramètres préremplis doivent rester visibles dans `/reports`, avec un
contexte compréhensible tel que :

```txt
Périmètre
Action unique

Action
<nom / date / lieu de l'action>
```

L'utilisateur conserve le choix des autres options autorisées du rapport,
notamment le niveau d'exhaustivité. L'ouverture depuis une action définit le
périmètre de données ; elle ne choisit automatiquement ni le template ni le
niveau de détail et ne perd pas le verrou de l'action unique, sauf si
l'utilisateur décide explicitement de revenir à une configuration générale.

Après cette vérification, le rapport suit exactement le pipeline canonique de
`/reports`, avec son versioning, ses méthodologies, son snapshot historique et
ses règles de traçabilité. La navigation depuis une action ne doit donc
introduire aucun traitement parallèle.

Ce mécanisme est un point d'entrée de préconfiguration générique de `/reports`.
Il devra pouvoir être réutilisé ultérieurement pour une campagne, une
organisation, un événement, un territoire ou un objectif mesurable, sans
multiplier les cas spéciaux dans les interfaces.


## États à documenter

- **loading** : fond `slate`, skeletons sobres, loader discret, même largeur et mêmes espacements que les autres états.
- **empty state** : fond `slate` doux, ton encourageant, CTA utile unique.
- **access refused** : `slate` avec léger `red` / `orange`, ton neutre et professionnel, pas de dramatisation.
- **Architecture commune** : `SystemStateLayout`, `SystemStateIcon`, `SystemStateTitle`, `SystemStateDescription`, `SystemStateAction`, `SystemStateMeta`.
- **Variantes** : `variant="loading"`, `variant="empty"`, `variant="forbidden"`.
- **Règle** : aucune route de ce type ne doit avoir un état vide sans CTA utile.



## Références legacy

- [historique.md](../../../../6-PAGES-STANDALONE/historique.md)

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
