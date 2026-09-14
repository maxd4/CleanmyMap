# ADR-006 — Source de vérité des migrations Supabase

**Statut : accepté et appliqué**
**Date : 11 juillet 2026 — application : 24 août 2026**

## Contexte

Deux arbres de migrations existaient avant l'application de cet ADR :

```txt
apps/web/supabase/migrations/
supabase/migrations/
```

Le workspace web possède :

```txt
apps/web/supabase/config.toml
```

et le script :

```txt
npm run backend:supabase:push -w apps/web
```

exécute Supabase avec :

```txt
--workdir .
```

depuis `apps/web`.

Plusieurs tests lisent également les migrations sous `apps/web/supabase/migrations/`.

## Problème

Deux arbres éditables manuellement créent un risque de divergence :

- migration ajoutée dans un seul dossier ;
- test lisant un arbre différent du CLI ;
- base distante non alignée avec la documentation ;
- agent modifiant le mauvais fichier.

## Décision proposée

Déclarer comme source canonique :

```txt
apps/web/supabase/
```

notamment :

```txt
apps/web/supabase/config.toml
apps/web/supabase/migrations/
```

Le dossier racine historique :

```txt
supabase/migrations/
```

est supprimé après comparaison contrôlée. Il ne doit plus être recréé.

## Vérifications d'application

La suppression du miroir a été précédée par :

1. une comparaison exhaustive des noms, contenus et ordre ;
2. l'identification et le transfert des quatre migrations présentes uniquement
   dans le miroir ;
3. la vérification des références de tests, scripts et documentation ;
4. la validation du workspace Supabase canonique ;
5. l'activation d'un garde-fou qui échoue si le miroir racine réapparaît.

La migration `20260625000001_territory_metadata_compatibility.sql` a été
transférée sous le nom `20260625000005_territory_metadata_compatibility.sql`,
car le timestamp `20260625000001` était déjà utilisé dans l'arbre canonique.
Le contenu SQL est inchangé.

## Migration documentaire

Mettre à jour :

```txt
les consignes d'agent applicables au dépôt
documentation/architecture/data-governance.md
documentation/development/TESTING.md
documentation/security/*
apps/web/README.md
```

## Tests

Les tests de migration lisent uniquement la source canonique après bascule.
Le garde-fou `npm run audit:supabase-migration-trees` vérifie que le dossier
racine interdit est absent et qu'aucun timestamp de migration n'est dupliqué.

## Conséquences

Après application complète :

- un seul arbre éditable : `apps/web/supabase/migrations/` ;
- CLI, tests et docs alignés ;
- moins de risque d'agent sur le mauvais chemin.

## Exception bornée de rejouabilité — `20260913000006`

Le principe append-only reste la règle générale. Une exception locale est
acceptée pour rendre rejouable une migration historique déjà appliquée lorsque
son seul bloqueur est l'absence des données historiques qu'elle réparait.
Cette exception ne crée aucune nouvelle application distante de la version et
ne constitue pas une permission générale de réécrire les migrations publiées.

La migration `20260913000006_restore_historical_waste_null_semantics.sql` est
concernée par cette exception : le projet Supabase lié
`trktzkgujgpgsgkoyndn` l'a déjà enregistrée comme appliquée, et les statements
distants enregistrés correspondent à la version historique précédemment
versionnée. La correction locale est limitée au bloc qui traite les cinq
identités historiques et respecte les conditions suivantes :

1. les cinq identités ont chacune zéro correspondance : le patch historique
   `waste_kg` est ignoré, aucune donnée n'est créée ni modifiée, puis les
   fonctions suivantes de la migration sont exécutées ;
2. les cinq identités ont chacune une correspondance unique : les contrôles de
   provenance et de valeur préexistante ainsi que la correction `waste_kg` sont
   conservés ;
3. toute autre cardinalité, notamment un historique partiel ou une identité
   dupliquée, échoue explicitement et fail-closed avant le DML historique.

Les valeurs et identités historiques ne sont pas modifiées par cette
exception, aucune donnée fictive n'est créée et les migrations `000007`,
`000008` et `000009` restent inchangées. Les empreintes Git de la migration
`000006` sont conservées pour la traçabilité :

```text
000006_BEFORE_HASH: 64e1063950ea69fb6e70b70fc2f23edff0c5abf8
000006_AFTER_HASH:  1983bedb04b443d7c348242a6c98b61e6aaf46b0
```

Cette exception est un changement de source versionnée uniquement. Elle
n'autorise ni `supabase migration repair`, ni `db push`, ni écriture sur le
projet distant ; toute publication ultérieure reste soumise à une revue et à
une validation distinctes.

## Opérations temporaires de benchmark

Une activation ou désactivation temporaire d'extension réalisée pour un
benchmark, un debug ou un bridge d'image distant ne constitue pas un état
durable du schéma canonique. Elle ne doit donc pas être ajoutée comme SQL
rejouable dans une migration applicative.

Les versions historiques `20260819142956`, `20260819143518`, `20260819154147`
et `20260825130153` sont conservées avec leurs noms et timestamps uniquement
pour aligner l'arbre local sur un historique Supabase déjà enregistré. Elles
restent volontairement des migrations no-op documentées : un `db reset` ou un
replay neuf ne doit ni installer ni supprimer `pg_net` ou `http` par leur
intermédiaire.

Toute opération de benchmark distante doit suivre sa propre procédure
ponctuelle, avec vérification de l'effet final et sans `DROP EXTENSION ...
CASCADE` dans le chemin canonique. Une extension ne doit être imposée par les
migrations que si elle appartient réellement au contrat durable de
l'application.

Le rollback du changement de dépôt consiste à restaurer le commit de ce lot.
Cela ne remplace pas une vérification de l'historique de migrations d'une base
distante avant déploiement.

## Interdiction

Ne pas maintenir indéfiniment deux copies manuelles sans contrôle de synchronisation.
