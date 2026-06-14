/**
 * wait-for-stable-state.ts
 *
 * Implements the same "wait for the page to settle" semantics that make
 * browser-use reliable: after an action that may trigger navigation,
 * rendering or network activity, we wait until the DOM is stable instead
 * of guessing a fixed delay.
 *
 * The strategy combines three independent signals:
 *   1. Navigation  — detect URL/framenavigated transitions and let them settle.
 *   2. Network     — wait for the in-flight request count to drain (best effort,
 *                    never blocks forever on a long-polling SPA).
 *   3. DOM         — poll the serialized interactive-element signature until two
 *                    consecutive reads are identical (mutations have stopped).
 *
 * All waits are bounded by `timeoutMs` and degrade gracefully — if any signal
 * is unavailable (e.g. closed shadow DOM, detached frame), the others still run.
 */

import type { Page } from "playwright";
import { createLogger } from "../core/logging";

const log = createLogger("wait-for-stable-state");

export interface StableStateOptions {
  /** Hard upper bound for the whole wait. Default 5000ms. */
  timeoutMs?: number;
  /** Polling interval for DOM signature comparison. Default 150ms. */
  pollIntervalMs?: number;
  /**
   * How many consecutive identical DOM signatures count as "stable".
   * 2 is enough to absorb a single async re-render. Default 2.
   */
  requiredStableReads?: number;
  /** Skip the network-idle wait entirely. Default false. */
  skipNetworkIdle?: boolean;
}

export interface StableStateResult {
  /** Total milliseconds spent waiting. */
  waitedMs: number;
  /** True if the page reached a stable state before the timeout. */
  stable: boolean;
  /** Final DOM signature captured (hash of interactive elements). */
  signature: string;
  /** Reason the wait ended. */
  reason: "stable" | "timeout" | "error" | "skipped";
}

const DEFAULT_TIMEOUT = 5000;
const DEFAULT_POLL = 150;
const DEFAULT_STABLE_READS = 2;

/**
 * Wait for the page to reach a quiescent state.
 *
 * Safe to call on any Playwright page; never throws — returns a result
 * describing what happened so callers can decide how to react.
 */
export async function waitForStableState(
  page: Page,
  opts: StableStateOptions = {}
): Promise<StableStateResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT;
  const pollIntervalMs = opts.pollIntervalMs ?? DEFAULT_POLL;
  const requiredStableReads = opts.requiredStableReads ?? DEFAULT_STABLE_READS;

  const start = Date.now();

  // 1. Let any in-flight navigation settle first (best effort).
  try {
    await page.waitForLoadState("domcontentloaded", { timeout: Math.min(timeoutMs, 1500) });
  } catch {
    // ignore — page may already be loaded or DOMContentLoaded already fired
  }

  // 2. Network idle (best effort). SPAs with long-polling/websockets never
  //    reach networkidle, so we bound this aggressively and don't fail.
  if (!opts.skipNetworkIdle) {
    try {
      await page.waitForLoadState("networkidle", {
        timeout: Math.min(timeoutMs, 2500),
      });
    } catch {
      // many real pages never hit networkidle — that's fine
    }
  }

  // 3. DOM stability: hash the interactive-element signature until it stops
  //    changing. This is the actual "page stopped re-rendering" signal.
  let lastSignature = "";
  let stableReads = 0;

  while (Date.now() - start < timeoutMs) {
    let signature: string;
    try {
      signature = await captureDomSignature(page);
    } catch {
      // page navigated / frame detached mid-read — try once more next tick
      await sleep(pollIntervalMs);
      continue;
    }

    if (signature === lastSignature && signature.length > 0) {
      stableReads++;
      if (stableReads >= requiredStableReads) {
        const waitedMs = Date.now() - start;
        log.debug({ waitedMs, signatureLen: signature.length }, "page reached stable state");
        return { waitedMs, stable: true, signature, reason: "stable" };
      }
    } else {
      stableReads = 0;
    }
    lastSignature = signature;
    await sleep(pollIntervalMs);
  }

  const waitedMs = Date.now() - start;
  return {
    waitedMs,
    stable: false,
    signature: lastSignature,
    reason: "timeout",
  };
}

/**
 * Capture a compact, deterministic signature of the current DOM state.
 *
 * We hash the attributes of interactive elements (the same set the snapshot
 * script numbers as refIds) plus the URL and scroll position. This gives a
 * stable fingerprint that changes whenever the page's actionable surface
 * changes, but ignores cosmetic animations.
 */
async function captureDomSignature(page: Page): Promise<string> {
  // Run inside the page so it works for any origin without cross-origin issues.
  const sig = await page.evaluate(() => {
    const interactive = Array.from(
      document.querySelectorAll<HTMLElement>(
        "a, button, input, select, textarea, [role='button'], [role='link'], [role='textbox'], [contenteditable='true'], [tabindex]"
      )
    ).filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    // Stable, deterministic fingerprint per element. We deliberately exclude
    // transient attributes (animation frame counters, random ids) by only
    // reading structural/semantic attributes.
    const parts = interactive.slice(0, 200).map((el) => {
      const tag = el.tagName.toLowerCase();
      const role = el.getAttribute("role") || "";
      const name = el.getAttribute("name") || "";
      const type = el.getAttribute("type") || "";
      const href = (el.getAttribute("href") || "").split("#")[0];
      const text = (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40);
      const idx = Array.from(el.parentElement?.children || []).indexOf(el);
      return `${tag}:${role}:${name}:${type}:${href}:${text}:${idx}`;
    });

    return [
      location.href.split("#")[0],
      document.title.slice(0, 60),
      (document.scrollingElement?.scrollTop ?? 0) | 0,
      interactive.length,
      parts.join("|"),
    ].join("::");
  });

  // cheap string hash (FNV-1a) so the signature is short and comparable
  return fnv1a(sig);
}

function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
