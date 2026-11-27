import type { SupportNeed } from "./accompaniment";

export type NationalSupportResource = { id:string; label:string; url:string; needs:readonly SupportNeed[]; guidance:string };
const RESOURCES: readonly NationalSupportResource[] = [
  {id:"dila",label:"Annuaire des services publics",url:"https://lannuaire.service-public.gouv.fr/",needs:["notify","equipment","pickup","safety","communication"],guidance:"Mairie, intercommunalité et services de l'État : demander le service compétent, sans présumer d'accord."},
  {id:"banatic",label:"BANATIC : groupements et compétences",url:"https://www.banatic.interieur.gouv.fr/",needs:["equipment","pickup"],guidance:"Identifier les groupements et syndicats. La compétence déchets n'établit pas la reprise d'une collecte citoyenne."},
  {id:"sinoe",label:"SINOE Déchets (ADEME)",url:"https://www.sinoe.org/thematiques/consult/ss-theme/3",needs:["pickup"],guidance:"Rechercher la collectivité ou le syndicat chargé de la collecte et confirmer les flux et la reprise."},
  {id:"ademe-circular",label:"ADEME : acteurs de l’économie circulaire",url:"https://data.ademe.fr/datasets/wvw1zecq4f4gyvonve5j0hr7",needs:["pickup","equipment"],guidance:"Annuaire ouvert à rechercher par territoire ; il n’est pas exhaustif et une adresse présente ne prouve ni la compétence de collecte ni une reprise."},
  {id:"dataasso",label:"DataAsso : associations par territoire",url:"https://associations.gouv.fr/dataasso",needs:["association","communication"],guidance:"Recherche géographique de sièges et d’établissements ; vérifier directement l’activité et l’interlocuteur. Les contacts personnels de l’API ouverte ne sont pas fournis."},
  {id:"wcd",label:"World Cleanup Day : ambassadeurs locaux",url:"https://www.worldcleanupday.fr/annuaire-ambassadeurs/",needs:["association","communication","equipment"],guidance:"Référents locaux pour conseils et relais ; matériel non garanti."},
  {id:"jva",label:"JeVeuxAider.gouv.fr : ramassage de déchets",url:"https://www.jeveuxaider.gouv.fr/activites/ramassage-de-dechets",needs:["association","communication"],guidance:"Identifier des associations actives localement. Aucune collaboration présumée."},
  {id:"retrace",label:"Surfrider : Retrace!",url:"https://retrace.surfrider.eu/citoyen/",needs:["association","equipment"],guidance:"Pour les collectes aquatiques éligibles, consulter le programme et ses conditions. Pas de kit automatique CleanMyMap."},
  {id:"retrace-conditions",label:"Retrace! : assurance et conditions",url:"https://retrace.surfrider.eu/faq/",needs:["insurance"],guidance:"La couverture décrite concerne le programme et ses conditions, pas toute cleanwalk."},
  {id:"insurance",label:"Service Public : assurance des associations",url:"https://www.service-public.gouv.fr/particuliers/vosdroits/F1124",needs:["insurance"],guidance:"Vérifier auprès de l'assureur les responsabilités, participants et exclusions."},
  {id:"ofb",label:"OFB : services départementaux",url:"https://ofb.gouv.fr/comment-contacter-ofb",needs:["safety"],guidance:"Pour une question de biodiversité ou de site sensible ; l'OFB n'est pas automatiquement gestionnaire du lieu."},
  {id:"reserves",label:"Réserves naturelles de France",url:"https://reserves-naturelles.org/reserves-naturelles/",needs:["notify","safety"],guidance:"Identifier le gestionnaire et vérifier les conditions d'accès."},
  {id:"parcs",label:"Parcs naturels régionaux",url:"https://www.parcs-naturels-regionaux.fr/les-parcs/decouvrir-les-59-parcs",needs:["notify","safety"],guidance:"Trouver le parc et le gestionnaire effectif ; aucune autorisation déduite du seul périmètre."},
  {id:"vnf",label:"Voies navigables de France : directions territoriales",url:"https://www.vnf.fr/vnf/accueil/contact/",needs:["notify","safety","pickup"],guidance:"Pour une berge ou un ouvrage géré par VNF ; vérifier la compétence avant demande."},
];

export function nationalSupportResources(needs:readonly SupportNeed[]): NationalSupportResource[] {
  return RESOURCES.filter(resource=>resource.needs.some(need=>needs.includes(need)));
}
