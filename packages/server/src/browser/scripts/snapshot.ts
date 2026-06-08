/**
 * Page snapshot script — browser-use quality DOM representation
 *
 * Produces tree-style indented output with:
 * - Parent/child hierarchy via \t indentation
 * - [index] markers on interactive elements
 * - *[index] for elements newly appeared since last snapshot
 * - Scroll context (pages above/below)
 * - Page statistics (links, interactive, iframes, images, total elements, text chars)
 * - Shadow DOM support (open/closed)
 * - Text content as child nodes
 * - [Start of page] / [End of page] markers
 */

export const SNAPSHOT_JS = `
(() => {
  const MAX_ELEMENTS = 300;
  const MAX_TEXT_PREVIEW = 3000;

  let counter = 0;
  let elementsArray = [];
  let outputLines = [];

  const interactiveTags = new Set([
    'a', 'button', 'input', 'select', 'textarea', 'details', 'summary',
    'option', 'optgroup', 'fieldset', 'label', 'output', 'iframe', 'frame',
    'video', 'audio',
  ]);

  const interactiveRoles = new Set([
    'button', 'link', 'textbox', 'combobox', 'checkbox', 'radio',
    'menuitem', 'tab', 'switch', 'slider', 'spinbutton', 'searchbox',
    'treeitem', 'option', 'menuitemcheckbox', 'menuitemradio',
    'listbox', 'gridcell', 'row', 'columnheader', 'rowheader',
  ]);

  const contentTags = new Set([
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'p', 'li', 'td', 'th',
    'span', 'div', 'section', 'article', 'header', 'footer', 'nav', 'main',
    'pre', 'code', 'blockquote',
  ]);

  function isInteractive(el) {
    const tag = el.tagName.toLowerCase();
    if (interactiveTags.has(tag)) {
      if (tag === 'a' && !el.getAttribute('href')) return false;
      return true;
    }
    const role = el.getAttribute('role');
    if (role && interactiveRoles.has(role.toLowerCase())) return true;
    if (el.getAttribute('contenteditable') === 'true') return true;
    const tabindex = el.getAttribute('tabindex');
    if (tabindex !== null && tabindex !== '-1') return true;
    if (el.getAttribute('onclick') || el.getAttribute('ng-click')) return true;
    if (el.getAttribute('data-action') || el.getAttribute('data-click')) return true;
    const classes = (el.getAttribute('class') || '').toLowerCase();
    if (/\\bbtn\\b|\\bbutton\\b/.test(classes)) return true;
    return false;
  }

  function isVisible(el) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    return true;
  }

  function buildTag(el, refId, isNew) {
    const tag = el.tagName.toLowerCase();
    let attrs = [];
    let text = '';

    if (el.id) attrs.push('id=' + el.id.slice(0, 40));
    if (el.getAttribute('type')) attrs.push('type=' + el.getAttribute('type'));
    if (el.getAttribute('placeholder')) attrs.push('placeholder=' + JSON.stringify(el.getAttribute('placeholder').slice(0, 60)));
    if (el.getAttribute('aria-label')) attrs.push('aria-label=' + JSON.stringify(el.getAttribute('aria-label').slice(0, 60)));
    if (el.getAttribute('role')) attrs.push('role=' + el.getAttribute('role'));
    if (el.getAttribute('href')) attrs.push('href=' + JSON.stringify(el.getAttribute('href').slice(0, 60)));
    if (el.getAttribute('value')) attrs.push('value=' + JSON.stringify(el.getAttribute('value').slice(0, 40)));
    if (el.getAttribute('name')) attrs.push('name=' + JSON.stringify(el.getAttribute('name').slice(0, 40)));
    if (el.getAttribute('title')) attrs.push('title=' + JSON.stringify(el.getAttribute('title').slice(0, 40)));
    if (el.getAttribute('alt')) attrs.push('alt=' + JSON.stringify(el.getAttribute('alt').slice(0, 40)));
    if (el.getAttribute('src')) attrs.push('src=' + JSON.stringify(el.getAttribute('src').slice(0, 60)));

    if (tag === 'input' && !el.getAttribute('type')) attrs.push('type=text');

    // Get direct text content (only from immediate text nodes, not nested elements)
    for (const child of el.childNodes) {
      if (child.nodeType === 3) { // Text node
        text += child.textContent;
      }
    }
    text = text.replace(/\\s+/g, ' ').trim().slice(0, 120);
    if (text) attrs.push('text=' + JSON.stringify(text));

    const prefix = isNew ? '*' : '';
    const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';
    return prefix + '[' + refId + ']<' + tag + attrStr + ' />';
  }

  function getDirectText(el) {
    let text = '';
    for (const child of el.childNodes) {
      if (child.nodeType === 3) text += child.textContent;
    }
    return text.replace(/\\s+/g, ' ').trim().slice(0, 200);
  }

  function isCssOrJsText(s) {
    if (!s) return false;
    s = s.trim();
    if (/^[.#@][\\w-]/.test(s) && /\\{/.test(s)) return true;
    if (/^(var|let|const|function |if |for |while |return |this\\.|window\\.|document\\.|\\(function|try\\s*\\{)/.test(s)) return true;
    if (s.startsWith('{') && s.endsWith('}') && s.length > 30) return true;
    return false;
  }

  function buildContentLine(el) {
    const tag = el.tagName.toLowerCase();
    if (tag === 'img') {
      const alt = el.getAttribute('alt') || '';
      const src = (el.getAttribute('src') || '').slice(0, 60);
      return '<img alt=' + JSON.stringify(alt.slice(0, 60)) + ' src=' + JSON.stringify(src) + ' />';
    }
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
      const t = getDirectText(el);
      if (isCssOrJsText(t)) return '';
      return '<' + tag + '>' + (t || el.textContent?.replace(/\\s+/g, ' ').trim().slice(0, 200) || '') + '</' + tag + '>';
    }
    const t = getDirectText(el);
    if (!t || isCssOrJsText(t)) return '';
    if (isInteractive(el)) return '';
    return t;
  }

  // Get previous element indices for tracking new elements
  const prevRefIds = new Set();
  document.querySelectorAll('[data-sediman-ref-id]').forEach(el => {
    prevRefIds.add(el.getAttribute('data-sediman-ref-id'));
  });

  // Clear existing markers
  document.querySelectorAll('[data-sediman-ref-id]').forEach(el => {
    el.removeAttribute('data-sediman-ref-id');
  });

  // Collect page statistics
  let stats = { links: 0, interactive: 0, iframes: 0, images: 0, total: 0, textChars: 0 };
  let shadowOpen = 0;
  let shadowClosed = 0;

  function collectStats(el) {
    stats.total++;
    const tag = el.tagName.toLowerCase();
    if (tag === 'a' && el.getAttribute('href')) stats.links++;
    if (tag === 'iframe' || tag === 'frame') stats.iframes++;
    if (tag === 'img') stats.images++;
    if (isInteractive(el)) stats.interactive++;
    for (const child of el.childNodes) {
      if (child.nodeType === 3) stats.textChars += (child.textContent || '').trim().length;
    }
    // Check shadow root
    if (el.shadowRoot) {
      if (el.shadowRoot.mode === 'closed') shadowClosed++;
      else shadowOpen++;
    }
  }

  function walkDOM(el, depth) {
    if (elementsArray.length >= MAX_ELEMENTS) return;
    if (el.nodeType !== 1) return; // Skip non-elements
    if (!isVisible(el)) return;

    const tag = el.tagName.toLowerCase();

    // Skip style/script/noscript/svg elements — they pollute output
    if (tag === 'style' || tag === 'script' || tag === 'noscript' || tag === 'svg' || tag === 'path' || tag === 'link' || tag === 'meta') return;

    collectStats(el);
    const isInter = isInteractive(el);
    const isContent = contentTags.has(tag);
    const isTextNode = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'td', 'th', 'span'].includes(tag);

    if (!isInter && !isContent && !isTextNode) {
      // Still walk children for non-content elements
      for (const child of el.children) {
        walkDOM(child, depth);
      }
      return;
    }

    if (isInter) {
      const refId = counter++;
      el.setAttribute('data-sediman-ref-id', String(refId));
      const isNew = !prevRefIds.has(String(refId));

      elementsArray.push({
        refId, tag, isNew,
        text: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 200),
        role: el.getAttribute('role') || '',
        placeholder: el.getAttribute('placeholder') || '',
        href: el.getAttribute('href') || '',
        src: el.getAttribute('src') || '',
        alt: el.getAttribute('alt') || '',
        type: el.getAttribute('type') || '',
        value: (el.value || el.getAttribute('value') || '').slice(0, 100),
        ariaLabel: el.getAttribute('aria-label') || '',
        title: el.getAttribute('title') || '',
        name: el.getAttribute('name') || '',
        boundingBox: (() => {
          const r = el.getBoundingClientRect();
          return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
        })(),
      });

      const indent = '\\t'.repeat(depth);
      const line = indent + buildTag(el, refId, isNew);
      outputLines.push({ line, depth });

      // Show direct text content on next line for interactive elements
      let directText = '';
      for (const child of el.childNodes) {
        if (child.nodeType === 3) directText += child.textContent;
      }
      directText = directText.replace(/\\s+/g, ' ').trim().slice(0, 150);
      // Don't duplicate if already in the tag attrs (short text)
      if (directText && directText.length > 20) {
        outputLines.push({ line: indent + '\\t' + directText, depth: depth + 1 });
      }

      // Handle shadow DOM
      if (el.shadowRoot) {
        const shadowMode = el.shadowRoot.mode;
        outputLines.push({ line: indent + '\\t|SHADOW(' + shadowMode + ')|', depth: depth + 1 });
      }

      // Walk children with increased depth
      for (const child of el.children) {
        walkDOM(child, depth + 1);
      }
    } else {
      // Content element - show text content and continue walking
      const line = buildContentLine(el);
      if (line) {
        const indent = '\\t'.repeat(depth);
        outputLines.push({ line: indent + line, depth });
      }
      for (const child of el.children) {
        walkDOM(child, depth);
      }
    }
  }

  // Start walking from body
  if (document.body) {
    for (const child of document.body.children) {
      walkDOM(child, 0);
    }
  }

  // Build scroll context
  const scrollEl = document.scrollingElement || document.documentElement;
  const scrollY = scrollEl.scrollTop || 0;
  const scrollX = scrollEl.scrollLeft || 0;
  const viewportH = window.innerHeight;
  const pageH = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
  const pixelsAbove = scrollY;
  const pixelsBelow = Math.max(0, pageH - scrollY - viewportH);
  const pagesAbove = pixelsAbove / viewportH;
  const pagesBelow = pixelsBelow / viewportH;

  // Build output
  let output = '';

  // Page statistics
  output += '<page_stats>';
  if (stats.total < 10) {
    output += 'Page appears empty (SPA not loaded?) - ';
  }
  output += stats.links + ' links, ' + stats.interactive + ' interactive, ' + stats.iframes + ' iframes';
  if (shadowOpen > 0 || shadowClosed > 0) {
    output += ', ' + shadowOpen + ' shadow(open), ' + shadowClosed + ' shadow(closed)';
  }
  output += ', ' + stats.images + ' images';
  output += ', ' + stats.total + ' total elements';
  output += ', ' + stats.textChars + ' text chars';
  output += '</page_stats>\\n';

  // Scroll context
  output += '<page_info>';
  output += pagesAbove.toFixed(1) + ' pages above, ' + pagesBelow.toFixed(1) + ' pages below';
  if (pagesBelow > 0.2) {
    output += ' — scroll down to reveal more content';
  }
  output += '</page_info>\\n';

  // Interactive elements
  const hasContentAbove = pagesAbove > 0;
  const hasContentBelow = pagesBelow > 0;

  output += '\\nInteractive elements:\\n';
  if (!hasContentAbove) output += '[Start of page]\\n';

  for (const item of outputLines) {
    output += item.line + '\\n';
  }

  if (!hasContentBelow) output += '[End of page]\\n';

  if (elementsArray.length >= MAX_ELEMENTS) {
    output += '\\n[Showing first ' + MAX_ELEMENTS + ' interactive elements — page has more]\\n';
  }

  // Text preview for content extraction
  let textPreview = '';
  try {
    const clone = document.body.cloneNode(true);
    clone.querySelectorAll('script, style, noscript, svg, path, iframe, nav, footer, header').forEach(el => el.remove());
    textPreview = (clone.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, MAX_TEXT_PREVIEW);
  } catch(e) {}

  return {
    output,
    textPreview,
    elements: elementsArray,
    scrollPosition: { x: Math.round(scrollX), y: Math.round(scrollY) },
    viewport: { width: window.innerWidth, height: viewportH },
    pageSize: { width: pageH > 0 ? document.body.scrollWidth : 0, height: pageH },
    url: location.href,
    title: document.title,
    stats,
    pagesAbove,
    pagesBelow,
  };
})();
`;
