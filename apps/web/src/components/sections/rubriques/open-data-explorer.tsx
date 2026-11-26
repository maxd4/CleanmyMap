"use client";
import { useEffect,useRef,useState } from "react";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmField } from "@/components/ui/cmm-field";
import { CmmButton } from "@/components/ui/cmm-button";
import { DEFAULT_RESEARCH_QUERY,projectResearchSample,researchQueryUrl,type ResearchQuery,type ResearchSample } from "./open-data-research.model";

export function OpenDataExplorer({fr}:{fr:boolean}){
  const [query,setQuery]=useState(DEFAULT_RESEARCH_QUERY);
  const [result,setResult]=useState<{sample:ResearchSample;url:string;retrievedAt:string;type:ResearchQuery["type"]}|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState(false);
  const [copyStatus,setCopyStatus]=useState<"idle"|"ok"|"error">("idle");
  const request=useRef<AbortController|null>(null);
  useEffect(()=>()=>request.current?.abort(),[]);
  const url=researchQueryUrl(query);
  function change<K extends keyof ResearchQuery>(key:K,value:ResearchQuery[K]){
    setQuery(current=>({...current,[key]:value}));setCopyStatus("idle");
  }
  async function load(){
    request.current?.abort();
    const controller=new AbortController();request.current=controller;
    setBusy(true);setError(false);setResult(null);
    const retrievedAt=new Date().toISOString();
    try{
      const response=await fetch(url,{signal:controller.signal,cache:"no-store"});
      if(!response.ok)throw new Error("Public API unavailable");
      const sample=projectResearchSample(await response.json(),query,retrievedAt.slice(0,10));
      if(!controller.signal.aborted)setResult({sample,url,retrievedAt,type:query.type});
    }catch{
      if(!controller.signal.aborted)setError(true);
    }finally{
      if(!controller.signal.aborted)setBusy(false);
    }
  }
  async function copy(){
    try{await navigator.clipboard.writeText(new URL(url,window.location.origin).href);setCopyStatus("ok");}
    catch{setCopyStatus("error");}
  }
  return <section id="api" className="space-y-4" aria-labelledby="research-explorer-title">
    <CmmCard tone="family" variant="default" className="space-y-4">
      <h2 id="research-explorer-title" className="text-xl font-bold cmm-text-primary">{fr?"Explorer les données":"Explore data"}</h2>
      <p className="text-sm cmm-text-primary">{fr?"Requête à la demande sur l’API publique existante. L’aperçu des collectes retient uniquement les bilans terminés dont la date n’est pas future.":"On-demand query of the existing public API. The collection preview retains completed reports with non-future dates only."}</p>
      <form className="space-y-4" onSubmit={e=>{e.preventDefault();void load();}}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CmmField label={fr?"Jeu consulté":"Dataset"}><select className="cmm-input w-full" value={query.type} onChange={e=>change("type",e.target.value as ResearchQuery["type"])}><option value="action">{fr?"Collectes":"Cleanups"}</option><option value="spot">{fr?"Signalements":"Litter reports"}</option><option value="clean_place">{fr?"Lieux propres":"Clean places"}</option></select></CmmField>
          <CmmField label={fr?"À partir du":"From date"} hint={fr?"Vide : toute période":"Blank: all dates"}><input type="date" className="cmm-input w-full" value={query.from} onChange={e=>change("from",e.target.value)}/></CmmField>
          <CmmField label={fr?"Contexte":"Context"}><select className="cmm-input w-full" value={query.context} disabled={query.type!=="action"} onChange={e=>change("context",e.target.value as ResearchQuery["context"])}><option value="all">{fr?"Tous":"All"}</option><option value="citizen">{fr?"Citoyen":"Citizen"}</option><option value="company">{fr?"Entreprise":"Company"}</option><option value="school">{fr?"Scolaire":"School"}</option><option value="unknown">{fr?"Non classé":"Unknown"}</option></select></CmmField>
          <CmmField label={fr?"Taille maximale":"Maximum size"}><select className="cmm-input w-full" value={query.limit} onChange={e=>change("limit",Number(e.target.value))}>{[20,80,150,300].map(n=><option key={n} value={n}>{n}</option>)}</select></CmmField>
        </div>
        <p className="break-all rounded-lg border border-[var(--cmm-surface-border)] p-3 font-mono text-xs cmm-text-primary">{url}</p>
        <div className="flex flex-wrap gap-2">
          <CmmButton type="submit" tone="primary" loading={busy}>{fr?"Afficher un aperçu":"Preview data"}</CmmButton>
          <CmmButton href={url} prefetch={false} tone="secondary">{fr?"Ouvrir le JSON brut":"Open raw JSON"}</CmmButton>
          <CmmButton type="button" tone="tertiary" onClick={()=>void copy()}>{fr?"Copier l’URL":"Copy URL"}</CmmButton>
        </div>
        {copyStatus!=="idle"?<p role="status" className="text-sm cmm-text-primary">{copyStatus==="ok"?(fr?"URL copiée":"URL copied"):(fr?"Copie impossible ; sélectionnez l’URL affichée.":"Copy failed; select the displayed URL.")}</p>:null}
      </form>
    </CmmCard>
    {error?<CmmCard tone="family" variant="default" className="space-y-3"><p role="alert" className="text-sm cmm-text-primary">{fr?"Impossible de lire la réponse publique. Aucun résultat n’est déduit de cet échec.":"Unable to read the public response. No result is inferred from this failure."}</p><CmmButton type="button" tone="secondary" onClick={()=>void load()}>{fr?"Réessayer":"Retry"}</CmmButton></CmmCard>:null}
    {result?<ResearchResults fr={fr} result={result}/>:null}
  </section>;
}
function ResearchResults({fr,result}:{fr:boolean;result:{sample:ResearchSample;url:string;retrievedAt:string;type:ResearchQuery["type"]}}){
  const {sample}=result;
  const show=(value:string|number|null)=>value??(fr?"Non renseigné":"Not provided");
  const actions=result.type==="action";
  return <CmmCard tone="family" variant="default" className="space-y-3">
    <h3 className="font-bold cmm-text-primary">{fr?"Résultat de la requête":"Query result"}</h3>
    <p role="status" className="text-sm cmm-text-primary">{sample.rows.length} {fr?"retenus sur":"retained out of"} {sample.received} {fr?"reçus":"received"} · {sample.excluded} {fr?"écartés":"excluded"}</p>
    <p className="break-all text-sm cmm-text-primary">{result.retrievedAt} · {result.url}</p>
    {sample.isTruncated!==false||sample.partialSource!==false?<p role="status" className="rounded-lg border border-[var(--cmm-surface-border)] p-3 text-sm cmm-text-warning">{fr?"Lecture tronquée, partielle ou état non établi. Ne pas extrapoler cet échantillon.":"Truncated, partial or unconfirmed read. Do not extrapolate this sample."}</p>:null}
    <p className="text-sm cmm-text-primary">{fr?"Même sans avertissement, ce résultat borné n’est pas un recensement exhaustif du territoire. Les coordonnées exactes et les textes libres ne sont pas reproduits dans cet aperçu.":"Even without a warning, this bounded result is not a complete territorial census. Exact coordinates and free text are not reproduced in this preview."}</p>
    {sample.rows.length===0?<p className="text-sm cmm-text-primary">{fr?"Aucune ligne admissible dans la réponse reçue. Modifiez la requête pour explorer un autre échantillon.":"No eligible rows in the response. Change the query to explore another sample."}</p>:<div className="overflow-x-auto"><table className="w-full text-left text-xs cmm-text-primary">
      <caption className="sr-only">{fr?"Échantillon de données publiques":"Public data sample"}</caption>
      <thead><tr className="border-b border-[var(--cmm-surface-border)]">{(actions?[fr?"Date":"Date",fr?"Département":"Department",fr?"Déchets (kg)":"Waste (kg)",fr?"Mégots (nombre)":"Butts (count)",fr?"Méthode masse":"Mass method",fr?"Origine mégots":"Butt count provenance",fr?"Qualité":"Quality"]:[fr?"Date":"Date",fr?"Département":"Department",fr?"Provenance géométrique":"Geometry provenance",fr?"Qualité":"Quality"]).map(label=><th key={label} scope="col" className="p-2">{label}</th>)}</tr></thead>
      <tbody>{sample.rows.map((row,index)=><tr key={index} className="border-b border-[var(--cmm-surface-border)]">{(actions?[row.date,row.department,row.wasteKg,row.butts,row.massMethod,row.buttsProvenance,row.qualityStatus]:[row.date,row.department,row.geometryProvenance,row.qualityStatus]).map((v,i)=><td key={i} className="p-2">{show(v)}</td>)}</tr>)}</tbody>
    </table></div>}
  </CmmCard>;
}
