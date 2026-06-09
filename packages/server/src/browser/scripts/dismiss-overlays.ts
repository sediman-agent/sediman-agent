/**
 * Cookie consent overlay dismissal script
 *
 * Automatically dismisses cookie/GDPR consent banners
 */

export const DISMISS_OVERLAYS_JS = `
(() => {
  const selectors = [
    '[class*="cookie"]', '[class*="consent"]', '[class*="gdpr"]',
    '[class*="notice"]', '[class*="banner"]', '[class*="popup"]',
    '[class*="overlay"]', '[class*="modal"]', '[id*="cookie"]',
    '[id*="consent"]', '[id*="gdpr"]', '[id*="notice"]',
    '[aria-label*="cookie"]', '[aria-label*="consent"]',
    '[aria-label*="accept"]', '[aria-label*="close"]',
    '[aria-label*="dismiss"]', '[aria-label*="Close"]',
    '[aria-label*="Dismiss"]',
  ];

  for (const sel of selectors) {
    for (const el of document.querySelectorAll(sel)) {
      if (el.offsetHeight === 0) continue;

      const btn = el.querySelector('button, [role="button"], a');
      if (btn && btn.textContent) {
        const txt = btn.textContent.toLowerCase();
        if (txt.includes('accept') || txt.includes('agree') || txt.includes('ok') ||
            txt.includes('close') || txt.includes('dismiss') || txt.includes('got it')) {
          btn.click();
          return;
        }
      }
    }
  }
})();
`;
