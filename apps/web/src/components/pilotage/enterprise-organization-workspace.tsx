"use client";
import { useEffect, useState } from "react";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { organizationMembershipListSchema, organizationWorkspaceSchema, type OrganizationMembership, type OrganizationWorkspace } from "@/lib/organizations/contracts";

async function json(url: string, init?: RequestInit) {
  const res = await fetch(url,{...init,cache:"no-store"});
  if (!res.ok) throw new Error("Données indisponibles ou accès modifié.");
  return res.json();
}
function post(command: Record<string,unknown>) {
  return json("/api/organizations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...command,requestId:crypto.randomUUID()})});
}
const roleLabels={owner:"Responsable",manager:"Gestionnaire",site_manager:"Gestionnaire de site",member:"Membre"};
export function EnterpriseOrganizationWorkspace() {
  const [memberships,setMemberships]=useState<OrganizationMembership[]>([]);
  const [selected,setSelected]=useState("");
  const [workspace,setWorkspace]=useState<OrganizationWorkspace|null>(null);
  const [offset,setOffset]=useState(0);
  const [refresh,setRefresh]=useState(0);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [siteName,setSiteName]=useState("");
  const [siteEditId,setSiteEditId]=useState("");
  const [inviteTarget,setInviteTarget]=useState("");
  const [inviteRole,setInviteRole]=useState("member");
  const [inviteSite,setInviteSite]=useState("");
  const [siteId,setSiteId]=useState("");
  const [campaignTitle,setCampaignTitle]=useState("");
  const [from,setFrom]=useState("");
  const [to,setTo]=useState("");
  const [target,setTarget]=useState("");
  const [campaignId,setCampaignId]=useState("");
  const [actionId,setActionId]=useState("");
  const [metrics,setMetrics]=useState<Record<string,unknown>|null>(null);
  const [successorId,setSuccessorId]=useState("");

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
    }).catch(()=>{if(!controller.signal.aborted){setMemberships([]);setSelected("");setError("Impossible de charger les organisations.");}})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[refresh]);
  useEffect(()=>{
    const controller=new AbortController();
    if(!selected)return;
    json("/api/organizations?organizationId="+encodeURIComponent(selected)+"&offset="+offset,{signal:controller.signal}).then(data=>{
      if(!controller.signal.aborted)setWorkspace(organizationWorkspaceSchema.parse(data.workspace));
    }).catch(()=>{if(!controller.signal.aborted)setError("Périmètre indisponible.");});
    return()=>controller.abort();
  },[selected,offset,refresh]);
  async function mutate(organizationId:string,command:Record<string,unknown>){
    setBusy(true);setError("");setMetrics(null);setWorkspace(null);
    try{await post({organizationId,...command});setRefresh(value=>value+1);}
    catch{setError("Modification refusée ou état modifié. Actualisez avant de réessayer.");}
    finally{setBusy(false);}
  }
  async function report(format:"summary"|"csv"){
    if(!workspace||workspace.id!==selected)return;
    setBusy(true);setError("");setMetrics(null);
    try{
      const res=await fetch("/api/reports/organization",{method:"POST",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify({scope:{organizationId:selected,siteId:siteId||null,campaignId:campaignId||null,from,to},format})});
      if(!res.ok)throw new Error();
      if(format==="summary")setMetrics(await res.json());
      else {const url=URL.createObjectURL(await res.blob());const a=document.createElement("a");a.href=url;a.download="cleanmymap-bilan-entreprise.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    }catch{setError("Bilan indisponible ou périmètre invalide.");}
    finally{setBusy(false);}
  }
  return <div className="space-y-4">
    <CmmCard className="space-y-3"><h2 className="font-bold">Mes organisations</h2>
      <p>Les droits reposent sur une adhésion vérifiée, indépendamment du rôle actif.</p>
      {loading?<p role="status">Chargement…</p>:memberships.length===0?<p>Aucune adhésion active ou invitation. <a href="/partners/onboarding">Présenter votre structure</a>.</p>:null}
      {memberships.filter(m=>m.state==="pending").map(m=><div key={m.membership_id}><p>{m.organization_name} : invitation ({roleLabels[m.member_role]})</p><button disabled={busy} onClick={()=>void mutate(m.organization_id,{operation:"accept",membershipId:m.membership_id})}>Accepter</button>{" · "}<button disabled={busy} onClick={()=>void mutate(m.organization_id,{operation:"decline",membershipId:m.membership_id})}>Refuser</button></div>)}
      <label>Organisation <select disabled={busy} value={selected} onChange={e=>{setWorkspace(null);setMetrics(null);setSiteId("");setCampaignId("");setActionId("");setOffset(0);setSelected(e.target.value);}}><option value="">Sélectionner</option>{memberships.filter(m=>m.state==="active").map(m=><option key={m.organization_id} value={m.organization_id}>{m.organization_name}</option>)}</select></label>
      <button disabled={busy} onClick={()=>{setWorkspace(null);setRefresh(v=>v+1);}}>Actualiser</button>
      {error?<p role="alert">{error}</p>:null}
    </CmmCard>
    {workspace&&workspace.id===selected?<><CmmCard className="space-y-3"><h2 className="font-bold">{workspace.name}</h2><p>{roleLabels[workspace.role]}</p>
      {workspace.role==="owner"?<><h3>Membres et invitations</h3>{workspace.members.map(m=><div key={m.id}>{m.label} · {roleLabels[m.member_role]} · {m.state} {!m.is_self&&m.state!=="revoked"?<button disabled={busy} onClick={()=>void mutate(selected,{operation:"revoke",membershipId:m.id})}>Révoquer</button>:null}</div>)}{workspace.members.length===101?<p>Liste partielle.</p>:null}<form onSubmit={e=>{e.preventDefault();void mutate(selected,{operation:"invite",targetId:inviteTarget,role:inviteRole,siteId:inviteRole==="site_manager"?inviteSite||null:null});}}><label>Identifiant du compte invité <input required value={inviteTarget} onChange={e=>setInviteTarget(e.target.value)} maxLength={255}/></label><label>Rôle <select value={inviteRole} onChange={e=>setInviteRole(e.target.value)}><option value="member">Membre</option><option value="manager">Gestionnaire</option><option value="site_manager">Gestionnaire de site</option></select></label>{inviteRole==="site_manager"?<label>Site <select required value={inviteSite} onChange={e=>setInviteSite(e.target.value)}><option value="">Choisir</option>{workspace.sites.filter(s=>!s.archived_at).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>:null}<button disabled={busy}>Inviter</button></form></>:null}
      {workspace.role==="owner"?<form className="flex flex-wrap items-end gap-2" onSubmit={e=>{e.preventDefault();void mutate(selected,{operation:"transfer_owner",membershipId:successorId});}}><label>Transférer la responsabilité à <select required value={successorId} onChange={e=>setSuccessorId(e.target.value)}><option value="">Gestionnaire actif</option>{workspace.members.filter(m=>m.state==="active"&&m.member_role==="manager").map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></label><button disabled={busy||!successorId}>Transférer</button></form>:null}
      {workspace.role==="owner"||workspace.role==="manager"?<form onSubmit={e=>{e.preventDefault();void mutate(selected,{operation:"site",siteId:null,name:siteName,archive:false});}}><label>Nouvel établissement <input value={siteName} required maxLength={120} onChange={e=>setSiteName(e.target.value)}/></label><button disabled={busy}>Ajouter</button></form>:null}
      <ul>{workspace.sites.map(s=><li key={s.id}>{s.name}{s.archived_at?" (archivé)":""}</li>)}</ul>
      {workspace.role==="owner"||workspace.role==="manager"?<div className="flex flex-wrap items-end gap-2"><label>Établissement <select value={siteEditId} onChange={e=>setSiteEditId(e.target.value)}><option value="">Choisir pour modifier</option>{workspace.sites.filter(s=>!s.archived_at).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Nouveau nom <input value={siteName} maxLength={120} onChange={e=>setSiteName(e.target.value)}/></label><button disabled={busy||!siteEditId||!siteName.trim()} onClick={()=>void mutate(selected,{operation:"site",siteId:siteEditId,name:siteName,archive:false})}>Renommer</button><button disabled={busy||!siteEditId} onClick={()=>void mutate(selected,{operation:"site",siteId:siteEditId,name:workspace.sites.find(site=>site.id===siteEditId)?.name??"Établissement",archive:true})}>Archiver</button></div>:null}
    </CmmCard>
    {workspace.role!=="member"?<><CmmCard className="space-y-3"><h2 className="font-bold">Actions rattachées</h2><CmmButton href="/actions/new?tab=before">Préparer une collecte</CmmButton>
      <ul>{workspace.actions.map(a=><li key={a.id}>{a.action_date} · {a.title} · {a.status}{a.can_manage?<> · <a href="/actions/history">Historique</a></>:null}</li>)}</ul>
      {!workspace.actions.length?<p>Aucune action sur cette page.</p>:null}
      <button disabled={busy||offset===0} onClick={()=>{setWorkspace(null);setOffset(v=>Math.max(0,v-100));}}>Précédent</button>{" · "}<button disabled={busy||!workspace.actions_has_more} onClick={()=>{setWorkspace(null);setOffset(v=>v+100);}}>Suivant</button>
      <form onSubmit={e=>{e.preventDefault();void mutate(selected,{operation:"link_action",actionId,siteId:workspace.role==="site_manager"?workspace.site_id:siteId||null});}}>
      <label>Action admissible <select required value={actionId} onChange={e=>setActionId(e.target.value)}><option value="">Choisir</option>{workspace.link_candidates.map(a=><option key={a.id} value={a.id}>{a.title} ({a.action_date})</option>)}</select></label>
      {workspace.role!=="site_manager"?<label>Établissement <select value={siteId} onChange={e=>{setMetrics(null);setSiteId(e.target.value);}}><option value="">Central</option>{workspace.sites.filter(s=>!s.archived_at).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>:null}
      <button disabled={busy||!actionId}>Rattacher</button></form>{workspace.candidates_has_more?<p>Liste partielle des actions admissibles.</p>:null}
    </CmmCard>
    {workspace.role!=="site_manager"?<CmmCard className="space-y-3"><h2 className="font-bold">Campagnes</h2>
      <ul>{workspace.campaigns.map(c=><li key={c.id}>{c.title} · {c.starts_on} / {c.ends_on} · {c.completed_actions} action(s) terminée(s){c.target_actions!==null?" / "+c.target_actions+" objectif":""} · {c.state}{c.state==="draft"?<button disabled={busy} onClick={()=>void mutate(selected,{operation:"campaign",campaignId:c.id,title:c.title,startsOn:c.starts_on,endsOn:c.ends_on,targetActions:c.target_actions,state:"active"})}>Activer</button>:c.state==="active"?<button disabled={busy} onClick={()=>void mutate(selected,{operation:"campaign",campaignId:c.id,title:c.title,startsOn:c.starts_on,endsOn:c.ends_on,targetActions:c.target_actions,state:"completed"})}>Terminer</button>:c.state==="completed"?<button disabled={busy} onClick={()=>void mutate(selected,{operation:"campaign",campaignId:c.id,title:c.title,startsOn:c.starts_on,endsOn:c.ends_on,targetActions:c.target_actions,state:"archived"})}>Archiver</button>:null}</li>)}</ul>
      <form onSubmit={e=>{e.preventDefault();void mutate(selected,{operation:"campaign",campaignId:null,title:campaignTitle,startsOn:from,endsOn:to,targetActions:target?Number(target):null,state:"draft"});}}><label>Nom <input value={campaignTitle} required maxLength={120} onChange={e=>setCampaignTitle(e.target.value)}/></label><label>Objectif facultatif <input type="number" min="1" max="10000" value={target} onChange={e=>setTarget(e.target.value)}/></label><p>Utilise les dates sélectionnées dans le bilan ci-dessous.</p><button disabled={busy||!from||!to}>Créer un brouillon</button></form>
      <label>Campagne <select value={campaignId} onChange={e=>{setMetrics(null);setCampaignId(e.target.value);}}><option value="">Toutes</option>{workspace.campaigns.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
      <form className="flex flex-wrap items-end gap-2" onSubmit={e=>{e.preventDefault();void mutate(selected,{operation:"campaign_action",campaignId,actionId,remove:false});}}><label>Action déjà rattachée <select required value={actionId} onChange={e=>setActionId(e.target.value)}><option value="">Choisir</option>{workspace.actions.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select></label><button disabled={busy||!campaignId||!actionId}>Ajouter à la campagne</button></form>
      {workspace.campaigns.length===101?<p>Liste partielle.</p>:null}
    </CmmCard>:null}
    <CmmCard className="space-y-3"><h2 className="font-bold">Bilan privé</h2><p>Actions terminées admissibles uniquement. Les participations ne sont pas des personnes uniques.</p>
      {workspace.role!=="site_manager"?<label>Établissement du bilan <select value={siteId} onChange={e=>{setMetrics(null);setSiteId(e.target.value);}}><option value="">Tous les établissements</option>{workspace.sites.filter(s=>!s.archived_at).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>:null}
      <label>Du <input type="date" value={from} onChange={e=>{setMetrics(null);setFrom(e.target.value);}}/></label><label>Au <input type="date" value={to} onChange={e=>{setMetrics(null);setTo(e.target.value);}}/></label>
      <button disabled={busy||!from||!to} onClick={()=>void report("summary")}>Calculer</button>{" · "}<button disabled={busy||!from||!to} onClick={()=>void report("csv")}>Exporter CSV</button>
      {metrics?<dl>{Object.entries(metrics).map(([key,val])=><div key={key}><dt>{({actions:"Actions",massKg:"Masse déclarée (kg)",butts:"Mégots",participations:"Participations",durationMinutes:"Durée des actions (min)"} as Record<string,string>)[key]??key}</dt><dd>{typeof val==="number"?val:val&&typeof val==="object"&&"value" in val&&"known" in val&&"total" in val?String(val.value??"Non renseigné")+" ("+String(val.known)+"/"+String(val.total)+")":"Indisponible"}</dd></div>)}</dl>:null}
    </CmmCard></>:null}</>:null}
  </div>;
}
