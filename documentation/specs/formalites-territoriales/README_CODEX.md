# Formalités territoriales et accompagnement

Statut : intégré au checkout `main` le 27 novembre 2026 ; patches 01–03 et 05–06 appliqués/adaptés, patch 04 non rejoué car ses hunks étaient invalides pour le checkout et ont été portés manuellement dans les deux documents canoniques. Références des candidats : `f654eeea9ea07d2f4636859b314da9159bf723b7` (passe 1), `202267461c69ce033ebe44bbfb479d78d378b3f0` (passe 2).
La présente fiche reste le manifeste de lot et conserve les limites et preuves datées ; elle ne remplace pas les contrats `CURRENT`.

## Ordre

1. `01-cadre-territorial.patch` : cadre national, scopes EPCI et arrondissement, résolution géographique et tests candidats.
2. `02-accompagnement.patch` : sept besoins facultatifs, Lyon 8 et Nantes Métropole, formulaire Paris prioritaire, copie des faits, courriels complémentaires et alternatifs, obligations hors accordéon, tests candidats.
3. `03-persistance.patch` : champ de préparation, validation, conservation, brouillon, hydratation et duplication.
4. `04-documentation-canonique.patch` : deux documents CURRENT, à appliquer avec le runtime correspondant seulement ; contrôler/adapter les hunks documentaires au checkout réel.
5. Copier les sept fichiers sous `CANDIDATS_METROPOLE/` vers leurs chemins relatifs exacts, puis `05-contacts-metropole.patch` (intégration Web/API, catalogue local Rennes).
6. `06-preuve-territoriale.patch` : preuve métropolitaine du point calculée côté serveur, qualification nationale prudente et régression candidate. Ne jamais activer 01 sans 06.

## Décisions

Paris garde son moteur spécialisé. La simple cleanwalk n'est pas une manifestation par défaut. L'incertitude locale reste inconnue. Un point d'ancrage ne prouve pas toute la géographie d'un itinéraire. Le gestionnaire n'est pas déduit du territoire.

Le formulaire Paris est prioritaire pour les demandes courantes ; ses champs exacts ne sont pas vérifiés. Une demande complémentaire doit être relue et précisée par l'organisateur. Ne pas solliciter deux fois un service pour le même besoin. Lyon 8 : prêt de matériel sur demande ; Nantes : kit via formulaire, idéalement trois semaines avant. Pas de stock ni de soutien présumé. Les besoins ne sont ni une preuve ni une obligation. Aucun envoi automatique, aucune nouvelle table ni modification RLS. La fiche imprimable reste complète.

Sources :
- https://www.paris.fr/pages/nettoyages-participatifs-ensemble-rendons-paris-plus-propre-15425
- https://www.service-public.gouv.fr/particuliers/vosdroits/F21899
- https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070299/LEGISCTA000006180817/
- https://mairie8.lyon.fr/vie-pratique/dechets-et-proprete/organiser-une-operation-de-nettoyage-citoyen
- https://metropole.nantes.fr/mes-services-mon-quotidien/organiser-un-ramassage-citoyen-des-dechets
- https://geo.api.gouv.fr/decoupage-administratif/communes
- https://www.data.gouv.fr/dataservices/api-annuaire-de-ladministration-competence-geographique-des-services-locaux

## Intégration et preuves restantes

Partir du checkout courant, vérifier les hunks et préserver les changements concurrents. Vérifier les consommateurs de FormalityRuleScope, les traces, la publication/revue associative, les DTO publics/privés, Mobile et les écritures de préparation.

Restent ouverts, sans blocage des contrats intégrés :
- couverture complète des catégories et des interlocuteurs locaux DILA, gestionnaires déchets et associations ; les observations réseau de ce lot sont des échantillons bornés ;
- cas frontières IGN, les territoires parisiens non municipaux, validation de tous les codes de service et comportement exhaustif des limites fournisseur ;
- preuve de réception, accord/refus, délais locaux et preuve opposable : aucun statut `sent` ou contact trouvé ne signifie réception ou accord ;
- champs exacts du formulaire Paris et recouvrement complet avec les demandes complémentaires ; ne pas solliciter deux fois pour un besoin couvert ;
- inventaire/quantités de matériel et reprise confirmés par les interlocuteurs ; disponibilité non garantie ;
- adaptation du rendu mobile à vérifier sur appareil réel ; le test/runtime ne prouve pas le rendu natif par plateforme.

Les recherches de contacts sont exécutées uniquement à la demande de l'organisateur autorisé ; IGN résout les communes couvertes par la géométrie enregistrée et DILA fournit des fiches de services publics pour les catégories interrogées. Réponse privée/non-cacheable, cache fournisseur borné côté serveur, pas d'écriture des contacts ni d'envoi de message. La validation de publication requalifie les faits actuels ; les obligations `required` non satisfaites empêchent publication et l'enregistrement de revue associative, tandis qu'un besoin facultatif ou une qualification `unknown` ne crée pas d'obligation.

Preuves exécutées pour ce checkout :
- Web ciblé : 120 tests / 11 fichiers PASS ; après la dernière correction locale, 13 tests / 4 fichiers PASS ; typecheck `next typegen && tsc --noEmit` PASS ; ESLint strict des fichiers du lot PASS.
- Mobile : 402 tests / 45 fichiers PASS dans FAST, plus la suite ciblée de création (76 tests / 2 fichiers) PASS ; typecheck et ESLint strict PASS.
- Couverture V8 ciblée Web : 80,44 % statements, 76,30 % branches, 86,44 % fonctions, 86,13 % lignes sur les modules/routes inclus ; Mobile : 88,48 %, 89,52 %, 81,39 %, 97,44 % respectivement sur le contrôleur de création et son écran. Ces chiffres sont `TARGETED`, pas comparables aux rapports workspace.
- Revue associative : test ciblé confirme qu'une obligation requise non satisfaite interrompt le flux avant persistance de la revue ; publication Web relit et requalifie l'action sur le serveur. Aucune migration SQL/RLS n'a été créée ; `DB_SEMANTICS_NOT_EXECUTED`.
- `npm run checks:fast` : FAIL après 149,6 s. Contrôles en échec : audit des secrets (alertes sur documents d'import non suivis ; l'adresse institutionnelle Lyon, qui déclenchait également l'heuristique, a été retirée du runtime au profit du lien officiel), gouvernance documentaire (documents d'import non suivis), dérive globale pages_site, frontières d'import hors fichiers du lot et lint ciblé (apostrophe JSX corrigée ensuite ; re-lint strict ciblé PASS). Les gates non démarrées au budget temps restent `NOT_RUN` ; le typecheck Web avait passé séparément.
- Observations réseau bornées : IGN a retourné la commune pour un point de Paris ; DILA a retourné des services pour Lyon/Nantes et révèle un champ courriel tantôt scalaire, corrigé dans le parseur. Les échantillons ne prouvent ni les frontières, ni la taxonomie complète, ni l'exhaustivité des contacts.

Aucun résultat de déploiement ou d'exhaustivité n'est revendiqué. Les validations sont ciblées ; l'agrégat FAST reste en FAIL à cause de constats globaux et concurrents explicités ci-dessus.

STOP CONDITION : patches adaptés et intégrés ; validation ciblée exécutée ; publication et revue associative consomment la qualification serveur courante ; aucune décision bloquante ne repose sur une géographie non prouvée ; formulaire Paris reste prioritaire et besoins facultatifs indépendants ; contrat de préparation partagé sans duplication. Les lacunes d'exhaustivité, de réception/accord et de rendu appareil restent explicitement hors preuve.

## Passe 2 : annuaire métropolitain dynamique

Périmètre fonctionnel visé : communes de métropole et de Corse, y compris communes rurales, pas une liste finie de grandes villes. Le filtre INSEE exclut l'outre-mer ; la résolution administrative géographique reste la preuve nécessaire. Ne pas annoncer un inventaire exhaustif des contacts ni une couverture juridique complète.

Architecture : le serveur récupère la géométrie enregistrée de la pré-action autorisée ; IGN API Carto retourne les communes intersectées. Puis DILA joint compétence géographique et fiche de service par identifiant. Le navigateur déclenche explicitement GET /api/actions/[actionId]/formalities?contacts=1. Aucun envoi automatique, aucune écriture de contact dans la fiche d'action, aucune nouvelle migration. Seules les données publiques du service (téléphone, courriel, site, formulaire, fiche, communes, date de récupération) sont renvoyées. Les données personnelles de l'organisateur ne sont pas transmises à DILA. Les géométries sont envoyées à IGN pour la résolution, pas le titre ou les identités. Vérifier les protections, la fraîcheur des résultats et la politique de confidentialité avant activation.

Bornes candidates : 12 communes par recherche, 60 identifiants par commune, groupes de 15, 4 communes en parallèle ; cache mémoire de 6 h, maximum 500 entrées. Réponse tronquée ou fournisseur indisponible : état partiel/inconnu, jamais résultat complet par défaut. La liste de communes intersectées ne prouve pas que toute l'action est en France. Les contacts DILA sont des interlocuteurs d'orientation administrative, non une preuve de compétence de collecte ni d'accord. Les codes mairie, epci et gendarmerie sont documentés dans les exemples consultés ; les autres codes proposés (prefecture, sous_pref, commissariat_police, ddt, ddtm, dreal, sdis) restent à confirmer sur le service réel.

Les annuaires nationaux complémentaires sont des accès vers les sources, non des imports exhaustifs : BANATIC, SINOE, réseaux associatifs World Cleanup Day et JeVeuxAider, Surfrider, ressources assurance, OFB, réserves naturelles, parcs naturels régionaux, VNF. Paris, Lyon, Nantes et Rennes disposent de règles pratiques locales candidates ; aucune disponibilité de matériel ni reprise des déchets présumée. Les contacts directs des syndicats de déchets et des associations sont à résoudre par les sources officielles, pas à déduire de la mairie. Les gestionnaires privés restent à identifier.

Sources techniques à consulter avec le candidat :
- https://www.data.gouv.fr/dataservices/api-annuaire-de-ladministration-competence-geographique-des-services-locaux
- https://api-lannuaire.service-public.gouv.fr/
- https://github.com/IGNF/apicarto/blob/master/doc/limites-administratives.yml
- https://github.com/IGNF/apicarto/blob/master/controllers/limites-administratives/index.js
- https://www.banatic.interieur.gouv.fr/
- https://www.sinoe.org/
- https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000034448110/

Validation passe 2 : relecture des contrats IGN et DILA, génération et rejeu textuel exact des patches 05/06 sur les candidats précédents (PASS). Les tests Vitest inclus sont des tests candidats non exécutés. Accès réseau du conteneur au dépôt indisponible (résolution DNS), pas de checkout canonique. HOOK_NOT_AVAILABLE ; git apply --check réel, typecheck monorepo, lint, tests, appels IGN/DILA de production, E2E et déploiement NOT_RUN. Les hunks du patch documentaire 04 n'ont pas été rejoués complètement dans l'outil de reconstruction ; adapter sur le checkout plutôt que revendiquer PASS. Les deux documents CURRENT doivent absorber la doctrine de cette passe au moment de l'intégration, sans avancer leur statut avant validation.

Reste ouvert : preuve de réception et d'autorisation (ne pas confondre envoyé et accordé), refus, délais locaux exacts, intégration Mobile et tests Web/Mobile, recherche exhaustive des contacts locaux par besoin, récupération des demandes réellement couvertes par les formulaires, vérification de l'invalidation des preuves lors d'un changement de version de règle. Ne pas réinitialiser un workflow historique sans vérifier le contrat existant. Toute validation SQL/RLS et publication associative requise doit être exécutée sur le checkout réel.

## Passe de finalisation complémentaire — 2026-11-27

Cette passe étend les résultats et note les écarts vérifiés sans convertir une donnée manquante en réussite :

- Le filtre DILA figé à dix types a été retiré. Le serveur interroge maintenant les codes réellement publiés par DILA pour la commune, suit jusqu'à 500 lignes de compétence et joint au plus 120 services, par paquets de 15. La limite officielle de 100 lignes/page est suivie par pagination. Une taxonomie DILA nouvelle n'est plus rejetée par une allowlist locale.
- Les transitions utilisateur distinguent `prepared`, `sent`, `receipt_received`, `authorization_obtained` et `refused`. Tout est conservé comme déclaration datée de l'organisateur. La publication et la revue associative exigent l'autorisation déclarée pour AOT/gestionnaire et le récépissé déclaré reçu pour une déclaration ; le refus bloque. L'historique ne prétend pas à une vérification opposable.
- La route utilise `requireActionRequestAccess` : Web par session Clerk et Mobile par Bearer Clerk, avec les mêmes contrôles de propriété/organisateur. Mobile charge les mêmes formalités persistées, transitions autorisées et champs actuels de l'action, dont l'inventaire déclaré ; aucune règle métier n'est copiée côté natif.
- Les courriels préparés incluent les matériaux, consignes et quantités/disponibilités d'inventaire déjà renseignés. Ils restent modifiables et ne sont jamais envoyés par l'application.
- Vérifications réelles : DILA Nantes `44109` HTTP 200, 160 lignes sur deux pages et types comprenant `police_municipale`, `gendarmerie_departementale`, `sdis`, `parc_naturel_regional`; un en-tête observé indiquait une limite instantanée 500000, non garantie contractuelle. GEO a résolu Nantes/`44109` et EPCI `244400404`. IGN API Carto a renvoyé les communes `69123` et `69266` pour une ligne Lyon–Villeurbanne. ADEME Data Fair avait renvoyé HTTP 200 pour les deux jeux mentionnés dans `COUVERTURE_METROPOLE.md`. Le DNS INPN n'a pas répondu dans l'environnement.
- Coûts/limites de source : DILA annonce gratuité, mise à jour jours ouvrés, mais disponibilité et limite d'appels non documentées ; API Carto et GEO n'ont pas de SLA/tarif vérifié dans cette passe ; ADEME documente les limites anonymes de débit. Aucun tarif n'est donc inféré pour IGN/GEO.

Validations de cette passe : Web `typecheck` PASS ; cinq suites Vitest ciblées PASS (66 tests) ; Mobile `typecheck` PASS ; test de création Mobile PASS (67 tests) ; lint Web ciblé PASS. Les validations Web/Mobile doivent être rejouées après l'ajout du panneau natif et le préremplissage inventaire si elles n'ont pas couvert l'état final. `checks:fast`, les contrôles coverage V8 et les tests de rendu sur appareil natif restent `NOT_RUN`. Aucun SQL ni migration modifié : `DB_SEMANTICS_NOT_EXECUTED`.

La STOP CONDITION globale reste **non satisfaite** : aucune preuve exhaustive de toutes les collectivités, syndicats/services déchets, gestionnaires d'espaces naturels, interlocuteurs associatifs ou règles/délais/formulaires multicommunaux n'a été obtenue. Les plafonds de recherche sont partiels par conception ; l'API INPN n'est pas joignable ici, et DataAsso/API Association n'est pas une intégration runtime. Les formulaires Paris ne sont pas certifiés champ par champ dans cette passe. L'adaptation native Android/iOS n'a pas été testée sur appareils réels. Ne pas annoncer « couverture métropolitaine complète » ou « lot terminé » tant que ces preuves manquent.

## Passe de clôture fonctionnelle — 2026-11-27

La route Formalités utilise le garde d'accès partagé Clerk pour session Web et Bearer Mobile ; le contrat d'autorisation et l'explication du `private, no-store` décrivent maintenant ce comportement et sa confidentialité. Le panneau natif lit/écrit la même API et reçoit les transitions autorisées par le serveur. Le brouillon de demande est prérempli avec les champs disponibles, consignes et inventaire/quantités existants ; il reste éditable et n'envoie rien.

La règle parisienne événementielle a été revérifiée sur les pages officielles : AOT Ville (dossier technique PDF complet, dépôt au moins deux mois avant l'occupation) et accord Préfecture de police (ordre public/sécurité via Déclaration-manifestations) sont deux démarches distinctes. Le silence de la Ville pendant deux mois après réception d'un dossier finalisé vaut rejet implicite. La qualification et les blocages de publication/revue associative séparent ces demandes ; le délai général de police n'est pas inventé. La page d'instruction, pas l'interface complète du formulaire, a été examinée. Voir la fiche de couverture et les contrats `CURRENT`.

Preuves sur l'état de clôture : Web, sept suites formelles ciblées PASS (115 tests), typecheck PASS, lint strict ciblé PASS ; Mobile service formalités PASS (10 tests), typecheck PASS et lint ciblé PASS. Le FAST a exécuté 18 contrôles sur 19 et s'est terminé en FAIL au budget 180 s : 12 PASS, 6 FAIL et Web typecheck `NOT_RUN` dans cet agrégat. Les 403 tests Mobile, sécurité Mobile, typecheck/lint Mobile, audit secrets, migrations, 142 tests Web ciblés, lint Web, nomenclature, intégrité des chemins et checks diff staged/unstaged ont passé. Échecs FAST observés : frontières d'import, dérive préexistante de `pages_site`, gouvernance du document d'import parallèle non suivi, API boundary/regression gates échouant sur contrats/données d'autres routes du lot Personal AI simultané, et Semgrep `TIME_BUDGET_EXCEEDED` à 120,9 s. Un run ciblé de la gate no-store après correction a ensuite avancé sur un défaut d'une autre route (`admin/organizations/bootstrap`) ; un run API boundary a avancé sur une preuve d'une route Personal AI. Ces fichiers hors lot n'ont pas été modifiés par cette passe.

Aucune couverture V8, exécution sur appareil natif, vérification de toutes les communes ou parcours end-to-end réel avec une administration n'est revendiquée (`NOT_RUN`). Pas de migration attribuable à ce chantier ; `DB_SEMANTICS_NOT_EXECUTED`. L'état des formulaires et autorisations reste déclaré par l'organisateur et n'est pas vérifié par API.

**STOP CONDITION globale : NON SATISFAITE.** Une taxonomie DILA dynamique et une intersection multi-commune réelle sont démontrées par échantillons limités ; cela ne prouve pas la couverture exhaustive métropolitaine de tous les services et gestionnaires, ni les règles locales, échéances et formulaires de chaque commune. Les sources SINOE/DataAsso/INPN ne sont pas des intégrations runtime d'identification complète. Aucun résultat simulé n'est présenté comme contact, récépissé ou autorisation. Il faut des preuves de couverture territoriale et d'intégration opérationnelle des sources manquantes avant de clore le manifeste.

### Correctif cohérence transactionnelle et pertinence territoriale — 2026-11-27

Le contrat SQL de revue associative est remplacé par une migration forward-only `20261127000004` : les statuts courants et `police_authorization` sont reconnus ; `not_started`, `prepared` et `sent` restent lisibles dans les historiques. Une formalité AOT, autorisation de police ou gestionnaire requise exige `authorization_obtained`; une déclaration de police requise exige `receipt_received` ou `authorization_obtained`. Le test pgTAP vérifie les nouveaux statuts, l'insuffisance de `sent`, les refus, permissions, décision d'approbation et idempotence. À ce stade, la migration n'est pas appliquée ; le préflight a rendu `BLOCKED / SENSITIVE_PROOF_INVALID` car l'attestation SQL éphémère disponible n'a pas la version requise. L'application reste interdite jusqu'à une preuve CI éphémère sur le SHA et au retour `READY_TO_APPLY` du préflight.

Les transitions sont contrôlées côté serveur par procédure et état courant. Une autorisation invalidée redevient préparée au prochain geste explicite. La qualification conserve une juridiction de point GEO vérifiée lors d'une indisponibilité temporaire si l'empreinte du lieu persisté est identique ; pour les traces historiques sans cette empreinte, elle conserve l'obligation pendant la requalification de compatibilité mais invalide la preuve existante. La géométrie, les coordonnées, le libellé ou le département modifiés dans une trace versionnée requalifient l'action et invalident les preuves. Le sujet Bearer vérifié par Clerk est celui passé à l'AuthZ ; une discordance avec l'identité cookie échoue fermée.

La recherche DILA est ordonnée explicitement pour paginer de manière stable, classe les catégories selon les besoins cochés puis par identifiant, et partage un plafond de 48 requêtes par action. Chaque commune est plafonnée à 200 lignes de compétence et 30 fiches détaillées ; plafond, troncature et panne produisent un résultat partiel ou inconnu. Le lien compétence géographique DILA ne prouve pas la tâche déchets. BANATIC, SINOE, référentiels d'espaces naturels et annuaires associatifs restent des ressources d'orientation/documentaires lorsque leur source ne permet pas d'établir une relation officielle fiable avec l'emplacement. Aucun annuaire national exhaustif n'est constitué manuellement.

Les premières validations ciblées après le correctif : Mesures V8 ciblées finales avant stabilisation du candidat : Web, sept suites et 103 tests PASS, 92.87 % lignes / 87.84 % statements / 84.26 % branches / 93.85 % fonctions sur huit fichiers ; Mobile, deux suites et 20 tests PASS, 98.30 % lignes / 93.16 % statements / 82.53 % branches / 94.80 % fonctions sur deux fichiers. Les scopes sont indépendants ; aucun score monorepo n'est déduit. Typecheck Web/Mobile PASS ; lint ciblé Web/Mobile PASS ; audit de l'arbre de migrations PASS. Ces agrégats n'atteignent pas les cibles précédemment fixées sur tous les axes ; une nouvelle mesure et les suites ajoutées doivent être prises en compte avant clôture. Les suites ciblées n'attestent ni couverture native Android/iOS, ni exécution réelle d'une demande administrative.

**STOP CONDITION : NON SATISFAITE en attente de validations.** La convergence distante, l'application de migration et la preuve SQL CI restent en attente ; les agrégats ciblés dépassent 80 % sur les quatre métriques dans chaque workspace ; la couverture exhaustive des autorités, opérateurs déchets, gestionnaires d'espaces et associations n'est pas démontrée.

Le garde `checks:fast` de ce worktree s'est terminé en `FAIL` à 180,2 s : 14 contrôles PASS, les contrôles `architecture-import-boundary` et `pages-site-drift` FAIL sur des routes `admin/*`, `/sections/community` et une fiche community sans rapport avec cette modification, Semgrep `TIME_BUDGET_EXCEEDED` à 119,4 s, typecheck Web `NOT_RUN_TIME_BUDGET`. Les typechecks Web/Mobile ciblés, les suites Web/Mobile concernées et le lint ciblé ont réussi séparément. Aucun fichier des échecs étrangers n'a été modifié.

### Rejeu opérationnel complémentaire — 2026-11-27

La passe suivante a appelé les endpoints de production des modules runtime depuis ce checkout : GEO a résolu Paris (`75056`, EPCI `200054781`), Ajaccio (`2A004`, EPCI `242010056`) et la commune rurale d'Aiguilles (`05003`, EPCI `200067452`). IGN a renvoyé respectivement ces codes pour trois points, en HTTP 200. Le runtime DILA a renvoyé des fiches pour les trois communes ; dans chaque cas le plafond applicatif de 120 fiches a été atteint et le statut constaté est `partial`. Pour Aiguilles, l'API de compétences indique 155 lignes ; ce compteur n'est pas le nombre de services après déduplication et ne permet pas de quantifier les services omis. Ces appels démontrent les chemins géographiques et d'annuaire pour ces trois territoires, pas les services compétents d'une action particulière ni l'exhaustivité nationale.

La recherche officielle complémentaire confirme que l'API Association ouverte identifie une association à partir d'un RNA/SIREN et n'est pas un annuaire géographique ouvert de contacts ; DataAsso offre une carte et des exports, mais aucune API de recherche géographique ouverte n'a été certifiée pour ce runtime. SINOE/ADEME expose des jeux utiles sur les déchèteries et acteurs de l'économie circulaire ; leur présence ne démontre pas l'identité du syndicat ou du service à contacter pour une collecte citoyenne. Ces pistes restent des liens d'orientation, aucune intégration runtime n'est revendiquée.

État après cette passe : la résolution réelle est démontrée sur un point de métropole dense, un point rural et un point corse, ainsi que sur le parcours multi-communal Lyon–Villeurbanne vérifié dans la passe précédente. Les limites sont codées comme `partial` et exposées à l'utilisateur. La STOP CONDITION **reste non satisfaite** faute de source/intégration permettant une couverture démontrable des opérateurs déchets, gestionnaires d'espaces, contacts associatifs, formulaires et règles territoriales exhaustifs. Ne pas déclarer le chantier territorial complet.

### Correctif de stabilité et d'accès Mobile — 2026-11-27

Une règle locale ne s'applique que si le serveur a une preuve de point métropolitain résolu. Le département persisté seul ne crée donc pas d'obligation locale nouvelle. En panne GEO, la dernière juridiction vérifiée est conservée seulement si l'empreinte du lieu est identique ; sinon, la qualification retombe à l'incertitude et les preuves sont invalidées. La géométrie, le point, le libellé et le département entrent dans cette empreinte ; la date, le territoire et la version des règles entrent dans les dépendances de qualification.

Le panneau natif peut modifier les faits de qualification par le PATCH canonique `/api/actions/:actionId/formalities`. Il ne porte aucune règle métier. Les obligations et la recherche de services restent accessibles sans besoin facultatif coché ; le serveur conserve ses plafonds DILA et ses résultats partiels. Les statuts préparée, envoyée, récépissé reçu, autorisation obtenue et refus restent des déclarations de l'organisateur.

Les tests de qualification sans preuve, panne GEO, changement de lieu, date et règles sont présents ; les tests Mobile couvrent la recherche sans sélection facultative, le transport PATCH commun, l'affichage de qualification et les transitions déclarées. Un scénario E2E Clerk vérifie le refus HTTP 403 d'un non-organisateur pour l'accès aux formalités. Il n'a pas été exécuté jusqu'à cette assertion ici : la fixture protège ses mutations et a refusé l'exécution car l'environnement local est configuré vers un projet Supabase hébergé. Le runtime Android/iOS, la couverture exhaustive des autorités et les démarches administratives réelles restent non validés. **La STOP CONDITION territoriale reste NON SATISFAITE.**

Mesure complète du 27 novembre 2026 après correction des fixtures GEO : Web, 1 982 fichiers de test PASS, 1 skipped ; 12 487 tests PASS, 1 skipped ; 80,74 % statements et 71,43 % branches globalement. Dans les familles de risque Web, `business` mesure 79,70 % statements / 70,54 % branches et `api-persistence` 87,11 % / 79,43 %. Le domaine historique `formalities` mesure 70,57 % / 68,75 %. Les seuils demandés de 85 % statements et 80 % branches ne sont donc pas atteints. Mobile, 46 fichiers et 416 tests PASS : 89,70 % statements, 83,85 % branches, 86,22 % fonctions et 95,09 % lignes. Les couvertures Web et Mobile sont indépendantes. La CI historique 46045736760 échouait également sur un garde de commentaire no-store corrigé ici et sur des défauts étrangers de gouvernance/routes ; la preuve SQL 46045736761 PASS sur 0068fed5 n'a pas été rejouée. La suite Clerk reste BLOQUÉE par la garde d'environnement hébergé, et la validation native ainsi que Code Scanning ne sont pas acquises.
