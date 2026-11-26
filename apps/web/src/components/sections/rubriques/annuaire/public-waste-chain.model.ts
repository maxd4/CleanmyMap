export const PUBLIC_WASTE_CHAIN_STAGES = [
  {id:"collection",label:["Préparation et collecte","Preparation and collection"],ids:["participatory-cleaning","municipal-collection-regie","private-collectors","municipal-waste-channels","professional-waste-service"]},
  {id:"storage",label:["Stockage, dépôt et massification","Storage, drop-off and consolidation"],ids:["municipal-tri-sites","tri-site-lilas","operator-ckfd","syctom-transfer-romainville"]},
  {id:"transport",label:["Transport","Transport"],ids:["operator-carton-plein-cyclo","operator-ckfd"]},
  {id:"treatment",label:["Traitement et valorisation","Treatment and recovery"],ids:["syctom","operator-mego","operator-trivalo-92","operator-asterya","operator-urbaser","operator-valoest","operator-semotris","operator-generis"]},
  {id:"prevention",label:["Prévention et filières REP","Prevention and EPR schemes"],ids:["asso-megots-alcome","eco-organisme-citeo"]},
] as const;
