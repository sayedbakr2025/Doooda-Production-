import type { CharacterContext } from './characterAwareMode';

export type ContextLevel = 'selected_text' | 'scene' | 'chapter' | 'logline' | 'project';

export interface WritingContext {
  level: ContextLevel;
  selectedText?: string;
  scene?: { title: string; content: string; summary?: string };
  chapter?: { title: string; number: number; summary?: string };
  logline?: string;
  projectTitle?: string;
  projectType?: string;
  projectId?: string;
  characterContext?: CharacterContext;
  genres?: string[];
  tone?: string;
}

const PRIORITY: ContextLevel[] = ['selected_text', 'scene', 'chapter', 'logline', 'project'];

export function resolveContextLevel(ctx: WritingContext): ContextLevel {
  if (ctx.selectedText) return 'selected_text';
  if (ctx.scene?.content) return 'scene';
  if (ctx.chapter?.summary || ctx.chapter?.title) return 'chapter';
  if (ctx.logline) return 'logline';
  return 'project';
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

export function buildContextBlock(ctx: WritingContext): string {
  const level = resolveContextLevel(ctx);
  const parts: string[] = [];

  if (ctx.projectTitle) {
    parts.push(`[Project: ${ctx.projectTitle}]`);
  }

  if (ctx.characterContext) {
    return '';
  }

  if (level === 'selected_text' && ctx.selectedText) {
    parts.push(`[Selected text]\n${truncate(stripHtml(ctx.selectedText), 2000)}`);
  } else if (level === 'scene' && ctx.scene) {
    parts.push(`[Scene: ${ctx.scene.title}]`);
    if (ctx.scene.summary) {
      parts.push(`Scene reference: ${ctx.scene.summary}`);
    }
    parts.push(truncate(stripHtml(ctx.scene.content), 3000));
  } else if (level === 'chapter' && ctx.chapter) {
    parts.push(`[Chapter ${ctx.chapter.number}: ${ctx.chapter.title}]`);
    if (ctx.chapter.summary) {
      parts.push(ctx.chapter.summary);
    }
  } else if (level === 'logline' && ctx.logline) {
    parts.push(`[Logline]\n${truncate(stripHtml(ctx.logline), 2000)}`);
  }

  return parts.join('\n');
}

export function hasRicherContext(a: ContextLevel, b: ContextLevel): boolean {
  return PRIORITY.indexOf(a) < PRIORITY.indexOf(b);
}
