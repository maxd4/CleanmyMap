import { describe, expect, it, vi } from 'vitest';
import { createLocalIdentifier } from '../lib/local-identifier';

describe('createLocalIdentifier', () => {
  it('keeps the prefix and produces distinct local identifiers', () => {
    const first = createLocalIdentifier('test');
    const second = createLocalIdentifier('test');

    expect(first).toMatch(/^test-/);
    expect(second).toMatch(/^test-/);
    expect(second).not.toBe(first);
  });

  it('keeps producing distinct identifiers when the platform has no randomUUID', () => {
    vi.stubGlobal('crypto', {});

    const first = createLocalIdentifier('fallback');
    const second = createLocalIdentifier('fallback');

    expect(first).toMatch(/^fallback-[0-9a-z]+-[0-9a-z]+$/);
    expect(second).toMatch(/^fallback-[0-9a-z]+-[0-9a-z]+$/);
    expect(second).not.toBe(first);

    vi.unstubAllGlobals();
  });
});
