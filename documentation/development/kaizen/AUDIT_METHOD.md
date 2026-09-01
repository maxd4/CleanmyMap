# Méthode d'audit Kaizen

## Objectif

Un audit Kaizen identifie un petit nombre d'améliorations à forte valeur sur un périmètre réel et suffisamment stable.

Il n'est ni une roadmap générale, ni un inventaire exhaustif de toutes les idées possibles, ni une obligation après chaque refactor.

## Conditions d'ouverture

Créer ou mettre à jour un audit seulement si une raison concrète existe, par exemple :

- un périmètre vient d'être fortement restructuré et doit être réévalué ;
- une même anomalie ou dette revient plusieurs fois ;
- une page reste difficile à comprendre malgré sa stabilité ;
- des cas limites ou preuves manquent dans un contrat métier ;
- une dette mesurable gêne les changements ;
- l'utilisateur demande explicitement un audit d'amélioration.

Ne pas ouvrir un audit si :

- le périmètre est encore en panne ou en refonte fonctionnelle majeure ;
- une correction critique connue doit être faite d'abord ;
- aucun problème concret n'est observable ;
- le seul objectif est de produire un document supplémentaire.

## Étape 1 — établir l'état de référence

Avant toute proposition :

1. vérifier le `main` courant ;
2. lire les règles applicables ;
3. lire les fichiers directement concernés ;
4. lire les tests qui portent le comportement ;
5. lire uniquement les documents canoniques utiles ;
6. identifier les constats anciens qui ne sont plus valides.

Un audit doit indiquer le commit ou l'état de référence lorsqu'il est important pour interpréter ses constats.

## Étape 2 — collecter les preuves

Une preuve acceptable peut être :

- un chemin et un comportement de code précis ;
- un test manquant ou un cas non couvert ;
- un échec reproductible ;
- une duplication vérifiée ;
- un contrat documentaire contradictoire ;
- une mesure de performance obtenue avec un outil ;
- une friction UI directement observable ;
- une règle de sécurité non centralisée ;
- une dépendance ou frontière mal placée démontrée.

Une impression générale, un chiffre inventé ou une préférence esthétique ne suffit pas.

## Étape 3 — sélectionner au maximum trois actions

Classer les actions selon cet ordre :

1. exactitude, sécurité et robustesse ;
2. compréhension utilisateur, accessibilité et cohérence du contrat ;
3. performance et maintenabilité.

Une action n'entre dans l'audit que si son bénéfice est supérieur à son risque et à la complexité qu'elle ajoute.

Ne pas ajouter automatiquement une section « innovation ».

## Étape 4 — décrire chaque action

Chaque action contient uniquement :

- **Objectif** — résultat recherché ;
- **Preuve** — constat actuel vérifiable ;
- **Périmètre** — fichiers, modules ou surfaces concernés ;
- **Modification attendue** — changement de comportement ou de structure ;
- **Contraintes critiques** — invariants à préserver ;
- **Validations** — contrôles nécessaires ;
- **Fini quand** — critère de clôture observable.

Éviter :

- estimations horaires ;
- gains chiffrés non mesurés ;
- prompts très longs intégrés dans l'audit ;
- nouvelles dépendances proposées avant analyse ;
- composants ou APIs imaginaires ;
- innovations décoratives ;
- listes de plus de trois priorités actives.

## Étape 5 — exécution

Exécuter une action à la fois.

Avant modification :

- confirmer que le problème existe encore ;
- vérifier que le périmètre n'a pas dérivé ;
- préserver les changements parallèles ;
- choisir la plus petite correction sûre.

Après modification :

- exécuter les tests ciblés ;
- élargir aux checks de gouvernance, typecheck, lint ou build si le risque le justifie ;
- ne pas annoncer comme validé ce qui n'a pas été exécuté.

## Étape 6 — clôture

Une action est `done` uniquement si :

- la modification est réellement intégrée ;
- la preuve de validation est connue ;
- les invariants sont préservés ;
- aucune action implicite ne reste cachée dans le texte.

Une action abandonnée doit être supprimée de la liste active ou marquée explicitement `abandoned` avec une justification courte.

L'audit est `closed` quand il ne contient plus d'action active non décidée.

## Traitement historique

Les audits décrivent un état daté. Ils ne doivent pas être utilisés comme architecture actuelle sans revalidation.

Un audit ancien peut être renommé `*-historical.md` lorsqu'il contient :

- des chemins supprimés ;
- des prompts désormais invalides ;
- des chiffres non vérifiés ;
- des pratiques remplacées ;
- des recommandations qui contredisent le design system ou la gouvernance actuelle.

Ne pas réécrire un audit historique pour lui faire raconter le présent. Ajouter au besoin un bandeau d'historicité et conserver son contenu comme trace.

## Format minimal

Utiliser [`templates/TEMPLATE-AUDIT.md`](./templates/TEMPLATE-AUDIT.md).

Un audit simple doit rester lisible sans guide annexe ni contexte de session.

## Validation documentaire

Quand un audit ou la doctrine Kaizen est modifié :

- vérifier les liens actifs ;
- vérifier qu'aucune règle générale n'est dupliquée depuis `AGENTS.md` ;
- conserver les distinctions `current / working / audit / historical` ;
- exécuter les checks documentaires pertinents du dépôt.
