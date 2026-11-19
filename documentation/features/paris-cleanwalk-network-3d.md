# Réseau 3D des cleanwalks à Paris — contrat relationnel et runtime

**Statut : `CURRENT`**

Ce document décrit le contrat de données, de relations et de rendu de la visualisation 3D de l'écosystème des cleanwalks, de la prévention et de la sensibilisation aux déchets rattaché à Paris et intégré dans `/sections/annuaire` (25 acteurs publiés).

## 1. Sources runtime

- Registre éditorial typé et politique d'épaisseur : `apps/web/src/lib/partners/paris-cleanwalk-network.ts`, `paris-cleanwalk-network.data.ts`, `paris-cleanwalk-network.prevention.data.ts` et `paris-cleanwalk-network.relations.ts`
- Modèle de filtrage et projection 3D déterministe : `apps/web/src/components/sections/rubriques/annuaire/paris-network-3d.model.ts`
- Scène WebGL Three.js / React Three Fiber (`ssr: false`) : `apps/web/src/components/sections/rubriques/annuaire/paris-network-3d-canvas.tsx`
- Orchestrateur, filtres, légende, bulle contextuelle et repli interactif : `apps/web/src/components/sections/rubriques/annuaire/paris-network-3d-section.tsx` et `paris-network-3d-bubble.tsx`

## 2. Identifiants canoniques, périmètres, rôles et canaux publics

- Lorsqu'un acteur existe déjà dans les seeds éditoriaux de l'Annuaire (`INITIAL_ANNUAIRE_ENTRIES`), le registre réutilise son identifiant canonique (`asso-featured-1`, `asso-surfrider-paris`, `asso-zerowaste-paris`, `evt-paris-nettoyages`, `evt-j-agis-nature`, `evt-je-veux-aider`, `asso-gestes-propres`, `asso-1`, `asso-megots-alcome`) afin d'éviter toute base d'organisations concurrente.
- **Périmètre réel** : le registre distingue explicitement les acteurs parisiens intramuros (`parisZone.isIntramuros: true`, dont les mairies, associations parisiennes, antennes régionales comme AREMACS Île-de-France/Paris et le Syctom) des organismes ou réseaux nationaux de prévention, sensibilisation ou filières REP (`parisZone.isIntramuros: false`, dont Gestes Propres, Zero Waste France, No Plastic In My Sea, ALCOME et Citeo), sans attribuer à ces derniers d'opérations intramuros non prouvées ni d'arrondissements inventés.
- Chaque nœud porte explicitement sa catégorie (`association_locale`, `entreprise_rse` — élargie aux « Entreprises, soutiens RSE et éco-organismes » dont ALCOME et Citeo —, `collectivite_mairie`, `reseau_evenement`, `plateforme_mise_en_relation`), ses rôles opérationnels (`organisateur_effectif`, `relais`, `financeur`, `fournisseur_materiel`), ses rôles d'écosystème (`organisateur_direct`, `coordinateur_reseau`, `plateforme_publication`, `sensibilisation_prevention`, cumulables), sa zone parisienne ou nationale, ses modalités de participation, son statut matériel sourcé, son responsable public vérifié (`publicLeader` ou `null`), ses canaux publics dédupliqués (`publicChannels`), sa provenance et sa date de vérification.
- Les liens d'invitation privés ou non autorisés (`chat.whatsapp.com`, `wa.me`, `discord.gg`, `discord.com/invite`, `t.me/+`) sont rejetés par `sanitizeAndDeduplicatePublicChannels`.
- **Brigade Verte Paris** (`asso-featured-1`) est reliée à sa fiche `J'agis pour la nature` via `publie_sur`, sans confusion avec « Super Brigade Verte » portée par l'association Les Parques sur `JeVeuxAider.gouv.fr`.
- **Pik Pik Environnement** (`asso-1`, `organizerDirectoryId: "association-pikpik"`) pointe vers le site associatif `https://pikpik.org/` et sa mission parisienne vérifiée sur `JeVeuxAider.gouv.fr`, sans confusion avec l'entreprise distincte PikPik Services Solidaires.
- **ALCOME** (`asso-megots-alcome`, catégorie `entreprise_rse`) pointe vers son site officiel `https://alcome.eco/` tout en conservant la fiche filière REP Tabac de l'ADEME comme preuve institutionnelle distincte.
- **Zero Waste France** (`asso-zerowaste-france`) et **Zero Waste Paris** (`asso-zerowaste-paris`) restent deux nœuds distincts.
- **Cleanwalk.org** (`cleanwalk-org`) est typée comme `plateforme_publication` ; ses fonctionnalités V2 indisponibles sont signalées et aucune opération ou bénévole des structures utilisatrices ne lui est attribuée.
- Aucun acteur du registre n'est présenté comme membre du réseau CleanMyMap (`isCleanMyMapMember: false`).
- Aucun prêt de matériel n'est attribué à un tiers sans preuve directe (`fournit_materiel` est réservé aux acteurs disposant d'une source vérifiée, notamment la Ville de Paris / DPE). Les nœuds de prévention/sensibilisation sans relation directe démontrée sont conservés sans arête présumée.

## 3. Contrat relationnel et calcul d'épaisseur

Chaque relation publiée possède un type explicite (`action_commune` / « Coorganise avec », `publie_sur` / « Publie ses actions sur », `partenariat`, `soutien_rse`, `appui_logistique`, `presence_evenement`), deux acteurs identifiés et une source datée. Un référencement sur plateforme (`publie_sur`), une présence à un événement ou une similarité thématique ne sont jamais confondus avec une coorganisation (`action_commune`).

Pour `action_commune` :
- Les opérations prouvées sont dédupliquées par couple `(id, date)` sur une fenêtre glissante de **365 jours** (`countDistinctOperationsLast12Months`).
- L'épaisseur suit une échelle linéaire bornée dans `[1.5, 6.0]` pour `1` à `12+` opérations distinctes (`RELATION_THICKNESS_POLICY`).
- Si la fréquence n'est pas quantifiée (`frequencyKnown: false`), la fonction retourne une épaisseur neutre (`2.0`) et `operationsCount12m: null`, sans jamais inventer `0`.
- Les autres types de relations utilisent des styles de ligne distincts (`dashed` / `dotted` et couleurs dédiées) avec une épaisseur fixe (`1.8`).

## 4. Chargement, sobriété et repli WebGL

- La scène 3D est chargée dynamiquement côté client (`next/dynamic` avec `{ ssr: false }`) uniquement lorsque la section entre dans le viewport (ou sur action explicite).
- Aucune simulation physique permanente n'est exécutée ; les positions 3D sont déterministes par famille.
- `frameloop="demand"` suspend le rendu continu lorsque la section est hors écran, lorsque `prefers-reduced-motion` est actif ou lorsque le mode d'affichage est `sobre`.
- Si WebGL est indisponible (ou échoue à l'exécution), un repli HTML interactif complet (`ParisNetwork3DFallback`) permet d'explorer les clusters, les relations, les filtres, la légende et les fiches détaillées.

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

## 7. Sélecteur territorial, classement contextuel et état vide

- Catalogue géographique statique (`apps/web/src/lib/partners/territory-network-catalog.ts`, `.data.ts`, `territory-network-ranking.ts`) :
  - 18 régions françaises COG (`01` à `94`), 8 collectivités et territoires français d'outre-mer (`975`, `977`, `978`, `984`, `986`, `987`, `988`, `989`, dont `984` et `989` exclus du calcul de proximité car sans population permanente), ainsi que les États et gouvernements de l'OIF et subdivisions francophones pertinentes (`CA-QC`, `CA-NB`, `BE-WAL`, `BE-BRU`, cantons francophones suisses) sans doublonner la France.
- Le combobox accessible `« Choisir un territoire »` (`territory-network-combobox.tsx`) filtre localement sans requête réseau et propose 2 suggestions contextuelles en tête :
  1. Position GPS uniquement si déjà autorisée (`permissions.query`) ou après clic explicite sur `« Me localiser »`, classée par approximation géodésique (`haversineDistanceKm`) sur point représentatif.
  2. Préférences Clerk canoniques `residence` puis `work` (`user-location-preference.ts`), dédupliquées et complétées si besoin.
  3. Repli déterministe par ordre numérique INSEE puis codes/libellés internationaux.
  - Une sélection manuelle n'est jamais écrasée par une réponse asynchrone tardive.
- Seul `FR:REG:11` dispose actuellement d'un jeu de données (`Pilote : Paris intramuros (Île-de-France non exhaustive)`). Tout autre territoire affiche l'état vide `« Réseau de ce territoire pas encore renseigné »` sans scène WebGL ni données inventées, et le formulaire de contribution reste réservé à `FR:REG:11`.
