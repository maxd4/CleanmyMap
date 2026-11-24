import type { PublicCleanlinessCityDataset, PublicCleanlinessOrganizationNode as Node } from './public-cleanliness-organization';

/** The matrix is a projection of the canonical dataset, not another registry. */
export function getPublicCleanlinessCoverage(dataset: PublicCleanlinessCityDataset) {
  const nodeById = new Map(dataset.nodes.map(n => [n.id, n]));
  return dataset.territoryIds.map(territoryId => {
    const local = dataset.nodes.filter(n => n.territoryIds.includes(territoryId));
    const group = (id: string) => local.filter(n => n.territoryCoverageGroup === id);
    const roles = (kind: Node['coverageRole']) => local.filter(n => n.coverageRole === kind);
    // Do not infer a local assignment from a person's citywide territory.
    const holders = (kind: Node['coverageRole']) => {
      const ids = new Set(roles(kind).map(n => n.id));
      return dataset.relations.filter(e => ids.has(e.to) && (e.kind === 'assignment' || e.kind === 'mandate'))
        .flatMap(e => {
          const person = nodeById.get(e.from);
          const role = nodeById.get(e.to);
          return person?.kind === 'person' && role ? [{ person, role, status: e.status }] : [];
        });
    };
    const reqHolders = holders('req');
    const hall = group('town-halls');
    const dpe = group('stpp-divisions');
    const dpmp = group('dpmp-divisions');
    const contacts = [...hall, ...dpe, ...dpmp].flatMap(n => n.publicContact ? [n.publicContact] : []);
    const localMayor = holders('local_mayor');
    const delegates = holders('local_delegation');
    const dgs = roles('local_dgs');
    const dgaep = roles('local_dgaep');
    const reqRoles = roles('req');
    const localUnitIds = new Set(dpe.map(n => n.id));
    const field = local.filter(n => n.unitId && localUnitIds.has(n.unitId));
    const gaps = {
      townHall: hall.length !== 1,
      dpe: dpe.length !== 1,
      dpmp: dpmp.length !== 1,
      mayor: !localMayor.some(h => h.status === 'confirmed'),
      delegate: !delegates.some(h => h.status === 'confirmed'),
      dgs: !holders('local_dgs').some(h => h.status === 'confirmed'),
      dgaep: !holders('local_dgaep').some(h => h.status === 'confirmed'),
      req: !reqHolders.some(h => h.status === 'confirmed'),
      field: !field.some(n => n.assignment === 'confirmed'),
      contacts: !contacts.some(c => c.kind === 'functional_contact'),
      reqContact: !reqRoles.some(n => n.publicContact?.kind === 'functional_contact'),
    };
    return { territoryId, hall, dpe, dpmp, localMayor, delegates, dgs, dgaep, reqRoles, reqHolders, field, contacts, gaps };
  });
}
