import type { Chapter, Scene, Project } from '../../../types';
import type { KdpMetadata } from './kdpMetadataGenerator';
import {
  buildPrintLayoutSpec,
  buildPrintCss,
  type KdpTrimSize,
  type KdpInteriorType,
} from './kdpPrintEngine';
import { cleanHtmlToStructuredHtml, cleanTextForExport } from '../../../utils/cleanTextForExport';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function containsHtml(text: string): boolean {
  return /<[a-z][^>]*>|<br\s*\/?>|&nbsp;/i.test(text);
}

function textToParagraphs(text: string): string {
  if (!text || !text.trim()) return '';
  const trimmed = text.trim();
  if (containsHtml(trimmed)) {
    return cleanHtmlToStructuredHtml(trimmed);
  }
  return trimmed
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .split(/\n\n+/)
    .filter((p) => p.trim())
    .map((p) => `<p>${escapeHtml(p.replace(/\n/g, ' ').trim())}</p>`)
    .join('\n');
}

function countWordsInContent(text: string): number {
  if (!text || !text.trim()) return 0;
  const plain = cleanTextForExport(text);
  return plain.trim().split(/\s+/).filter(Boolean).length;
}

export interface KdpPrintOptions {
  authorName: string;
  showRunningHeader: boolean;
  language: 'ar' | 'en';
  trimSize?: KdpTrimSize;
  interiorType?: KdpInteriorType;
}

export interface KdpKindleOptions {
  authorName: string;
  description: string;
  language: 'ar' | 'en';
}

function safeSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/gi, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60) || 'chapter';
}

function countWords(chapters: Chapter[], scenesMap: Record<string, Scene[]>): number {
  let total = 0;
  for (const ch of chapters) {
    if (ch.is_active === false) continue;
    if (ch.content) total += countWordsInContent(ch.content);
    for (const sc of (scenesMap[ch.id] || [])) {
      if (sc.is_active === false) continue;
      if (sc.content) total += countWordsInContent(sc.content);
    }
  }
  return total;
}

export function renderKdpPrintHTML(
  project: Project,
  chapters: Chapter[],
  scenesMap: Record<string, Scene[]>,
  options: KdpPrintOptions,
  metadata: KdpMetadata
): string {
  const isRTL = options.language === 'ar';
  const dir = isRTL ? 'rtl' : 'ltr';
  const author = metadata.authorName || options.authorName;
  const titleEsc = escapeHtml(project.title);
  const authorEsc = escapeHtml(author);

  const trimSize: KdpTrimSize = options.trimSize ?? '6x9';
  const interiorType: KdpInteriorType = options.interiorType ?? 'black_white';
  const wordCount = countWords(chapters, scenesMap);

  const spec = buildPrintLayoutSpec(wordCount, trimSize, interiorType, 'cream');
  const css = buildPrintCss(spec, isRTL, options.showRunningHeader, titleEsc, authorEsc);

  const activeChapters = chapters.filter((c) => c.is_active !== false);

  const coverHtml = `
  <div class="cover front-matter">
    <h1>${titleEsc}</h1>
    ${metadata.subtitle ? `<div class="subtitle">${escapeHtml(metadata.subtitle)}</div>` : ''}
    ${author ? `<div class="author">${authorEsc}</div>` : ''}
  </div>`;

  let body = coverHtml;

  activeChapters.forEach((ch) => {
    const scenes = (scenesMap[ch.id] || []).filter((s) => s.is_active !== false);
    let chapterHtml = `<div class="chapter">`;
    chapterHtml += `<h2 class="chapter-title">${escapeHtml(ch.title)}</h2>`;

    if (ch.content && ch.content.trim()) {
      chapterHtml += textToParagraphs(ch.content);
    }

    scenes.forEach((sc) => {
      if (sc.content && sc.content.trim()) {
        chapterHtml += textToParagraphs(sc.content);
      }
    });

    chapterHtml += `</div>`;
    body += chapterHtml;
  });

  const footerText = author
    ? (isRTL
        ? `صنع هذا الإبداع بواسطة ${authorEsc} داخل دووودة`
        : `This work was created by ${authorEsc} inside Doooda.`)
    : '';
  const footerHtml = footerText
    ? `<div class="doooda-footer">${footerText}</div>`
    : '';

  body += footerHtml;

  const spineComment = `<!--
  KDP Print Formatting Engine v2
  Trim size   : ${spec.trim.widthIn}" × ${spec.trim.heightIn}"
  Interior    : ${interiorType}
  Est. pages  : ${spec.estimatedPageCount}
  Spine width : ${spec.spine.spineWidthIn.toFixed(4)}" (${spec.spine.pageCount} pages × 0.002252)
  Cover width : ${spec.spine.coverWidthIn}" × 2 + ${spec.spine.spineWidthIn.toFixed(4)}" spine + 0.25" bleed = ${spec.spine.totalWidthIn.toFixed(4)}"
  Margins     : top=${spec.margins.topIn}" bottom=${spec.margins.bottomIn}" inner=${spec.margins.innerIn}" outer=${spec.margins.outerIn}"
  Font        : ${spec.fontSizePt}pt · line-height ${spec.lineHeightRatio}
  Chapters start on right (recto) pages
  Orphans/widows: 3 lines minimum
  Page numbers: start after front matter (cover)
  CMYK-safe: all colors use hex black (#111111 / #000000), no RGB
  ${spec.warnings.length > 0 ? '\n  WARNINGS:\n' + spec.warnings.map(w => '  - ' + w.messageEn).join('\n') : ''}
-->`;

  return `<!DOCTYPE html>
<html lang="${options.language}" dir="${dir}">
<head>
<meta charset="UTF-8" />
<title>${titleEsc}</title>
<style>${css}</style>
</head>
<body>
${spineComment}
${body}
</body>
</html>`;
}

export function renderKdpKindleHTML(
  project: Project,
  chapters: Chapter[],
  scenesMap: Record<string, Scene[]>,
  options: KdpKindleOptions,
  metadata: KdpMetadata
): string {
  const isRTL = options.language === 'ar';
  const dir = isRTL ? 'rtl' : 'ltr';
  const lang = options.language;
  const author = metadata.authorName || options.authorName;
  const titleEsc = escapeHtml(project.title);
  const authorEsc = escapeHtml(author);
  const descEsc = escapeHtml(metadata.description || options.description || '');

  const activeChapters = chapters.filter((c) => c.is_active !== false);

  const tocEntries = activeChapters.map((ch, idx) => {
    const id = `chapter-${safeSlug(ch.title)}-${idx}`;
    return { id, title: ch.title };
  });

  const tocHtml = `
  <nav epub:type="toc" id="toc">
    <h2>${isRTL ? 'فهرس المحتويات' : 'Table of Contents'}</h2>
    <ol>
      ${tocEntries.map((e) => `<li><a href="#${e.id}">${escapeHtml(e.title)}</a></li>`).join('\n      ')}
    </ol>
  </nav>`;

  let sectionsHtml = '';
  activeChapters.forEach((ch, idx) => {
    const id = tocEntries[idx].id;
    const scenes = (scenesMap[ch.id] || []).filter((s) => s.is_active !== false);

    sectionsHtml += `<section epub:type="chapter" id="${id}">\n`;
    sectionsHtml += `<h1>${escapeHtml(ch.title)}</h1>\n`;

    if (ch.content && ch.content.trim()) {
      sectionsHtml += textToParagraphs(ch.content) + '\n';
    }

    scenes.forEach((sc) => {
      if (sc.content && sc.content.trim()) {
        sectionsHtml += textToParagraphs(sc.content) + '\n';
      }
    });

    sectionsHtml += `</section>\n`;
  });

  const kindleFooterText = author
    ? (isRTL
        ? `صنع هذا الإبداع بواسطة ${authorEsc} داخل دووودة`
        : `This work was created by ${authorEsc} inside Doooda.`)
    : '';

  const css = `
    body {
      font-family: ${isRTL ? "'Amiri', serif" : "serif"};
      font-size: 1em;
      line-height: 1.8;
      direction: ${dir};
      text-align: ${isRTL ? 'justify' : 'left'};
      margin: 0;
      padding: 0;
      color: #111;
    }
    h1 {
      font-size: 1.6em;
      margin: 2em 0 1em;
      text-align: center;
      page-break-before: always;
    }
    h1:first-child { page-break-before: avoid; }
    p {
      margin: 0 0 0.6em;
      text-indent: ${isRTL ? '1.25cm' : '1.5em'};
    }
    p:first-of-type { text-indent: 0; }
    nav[epub|type="toc"] { page-break-before: always; page-break-after: always; }
    nav ol { padding: 0; }
    nav li { list-style: none; padding: 4px 0; }
    nav a { text-decoration: none; color: inherit; }
    .doooda-footer {
      margin-top: 3em;
      padding-top: 1em;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 0.8em;
      color: #aaa;
      font-style: italic;
    }
    .doooda-footer p { text-indent: 0; }
  `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8" />
<title>${titleEsc}</title>
<meta name="author" content="${authorEsc}" />
${descEsc ? `<meta name="description" content="${descEsc}" />` : ''}
<style>${css}</style>
</head>
<body>
<header epub:type="cover" style="page-break-after:always;">
  <h1 style="text-align:center;padding-top:3em;">${titleEsc}</h1>
  ${author ? `<p style="text-align:center;font-size:1.1em;">${authorEsc}</p>` : ''}
</header>
${tocHtml}
${sectionsHtml}
${kindleFooterText ? `<footer class="doooda-footer"><p>${kindleFooterText}</p></footer>` : ''}
</body>
</html>`;
}
