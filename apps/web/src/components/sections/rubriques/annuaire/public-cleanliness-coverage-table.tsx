"use client";

import { useState } from "react";
import { getPublicCleanlinessCoverage } from '@/lib/partners/public-cleanliness-coverage';
import type { PublicCleanlinessCityDataset, PublicCleanlinessOrganizationNode } from '@/lib/partners/public-cleanliness-organization';

export function PublicCleanlinessCoverageTable({ dataset, fr, onSelect }: { dataset: PublicCleanlinessCityDataset; fr: boolean; onSelect: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  if (dataset.city !== 'Paris') return null;
  const rows = getPublicCleanlinessCoverage(dataset);
  const labels = fr ? {
    title: 'Couverture institutionnelle par arrondissement', intro: 'Les lacunes indiquent une information non établie dans le référentiel, pas une absence de service.', unknown: 'Non établi', district: 'Arrondissement', hall: 'Mairie / maire', dpe: 'Division DPE', dpmp: 'Division DPMP', local: 'Structures et délégations locales', req: 'REQ', field: 'Équipes de terrain', contacts: 'Canaux publics', gaps: 'Lacunes', historical: 'historique', unconfirmed: 'non établi', portal: 'Portail officiel (orientation)', gapNames: {townHall:'mairie',dpe:'DPE',dpmp:'DPMP',mayor:'maire',delegate:'délégation',dgs:'titulaire DGS',dgaep:'titulaire DGAEP',req:'titulaire REQ',field:'équipes locales actuelles',contacts:'contact fonctionnel direct',reqContact:'contact REQ'},
  } : {
    title: 'Institutional coverage by district', intro: 'Gaps indicate information not established in this registry, not absence of a service.', unknown: 'Not established', district: 'District', hall: 'Town hall / mayor', dpe: 'DPE division', dpmp: 'DPMP division', local: 'Local structures and mandates', req: 'REQ', field: 'Field teams', contacts: 'Public channels', gaps: 'Gaps', historical: 'historical', unconfirmed: 'not established', portal: 'Official website (guidance)', gapNames: {townHall:'town hall',dpe:'DPE',dpmp:'DPMP',mayor:'mayor',delegate:'delegation',dgs:'DGS incumbent',dgaep:'DGAEP incumbent',req:'REQ incumbent',field:'current field teams',contacts:'direct functional contact',reqContact:'REQ contact'},
  };
  const renderNodes = (nodes: readonly PublicCleanlinessOrganizationNode[]) => nodes.length ? <ul className="space-y-1">{nodes.map(n => <li key={n.id}><button type="button" onClick={() => onSelect(n.id)} className="text-left text-sky-200 underline underline-offset-2">{n.name}</button>{n.assignment !== 'confirmed' ? <span> ({n.assignment === 'historical' ? labels.historical : labels.unconfirmed})</span> : null}</li>)}</ul> : labels.unknown;
  const renderHolders = (holders: (typeof rows)[number]['reqHolders']) => holders.length ? <ul className="space-y-1">{holders.map(h => <li key={`${h.person.id}:${h.role.id}`}><button type="button" onClick={() => onSelect(h.person.id)} className="text-left text-sky-200 underline underline-offset-2">{h.person.name}</button>{h.status !== 'confirmed' ? <span> ({h.status === 'historical' ? labels.historical : labels.unconfirmed})</span> : null}</li>)}</ul> : null;
  return <section className="mt-5 rounded-xl border border-white/15 p-4">
    <h3 className="font-bold text-white"><button type="button" className="w-full text-left" aria-expanded={expanded} aria-controls="public-cleanliness-coverage-panel" onClick={() => setExpanded(value => !value)}>{labels.title} <span aria-hidden="true">{expanded ? "−" : "+"}</span></button></h3><p className="my-2 text-xs text-slate-300">{labels.intro}</p>
    <div id="public-cleanliness-coverage-panel" hidden={!expanded}>
    {expanded ? <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={labels.title}>
      <table className="w-full min-w-[72rem] border-collapse text-left text-xs text-slate-200">
        <caption className="sr-only">{labels.title}</caption>
        <thead><tr>{[labels.district, labels.hall, labels.dpe, labels.dpmp, labels.local, labels.req, labels.field, labels.contacts, labels.gaps].map(label => <th key={label} scope="col" className="border-b border-white/15 p-2">{label}</th>)}</tr></thead>
        <tbody>{rows.map(row => <tr key={row.territoryId} className="align-top"><th scope="row" className="border-b border-white/10 p-2">{row.territoryId.split(':')[1]}</th>
          <td className="border-b border-white/10 p-2">{renderNodes(row.hall)}{renderHolders(row.localMayor)}</td>
          <td className="border-b border-white/10 p-2">{renderNodes(row.dpe)}</td><td className="border-b border-white/10 p-2">{renderNodes(row.dpmp)}</td>
          <td className="border-b border-white/10 p-2">{renderNodes([...row.dgs, ...row.dgaep])}{renderHolders(row.delegates)}</td>
          <td className="border-b border-white/10 p-2">{renderNodes(row.reqRoles)}{renderHolders(row.reqHolders)}</td><td className="border-b border-white/10 p-2">{renderNodes(row.field)}</td>
          <td className="border-b border-white/10 p-2">{row.contacts.length ? row.contacts.map(c => <a key={c.label + c.url} href={c.url} target="_blank" rel="noreferrer" className="block text-sky-200 underline">{c.kind === 'official_portal' ? labels.portal : c.label}</a>) : labels.unknown}</td>
          <td className="border-b border-white/10 p-2">{(Object.keys(row.gaps) as (keyof typeof row.gaps)[]).filter(key => row.gaps[key]).map(key => labels.gapNames[key]).join(', ') || (fr ? 'Aucune dans ce périmètre' : 'None in this scope')}</td>
        </tr>)}</tbody>
      </table>
    </div> : null}
    </div>
  </section>;
}
