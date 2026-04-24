import type { WritingContext } from './dooodaContext';

export function dispatchAskDoooda(selectedText: string, writingContext?: Partial<WritingContext>) {
  const ctx: WritingContext = {
    level: 'selected_text',
    selectedText,
    ...writingContext,
  };

  window.dispatchEvent(
    new CustomEvent('open-doooda-chat', {
      detail: {
        source: 'context-menu' as const,
        selectedText,
        writingContext: ctx,
      },
    })
  );
}

export function dispatchOpenDoooda(writingContext?: Partial<WritingContext>) {
  window.dispatchEvent(
    new CustomEvent('toggle-doooda-chat', {
      detail: {
        source: 'floating-button' as const,
        writingContext: writingContext ?? undefined,
      },
    })
  );
}
