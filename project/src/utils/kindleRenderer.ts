import type { Chapter, Scene, Project } from '../types';
import type { KindleOptions } from './ExportPresetEngine';
import { cleanHtmlToStructuredHtml } from './cleanTextForExport';

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

function renderContent(text: string): string {
  if (!text) return '';
  const trimmed = text.trim();

  if (containsHtml(trimmed)) {
    return cleanHtmlToStructuredHtml(trimmed);
  }

  const cleaned = trimmed
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!cleaned) return '';
  return cleaned
    .split('\n\n')
    .map((para) => {
      const line = para.replace(/\n/g, ' ').trim();
      return line ? `<p>${escapeHtml(line)}</p>` : '';
    })
    .filter(Boolean)
    .join('\n');
}

function buildTocId(chapterIndex: number): string {
  return `ch${chapterIndex + 1}`;
}

function buildKindleTOC(
  chapters: Chapter[],
  containerLabel: string,
  language: 'ar' | 'en'
): string {
  const tocTitle = language === 'ar' ? 'فهرس المحتويات' : 'Table of Contents';

  const items = chapters
    .map((ch, idx) => {
      const id = buildTocId(idx);
      const label = `${containerLabel} ${ch.chapter_number}: ${escapeHtml(ch.title)}`;
      return `      <li><a href="#${id}">${label}</a></li>`;
    })
    .join('\n');

  return `  <nav epub:type="toc" id="toc">
    <h1>${tocTitle}</h1>
    <ol>
${items}
    </ol>
  </nav>`;
}

function buildChapterSection(
  chapter: Chapter,
  scenes: Scene[],
  chapterIndex: number,
  containerLabel: string
): string {
  const id = buildTocId(chapterIndex);
  const heading = `${containerLabel} ${chapter.chapter_number}: ${escapeHtml(chapter.title)}`;

  let html = `  <section epub:type="chapter" id="${id}" aria-labelledby="${id}-title">\n`;
  html += `    <h2 id="${id}-title">${heading}</h2>\n`;

  if (chapter.content && chapter.content.trim()) {
    html += `    <div class="chapter-intro">\n`;
    html += renderContent(chapter.content)
      .split('\n')
      .map((l) => `      ${l}`)
      .join('\n');
    html += `\n    </div>\n`;
  }

  scenes.forEach((scene) => {
    if (!scene.content || !scene.content.trim()) return;
    html += `    <div class="scene">\n`;
    html += renderContent(scene.content)
      .split('\n')
      .map((l) => `      ${l}`)
      .join('\n');
    html += `\n    </div>\n`;
  });

  html += `  </section>`;
  return html;
}

function buildKindleFooter(language: 'ar' | 'en', authorName: string): string {
  const author = authorName ? escapeHtml(authorName) : '';
  const text = author
    ? (language === 'ar'
        ? `صنع هذا الإبداع بواسطة ${author} داخل دووودة`
        : `This work was created by ${author} inside Doooda.`)
    : (language === 'ar' ? 'أُنشئ بواسطة دووودة' : 'Created with doooda');
  return `  <footer epub:type="backmatter" class="doooda-footer">
    <p>${text}</p>
  </footer>`;
}

export interface KindleExportData {
  project: Project;
  chapters: Chapter[];
  scenesMap: Record<string, Scene[]>;
}

export function renderKindleHTML(
  data: KindleExportData,
  options: KindleOptions,
  language: 'ar' | 'en'
): string {
  const { project, chapters, scenesMap } = data;
  const isRTL = language === 'ar';
  const dir = isRTL ? 'rtl' : 'ltr';
  const containerLabel = isRTL ? 'الفصل' : 'Chapter';

  const authorEsc = escapeHtml(options.authorName || '');
  const titleEsc = escapeHtml(project.title);
  const descEsc = escapeHtml(options.description || '');

  const toc = buildKindleTOC(chapters, containerLabel, language);

  const sections = chapters
    .map((ch, idx) => {
      const scenes = scenesMap[ch.id] || [];
      return buildChapterSection(ch, scenes, idx, containerLabel);
    })
    .join('\n\n');

  const footer = buildKindleFooter(language, options.authorName || '');

  const metaDescription = descEsc
    ? `  <meta name="description" content="${descEsc}" />\n`
    : '';

  const metaAuthor = authorEsc
    ? `  <meta name="author" content="${authorEsc}" />\n`
    : '';

  const arabicFontImport = isRTL
    ? `  <style>@import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');</style>\n`
    : '';

  const fontFamily = isRTL ? "'Amiri', serif" : "serif";
  const textIndent = isRTL ? '0' : '1.5em';

  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:epub="http://www.idpf.org/2007/ops"
      xml:lang="${language}"
      lang="${language}"
      dir="${dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${titleEsc}</title>
${metaAuthor}${metaDescription}  <meta name="generator" content="Doooda Export" />
${arabicFontImport}  <style>
    body {
      font-family: ${fontFamily};
      font-size: 1em;
      line-height: 1.8;
      direction: ${dir};
      text-align: ${isRTL ? 'justify' : 'left'};
      margin: 0;
      padding: 0;
    }
    h1 {
      font-size: 1.6em;
      font-weight: bold;
      margin: 1em 0 0.5em;
      text-align: center;
    }
    h2 {
      font-size: 1.3em;
      font-weight: bold;
      margin: 2em 0 0.8em;
      padding-bottom: 0.3em;
      text-align: center;
      border-bottom: 1px solid #ccc;
    }
    p {
      margin: 0 0 0.6em;
      text-indent: ${textIndent};
    }
    p:first-of-type {
      text-indent: 0;
    }
    .chapter-intro {
      font-style: italic;
      color: #555;
      margin-bottom: 1.2em;
    }
    .chapter-intro p {
      text-indent: 0;
    }
    .scene {
      margin-bottom: 1.2em;
    }
    nav[epub|type="toc"] {
      margin-bottom: 2em;
      page-break-before: always;
      page-break-after: always;
    }
    nav[epub|type="toc"] ol {
      list-style: none;
      padding: 0;
    }
    nav[epub|type="toc"] li {
      padding: 0.3em 0;
      border-bottom: 1px dotted #ddd;
    }
    nav[epub|type="toc"] a {
      text-decoration: none;
      color: inherit;
    }
    nav[epub|type="toc"] a:hover {
      text-decoration: underline;
    }
    .cover {
      text-align: center;
      padding: 3em 1em;
      margin-bottom: 2em;
      page-break-after: always;
    }
    .cover h1 {
      font-size: 2em;
      margin-bottom: 0.3em;
    }
    .cover .author {
      font-size: 1.1em;
      color: #555;
      margin-top: 0.4em;
    }
    .cover .description {
      font-size: 0.9em;
      color: #777;
      margin-top: 1em;
      font-style: italic;
    }
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
  </style>
</head>
<body>
  <section epub:type="cover" class="cover">
    <h1>${titleEsc}</h1>
    ${authorEsc ? `<p class="author">${authorEsc}</p>` : ''}
    ${descEsc ? `<p class="description">${descEsc}</p>` : ''}
  </section>

${toc}

${sections}

${footer}
</body>
</html>`;
}
