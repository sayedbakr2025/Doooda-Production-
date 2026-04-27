import type { Chapter, Scene, Project } from '../types';
import type { ExportPreset, PrintReadyOptions } from './ExportPresetEngine';
import { MARGIN_VALUES, LINE_SPACING_VALUES } from './ExportPresetEngine';
import { formatSceneHeader } from './projectTypeConfig';
import { cleanHtmlToStructuredHtml } from './cleanTextForExport';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function stripCommentAnchors(html: string): string {
  return html.replace(/<span[^>]*class="comment-anchor"[^>]*>([\s\S]*?)<\/span>/gi, '$1');
}

function containsHtml(text: string): boolean {
  return /<[a-z][^>]*>|<br\s*\/?>|&nbsp;/i.test(text);
}

function renderContent(content: string): string {
  if (!content) return '';
  let trimmed = content.trim();

  if (containsHtml(trimmed)) {
    trimmed = stripCommentAnchors(trimmed);
    return cleanHtmlToStructuredHtml(trimmed);
  }

  return trimmed
    .split(/\n\n+/)
    .map((para) => {
      const line = para.replace(/\n/g, ' ').trim();
      return line ? `<p>${escapeHtml(line)}</p>` : '';
    })
    .filter(Boolean)
    .join('\n');
}

function renderSceneContent(
  scene: Scene,
  preset: ExportPreset,
  sceneIndex: number
): string {
  const { layoutType } = preset;
  const sceneHeader = formatSceneHeader(scene);
  const sceneNum = preset.pageBehavior.sceneNumbering ? `${sceneIndex + 1}. ` : '';

  if (layoutType === 'screenplay') {
    let html = '';
    if (sceneHeader) {
      html += `<div class="scene-heading">${sceneNum}${escapeHtml(sceneHeader)}</div>`;
    }
    html += `<div class="scene-body">${renderContent(scene.content)}</div>`;
    return html;
  }

  if (layoutType === 'theatre') {
    let html = `<div class="scene-title-theatre">${sceneNum}${escapeHtml(scene.title)}</div>`;
    html += `<div class="scene-body">${renderContent(scene.content)}</div>`;
    return html;
  }

  if (layoutType === 'radio') {
    let html = `<div class="radio-scene-label">${sceneNum}${escapeHtml(scene.title)}</div>`;
    if (scene.background_sound) {
      html += `<div class="sound-cue">[SFX: ${escapeHtml(scene.background_sound)}]</div>`;
    }
    if (scene.sound_cues && scene.sound_cues.length > 0) {
      scene.sound_cues.forEach((cue) => {
        const prefix = cue.type === 'music' ? 'MUSIC' : cue.type === 'sfx' ? 'SFX' : cue.type.toUpperCase();
        html += `<div class="sound-cue">[${prefix}: ${escapeHtml(cue.label)}]</div>`;
      });
    }
    html += `<div class="scene-body">${renderContent(scene.content)}</div>`;
    return html;
  }

  if (layoutType === 'children') {
    let html = '';
    if (preset.pageBehavior.illustrationPlaceholders) {
      html += `<div class="illustration-placeholder">[Illustration]</div>`;
    }
    html += `<div class="scene-body children">${renderContent(scene.content)}</div>`;
    return html;
  }

  return `<div class="scene-body">${renderContent(scene.content)}</div>`;
}

function renderChapter(
  chapter: Chapter,
  scenes: Scene[],
  preset: ExportPreset,
  chapterIndex: number,
  language: 'ar' | 'en',
  showChapterTitles: boolean,
  showSceneTitles: boolean,
  sceneBreak: boolean
): string {
  const containerLabel = language === 'ar'
    ? preset.containerLabel.ar
    : preset.containerLabel.en;

  const pageBreak = preset.pageBehavior.chapterBreak && chapterIndex > 0
    ? ' page-break'
    : '';

  let html = `<div class="chapter${pageBreak}">`;

  if (showChapterTitles) {
    html += `<h2 class="chapter-title">${escapeHtml(containerLabel)} ${chapter.chapter_number}: ${escapeHtml(chapter.title)}</h2>`;
  }

  if (chapter.content) {
    html += `<div class="chapter-intro">${renderContent(chapter.content)}</div>`;
  }

  scenes.forEach((scene, idx) => {
    const scenePageBreak = sceneBreak && idx > 0 ? ' scene-page-break' : '';
    html += `<div class="scene${scenePageBreak}">`;
    if (showSceneTitles && preset.layoutType === 'narrative' && scene.title) {
      html += `<h3 class="scene-title">${escapeHtml(scene.title)}</h3>`;
    }
    html += renderSceneContent(scene, preset, idx);
    html += `</div>`;
  });

  html += `</div>`;
  return html;
}

function buildTOC(
  chapters: Chapter[],
  preset: ExportPreset,
  language: 'ar' | 'en'
): string {
  if (!preset.pageBehavior.tocEnabled) return '';
  const tocTitle = language === 'ar' ? 'فهرس المحتويات' : 'Table of Contents';
  const containerLabel = language === 'ar' ? preset.containerLabel.ar : preset.containerLabel.en;

  let html = `<div class="toc"><h2 class="toc-title">${tocTitle}</h2><ul class="toc-list">`;
  chapters.forEach((ch) => {
    html += `<li class="toc-item">${escapeHtml(containerLabel)} ${ch.chapter_number}: ${escapeHtml(ch.title)}</li>`;
  });
  html += `</ul></div>`;
  return html;
}

function buildFooter(
  language: 'ar' | 'en',
  authorName: string
): string {
  const author = authorName ? escapeHtml(authorName) : '';
  const text = author
    ? (language === 'ar'
        ? `صنع هذا الإبداع بواسطة ${author} داخل دووودة`
        : `This work was created by ${author} inside Doooda.`)
    : (language === 'ar' ? 'أُنشئ بواسطة دووودة' : 'Created with doooda');
  return `<div class="doooda-footer">${text}</div>`;
}

function buildPrintReadyPageRules(
  isRTL: boolean,
  projectTitle: string,
  authorName: string
): string {
  const titleEsc = escapeHtml(projectTitle);
  const authorEsc = escapeHtml(authorName || '');

  if (isRTL) {
    return `
      @page {
        size: 6in 9in;
        margin-top: 0.75in;
        margin-bottom: 0.75in;
      }
      @page :left {
        margin-right: 1in;
        margin-left: 0.75in;
        @top-left {
          content: "${titleEsc}";
          font-size: 9pt;
          color: #666;
        }
        @bottom-left {
          content: counter(page);
          font-size: 9pt;
          color: #444;
        }
      }
      @page :right {
        margin-left: 1in;
        margin-right: 0.75in;
        @top-right {
          content: "${authorEsc}";
          font-size: 9pt;
          color: #666;
        }
        @bottom-right {
          content: counter(page);
          font-size: 9pt;
          color: #444;
        }
      }
      @page :first {
        @top-left { content: ""; }
        @top-right { content: ""; }
        @bottom-left { content: ""; }
        @bottom-right { content: ""; }
      }
    `;
  }

  return `
    @page {
      size: 6in 9in;
      margin-top: 0.75in;
      margin-bottom: 0.75in;
    }
    @page :left {
      margin-left: 1in;
      margin-right: 0.75in;
      @top-left {
        content: "${titleEsc}";
        font-size: 9pt;
        color: #666;
      }
      @bottom-left {
        content: counter(page);
        font-size: 9pt;
        color: #444;
      }
    }
    @page :right {
      margin-right: 1in;
      margin-left: 0.75in;
      @top-right {
        content: "${authorEsc}";
        font-size: 9pt;
        color: #666;
      }
      @bottom-right {
        content: counter(page);
        font-size: 9pt;
        color: #444;
      }
    }
    @page :first {
      @top-left { content: ""; }
      @top-right { content: ""; }
      @bottom-left { content: ""; }
      @bottom-right { content: ""; }
    }
  `;
}

function resolveBodyFontSize(preset: ExportPreset, isRTL: boolean): number {
  if (preset.fontSize && preset.fontSize > 0) return preset.fontSize;
  if (isRTL) return 16;
  return 12;
}

function buildStylesheet(
  preset: ExportPreset,
  printReady: PrintReadyOptions,
  projectTitle: string,
  language: 'ar' | 'en'
): string {
  const margin = MARGIN_VALUES[preset.margins];
  const lineHeight = LINE_SPACING_VALUES[preset.lineSpacing];
  const isRTL = language === 'ar';
  const dir = isRTL ? 'rtl' : 'ltr';
  const bodyFontSize = resolveBodyFontSize(preset, isRTL);

  const pageRules = printReady.enabled
    ? buildPrintReadyPageRules(isRTL, projectTitle, printReady.authorName)
    : `@page { margin: ${margin}; }`;

  const arabicFonts = ['Amiri', 'Tajawal'];
  const selectedFontIsArabic = arabicFonts.includes(preset.font);

  const googleFonts = isRTL
    ? `@import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Tajawal:wght@400;700&display=swap');`
    : `@import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;700&display=swap');`;

  const fontStack = isRTL
    ? (selectedFontIsArabic
        ? `'${preset.font}', 'Traditional Arabic', serif`
        : `'Amiri', 'Traditional Arabic', serif`)
    : preset.font === 'Courier New'
      ? `'Courier New', Courier, monospace`
      : preset.font === 'Times New Roman'
        ? `'Times New Roman', Times, serif`
        : preset.font === 'Georgia'
          ? `Georgia, 'Times New Roman', serif`
          : `'EB Garamond', 'Garamond', 'Times New Roman', Georgia, serif`;

  const textAlign = isRTL ? 'justify' : preset.layoutType === 'screenplay' ? 'left' : 'justify';
  const paragraphIndent = isRTL ? '1.25cm' : '1.5em';
  const paragraphSpacing = isRTL ? '0.6em' : '0.5em';

  const printReadyTypography = printReady.enabled ? `
    p, .scene-body {
      orphans: 3;
      widows: 3;
    }
    .chapter-title {
      page-break-after: avoid;
      orphans: 3;
      widows: 3;
    }
    .scene-heading {
      page-break-after: avoid;
    }
    p {
      margin: 0 0 ${paragraphSpacing};
      text-indent: ${paragraphIndent};
    }
    p:first-of-type {
      text-indent: 0;
    }
  ` : '';

  const screenplayStyles = preset.layoutType === 'screenplay' ? `
    .scene-heading {
      font-family: 'Courier New', monospace;
      font-weight: bold;
      text-transform: uppercase;
      margin: 2em 0 0.5em;
      letter-spacing: 0.05em;
    }
    .scene-body {
      margin: 0 0 1em;
      padding-left: 2.5em;
    }
  ` : '';

  const theatreStyles = preset.layoutType === 'theatre' ? `
    .scene-title-theatre {
      font-weight: bold;
      text-transform: uppercase;
      margin: 2em 0 0.5em;
      border-bottom: 1px solid #ccc;
      padding-bottom: 4px;
    }
    .scene-body em { font-style: italic; color: #555; }
    .scene-body p.dialogue-name { font-weight: bold; margin-bottom: 0.1em; }
    .scene-body p.stage-direction { font-style: italic; color: #555; padding: 0 1.5em; }
  ` : '';

  const radioStyles = preset.layoutType === 'radio' ? `
    .radio-scene-label {
      font-weight: bold;
      margin: 2em 0 0.3em;
      text-transform: uppercase;
    }
    .sound-cue {
      font-style: italic;
      color: #666;
      margin: 0.2em 0;
      font-size: 0.9em;
    }
    .narrator-line {
      font-weight: bold;
      font-variant: small-caps;
      color: #333;
      margin: 0.5em 0 0.2em;
    }
  ` : '';

  const childrenStyles = preset.layoutType === 'children' ? `
    .illustration-placeholder {
      border: 2px dashed #aaa;
      height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
      font-size: 1.2em;
      margin: 1.5em 0;
      border-radius: 8px;
    }
    .children { font-size: 1.1em; line-height: 2; }
    p { margin-bottom: 1em; }
  ` : '';

  return `
    ${googleFonts}
    ${pageRules}
    * { box-sizing: border-box; }
    body {
      font-family: ${fontStack};
      font-size: ${bodyFontSize}pt;
      line-height: ${lineHeight};
      direction: ${dir};
      text-align: ${textAlign};
      color: #111;
      background: #fff;
      counter-reset: page;
    }
    p {
      margin: 0 0 ${paragraphSpacing};
      text-indent: ${paragraphIndent};
    }
    p:first-of-type, .chapter-intro p:first-of-type {
      text-indent: 0;
    }
    .cover { text-align: center; padding: 60px 0 40px; page-break-after: always; }
    .cover h1 { font-size: 2.2em; margin-bottom: 0.3em; }
    .cover .subtitle { color: #666; font-size: 1em; }
    .cover .author { margin-top: 0.5em; font-size: 1.1em; color: #444; }
    .toc { padding: 1em 0; page-break-before: always; page-break-after: always; }
    .toc-title { font-size: 1.4em; margin-bottom: 1em; border-bottom: 2px solid #333; padding-bottom: 0.3em; text-align: center; }
    .toc-list { list-style: none; padding: 0; }
    .toc-item { padding: 4px 0; border-bottom: 1px dotted #ccc; }
    .page-break { page-break-before: always; }
    .scene-page-break { page-break-before: always; }
    .chapter { margin-bottom: 2em; }
    .chapter-title {
      font-size: 1.5em;
      font-weight: bold;
      margin: 0 0 1em;
      padding-bottom: 0.3em;
      text-align: center;
      border-bottom: 2px solid #333;
    }
    .scene-title {
      font-size: 1.1em;
      font-weight: bold;
      margin: 1.5em 0 0.5em;
      color: #333;
    }
    .chapter-intro { color: #444; margin-bottom: 1.5em; font-style: italic; }
    .scene { margin-bottom: 1.5em; }
    .scene-body { margin: 0; }
    .scene-body p { margin: 0 0 ${paragraphSpacing}; }
    .scene-body p:last-child { margin-bottom: 0; }
    .doooda-footer {
      margin-top: 3em;
      padding-top: 1.5em;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 9pt;
      color: #999;
      font-style: italic;
    }
    @media print {
      .page-break { page-break-before: always; }
      .scene-page-break { page-break-before: always; }
    }
    ${printReadyTypography}
    ${screenplayStyles}
    ${theatreStyles}
    ${radioStyles}
    ${childrenStyles}
  `;
}

export interface ExportData {
  project: Project;
  chapters: Chapter[];
  scenesMap: Record<string, Scene[]>;
}

export function renderExportHTML(
  data: ExportData,
  preset: ExportPreset,
  language: 'ar' | 'en',
  printReady: PrintReadyOptions = { enabled: false, authorName: '' }
): string {
  const { project, chapters, scenesMap } = data;
  const isRTL = language === 'ar';
  const css = buildStylesheet(preset, printReady, project.title, language);
  const toc = buildTOC(chapters, preset, language);

  const authorLine = printReady.enabled && printReady.authorName
    ? `<div class="author">${escapeHtml(printReady.authorName)}</div>`
    : '';

  const showChapterTitles = preset.pageBehavior.tocEnabled !== false;
  const showSceneTitles = false;
  const sceneBreak = preset.pageBehavior.sceneBreak ?? false;

  let body = `<div class="cover"><h1>${escapeHtml(project.title)}</h1>${authorLine}</div>`;
  body += toc;

  chapters.forEach((chapter, idx) => {
    const scenes = scenesMap[chapter.id] || [];
    body += renderChapter(chapter, scenes, preset, idx, language, showChapterTitles, showSceneTitles, sceneBreak);
  });

  const footer = buildFooter(language, printReady.authorName);
  if (footer) body += footer;

  return `<!DOCTYPE html>
<html lang="${language}" dir="${isRTL ? 'rtl' : 'ltr'}">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(project.title)}</title>
<style>${css}</style>
</head>
<body>${body}</body>
</html>`;
}
