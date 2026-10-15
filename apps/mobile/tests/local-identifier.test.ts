import { describe, expect, it } from 'vitest';
import { createLocalIdentifier } from '../lib/local-identifier';

describe('createLocalIdentifier', () => {
  it('keeps the prefix and produces distinct local identifiers', () => {
    const first = createLocalIdentifier('test');
    const second = createLocalIdentifier('test');

    expect(first).toMatch(/^test-/);
    expect(second).toMatch(/^test-/);
    expect(second).not.toBe(first);
  });
});
