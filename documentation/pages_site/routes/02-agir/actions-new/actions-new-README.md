# Créer une action

## Fiche canonique

- **Route** : `/actions/new`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/actions/new/page.tsx`
- **Type fonctionnel** : page d'action
- **Famille / bloc fonctionnel** : Agir (bloc)
- **Accès runtime** : `clerk-context` ; l'entrée et la préparation des parcours sont accessibles au visiteur sans compte. La route fournit le contexte Clerk sans hard gate de page ; le compte est demandé lorsque l'identité est nécessaire pour créer, compléter ou envoyer une action.
- **Objectif utilisateur principal** : Préparer une action avant terrain ou compléter ses résultats après réalisation.
- **Action principale attendue** : Utiliser le shell unique de création avec quatre panneaux indépendants : pré-formulaire, itinéraire, météo & conditions terrain et formalités juridiques.
- **Règle de séparation** : le parcours avant action prépare seulement l'organisation; les champs de récolte, d'impact et de validation scientifique restent réservés au formulaire complet après action.
- **Règle de modération** : toute action créée suit le parcours normal de validation, quel que soit le rôle actif de son auteur. Une pré-action future peut être publiée explicitement et visible sur la carte ; cette visibilité ne vaut ni approbation métier ni éligibilité Impact.
- **Préparation avant action** : titre de l'action, description courte, commune ou zone, point de rendez-vous précis avec localisation si disponible, zone cible prévue, date prévue, heure de rendez-vous, heure de départ prévue, durée estimée, distance cible du parcours, type d'action prévue, type de zone, nombre de bénévoles attendus, difficulté estimée, accessibilité, message pour les participants, consignes de sécurité, matériel conseillé, commentaire logistique, checklist avant départ, organisateur ou référent, membres ajoutés manuellement via `participantAccounts`, ouverture à la participation, lien d'accès à `Rejoindre une action` et statut de la préparation. Les noms techniques `groupJoinEnabled` et `groupJoinHref` restent ceux du contrat interne.
- **Identité structurée** : `organizerType` est le type canonique de structure, distinct du nom de l'organisateur ou du référent. Les valeurs publiques sont `Action spontanée`, `Entreprise`, `Association`, `Association étudiante`, `Collectif` et `Autre`. `associationName` reste conservé temporairement pour compatibilité avec les rapports et exports existants.
- **Catalogue de structures** : le champ `associationName` est filtré par `organizerType` depuis `apps/web/src/lib/actions/association-options.ts`. Une action spontanée fixe `associationName = "Action spontanée"` sans sélecteur; les entreprises proposent le catalogue connu et une saisie libre, tandis que les autres types ne proposent que leurs structures canoniques. Les valeurs legacy restent lisibles et les noms d'entreprise libres conservent le format `Entreprise - <nom>`.
- **Participants** : `volunteersCount` décrit le nombre de participants à l'action et ne doit pas être déduit de `organizerType`, qui décrit uniquement le cadre de l'organisateur.
- **Contrat de publication** : la préparation avant action reste fermée par défaut ; seule une publication explicite via `groupJoinEnabled = true` permet son affichage dans la page Rejoindre une action. Les champs de récolte finale restent exclus de ce parcours.
- **Panneaux indépendants** : le pré-formulaire peut créer une pré-action sans itinéraire, météo ou formalités. Aucun panneau ne constitue une étape obligatoire d'un wizard.
- **Itinéraire** : le moteur existant reste la source canonique `POST /api/route/recommend` pour les parcours planifiés. Son handoff enrichit le même draft et son `operationalRoute` ; il ne crée jamais une seconde action. Pour une action créée depuis le formulaire sans tracé réel, la reconstruction de la boucle est serveur uniquement : FOSSGIS/OSRM reçoit un nombre borné de points autour de l'origine, la cible par défaut étant `durée en minutes / 60`. La distance retournée par le réseau est conservée séparément de la cible ; un repli local est explicitement estimé.
- **Météo** : les composants et services météo existants sont réutilisés. Le lieu et la date du pré-formulaire peuvent servir de contexte lorsqu'ils existent, sans être requis pour consulter le panneau.
- **Formalités juridiques** : le panneau reste borné tant qu'une source officielle fiable n'est pas documentée. Il ne fabrique aucune obligation légale, assurance, autorisation municipale ou règle de responsabilité. Chaque pré-action porte en plus `administrativeRequirements.status`, initialisé à `pending` et distinct de `preparationState`.
- **Validation des démarches** : une pré-action créée n'est pas une pré-action dont les démarches sont validées. Le sous-état `administrativeRequirements` est serveur et ne peut pas être créé, réinitialisé ou validé par le payload générique de création/PATCH : `GET /api/actions/[actionId]/administrative-requirements` expose uniquement `status`, `validatedAt` et `canValidate`, tandis que `POST /api/actions/[actionId]/administrative-requirements` effectue atomiquement la transition `pending → validated` et sa trace d'audit. Tant que le statut est `pending`, seuls `ACTIVE_ROLE=admin|max|elu` ou l'organisateur/coorganisateur relié dans `action_organizers` peuvent ouvrir le panneau et marquer explicitement les démarches terminées. Les autres utilisateurs voient seulement `Démarches administratives non validées`; après validation, tous les lecteurs autorisés voient `✓ Démarches administratives validées`, sans identité publique du validateur.
- **Préparation et démarrage** : les démarches doivent être validées avant le démarrage réel de l'action. Cette validation ne bloque pas la saisie rétrospective des résultats d'une action déjà réalisée ; aucun blocage technique supplémentaire n'est inventé tant qu'aucune transition canonique `action_en_cours` n'est utilisée par le runtime.
- **Deep-links** : `/actions/new?panel=itineraire`, `/actions/new?panel=meteo` et `/actions/new?panel=formalites` sélectionnent uniquement le panneau ouvert ; `panel` ne confère aucune permission. `/actions/new?actionId=<id>&panel=formalites` permet d'ouvrir directement les démarches de l'action existante. `/sections/route` redirige vers le panneau itinéraire, `/sections/weather` et `/sections/guide` vers le panneau météo, en conservant les paramètres utiles.
- **Palette attendue** : emerald
- **Scope** : point d'entrée nettoyé, métier des formulaires conservé
- **Statut de finition UI** : terminé pour le contrat du point d'entrée ; l'authentification reste contrôlée au moment des capacités de création, de complétion et d'envoi.
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
- Le snapshot historique nommé `02-agir__declaration__...` est conservé ici
  comme trace de l'ancien alias `/declaration`, qui redirige vers cette page ;
  il ne constitue pas une seconde page canonique.
- **Priorité de correction** : faible


## Accès progressif

Le choix du parcours et la saisie préalable peuvent être consultés ou
préparés sans compte. Lorsqu'une création, une complétion ou un envoi doit
être persisté avec une identité, l'interface propose la connexion ou la
création de compte avec reprise du parcours. L'accès à l'entrée ne constitue
pas une permission de mutation et ne modifie pas les règles métier existantes.


## États à documenter

- **loading** : fond `slate`, skeletons sobres, loader discret uniquement pendant l'hydratation d'un `actionId` ou le handoff après une vraie écriture.
- **empty state** : fond `slate` doux, ton encourageant, CTA utile unique.
- **access refused** : `slate` avec léger `red` / `orange`, ton neutre et professionnel, pas de dramatisation.
- **shell** : les quatre panneaux restent indépendants et peuvent être ouverts ou refermés sans imposer d'ordre.
- **choice initial** : le moteur d'entrée conserve le retour au choix et les deux parcours lorsque ce sous-flux est utilisé; l'accès direct à `/actions/new` ouvre le pré-formulaire autonome.
- **success** : affichage direct de la préparation avant action ou de la déclaration des résultats terrain après action, puis passage possible vers les résultats terrain après la préparation.
- **error** : panneau compact avec retour au choix.
- **Architecture commune** : `SystemStateLayout`, `SystemStateIcon`, `SystemStateTitle`, `SystemStateDescription`, `SystemStateAction`, `SystemStateMeta`.
- **Variantes** : `variant="loading"`, `variant="empty"`, `variant="forbidden"`.
- **Règle** : aucune route de ce type ne doit avoir un état vide sans CTA utile.

### Reprise d'une action existante

Le lien `/actions/new?from=before&actionId=...` ne reprend une action comme
pré-action éditable que si `actionPhase = pre_action` et que son statut est
`pending` ou `approved`. Une pré-action `pending` non publiée peut donc rester
en préparation puis être publiée explicitement ; une pré-action approuvée peut
être reprise selon le même contrat.

Les statuts `rejected` et `cancelled` sont terminaux pour ce parcours : ils
sont affichés comme tels, ne sont pas éditables comme pré-actions, ne peuvent
pas être publiés et ne doivent jamais afficher « Action prête et publiée ».
Une action `cancelled` reste en outre un tombstone historique immuable ; son
identité et ses références existantes sont conservées.



## Références legacy

- [declarer_action.md](../../../../2-BLOC-AGIR/declarer_action.md)

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Le point d'entrée est le shell unique `Créer une action`, dont les quatre panneaux sélectionnent uniquement une section ouverte.
- Choisir un parcours ne crée encore aucune action.
- `/actions/new` conserve `recordType = action` comme invariant interne sans afficher de choix à option unique.
- Le parcours sélectionné s'affiche directement; un état de chargement est réservé à l'hydratation d'un enregistrement ou au handoff après une vraie écriture.
- La déclaration après action affiche un bandeau compact lorsqu'une préparation existante est reprise; les phases techniques ne sont pas affichées.
- Le header utilisateur est `Déclarer les résultats terrain`; les badges redondants de date, déchets et structure du formulaire ne sont pas affichés.
- La revue du formulaire affiche une aide à la relecture et des points d'attention concrets; elle ne présente pas de score ou de grade local comme une mesure de qualité démontrée.
- La masse de déchets saisie reste la mesure déclarée. `estimateWasteKg()` fournit seulement un repère indicatif séparé, sans pénaliser une valeur qui s'en écarte.
- La confirmation conserve les mesures déclarées séparément des proxys d'impact. Les proxys affichés réutilisent `computeActionImpactKpis()`; aucune quantité de plastique n'est déduite du poids total sans donnée dédiée.
- Les statuts, anomalies et provenances du contrat de données restent définis par `apps/web/src/lib/actions/quality/data-quality.ts`; la revue locale ne les duplique pas.
- Le parcours avant action crée une préparation légère, visible ensuite dans la page Rejoindre une action uniquement si elle est explicitement publiée.
- Les membres ajoutés avant publication sont conservés dans `participantAccounts` puis synchronisés en tant que participations `manual_add`.
- Les champs de récolte, de validation finale et les calculs d'impact restent réservés au formulaire après action.
- Le formulaire complet réutilise les données communes et n'expose plus le contrôle de publication du groupe.
- Le parcours avant action conserve l'état `pending` jusqu'à la complétion du formulaire complet. La carte peut projeter cette pré-action future comme publique, sans l'inclure dans les KPI ; les demandes de participation restent une file séparée `pending` jusqu'à confirmation ou refus.
- Le parcours avant action propose ensuite un passage fluide vers le formulaire complet sans perte de données.
- Le passage vers le formulaire complet doit réutiliser les données déjà saisies et n'exige pas de recommencer la préparation.
- `/actions/new?actionId=...` reprend le formulaire complet de la même action ; la navigation du shell ne crée ni action ni moteur météo parallèle.
- La préparation avant action n'est jamais traitée comme une collecte validée tant que la déclaration finale n'a pas complété les champs de récolte.
- L'absence de valeur pour `groupJoinEnabled` est interprétée comme une fermeture de la visibilité publique.
- Toute soumission d'action reste `pending` jusqu'au parcours explicite de validation, quel que soit le rôle actif de son auteur.
- Les corrections admin d'impact exigent un motif, journalisent les valeurs avant/après et recalculent la progression de manière idempotente pour les organisateurs concernés.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
