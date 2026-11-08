# SPOGOMI — intégration événementielle et consolidation CleanMyMap

> **Statut : CURRENT PARTIEL — la préparation, la certification, les projections publiques bornées, les deux classements indépendants, la consolidation et l'export XLSX sont livrés sur les contrats explicitement présents dans le dépôt. Les preuves runtime externes et l'intégration partenaire restent à valider en environnement de validation.**
> Ce document ne prouve ni l'existence des tables et interfaces décrites, ni un partenariat contractualisé, ni la validation d'un règlement officiel SPOGOMI. Après chaque lot, ne passer en `CURRENT` que les comportements réellement livrés et testés.
>
> **Périmètre :** événements SPOGOMI organisés avec CleanMyMap, modes `casual`, `world_cup` et `mixed` (`Casual & World Cup`), inscriptions importées, équipes, mesures, classements par division, action canonique agrégée et participations confirmées.

## 1. Décision centrale

Une édition parentale SPOGOMI possède des données sportives par équipe, mais produit **une seule action environnementale canonique CleanMyMap**. Dans le schéma courant, `spogomi_events` est cette édition parente : `action_id` reste unique et aucune division ne crée une action supplémentaire.

Une édition possède une division `casual`, une division `world_cup`, ou les deux. Le mode parent `mixed` est valide uniquement avec exactement ces deux divisions distinctes. Les divisions portent un UUID stable, déterministe à partir de l’édition et de leur type ; une reprise identique réutilise les mêmes lignes.

```text
Édition parente SPOGOMI (casual | world_cup | mixed)
  ├── Division(s) typée(s) (casual et/ou world_cup)
  │     ├── Places importées, uniques au parent et affectées explicitement
  │     ├── Équipes et membres
  │     ├── Règlement, catégories et mesures
  │     ├── Soumissions, certifications et classement séparés
  │     └── Parcours GPX de référence si fourni
  └── Une seule action CleanMyMap liée au parent
        └── Formulaires SPOGOMI dédiés par équipe
        └── Soumissions, arbitrage, mesures physiques et points sportifs
               │
               ▼
       Consolidation environnementale validée
               │   une seule liaison event → action
               ▼
       Action canonique CleanMyMap
         ├── bilan et géométrie de référence
         ├── carte, statistiques et rapports
         └── action_participants.confirmed (comptes Clerk éligibles)
                       └── gamification CleanMyMap existante
```

### Contrat canonique des divisions

- `spogomi_divisions(event_id, division_type)` est la source de vérité des divisions ; `division_type` vaut uniquement `casual` ou `world_cup`.
- Les tables d’équipes, affectations, règlements/catégories, mesures, soumissions, certifications, accès, audits, attestations et classements portent `division_id` et des clés étrangères composites avec `event_id`. Une référence entre deux divisions d’une même édition est donc rejetée par PostgreSQL.
- Les participants restent une seule ligne au niveau parent (`event_id`, `external_reference`) et doivent recevoir une affectation explicite à une division et, le cas échéant, à une équipe. Une édition `mixed` ne peut jamais déduire une division depuis le parent.
- Les éditions existantes sont conservées sans réinterprétation : chaque ancien `casual` ou `world_cup` reçoit une seule division de même type, avec un identifiant stable. Le mécanisme de compatibilité ne résout automatiquement une valeur absente que lorsqu’une seule division existe ; il échoue fermé pour une édition mixte.
- `spogomi_ensure_parent_divisions` verrouille l’édition et effectue les insertions idempotentes dans une transaction. La clé d’idempotence existante continue de protéger la reprise de l’action et de l’édition ; aucune reprise ne crée une seconde action, division ou équipe.
- Les verrous de composition, règlements, certifications et classements restent portés par les procédures serveur et s’appliquent dans le périmètre d’une division. Le rôle HTTP conserve l’AuthN/AuthZ ; Supabase RLS et les grants ne sont pas élargis aux écritures client.
- L'API et la préparation savent porter le mode `mixed` comme une édition privée avec deux divisions déterministes et une seule action parent ; le choix `Casual & World Cup` reste masqué dans le formulaire tant que les preuves PostgreSQL et navigateur de la chaîne complète ne sont pas réunies. Les onglets de gestion et les projections gardent les équipes, mesures, arbitrages et classements dans leur division.

### Déroulé UI de la démonstration Cachan

Le scénario synthétique `SPOGOMI Cachan, démonstration CleanMyMap — DEMONSTRATION / NON OFFICIEL` n’est présent dans `/spogomi/mes-evenements?parcours=organizers` que si l’édition existe réellement dans le catalogue filtré par la relation organisateur du compte courant. Depuis `/spogomi`, l’onglet **Organisateurs** conserve cette intention puis le catalogue ouvre le cockpit canonique `/spogomi/[eventSlug]/espace#teams`. Aucun événement ou résultat de secours n’est fabriqué par l’interface.

Dans le cockpit, le sélecteur de divisions permet de parcourir séparément Casual et World Cup ; les catégories, équipes, saisies, décisions et classements sont chargés par les sections existantes et restent bornés par `division_id`. La carte de démonstration expose l’état réellement persisté : préparation, catégories et équipes, règlement complet ou incomplet, résultats certifiés ou non certifiés et publication bloquée ou publiée. Un règlement fictif et un résultat synthétique ne deviennent jamais officiels par leur affichage.

Les projections de résultats publiques et le formulaire de saisie équipe relisent les correspondances environnementales persistées de la division, les convertissent vers le contrat métier unique et n’annoncent un score officiel que si le règlement complet, les coefficients confirmés et toutes les correspondances mappées satisfont la validation serveur. Une édition complète sans mapping confirmé reste donc explicitement indisponible à la certification, même si l’interface est consultable.

Depuis `/spogomi`, les trois onglets restent utilisables avant authentification : les actions publiques aboutissent à la découverte ou à une explication contextualisée, tandis que les actions privées conservent leur intention dans Clerk puis ouvrent `/spogomi/mes-evenements` et la section autorisée de l’espace événementiel. Un participant multirôle conserve le parcours bénévole lorsqu’il le choisit ; aucune entrée privée n’est remplacée par un cockpit organisateur.

Le compte organisateur autorisé suffit pour parcourir la préparation, les équipes, les paramètres, l’arbitrage, le bilan et l’export lorsque les contrôles serveur les rendent disponibles. La saisie d’équipe exige une session d’équipe créée par le parcours existant ; la consultation personnelle exige un compte bénévole distinct ou une relation participant vérifiée. Les invitations, codes individuels et liens d’assistance restent contextuels et ne sont pas remplacés par le compte organisateur.

Le formulaire général de création continue de masquer `mixed`. Tant que le scénario n’a pas obtenu ses preuves PostgreSQL éphémère et navigateur exigées par le contrat d’intégration, seule l’édition de validation préconfigurée peut porter ce mode ; elle n’est jamais créée, publiée ou certifiée depuis un CTA UI.

**Frontières non négociables :**

- Le formulaire SPOGOMI par équipe n'est ni le formulaire générique des bénévoles ni `public.forms` ; cette dernière table a déjà des consommateurs de gamification.
- Les résultats sportifs ne sont pas de l'XP CleanMyMap. Les deux classements et les deux mécaniques sont indépendants.
- Une seule action `actions.id` représente la collecte collective sur la carte et dans les statistiques : aucune action par équipe, aucune action supplémentaire lors d'un recalcul.
- Les données détaillées de compétition ont leur propriétaire SPOGOMI ; la table `actions` reçoit une **projection** du bilan physique validé, pas une nouvelle saisie indépendante.
- La projection doit pouvoir être reconstruite et sa provenance vérifiée. Un changement de résultat ne s'ajoute jamais au bilan existant : il le remplace après nouvelle validation.

## Index des modules

- [Données, import et règlements](./spogomi-donnees-regles.md)
- [Accès, identités et surfaces](./spogomi-acces-surfaces.md)
- [Préparation et imports](./spogomi-preparation-imports.md)
- [Certification et consolidation](./spogomi-certification-consolidation.md)
- [Règlement externe et questions ouvertes](./spogomi-reglement-plan.md)
- [Gamification et publications](./spogomi-gamification-publication.md)
- [Cockpit et exploitation](./spogomi-exploitation.md)

Les règles sportives non validées ne deviennent pas un règlement officiel.
