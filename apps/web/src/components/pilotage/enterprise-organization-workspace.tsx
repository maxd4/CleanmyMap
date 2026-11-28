"use client";
import { useEffect, useRef, useState } from "react";
import { CmmCard } from "@/components/ui/cmm-card";
import { OrganizationTeamPanel } from "@/components/pilotage/organization-team-panel";
import { OrganizationCollectionsPanel } from "@/components/pilotage/organization-collections-panel";
import { organizationMembershipListSchema, organizationWorkspaceSchema, type OrganizationMembership, type OrganizationWorkspace } from "@/lib/organizations/contracts";

async function json(url: string, init?: RequestInit) {
  const res = await fetch(url,{...init,cache:"no-store"});
  if (!res.ok) throw new Error("Données indisponibles ou accès modifié.");
  return res.json();
}
function post(command: Record<string,unknown>) {
  return json("/api/organizations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...command,requestId:crypto.randomUUID()})});
}
export function EnterpriseOrganizationWorkspace({locale="fr"}:{locale?:"fr"|"en"}) {
  const isEn=locale==="en";
  const roleLabels={owner:isEn?"Owner":"Responsable",manager:isEn?"Manager":"Gestionnaire",site_manager:isEn?"Site manager":"Gestionnaire de site",member:isEn?"Member":"Membre"};
  const ui=isEn?{
    organizations:"My organizations",rights:"Access relies on verified membership, independent of the active role.",loading:"Loading…",empty:"No active membership or invitation.",onboarding:"Introduce your organization",invitation:"invitation",accept:"Accept",decline:"Decline",organization:"Organization",select:"Select",refresh:"Refresh",unavailable:"Could not load organizations.",scopeUnavailable:"Organization scope unavailable.",changed:"Change refused or state changed. Refresh and try again.",team:"My team",noMembers:"No active members.",partial:"Partial list.",inviteEmail:"Collaborator email",role:"Role",site:"Site",choose:"Choose",invite:"Invite",revoke:"Revoke",leave:"Leave organization",transfer:"Transfer responsibility to",activeManager:"Active manager",newSite:"New location",add:"Add",rename:"Rename",archive:"Archive",central:"Central",actions:"Linked actions",prepare:"Prepare a collection",noActions:"No actions on this page.",previous:"Previous",next:"Next",eligibleAction:"Eligible action",link:"Link",campaigns:"Campaigns",activate:"Activate",complete:"Complete",archiveCampaign:"Archive",editCampaign:"Edit",saveCampaign:"Save campaign",cancel:"Cancel",campaignName:"Name",target:"Optional target",periodHint:"Uses the report dates below.",createDraft:"Create draft",all:"All",addCampaignAction:"Add to campaign",report:"Private report",completedOnly:"Eligible completed actions only. Participation totals do not count unique people.",siteReport:"Report location",allSites:"All locations",from:"From",to:"To",calculate:"Calculate",export:"Export CSV",reportUnavailable:"Report unavailable or scope invalid.",unknown:"Not reported",duration:"Action duration (min)",weight:"Reported mass (kg)",participations:"Participations",butts:"Cigarette butts",actionsCount:"Actions",expire:"expires"
  }:{
    organizations:"Mes organisations",rights:"Les droits reposent sur une adhésion vérifiée, indépendamment du rôle actif.",loading:"Chargement…",empty:"Aucune adhésion active ou invitation.",onboarding:"Présenter votre structure",invitation:"invitation",accept:"Accepter",decline:"Refuser",organization:"Organisation",select:"Sélectionner",refresh:"Actualiser",unavailable:"Impossible de charger les organisations.",scopeUnavailable:"Périmètre indisponible.",changed:"Modification refusée ou état modifié. Actualisez avant de réessayer.",team:"Mon équipe",noMembers:"Aucun membre actif.",partial:"Liste partielle.",inviteEmail:"Courriel du collaborateur",role:"Rôle",site:"Site",choose:"Choisir",invite:"Inviter",revoke:"Révoquer",leave:"Quitter l’organisation",transfer:"Transférer la responsabilité à",activeManager:"Gestionnaire actif",newSite:"Nouvel établissement",add:"Ajouter",rename:"Renommer",archive:"Archiver",central:"Central",actions:"Actions rattachées",prepare:"Préparer une collecte",noActions:"Aucune action sur cette page.",previous:"Précédent",next:"Suivant",eligibleAction:"Action admissible",link:"Rattacher",campaigns:"Campagnes",activate:"Activer",complete:"Terminer",archiveCampaign:"Archiver",editCampaign:"Modifier",saveCampaign:"Enregistrer la campagne",cancel:"Annuler",campaignName:"Nom",target:"Objectif facultatif",periodHint:"Utilise les dates sélectionnées dans le bilan ci-dessous.",createDraft:"Créer un brouillon",all:"Toutes",addCampaignAction:"Ajouter à la campagne",report:"Bilan privé",completedOnly:"Actions terminées admissibles uniquement. Les participations ne sont pas des personnes uniques.",siteReport:"Établissement du bilan",allSites:"Tous les établissements",from:"Du",to:"Au",calculate:"Calculer",export:"Exporter CSV",reportUnavailable:"Bilan indisponible ou périmètre invalide.",unknown:"Non renseigné",duration:"Durée des actions (min)",weight:"Masse déclarée (kg)",participations:"Participations",butts:"Mégots",actionsCount:"Actions",expire:"expire le"
  };
  const [memberships,setMemberships]=useState<OrganizationMembership[]>([]);
  const [selected,setSelected]=useState("");
  const [workspace,setWorkspace]=useState<OrganizationWorkspace|null>(null);
  const [workspaceScope,setWorkspaceScope]=useState("");
  const [offset,setOffset]=useState(0);
  const [refresh,setRefresh]=useState(0);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [siteName,setSiteName]=useState("");
  const [siteEditId,setSiteEditId]=useState("");
  const [siteId,setSiteId]=useState("");
  const [campaignTitle,setCampaignTitle]=useState("");
  const [editingCampaign,setEditingCampaign]=useState("");
  const [editCampaignStart,setEditCampaignStart]=useState("");
  const [editCampaignEnd,setEditCampaignEnd]=useState("");
  const [editCampaignTarget,setEditCampaignTarget]=useState("");
  const [from,setFrom]=useState("");
  const [to,setTo]=useState("");
  const [target,setTarget]=useState("");
  const [campaignId,setCampaignId]=useState("");
  const [actionId,setActionId]=useState("");
  const [metrics,setMetrics]=useState<Record<string,unknown>|null>(null);
  const reportScopeRef=useRef("");
  const [activeTab,setActiveTab]=useState<"team"|"collections"|"sites"|"campaigns"|"reports">("team");

  useEffect(()=>{
    const controller=new AbortController();
    Promise.resolve().then(()=>{
      if(!controller.signal.aborted)setLoading(true);
      return json("/api/organizations",{signal:controller.signal});
    }).then(data=>{
      if(controller.signal.aborted)return;
      const rows=organizationMembershipListSchema.parse(data.memberships);
      setMemberships(rows);
      setSelected(prev=>rows.some(row=>row.organization_id===prev&&row.state==="active")?prev:rows.find(row=>row.state==="active")?.organization_id??"");
      setError("");
    }).catch(()=>{if(!controller.signal.aborted){setMemberships([]);setSelected("");setError(ui.unavailable);}})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[refresh,ui.unavailable]);
  useEffect(()=>{
    const controller=new AbortController();
    const scope=`${selected}|${offset}|${refresh}`;
    if(!selected)return;
    json("/api/organizations?organizationId="+encodeURIComponent(selected)+"&offset="+offset,{signal:controller.signal}).then(data=>{
      if(!controller.signal.aborted){setWorkspace(organizationWorkspaceSchema.parse(data.workspace));setWorkspaceScope(scope);}
    }).catch(()=>{if(!controller.signal.aborted){setWorkspace(null);setWorkspaceScope("");setError(ui.scopeUnavailable);}});
    return()=>controller.abort();
  },[selected,offset,refresh,ui.scopeUnavailable]);
  async function mutate(organizationId:string,command:Record<string,unknown>){
    reportScopeRef.current="";
    setBusy(true);setError("");setMetrics(null);setWorkspace(null);
    try{await post({organizationId,...command});setRefresh(value=>value+1);}
    catch{setError(ui.changed);}
    finally{setBusy(false);}
  }
  async function report(format:"summary"|"csv"){
    if(!workspace||workspace.id!==selected)return;
    const reportScope=[selected,siteId,campaignId,from,to,refresh].join("|");
    reportScopeRef.current=reportScope;
    setBusy(true);setError("");setMetrics(null);
    try{
      const res=await fetch("/api/reports/organization",{method:"POST",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify({scope:{organizationId:selected,siteId:siteId||null,campaignId:campaignId||null,from,to},format})});
      if(!res.ok)throw new Error();
      if(reportScopeRef.current!==reportScope)return;
      if(format==="summary")setMetrics(await res.json());
      else {const blob=await res.blob();if(reportScopeRef.current!==reportScope)return;const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="cleanmymap-bilan-entreprise.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    }catch{if(reportScopeRef.current===reportScope)setError(ui.reportUnavailable);}
    finally{setBusy(false);}
  }
  return <div className="space-y-4">
    <CmmCard className="space-y-3"><h2 className="font-bold">{ui.organizations}</h2>
      <p>{ui.rights}</p>
      {loading?<p role="status">{ui.loading}</p>:memberships.length===0?<p>{ui.empty} <a href="/partners/onboarding">{ui.onboarding}</a>.</p>:null}
      {memberships.filter(m=>m.state==="pending").map(m=><div key={m.membership_id}><p>{m.organization_name} : {ui.invitation} ({roleLabels[m.member_role]})</p><button disabled={busy} onClick={()=>void mutate(m.organization_id,{operation:"accept",membershipId:m.membership_id})}>{ui.accept}</button>{" · "}<button disabled={busy} onClick={()=>void mutate(m.organization_id,{operation:"decline",membershipId:m.membership_id})}>{ui.decline}</button></div>)}
      <label>{ui.organization} <select disabled={busy} value={selected} onChange={e=>{reportScopeRef.current="";setWorkspace(null);setMetrics(null);setSiteId("");setSiteEditId("");setSiteName("");setCampaignTitle("");setEditingCampaign("");setCampaignId("");setTarget("");setFrom("");setTo("");setActionId("");setOffset(0);setActiveTab("team");setSelected(e.target.value);}}><option value="">{ui.select}</option>{memberships.filter(m=>m.state==="active").map(m=><option key={m.organization_id} value={m.organization_id}>{m.organization_name}</option>)}</select></label>
      <button disabled={busy} onClick={()=>{reportScopeRef.current="";setWorkspace(null);setRefresh(v=>v+1);}}>{ui.refresh}</button>
      {error?<p role="alert">{error}</p>:null}
    </CmmCard>
    {workspace&&workspace.id===selected&&workspaceScope===`${selected}|${offset}|${refresh}`?<><CmmCard className="space-y-3"><h2 className="font-bold">{workspace.name}</h2><p>{roleLabels[workspace.role]}</p></CmmCard>
      <div role="tablist" aria-label={isEn?"Organization workspace":"Espace organisation"} className="flex flex-wrap gap-2">
        {([ ["team",isEn?"Team":"Équipe"], ["collections",isEn?"Collections":"Collectes"], ["sites",isEn?"Locations":"Établissements"], ["campaigns",isEn?"Campaigns":"Campagnes"], ["reports",isEn?"Impact reports":"Bilans RSE"] ] as const).map(([id,label])=><button key={id} type="button" role="tab" id={`enterprise-tab-${id}`} aria-controls={`enterprise-panel-${id}`} aria-selected={activeTab===id} tabIndex={activeTab===id?0:-1} onClick={()=>setActiveTab(id)} onKeyDown={event=>{if(event.key!=="ArrowRight"&&event.key!=="ArrowLeft")return;event.preventDefault();const next=["team","collections","sites","campaigns","reports"] as const;const index=next.indexOf(id);const target=next[(index+(event.key==="ArrowRight"?1:next.length-1))%next.length];setActiveTab(target);event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`#enterprise-tab-${target}`)?.focus();}}>{label}</button>)}
      </div>
      <section role="tabpanel" id="enterprise-panel-team" aria-labelledby="enterprise-tab-team" hidden={activeTab!=="team"}>
        <OrganizationTeamPanel workspace={workspace} locale={locale} busy={busy} onMutate={(organizationId,command)=>void mutate(organizationId,command)} />
      </section>
      <section role="tabpanel" id="enterprise-panel-sites" aria-labelledby="enterprise-tab-sites" hidden={activeTab!=="sites"}>
      {workspace.role==="owner"||workspace.role==="manager"?<form onSubmit={e=>{e.preventDefault();void mutate(selected,{operation:"site",siteId:null,name:siteName,archive:false});}}><label>{ui.newSite} <input value={siteName} required maxLength={120} onChange={e=>setSiteName(e.target.value)}/></label><button disabled={busy}>{ui.add}</button></form>:null}
      <ul>{workspace.sites.map(s=><li key={s.id}>{s.name}{s.archived_at?" (archivé)":""}</li>)}</ul>
      {workspace.role==="owner"||workspace.role==="manager"?<div className="flex flex-wrap items-end gap-2"><label>{ui.site} <select value={siteEditId} onChange={e=>setSiteEditId(e.target.value)}><option value="">{ui.choose}</option>{workspace.sites.filter(s=>!s.archived_at).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>{ui.rename} <input value={siteName} maxLength={120} onChange={e=>setSiteName(e.target.value)}/></label><button disabled={busy||!siteEditId||!siteName.trim()} onClick={()=>void mutate(selected,{operation:"site",siteId:siteEditId,name:siteName,archive:false})}>{ui.rename}</button><button disabled={busy||!siteEditId} onClick={()=>void mutate(selected,{operation:"site",siteId:siteEditId,name:workspace.sites.find(site=>site.id===siteEditId)?.name??ui.newSite,archive:true})}>{ui.archive}</button></div>:null}
      </section>
      <section role="tabpanel" id="enterprise-panel-collections" aria-labelledby="enterprise-tab-collections" hidden={activeTab!=="collections"}>
    <OrganizationCollectionsPanel workspace={workspace} locale={locale} busy={busy} offset={offset} onPage={(direction)=>{setWorkspace(null);setOffset(value=>direction==="previous"?Math.max(0,value-100):value+100);}} />
    {workspace.role!=="member"?<CmmCard className="space-y-3">
      <form onSubmit={e=>{e.preventDefault();void mutate(selected,{operation:"link_action",actionId,siteId:workspace.role==="site_manager"?workspace.site_id:siteId||null});}}>
      <label>{ui.eligibleAction} <select required value={actionId} onChange={e=>setActionId(e.target.value)}><option value="">{ui.choose}</option>{workspace.link_candidates.map(a=><option key={a.id} value={a.id}>{a.title} ({a.action_date})</option>)}</select></label>
      {workspace.role!=="site_manager"?<label>{ui.site} <select value={siteId} onChange={e=>{reportScopeRef.current="";setMetrics(null);setSiteId(e.target.value);}}><option value="">{ui.central}</option>{workspace.sites.filter(s=>!s.archived_at).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>:null}
      <button disabled={busy||!actionId}>{ui.link}</button></form>{workspace.candidates_has_more?<p>{ui.partial}</p>:null}
    </CmmCard>:null}
      </section>
      <section role="tabpanel" id="enterprise-panel-campaigns" aria-labelledby="enterprise-tab-campaigns" hidden={activeTab!=="campaigns"}>
    {workspace.role!=="site_manager"?<CmmCard className="space-y-3"><h2 className="font-bold">{ui.campaigns}</h2>
      <ul>{workspace.campaigns.map(c=><li key={c.id}>{c.title} · {c.starts_on} / {c.ends_on} · {c.completed_actions} {ui.actionsCount}{c.target_actions!==null?" / "+c.target_actions+" "+ui.target:""} · {c.state}{workspace.role!=="member"&&c.state==="draft"?<><button disabled={busy} onClick={()=>{setEditingCampaign(c.id);setCampaignTitle(c.title);setEditCampaignStart(c.starts_on);setEditCampaignEnd(c.ends_on);setEditCampaignTarget(c.target_actions===null?"":String(c.target_actions));}}>{ui.editCampaign}</button><button disabled={busy} onClick={()=>void mutate(selected,{operation:"campaign",campaignId:c.id,title:c.title,startsOn:c.starts_on,endsOn:c.ends_on,targetActions:c.target_actions,state:"active"})}>{ui.activate}</button></>:workspace.role!=="member"&&c.state==="active"?<button disabled={busy} onClick={()=>void mutate(selected,{operation:"campaign",campaignId:c.id,title:c.title,startsOn:c.starts_on,endsOn:c.ends_on,targetActions:c.target_actions,state:"completed"})}>{ui.complete}</button>:workspace.role!=="member"&&c.state==="completed"?<button disabled={busy} onClick={()=>void mutate(selected,{operation:"campaign",campaignId:c.id,title:c.title,startsOn:c.starts_on,endsOn:c.ends_on,targetActions:c.target_actions,state:"archived"})}>{ui.archiveCampaign}</button>:null}</li>)}</ul>
      {editingCampaign? <form onSubmit={e=>{e.preventDefault();const campaign=workspace.campaigns.find(c=>c.id===editingCampaign);if(!campaign)return;void mutate(selected,{operation:"campaign",campaignId:campaign.id,title:campaignTitle,startsOn:editCampaignStart,endsOn:editCampaignEnd,targetActions:editCampaignTarget?Number(editCampaignTarget):null,state:"draft"});setEditingCampaign("");}}><label>{ui.campaignName} <input value={campaignTitle} required maxLength={120} onChange={e=>setCampaignTitle(e.target.value)}/></label><label>{ui.from} <input type="date" required value={editCampaignStart} onChange={e=>setEditCampaignStart(e.target.value)}/></label><label>{ui.to} <input type="date" required value={editCampaignEnd} onChange={e=>setEditCampaignEnd(e.target.value)}/></label><label>{ui.target} <input type="number" min="1" max="10000" value={editCampaignTarget} onChange={e=>setEditCampaignTarget(e.target.value)}/></label><button disabled={busy||!editCampaignStart||!editCampaignEnd||editCampaignStart>editCampaignEnd}>{ui.saveCampaign}</button><button type="button" disabled={busy} onClick={()=>setEditingCampaign("")}>{ui.cancel}</button></form>:null}
      {workspace.role!=="member"?<form onSubmit={e=>{e.preventDefault();void mutate(selected,{operation:"campaign",campaignId:null,title:campaignTitle,startsOn:from,endsOn:to,targetActions:target?Number(target):null,state:"draft"});}}><label>{ui.campaignName} <input value={campaignTitle} required maxLength={120} onChange={e=>setCampaignTitle(e.target.value)}/></label><label>{ui.target} <input type="number" min="1" max="10000" value={target} onChange={e=>setTarget(e.target.value)}/></label><p>{ui.periodHint}</p><button disabled={busy||!from||!to}>{ui.createDraft}</button></form>:null}
      <label>{ui.campaigns} <select value={campaignId} onChange={e=>{reportScopeRef.current="";setMetrics(null);setCampaignId(e.target.value);}}><option value="">{ui.all}</option>{workspace.campaigns.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
      {workspace.role!=="member"?<form className="flex flex-wrap items-end gap-2" onSubmit={e=>{e.preventDefault();void mutate(selected,{operation:"campaign_action",campaignId,actionId,remove:false});}}><label>{ui.eligibleAction} <select required value={actionId} onChange={e=>setActionId(e.target.value)}><option value="">{ui.choose}</option>{workspace.actions.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select></label><button disabled={busy||!campaignId||!actionId}>{ui.addCampaignAction}</button></form>:null}
      {workspace.campaigns.length===101?<p>{ui.partial}</p>:null}
    </CmmCard>:null}
      </section>
      <section role="tabpanel" id="enterprise-panel-reports" aria-labelledby="enterprise-tab-reports" hidden={activeTab!=="reports"}>
    <CmmCard className="space-y-3"><h2 className="font-bold">{ui.report}</h2><p>{ui.completedOnly}</p>
      {workspace.role!=="site_manager"?<label>{ui.siteReport} <select value={siteId} onChange={e=>{reportScopeRef.current="";setMetrics(null);setSiteId(e.target.value);}}><option value="">{ui.allSites}</option>{workspace.sites.filter(s=>!s.archived_at).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>:null}
      <label>{ui.from} <input type="date" value={from} onChange={e=>{reportScopeRef.current="";setMetrics(null);setFrom(e.target.value);}}/></label><label>{ui.to} <input type="date" value={to} onChange={e=>{reportScopeRef.current="";setMetrics(null);setTo(e.target.value);}}/></label>
      <button disabled={busy||!from||!to} onClick={()=>void report("summary")}>{ui.calculate}</button>{" · "}<button disabled={busy||!from||!to||workspace.role==="member"} onClick={()=>void report("csv")}>{ui.export}</button>{workspace.role==="member"?<p>{isEn?"Detailed exports are reserved for organization managers.":"Les exports détaillés sont réservés aux responsables d’organisation."}</p>:null}
      {metrics?<dl>{Object.entries(metrics).map(([key,val])=><div key={key}><dt>{({actions:ui.actionsCount,massKg:ui.weight,butts:ui.butts,participations:ui.participations,durationMinutes:ui.duration} as Record<string,string>)[key]??key}</dt><dd>{typeof val==="number"?val:val&&typeof val==="object"&&"value" in val&&"known" in val&&"total" in val?String(val.value??ui.unknown)+" ("+String(val.known)+"/"+String(val.total)+")":ui.unknown}</dd></div>)}</dl>:null}
    </CmmCard>
      </section></>:null}
  </div>;
}
