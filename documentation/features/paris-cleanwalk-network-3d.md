# Réseau 3D des cleanwalks à Paris — contrat relationnel et runtime

**Statut : `CURRENT`**

Ce document décrit le contrat de données, de relations et de rendu de la visualisation 3D de l'écosystème des cleanwalks, de la prévention et de la sensibilisation aux déchets rattaché à Paris et intégré dans `/sections/annuaire`. Les inventaires courants sont portés par les registres TypeScript et leurs tests, non par un compteur documentaire.

Dans `/sections/annuaire`, le réseau est présenté dans l'onglet « Réseau 3D », à côté de l'onglet « Services publics ». Ce dernier possède un référentiel et des types de relations institutionnelles distincts ; les deux modèles relationnels restent distincts. La vue guidée est initiale ; le canvas WebGL nécessite le choix de la 3D puis l'entrée dans le viewport ou le chargement explicite. La scène est démontée hors de l'onglet réseau. Le panneau réseau peut rester monté afin de préserver ses filtres et sélections ; au retour en 3D, la scène est rétablie. Les onglets appliquent le patron ARIA à tabulation mobile unique et navigation par flèches, `Home` et `End`. Voir le [contrat des services publics de propreté](organisation-services-publics-proprete.md).

## 1. Sources runtime

- Registre éditorial typé et politique d'épaisseur : `apps/web/src/lib/partners/paris-cleanwalk-network.ts`, `paris-cleanwalk-network.data.ts`, `paris-cleanwalk-network.prevention.data.ts`, `paris-cleanwalk-network.schools.ts`, `paris-cleanwalk-network.scheduled.ts` et `paris-cleanwalk-network.relations.ts`
- Modèle de filtrage et projection 3D déterministe : `apps/web/src/components/sections/rubriques/annuaire/paris-network-3d.model.ts`
- Scène WebGL Three.js / React Three Fiber (`ssr: false`) : `apps/web/src/components/sections/rubriques/annuaire/paris-network-3d-canvas.tsx`
- Orchestrateur, filtres, légende, bulle contextuelle et repli interactif : `apps/web/src/components/sections/rubriques/annuaire/paris-network-3d-section.tsx` et `paris-network-3d-bubble.tsx`

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

## 4. Chargement, sobriété et repli WebGL

- La vue HTML guidée est la présentation initiale ; la scène 3D est optionnelle et ne se monte qu’après choix explicite, puis entrée dans le viewport ou demande de chargement. Le bouton de retour à la vue guidée conserve les filtres et la sélection. Le graphe garde son nom de réseau 3D dans les onglets.
- Aucune simulation physique permanente n'est exécutée. La disposition déterministe est calculée sur le dataset complet, puis projetée sur les résultats filtrés ; les nœuds conservés ne changent pas de position. Le rayon nominal est uniforme et ne signifie ni influence ni importance. La position indique une famille, pas une adresse ou une distance relationnelle.
- `frameloop="demand"` suspend le rendu continu lorsque la section est hors écran, lorsque `prefers-reduced-motion` est actif ou lorsque le mode d'affichage est `sobre`.
- Si WebGL est indisponible (ou échoue à l'exécution), un repli HTML interactif complet (`ParisNetwork3DFallback`) donne accès aux mêmes acteurs, liens et fiches. La capacité WebGL est mémorisée pour l'instance active ; le contexte de sonde est libéré si l'extension le permet. Le listener de perte de contexte est nettoyé au démontage. Le zoom suit la cible des contrôles de caméra et respecte leurs limites. Le cadrage initial et le bouton Cadrer le réseau ajustent la caméra aux bornes géométriques des nœuds visibles et au champ de vision horizontal et vertical. Centrer la sélection cadre son voisinage ; Isoler les voisins ne modifie pas les données ou les filtres métier, seulement la projection 3D. La fermeture de la sélection, un changement de territoire ou une exclusion par filtre rend l’isolation inactive. Seuls les acteurs sélectionnés ou survolés affichent leur nom dans la scène, à taille d’écran lisible ; les étiquettes de collaboration programmée apparaissent sur les liens incidents mis en évidence. Tous les noms et relations restent accessibles dans la recherche, la vue guidée et les fiches.
- `ParisNetworkActorSearch` recherche un nom dans le territoire documenté sans supprimer les voisins. Une sélection explicite d'un acteur hors filtres réinitialise les filtres incompatibles. Type d'acteur et arrondissement restent visibles ; les autres filtres existants sont regroupés dans un détail secondaire. Aucune nouvelle facette temporelle ou de classement.
- Le survol met en évidence l'acteur et ses voisins et affiche un aperçu court non interactif. La sélection explicite ouvre la fiche complète et les liens documentés dans `ParisNetworkSelectionPanel`, à côté de la scène sur grand écran et à sa suite sur petit écran. Une relation ouvre son type, ses deux extrémités, son résumé, sa source et son niveau de preuve ; une opération déclarée réutilise sa fiche programmée. Le parcours par fiche fournit aussi un accès clavier aux liens historiques.
- La légende résume les encodages puis permet d'ouvrir les définitions détaillées. Un lien absent n'est pas une absence démontrée de collaboration.
- Une identité institutionnelle commune explicitement résolue peut ouvrir l'onglet des services publics, conformément au [contrat institutionnel](organisation-services-publics-proprete.md).
- `public-entity-projection.ts` fournit une projection publique canonique réutilisable à partir des identifiants explicites (`annuaireEntryId`, `networkActorId`, `institutionId`), sans rapprochement par nom ni exposition du registre privé.

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

## 7. Sélecteur territorial, classement contextuel et état vide (référentiel vérifié au 2026-11-19)

- Catalogue géographique statique (`apps/web/src/lib/partners/territory-network-catalog.ts`, `.data.ts`, `territory-network-ranking.ts`) :
  - 18 régions françaises COG (`01` à `94`), 8 collectivités et territoires français d'outre-mer (`975`, `977`, `978`, `984`, `986`, `987`, `988`, `989`, dont `984` et `989` exclus du calcul de proximité car sans population permanente).
  - **OIF (92 États et gouvernements au 16 novembre 2026)** : **53 membres de plein droit** (52 entités externes dont Chypre, Ghana, Belgique et Fédération Wallonie-Bruxelles distincts + France représentée par `FR:*` sans doublon ; retraits 2025 du Burkina Faso, du Mali et du Niger pris en compte), **5 membres associés** (dont Nouvelle-Calédonie `FR:COM:988` sans doublon) et **34 observateurs** (dont Polynésie française `FR:COM:987` sans doublon, Angola, Chili, Gambie, Malte, Louisiane, Ontario, Nouvelle-Écosse, Sarre, ainsi que Saint-Christophe-et-Niévès et le Manitoba admis en novembre 2026).
  - Les subdivisions francophones sans statut institutionnel propre à l'OIF (`SUB:BE-WAL`, `SUB:BE-BRU` et les 6 cantons francophones suisses) restent accessibles sans statut OIF fictif.
- Le combobox accessible `« Choisir un territoire »` (`territory-network-combobox.tsx`) filtre localement sans requête réseau et propose 2 suggestions contextuelles en tête :
  1. Position GPS uniquement si déjà autorisée (`permissions.query`) ou après clic explicite sur `« Me localiser »`, classée par approximation géodésique (`haversineDistanceKm`) sur point représentatif, en évitant que deux entités partageant les mêmes coordonnées représentatives monopolisent les deux suggestions.
  2. Préférences Clerk canoniques `residence` puis `work` (`user-location-preference.ts`), dédupliquées et complétées si besoin.
  3. Repli déterministe par ordre numérique INSEE puis codes/libellés internationaux.
  - Une sélection manuelle n'est jamais écrasée par une réponse asynchrone tardive.
- Seul `FR:REG:11` dispose actuellement d'un jeu de données (`Pilote : Paris intramuros (Île-de-France non exhaustive)`). Tout autre territoire affiche l'état vide `« Réseau de ce territoire pas encore renseigné »` sans scène WebGL ni données inventées, et le formulaire de contribution reste réservé à `FR:REG:11`.

## Chiffres, financements et limites des acteurs

Le contexte public d'une structure est porté par `apps/web/src/lib/partners/public-structure-context.ts` et ses données éditoriales. Le composant `PublicStructureContextPanel` est commun au réseau et à l'organisation institutionnelle. Les fiches sélectionnées affichent des détails repliables de chiffres et limites seulement lorsqu'un élément sourcé existe. Aucun score, classement, filtre de controverse ni changement de taille, couleur ou position des nœuds ne dérive de ces éléments.

Les chiffres portent une période, une unité, une portée et une source qualifiée. Une déclaration de l'organisateur ou d'un opérateur n'est pas un audit indépendant. Un fait documenté, une critique publique attribuée et une information non établie sont distingués ; les critiques restent attachées à l'identité concernée et ne sont pas propagées aux partenaires ou bénéficiaires. La section Limites est distincte d'une mesure d'impact, d'une décision administrative et d'une qualification judiciaire.

L'enrichissement Mégothon conserve les identités existantes, sépare les opérations nationales, régionales et parisiennes, les mécénats déclarés, la participation, l'appui numérique et les offres aval. Les nouveaux acteurs et liens sont dans les modules `paris-cleanwalk-network.megots.data.ts` et `paris-cleanwalk-network.megots.relations.ts`. Un partenariat ou une offre ne vaut pas un transfert financier chiffré, une opération commune réalisée ni une fréquence connue. Les données de contexte et leurs sources sont contrôlées par `public-structure-context.test.ts` ; aucun lien n'est créé par simple affiliation nationale d'une antenne. Les données et rapports d'origine publique ne sont jamais agrégés aux actions CleanMyMap sans contrat métier et preuve spécifique.
