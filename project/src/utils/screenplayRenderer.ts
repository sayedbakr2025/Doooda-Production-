import type { Chapter, Scene, Project } from '../types';
import type { ScreenplayOptions } from './ExportPresetEngine';
import { cleanTextForExport } from './cleanTextForExport';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const CAMERA_NOTE_PATTERNS = [
  /^(CUT\s+TO\s*:)/i,
  /^(SMASH\s+CUT\s+TO\s*:)/i,
  /^(MATCH\s+CUT\s+TO\s*:)/i,
  /^(DISSOLVE\s+TO\s*:)/i,
  /^(FADE\s+IN\s*:)/i,
  /^(FADE\s+OUT\s*\.?)/i,
  /^(FADE\s+TO\s+BLACK\s*\.?)/i,
  /^(INTERCUT\s+WITH\s*:)/i,
  /^(BACK\s+TO\s+SCENE\s*:?)/i,
  /^(CLOSE\s+(?:UP|ON)\s*:)/i,
  /^(EXTREME\s+CLOSE\s+UP\s*:?)/i,
  /^(WIDE\s+SHOT\s*:?)/i,
  /^(ESTABLISHING\s+SHOT\s*:?)/i,
  /^(POV\s*:?)/i,
  /^(ANGLE\s+ON\s*:)/i,
  /^(INSERT\s*:)/i,
  /^(MONTAGE\s*:?)/i,
  /^(END\s+MONTAGE\s*\.?)/i,
  /^(TITLE\s+CARD\s*:)/i,
  /^(SUPER\s*:)/i,
  /^(OVER\s+BLACK\s*:)/i,
  /^(TIME\s+CUT\s*:?)/i,
];

const PARENTHETICAL_PATTERN = /^\(([^)]*)\)$/;
const CHARACTER_LINE_PATTERN = /^([A-ZÄÖÜÀÁÂÃÉÈÊËÎÏÔÕÙÛÜÑ][A-Z\s\-'\.()]{1,40})$/;

type LineType =
  | 'scene-heading'
  | 'action'
  | 'character'
  | 'parenthetical'
  | 'dialogue'
  | 'transition'
  | 'camera-note'
  | 'blank';

interface ParsedLine {
  type: LineType;
  raw: string;
}

function detectLineType(line: string, prevType: LineType): LineType {
  const trimmed = line.trim();

  if (!trimmed) return 'blank';

  const upper = trimmed.toUpperCase();

  if (/^(INT|EXT|INT\/EXT|EXT\/INT)\b/.test(upper)) return 'scene-heading';

  for (const pat of CAMERA_NOTE_PATTERNS) {
    if (pat.test(trimmed)) return 'transition';
  }

  if (PARENTHETICAL_PATTERN.test(trimmed) && prevType === 'character') return 'parenthetical';
  if (PARENTHETICAL_PATTERN.test(trimmed) && prevType === 'parenthetical') return 'dialogue';
  if (PARENTHETICAL_PATTERN.test(trimmed) && prevType === 'dialogue') return 'parenthetical';

  if (
    CHARACTER_LINE_PATTERN.test(trimmed) &&
    trimmed === upper &&
    trimmed.length >= 2 &&
    trimmed.length <= 40 &&
    (prevType === 'blank' || prevType === 'action' || prevType === 'scene-heading')
  ) {
    return 'character';
  }

  if (prevType === 'character' || prevType === 'parenthetical') return 'dialogue';
  if (prevType === 'dialogue') return 'dialogue';

  return 'action';
}

function parseScreenplayContent(content: string): ParsedLine[] {
  const lines = content.split('\n');
  const result: ParsedLine[] = [];
  let prevType: LineType = 'blank';

  for (const line of lines) {
    const type = detectLineType(line, prevType);
    result.push({ type, raw: line.trim() });
    if (type !== 'blank') prevType = type;
  }

  return result;
}

function renderParsedLines(lines: ParsedLine[], sceneNum: string): string {
  let html = '';
  let inDialogueBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const { type, raw } = lines[i];

    if (type === 'blank') {
      if (inDialogueBlock) {
        html += `</div>`;
        inDialogueBlock = false;
      }
      continue;
    }

    if (type === 'scene-heading') {
      if (inDialogueBlock) { html += `</div>`; inDialogueBlock = false; }
      const label = sceneNum ? `<span class="sp-scene-num">${escapeHtml(sceneNum)}</span>` : '';
      html += `<div class="sp-scene-heading">${label}${escapeHtml(raw.toUpperCase())}</div>`;
      continue;
    }

    if (type === 'transition') {
      if (inDialogueBlock) { html += `</div>`; inDialogueBlock = false; }
      html += `<div class="sp-transition">${escapeHtml(raw.toUpperCase())}</div>`;
      continue;
    }

    if (type === 'action') {
      if (inDialogueBlock) { html += `</div>`; inDialogueBlock = false; }
      html += `<p class="sp-action">${escapeHtml(raw)}</p>`;
      continue;
    }

    if (type === 'character') {
      if (inDialogueBlock) { html += `</div>`; inDialogueBlock = false; }
      html += `<div class="sp-dialogue-block"><div class="sp-character">${escapeHtml(raw.toUpperCase())}</div>`;
      inDialogueBlock = true;
      continue;
    }

    if (type === 'parenthetical') {
      if (!inDialogueBlock) {
        html += `<div class="sp-dialogue-block">`;
        inDialogueBlock = true;
      }
      html += `<div class="sp-parenthetical">${escapeHtml(raw)}</div>`;
      continue;
    }

    if (type === 'dialogue') {
      if (!inDialogueBlock) {
        html += `<div class="sp-dialogue-block">`;
        inDialogueBlock = true;
      }
      html += `<div class="sp-dialogue">${escapeHtml(raw)}</div>`;
      continue;
    }
  }

  if (inDialogueBlock) html += `</div>`;

  return html;
}

function buildSceneHeadingFromMeta(scene: Scene): string {
  if (!scene.scene_type && !scene.location) return '';
  const type = scene.scene_type || 'INT';
  const loc = scene.location ? scene.location.toUpperCase() : '';
  const tod = scene.time_of_day ? ` \u2013 ${scene.time_of_day}` : '';
  return `${type}. ${loc}${tod}`;
}

function renderScene(
  scene: Scene,
  globalSceneIndex: number,
  showSceneNumbers: boolean
): string {
  const sceneLabel = showSceneNumbers ? `${globalSceneIndex + 1}.` : '';
  const metaHeading = buildSceneHeadingFromMeta(scene);

  let html = `<div class="sp-scene">`;

  if (metaHeading) {
    const label = sceneLabel
      ? `<span class="sp-scene-num">${escapeHtml(sceneLabel)}</span>`
      : '';
    html += `<div class="sp-scene-heading">${label}${escapeHtml(metaHeading)}</div>`;
  }

  if (scene.content && scene.content.trim()) {
    const cleanContent = cleanTextForExport(scene.content);
    const parsed = parseScreenplayContent(cleanContent);
    const sceneNumForContent = metaHeading ? '' : sceneLabel;
    html += renderParsedLines(parsed, sceneNumForContent);
  }

  html += `</div>`;
  return html;
}

function estimateRuntime(chapters: Chapter[], scenesMap: Record<string, Scene[]>): number {
  let totalWords = 0;
  for (const ch of chapters) {
    if (ch.content) totalWords += ch.content.split(/\s+/).filter(Boolean).length;
    const scenes = scenesMap[ch.id] || [];
    for (const sc of scenes) {
      if (sc.content) totalWords += sc.content.split(/\s+/).filter(Boolean).length;
    }
  }
  const estimatedPages = totalWords / 150;
  return Math.round(estimatedPages);
}

function buildScreenplayCSS(): string {
  return `
    @page {
      size: 8.5in 11in;
      margin-top: 1in;
      margin-bottom: 1in;
      margin-left: 1.5in;
      margin-right: 1in;
      @top-right {
        content: counter(page) ".";
        font-family: 'Courier New', Courier, monospace;
        font-size: 12pt;
      }
    }
    @page :first {
      @top-right { content: ""; }
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12pt;
      line-height: 1.0;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 0;
      counter-reset: page;
    }
    .sp-cover {
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      page-break-after: always;
    }
    .sp-cover-title {
      font-size: 14pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 1em;
    }
    .sp-cover-author {
      font-size: 12pt;
      margin-top: 0.5em;
    }
    .sp-cover-contact {
      font-size: 10pt;
      margin-top: 3em;
      text-align: left;
      position: absolute;
      bottom: 1.5in;
      left: 1.5in;
    }
    .sp-cover-runtime {
      font-size: 10pt;
      margin-top: 1em;
      color: #555;
    }
    .sp-act {
      margin-bottom: 0;
    }
    .sp-act-title {
      font-size: 12pt;
      font-weight: bold;
      text-transform: uppercase;
      text-align: center;
      margin: 3em 0 2em;
      page-break-before: always;
    }
    .sp-act-title:first-child {
      page-break-before: avoid;
    }
    .sp-scene {
      margin-bottom: 1em;
    }
    .sp-scene-heading {
      font-weight: bold;
      text-transform: uppercase;
      font-size: 12pt;
      margin: 1.5em 0 0.5em;
      page-break-after: avoid;
      position: relative;
    }
    .sp-scene-num {
      position: absolute;
      left: -1.2em;
      color: #333;
    }
    .sp-action {
      margin: 0 0 1em;
      font-size: 12pt;
      line-height: 1.2;
    }
    .sp-dialogue-block {
      margin: 0.5em 0 1em;
      margin-left: 1.6in;
      width: 3.5in;
    }
    .sp-character {
      font-weight: bold;
      text-transform: uppercase;
      text-align: center;
      margin-bottom: 0;
      font-size: 12pt;
    }
    .sp-parenthetical {
      text-align: center;
      font-style: italic;
      margin: 0;
      font-size: 12pt;
    }
    .sp-dialogue {
      text-align: left;
      font-size: 12pt;
      line-height: 1.2;
      margin: 0;
    }
    .sp-transition {
      text-align: right;
      text-transform: uppercase;
      font-weight: bold;
      margin: 1em 0;
      font-size: 12pt;
    }
    .sp-footer {
      margin-top: 4em;
      padding-top: 1.5em;
      border-top: 1px solid #ccc;
      text-align: center;
      font-size: 10pt;
      color: #aaa;
      font-style: italic;
    }
    @media print {
      .sp-act-title { page-break-before: always; }
      .sp-act-title:first-child { page-break-before: avoid; }
    }
  `;
}

export interface ScreenplayExportData {
  project: Project;
  chapters: Chapter[];
  scenesMap: Record<string, Scene[]>;
}

function buildScreenplayFooter(authorName: string): string {
  const author = authorName ? escapeHtml(authorName) : '';
  const text = author
    ? `This work was created by ${author} inside Doooda.`
    : 'Created with doooda';
  return `<div class="sp-footer">${text}</div>`;
}

export function renderScreenplayHTML(
  data: ScreenplayExportData,
  options: ScreenplayOptions
): string {
  const { project, chapters, scenesMap } = data;

  const runtimeMinutes = estimateRuntime(chapters, scenesMap);
  const runtimeLabel = runtimeMinutes > 0
    ? `Approx. ${runtimeMinutes} min (${Math.ceil(runtimeMinutes / 60)}h ${runtimeMinutes % 60}m)`
    : '';

  const authorHtml = options.authorName
    ? `<div class="sp-cover-author">Written by<br>${escapeHtml(options.authorName)}</div>`
    : '';

  const contactHtml = options.contactInfo
    ? `<div class="sp-cover-contact">${escapeHtml(options.contactInfo).replace(/\n/g, '<br>')}</div>`
    : '';

  const runtimeHtml = runtimeLabel
    ? `<div class="sp-cover-runtime">${escapeHtml(runtimeLabel)}</div>`
    : '';

  const cover = `<div class="sp-cover">
  <div class="sp-cover-title">${escapeHtml(project.title)}</div>
  ${authorHtml}
  ${runtimeHtml}
  ${contactHtml}
</div>`;

  let globalSceneIndex = 0;
  let body = cover;

  chapters.forEach((chapter, chIdx) => {
    const scenes = scenesMap[chapter.id] || [];
    const breakClass = chIdx === 0 ? ' first-act' : '';
    body += `<div class="sp-act${breakClass}">`;
    body += `<div class="sp-act-title">${escapeHtml(chapter.title)}</div>`;

    if (chapter.content && chapter.content.trim()) {
      const parsed = parseScreenplayContent(chapter.content);
      body += renderParsedLines(parsed, '');
    }

    scenes.forEach((scene) => {
      body += renderScene(scene, globalSceneIndex, options.showSceneNumbers);
      globalSceneIndex++;
    });

    body += `</div>`;
  });

  body += buildScreenplayFooter(options.authorName);

  const css = buildScreenplayCSS();

  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(project.title)}</title>
<style>${css}</style>
</head>
<body>${body}</body>
</html>`;
}

export function calculateScreenplayRuntime(
  chapters: Chapter[],
  scenesMap: Record<string, Scene[]>
): number {
  return estimateRuntime(chapters, scenesMap);
}
