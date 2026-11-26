# Carte et réseau géographique des cleanwalks à Paris — contrat relationnel et runtime

**Statut : `CURRENT`**

Ce document décrit le contrat de données, de relations et de rendu de la carte relationnelle géographique de l'écosystème des cleanwalks, de la prévention et de la sensibilisation aux déchets rattaché à Paris et intégré dans `/sections/annuaire`. Les inventaires courants sont portés par les registres TypeScript et leurs tests, non par un compteur documentaire.

Dans `/sections/annuaire`, l'onglet « Carte & réseau » utilise une même projection publique pour la perspective 3D géographique MapLibre et le repli 2D Leaflet. Les points sont des implantations géocodées, jamais une disposition abstraite. Le référentiel institutionnel de « Services publics » conserve ses types de relations propres. Les deux onglets partagent les identités explicitement établies.

## 1. Sources runtime

- Registre éditorial typé et politique d'épaisseur : `apps/web/src/lib/partners/paris-cleanwalk-network.ts`, `paris-cleanwalk-network.data.ts`, `paris-cleanwalk-network.prevention.data.ts`, `paris-cleanwalk-network.schools.ts`, `paris-cleanwalk-network.scheduled.ts` et `paris-cleanwalk-network.relations.ts`
- Projection géographique et relations : `annuaire-geo-network.model.ts`, `annuaire-geo-network.visuals.ts` et `annuaire-network-only-filters.ts` dans `apps/web/src/components/sections/rubriques/annuaire/`.
- Rendus `annuaire-map-3d-canvas.tsx` et `annuaire-map-canvas.tsx`, chargés dynamiquement par `annuaire-exploration-view.tsx` ; `annuaire-geo-projection.ts` projette l'altitude symbolique selon la caméra.
- Identités et preuves : `public-entity-projection.ts`, `public-structure-context.ts` et `public-network-identity-media.ts` dans `apps/web/src/lib/partners/`.

## 2. Identifiants canoniques, périmètres, rôles et canaux publics

- Lorsqu'un acteur existe déjà dans les seeds éditoriaux de l'Annuaire (`INITIAL_ANNUAIRE_ENTRIES`), le registre réutilise son identifiant canonique (`asso-featured-1`, `asso-surfrider-paris`, `asso-zerowaste-paris`, `evt-paris-nettoyages`, `evt-j-agis-nature`, `evt-je-veux-aider`, `asso-gestes-propres`, `asso-1`, `asso-megots-alcome`) afin d'éviter toute base d'organisations concurrente.
- **Périmètre réel** : le registre distingue explicitement les acteurs parisiens intramuros (`parisZone.isIntramuros: true`, dont les mairies, associations parisiennes, antennes régionales comme AREMACS Île-de-France/Paris et le Syctom) des organismes ou réseaux nationaux de prévention, sensibilisation ou filières REP (`parisZone.isIntramuros: false`, dont Gestes Propres, Zero Waste France, No Plastic In My Sea, ALCOME et Citeo), sans attribuer à ces derniers d'opérations intramuros non prouvées ni d'arrondissements inventés.
- Chaque nœud porte explicitement sa catégorie (`association_locale`, `entreprise_rse` — élargie aux « Entreprises, soutiens RSE et éco-organismes » dont ALCOME et Citeo —, `collectivite_mairie`, `reseau_evenement`, `plateforme_mise_en_relation`, `etablissement_enseignement`), ses rôles opérationnels (`organisateur_effectif`, `relais`, `financeur`, `fournisseur_materiel`), ses rôles d'écosystème (`organisateur_direct`, `coordinateur_reseau`, `plateforme_publication`, `sensibilisation_prevention`, cumulables), sa zone parisienne ou nationale, ses modalités de participation, son statut matériel sourcé, son responsable public vérifié (`publicLeader` ou `null`), ses canaux publics dédupliqués (`publicChannels`), sa provenance et sa date de vérification.
- Les liens d'invitation privés ou non autorisés (`chat.whatsapp.com`, `wa.me`, `discord.gg`, `discord.com/invite`, `t.me/+`) sont rejetés par `sanitizeAndDeduplicatePublicChannels`.
- **Brigade Verte Paris** (`asso-featured-1`) est reliée à sa fiche `J'agis pour la nature` via `publie_sur`, sans confusion avec « Super Brigade Verte » portée par l'association Les Parques sur `JeVeuxAider.gouv.fr`.
- **Pik Pik Environnement** (`asso-1`, `organizerDirectoryId: "association-pikpik"`) pointe vers le site associatif `https://pikpik.org/` et sa mission parisienne vérifiée sur `JeVeuxAider.gouv.fr`, sans confusion avec l'entreprise distincte PikPik Services Solidaires.
- **ALCOME** (`asso-megots-alcome`, catégorie `entreprise_rse`) pointe vers son site officiel `https://alcome.eco/` tout en conservant la fiche filière REP Tabac de l'ADEME comme preuve institutionnelle distincte.
- CKFD (`operator-ckfd`), MéGO! (`operator-mego`), Carton Plein Cyclo (`operator-carton-plein-cyclo`, distinct de l'association `asso-3`) et Les Runners Laveurs (`asso-runners-laveurs`) partagent leur identifiant avec une ressource éditoriale Annuaire ; aucune coordonnée, couverture d'arrondissement, adhésion ou prestation acquise n'est imputée. Les fiches éditoriales réutilisent les limites sourcées du réseau par identifiant canonique. Les clubs simplement prospectés ne sont pas des organisateurs de cleanwalks attestés.
- **Zero Waste France** (`asso-zerowaste-france`) et **Zero Waste Paris** (`asso-zerowaste-paris`) restent deux nœuds distincts.
- **Cleanwalk.org** (`cleanwalk-org`) est typée comme `plateforme_publication` ; ses fonctionnalités V2 indisponibles sont signalées et aucune opération ou bénévole des structures utilisatrices ne lui est attribuée.
- **CleanMyMap** (`cleanmymap`) est documentée comme plateforme éditrice du réseau (`plateforme_mise_en_relation`, `plateforme_publication`, projet civic-tech open source initié par Maxence Deroome selon `README.md` et `AUTHORS.md`), sans présumer qu'elle est une association constituée ni que les autres acteurs du graphe sont ses partenaires (`isCleanMyMapMember: false` conservé).
- Les établissements scolaires sont projetés depuis les seeds éditoriaux de l'Annuaire (`seed-schools.ts`), avec identifiant UAI stable, sources d'identité, adresses contradictoires conservées et coordonnées absentes lorsqu'elles ne sont pas établies. L'identification institutionnelle ne constitue pas une preuve d'activité cleanwalk, de rôle opérationnel ou de partenariat.
- Aucun acteur du registre n'est présenté comme membre du réseau CleanMyMap (`isCleanMyMapMember: false`).
- Aucun prêt de matériel n'est attribué à un tiers sans preuve directe (`fournit_materiel` est réservé aux acteurs disposant d'une source vérifiée, notamment la Ville de Paris / DPE). Pour la DPE, la source municipale annonce sacs et gants sur demande et cendriers de poche selon disponibilité ; ce statut ne prouve ni stock, ni prêt accordé, ni fourniture de pinces ou chasubles. Les nœuds de prévention/sensibilisation sans relation directe démontrée sont conservés sans arête présumée.

## 3. Contrat relationnel et calcul d'épaisseur

Chaque relation publiée possède un type explicite (`action_commune` / « Coorganise avec », `publie_sur` / « Publie ses actions sur », `partenariat`, `soutien_rse`, `appui_logistique`, `presence_evenement`, `collaboration_programmee`), deux acteurs identifiés et une provenance datée. Les relations historiques ont une source URL ; une collaboration programmée est une déclaration d'organisateur sans URL publique propre à l'opération lorsque celle-ci n'est pas disponible. Un référencement sur plateforme (`publie_sur`), une présence à un événement ou une similarité thématique ne sont jamais confondus avec une coorganisation (`action_commune`).

Les collaborations programmées sont dérivées de `PARIS_SCHEDULED_OPERATIONS`, avec un identifiant d'opération commun aux liens concernés. Leur état `programme` et leur provenance `declaration_organisateur` sont distincts d'une action commune réalisée. Une date passée ne déclenche aucune promotion automatique, aucun comptage historique ni aucun partenariat. Le panneau dédié et les fiches des acteurs conservent les informations non renseignées et les identifications probables. Ne publier que les informations opérationnelles autorisées à être rendues publiques ; une déclaration ne prouve pas à elle seule cette autorisation.

Pour `action_commune` :
- Les opérations prouvées sont dédupliquées par couple `(id, date)` sur une fenêtre glissante de **365 jours** (`countDistinctOperationsLast12Months`).
- L'épaisseur suit une échelle linéaire bornée dans `[1.5, 6.0]` pour `1` à `12+` opérations distinctes (`RELATION_THICKNESS_POLICY`).
- Si la fréquence n'est pas quantifiée (`frequencyKnown: false`), la fonction retourne une épaisseur neutre (`2.0`) et `operationsCount12m: null`, sans jamais inventer `0`.
- Une fréquence connue sans opération dans la fenêtre retourne `operationsCount12m: 0` avec une épaisseur neutre ; elle reste distincte d'une fréquence inconnue.
- Les autres types de relations utilisent des styles de ligne distincts (`dashed` / `dotted` et couleurs dédiées) avec une épaisseur fixe (`1.8`). Les collaborations programmées sont affichées en ambre, en tirets, et exclues du comptage historique.

## 4. Caméra, marqueurs, relations et repli

- La carte utilise le fond CARTO existant. La vue 3D permet translation, rotation, inclinaison et zoom ; le repli 2D reste sélectionnable et prend le relais si WebGL est indisponible. Les deux moteurs sont démontés hors de l'onglet actif.
- La pointe du pin correspond à une coordonnée établie. Le badge flottant et sa hauteur sont des encodages visuels, pas la hauteur physique du bâtiment. Les logos autorisés sont des fichiers locaux, avec provenance ; les initiales signalent un logo non renseigné, jamais un logo inventé.
- Une adresse publiée et un géocodage sont deux preuves distinctes. Les acteurs sans coordonnée restent dans les résultats et la fiche ; aucun centroïde ou domicile individuel n'est ajouté. Une structure peut partager une implantation avec une autre sans fusion d'identité.
- Le diamètre est borné par 32 et 92 pixels, avec surface croissante en fonction du nombre de voisins distincts documentés. Les collaborations programmées ne contribuent pas à ce degré. L'épaisseur des arêtes réutilise la politique d'opérations communes existante, sans inférer d'activité absente.
- Les relations sont affichables toutes ensemble, pour la sélection ou masquées. Le registre complet reste consultable dans les fiches ; les arêtes dont un endpoint est dépourvu de géocodage ne sont pas tracées. Ni une relation absente ni un badge de taille minimale ne constituent une preuve d'absence de coopération.
- Les résultats et la recherche de Carte & réseau comprennent les acteurs uniquement réseau, sans inventer leurs champs Annuaire absents. La navigation institutionnelle et les contextes chiffrés communs passent par les références canoniques, sans rapprochement par nom.

## 5. Contributions citoyennes, modération et mise à jour du registre

- Sous la scène 3D, le bloc `« Aidez-nous à compléter ce réseau »` (`paris-network-contribution-card.tsx`) permet à un utilisateur **connecté** (session Clerk requise ; lien visible vers `/sign-in` pour les visiteurs anonymes) de proposer une structure, une collaboration, une action commune, un contact professionnel public ou une disponibilité de matériel.
- L'envoi réutilise `POST /api/community/bug-reports` (`community_bug_reports`) avec `reportType: "idea"`, `source: "feedback_section"`, un titre préfixé `Réseau cleanwalks Paris` et `pagePath: "/sections/annuaire#reseau-cleanwalks"`. Les contrôles existants s'appliquent (authentification, validation Zod, taille maximale `3000` caractères, anti-abus honeypot/timing et quota serveur).
- **Aucune publication automatique** : une contribution reçue ou acceptée dans la file administrateur ne modifie jamais le graphe public. L'intégration exige une vérification éditoriale :
  1. L'administrateur retrouve et qualifie la proposition dans la file créateur existante (`/admin` / `creator-inbox`).
  2. Vérification de la preuve (source publique HTTP(S) directe, absence de confusion d'homonymes, absence de lien d'invitation privé ou de donnée personnelle privée).
  3. Mise à jour explicite du registre canonique (`apps/web/src/lib/partners/paris-cleanwalk-network.data.ts` et `.relations.ts`) avec provenance et date `verifiedAt`.

## 6. Transparence des financements

- Chaque nœud peut porter un champ facultatif `funding` (`ParisActorFunding`) directement dans le registre éditorial (sans nouvelle table Supabase).
- Ce champ enregistre uniquement les origines de financement documentées par une source publique directe (`sources`, `sharesPublished`, `period`, `entityName`, `calculationBase`, `sourceUrl`, `verifiedAt`, `notes` éventuelles).
- **Règles de rigueur** :
  - Ne jamais assimiler une part inconnue à `0` : lorsque les sources sont connues sans répartition chiffrée (`sharesPublished: false`), la bulle affiche `« Parts non publiées »`.
  - Ne jamais confondre les comptes d'une entité nationale/européenne avec ceux d'une antenne locale (ex. les comptes de Surfrider Europe ne sont pas attribués à Surfrider Paris).
  - Les liens non HTTP(S) sont filtrés avant affichage.
  - Si aucun financement n'est établi pour l'acteur, aucune ligne `Financement` n'est rendue dans `ParisNetwork3DBubble`.

## 7. Périmètre géographique

Paris intramuros et France métropolitaine sont des périmètres de cadrage du même registre public. Ils ne prouvent ni une couverture exhaustive de Paris ou de la France ni une activité locale pour tous les acteurs nationaux. Les implantations hors Paris et non établies restent consultables. Le catalogue territorial historique n'est pas un nouveau registre d'acteurs.

## Chiffres, financements et limites des acteurs

Le contexte public d'une structure est porté par `apps/web/src/lib/partners/public-structure-context.ts` et ses données éditoriales. Le composant `PublicStructureContextPanel` est commun au réseau et à l'organisation institutionnelle. Les fiches sélectionnées affichent des détails repliables de chiffres et limites seulement lorsqu'un élément sourcé existe. Aucun score, classement, filtre de controverse ni changement de taille, couleur ou position des nœuds ne dérive de ces éléments.

Les chiffres portent une période, une unité, une portée et une source qualifiée. Une déclaration de l'organisateur ou d'un opérateur n'est pas un audit indépendant. Un fait documenté, une critique publique attribuée et une information non établie sont distingués ; les critiques restent attachées à l'identité concernée et ne sont pas propagées aux partenaires ou bénéficiaires. La section Limites est distincte d'une mesure d'impact, d'une décision administrative et d'une qualification judiciaire.

L'enrichissement Mégothon conserve les identités existantes, sépare les opérations nationales, régionales et parisiennes, les mécénats déclarés, la participation, l'appui numérique et les offres aval. Les nouveaux acteurs et liens sont dans les modules `paris-cleanwalk-network.megots.data.ts` et `paris-cleanwalk-network.megots.relations.ts`. Un partenariat ou une offre ne vaut pas un transfert financier chiffré, une opération commune réalisée ni une fréquence connue. Les données de contexte et leurs sources sont contrôlées par `public-structure-context.test.ts` ; aucun lien n'est créé par simple affiliation nationale d'une antenne. Les données et rapports d'origine publique ne sont jamais agrégés aux actions CleanMyMap sans contrat métier et preuve spécifique.
