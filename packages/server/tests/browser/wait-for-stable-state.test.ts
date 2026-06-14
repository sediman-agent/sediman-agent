/**
 * Tests for waitForStableState and normalizeUrl.
 *
 * These are the reliability primitives that bring the agent to parity with
 * browser-use: deterministic URL handling and a real "wait for the page to
 * settle" instead of a fixed sleep.
 */

import { describe, it, expect } from 'bun:test';
import { normalizeUrl } from '../../src/browser/controller';

describe('normalizeUrl', () => {
  it('accepts a fully-qualified https URL unchanged', () => {
    const r = normalizeUrl('https://example.com/path?q=1');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url).toBe('https://example.com/path?q=1');
  });

  it('accepts a fully-qualified http URL unchanged', () => {
    const r = normalizeUrl('http://localhost:3000/');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url).toBe('http://localhost:3000/');
  });

  it('prepends https:// when the agent passes a bare hostname', () => {
    const r = normalizeUrl('example.com');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url).toBe('https://example.com/');
  });

  it('preserves query strings and paths on bare hostnames', () => {
    const r = normalizeUrl('google.com/search?q=hello+world');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.url).toContain('https://google.com/search');
      expect(r.url).toContain('q=hello+world');
    }
  });

  it('accepts localhost as a valid host', () => {
    const r = normalizeUrl('localhost:8080');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url).toBe('https://localhost:8080/');
  });

  it('rejects an empty string with an actionable message', () => {
    const r = normalizeUrl('');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('empty');
  });

  it('rejects pure whitespace as empty', () => {
    const r = normalizeUrl('   ');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('empty');
  });

  it('rejects non-string input', () => {
    const r = normalizeUrl(undefined as any);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('expected a string');
  });

  it('rejects a single-word string with no TLD', () => {
    const r = normalizeUrl('notavalidurl');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('Invalid hostname');
  });

  it('rejects javascript: URLs (security: prevents script injection via navigate)', () => {
    const r = normalizeUrl('javascript:alert(1)');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('Unsupported URL scheme');
  });

  it('rejects data: URLs', () => {
    const r = normalizeUrl('data:text/html,<script>alert(1)</script>');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('Unsupported URL scheme');
  });

  it('rejects file: URLs', () => {
    const r = normalizeUrl('file:///etc/passwd');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('Unsupported URL scheme');
  });

  it('returns a stable, normalized href (lowercases scheme)', () => {
    const r = normalizeUrl('HTTPS://EXAMPLE.COM/');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url).toBe('https://example.com/');
  });

  it('trims surrounding whitespace before validating', () => {
    const r = normalizeUrl('  https://example.com  ');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url).toBe('https://example.com/');
  });
});

describe('waitForStableState (unit behavior via a fake page)', () => {
  it('returns immediately as stable when the DOM never changes', async () => {
    const { waitForStableState } = await import('../../src/browser/wait-for-stable-state');

    // Minimal fake page: evaluate returns a constant string, loadState resolves.
    const fakePage: any = {
      waitForLoadState: async () => {},
      evaluate: async () => '<html><body><a>link</a></body></html>',
    };

    const start = Date.now();
    const result = await waitForStableState(fakePage, { timeoutMs: 2000, pollIntervalMs: 50 });
    const elapsed = Date.now() - start;

    expect(result.stable).toBe(true);
    expect(result.reason).toBe('stable');
    // Should finish well under the 2s timeout.
    expect(elapsed).toBeLessThan(500);
    expect(result.signature.length).toBeGreaterThan(0);
  });

  it('eventually settles when the DOM stops mutating', async () => {
    const { waitForStableState } = await import('../../src/browser/wait-for-stable-state');

    let callCount = 0;
    const fakePage: any = {
      waitForLoadState: async () => {},
      // Mutate for the first 4 reads, then stabilize.
      evaluate: async () => {
        callCount++;
        return `<html><body><a>link-${callCount <= 4 ? callCount : 'final'}</a></body></html>`;
      },
    };

    const result = await waitForStableState(fakePage, { timeoutMs: 3000, pollIntervalMs: 30 });
    expect(result.stable).toBe(true);
    expect(result.reason).toBe('stable');
  });

  it('reports timeout (not stable) when the DOM mutates forever', async () => {
    const { waitForStableState } = await import('../../src/browser/wait-for-stable-state');

    let callCount = 0;
    const fakePage: any = {
      waitForLoadState: async () => {},
      evaluate: async () => {
        callCount++;
        return `<html><body><a>link-${callCount}</a></body></html>`; // always different
      },
    };

    const result = await waitForStableState(fakePage, { timeoutMs: 400, pollIntervalMs: 50 });
    expect(result.stable).toBe(false);
    expect(result.reason).toBe('timeout');
    expect(result.waitedMs).toBeGreaterThanOrEqual(350);
  });

  it('survives a transient evaluate error (e.g. mid-navigation frame detach)', async () => {
    const { waitForStableState } = await import('../../src/browser/wait-for-stable-state');

    let callCount = 0;
    const fakePage: any = {
      waitForLoadState: async () => {},
      evaluate: async () => {
        callCount++;
        if (callCount === 2) throw new Error('Execution context was destroyed');
        return `<html><body><a>stable-link</a></body></html>`;
      },
    };

    const result = await waitForStableState(fakePage, { timeoutMs: 2000, pollIntervalMs: 40 });
    expect(result.stable).toBe(true);
  });

  it('skips the network-idle wait when skipNetworkIdle is set', async () => {
    const { waitForStableState } = await import('../../src/browser/wait-for-stable-state');

    let networkIdleCalls = 0;
    const fakePage: any = {
      waitForLoadState: async (state: string) => {
        if (state === 'networkidle') networkIdleCalls++;
      },
      evaluate: async () => '<html><body><a>x</a></body></html>',
    };

    await waitForStableState(fakePage, {
      timeoutMs: 1000,
      pollIntervalMs: 30,
      skipNetworkIdle: true,
    });
    expect(networkIdleCalls).toBe(0);
  });

  it('respects the requiredStableReads option (more reads → more conservative)', async () => {
    const { waitForStableState } = await import('../../src/browser/wait-for-stable-state');

    const fakePage: any = {
      waitForLoadState: async () => {},
      evaluate: async () => '<html><body><a>x</a></body></html>',
    };

    const start = Date.now();
    await waitForStableState(fakePage, {
      timeoutMs: 2000,
      pollIntervalMs: 100,
      requiredStableReads: 4,
    });
    const elapsed = Date.now() - start;
    // 4 reads at 100ms each = at least ~300ms of polling after the first read.
    expect(elapsed).toBeGreaterThanOrEqual(250);
  });
});
