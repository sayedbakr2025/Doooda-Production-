export function cleanTextForExport(html: string): string {
  if (!html) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const parts: string[] = [];

  function walk(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      const normalized = text.replace(/\u00a0/g, ' ');
      if (normalized) parts.push(normalized);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === 'img') return;
    if (el.hasAttribute('data-image-wrapper') || el.hasAttribute('data-image-toolbar')) return;

    if (el.hasAttribute('data-character-dialogue-block')) {
      const nameEl = el.querySelector('[data-character-name-label]');
      const textEl = el.querySelector('.character-dialogue-text');
      const name = nameEl ? (nameEl.textContent ?? '').replace(/\u00a0/g, ' ').trim() : '';
      const text = textEl ? (textEl.textContent ?? '').replace(/\u00a0/g, ' ').trim() : '';
      if (parts.length > 0 && parts[parts.length - 1] !== '\n') parts.push('\n');
      parts.push(`${name} ${text}`);
      parts.push('\n');
      return;
    }

    if (tag === 'br') {
      parts.push('\n');
      return;
    }

    const isBlock = ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'tr'].includes(tag);

    if (isBlock) {
      const last = parts[parts.length - 1];
      if (parts.length > 0 && last !== '\n') {
        parts.push('\n');
      }
    }

    for (const child of Array.from(node.childNodes)) {
      walk(child);
    }

    if (isBlock) {
      const last = parts[parts.length - 1];
      if (last !== '\n') {
        parts.push('\n');
      }
    }
  }

  walk(doc.body);

  return parts
    .join('')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function cleanHtmlToStructuredHtml(html: string): string {
  if (!html) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const parts: string[] = [];

  function walkForHtml(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent ?? '').replace(/\u00a0/g, ' ').trim();
      if (text) parts.push(`<p>${escapeForHtml(text)}</p>`);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (el.hasAttribute('data-image-toolbar') || el.hasAttribute('data-handle')) return;

    if (el.hasAttribute('data-character-dialogue-block')) {
      const nameEl = el.querySelector('[data-character-name-label]');
      const textEl = el.querySelector('.character-dialogue-text');
      const name = nameEl ? (nameEl.textContent ?? '').replace(/\u00a0/g, ' ').trim() : '';
      const text = textEl ? (textEl.textContent ?? '').replace(/\u00a0/g, ' ').trim() : '';
      if (name) {
        const indent = '2.5em';
        parts.push(
          `<div style="margin:0.6em 0;padding-inline-start:${indent};">` +
          `<span style="font-weight:bold;">${escapeForHtml(name)}</span>` +
          ` <span style="display:inline-block;text-indent:0;">${escapeForHtml(text)}</span>` +
          `</div>`
        );
      }
      return;
    }

    if (el.hasAttribute('data-image-wrapper')) {
      const img = el.querySelector('img');
      if (img && img.src) {
        const alignment = el.getAttribute('data-alignment') || 'center';
        const width = el.getAttribute('data-width') || '300';
        const marginLeft = alignment === 'center' ? 'auto' : alignment === 'right' ? 'auto' : '0';
        const marginRight = alignment === 'center' ? 'auto' : alignment === 'right' ? '0' : 'auto';
        parts.push(
          `<div style="display:block;width:${width}px;margin:8px ${marginRight} 8px ${marginLeft};">` +
          `<img src="${img.src}" style="width:100%;display:block;border-radius:4px;" />` +
          `</div>`
        );
      }
      return;
    }

    if (tag === 'img') {
      if ((el as HTMLImageElement).src) {
        parts.push(
          `<div style="display:block;margin:8px auto;">` +
          `<img src="${(el as HTMLImageElement).src}" style="max-width:100%;display:block;border-radius:4px;" />` +
          `</div>`
        );
      }
      return;
    }

    if (tag === 'br') {
      return;
    }

    const isBlock = ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote'].includes(tag);

    if (isBlock) {
      const innerText = (el.textContent ?? '').replace(/\u00a0/g, ' ').trim();
      const hasImageChild = el.querySelector('img') !== null || el.querySelector('[data-image-wrapper]') !== null;
      if (!innerText && !hasImageChild) return;

      for (const child of Array.from(el.childNodes)) {
        walkForHtml(child);
      }
    } else {
      for (const child of Array.from(el.childNodes)) {
        walkForHtml(child);
      }
    }
  }

  function processBlockChildren(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent ?? '').replace(/\u00a0/g, ' ').trim();
      if (text) parts.push(`<p>${escapeForHtml(text)}</p>`);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (el.hasAttribute('data-image-toolbar') || el.hasAttribute('data-handle')) return;

    if (el.hasAttribute('data-character-dialogue-block')) {
      walkForHtml(el);
      return;
    }

    if (el.hasAttribute('data-image-wrapper')) {
      walkForHtml(el);
      return;
    }

    if (tag === 'img') {
      walkForHtml(el);
      return;
    }

    if (tag === 'br') return;

    const blockTags = ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote'];
    if (blockTags.includes(tag)) {
      const hasImageChild = el.querySelector('img, [data-image-wrapper]') !== null;
      const innerText = (el.textContent ?? '').replace(/\u00a0/g, ' ').trim();

      if (hasImageChild) {
        for (const child of Array.from(el.childNodes)) {
          processBlockChildren(child);
        }
      } else if (innerText) {
        parts.push(`<p>${escapeForHtml(innerText)}</p>`);
      }
    } else {
      const innerText = (el.textContent ?? '').replace(/\u00a0/g, ' ').trim();
      if (innerText) parts.push(`<p>${escapeForHtml(innerText)}</p>`);
    }
  }

  for (const child of Array.from(doc.body.childNodes)) {
    processBlockChildren(child);
  }

  return parts.join('\n');
}

function escapeForHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
