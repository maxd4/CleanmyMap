import { describe, it, expect } from 'vitest';
import { PARIS_PUBLIC_CLEANLINESS_DATASET, validatePublicCleanlinessOrganization } from './public-cleanliness-organization';
import { getPublicCleanlinessCoverage } from './public-cleanliness-coverage';

describe('Paris institutional extension', () => {
  it('keeps 17 town halls, 14 DPE divisions and 17 DPMP divisions for 20 districts', () => {
    const rows = getPublicCleanlinessCoverage(PARIS_PUBLIC_CLEANLINESS_DATASET);
    expect(rows).toHaveLength(20);
    for (const row of rows) {
      expect([row.hall.length, row.dpe.length, row.dpmp.length, row.localMayor.length]).toEqual([1, 1, 1, 1]);
    }
    const count = (key: 'hall' | 'dpe' | 'dpmp') => new Set(rows.flatMap(r => r[key].map(n => n.id))).size;
    expect([count('hall'), count('dpe'), count('dpmp')]).toEqual([17, 14, 17]);
    expect(rows[4].dpe[0].id).toBe(rows[5].dpe[0].id);
    expect(rows[4].hall[0].id).not.toBe(rows[5].hall[0].id);
    expect(validatePublicCleanlinessOrganization()).toEqual([]);
  });
  it('uses one Carine Ekon identity with multiple non-hierarchical mandates', () => {
    const data = PARIS_PUBLIC_CLEANLINESS_DATASET;
    expect(data.nodes.filter(n => n.id === 'person-carine-ekon')).toHaveLength(1);
    const mandates = data.relations.filter(e => e.from === 'person-carine-ekon' && e.kind === 'mandate');
    expect(mandates.map(e => e.to)).toEqual(expect.arrayContaining(['commission-8-vice-chair', 'local-delegation-20-waste', 'council-paris']));
    const rows = getPublicCleanlinessCoverage(data);
    expect(rows[19].delegates.map(h => h.person.id)).toContain('person-carine-ekon');
    expect(rows.slice(0, 19).flatMap(r => r.delegates.map(h => h.person.id))).not.toContain('person-carine-ekon');
  });
  it('does not convert historical REQ or official portals into current direct contacts', () => {
    const rows = getPublicCleanlinessCoverage(PARIS_PUBLIC_CLEANLINESS_DATASET);
    expect(rows[7].reqHolders).toEqual(expect.arrayContaining([expect.objectContaining({ status: 'confirmed' })]));
    expect(rows[8].reqHolders).toEqual(expect.arrayContaining([expect.objectContaining({ status: 'historical' })]));
    expect(rows[8].gaps.req).toBe(true);
    expect(rows[19].gaps.req).toBe(true);
    expect(rows.every(r => r.gaps.contacts)).toBe(true);
  });
  it('preserves the regulatory reporting line of occupational prevention', () => {
    const data = PARIS_PUBLIC_CLEANLINESS_DATASET;
    expect(data.nodes.find(n => n.id === 'dpe-work-safety')).toMatchObject({ unitId: 'dpe-deputy', assignment: 'historical' });
    expect(data.relations.filter(e => e.kind === 'hierarchy' && e.from === 'stpp-mechanical')).toHaveLength(6);
  });
});
