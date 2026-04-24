import { useEffect, useRef } from 'react';

const MAX_IMAGE_BYTES = 100 * 1024;

interface UseEditorImagesOptions {
  editorRef: React.RefObject<HTMLDivElement>;
  language: 'ar' | 'en';
  onContentChange: (html: string) => void;
}

export function useEditorImages({ editorRef, language, onContentChange }: UseEditorImagesOptions) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeImageRef = useRef<HTMLImageElement | null>(null);
  const resizeDragRef = useRef<{
    startX: number;
    startWidth: number;
    side: 'left' | 'right';
    img: HTMLImageElement;
    wrapper: HTMLElement;
  } | null>(null);

  useEffect(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    input.addEventListener('change', handleFileSelected);
    document.body.appendChild(input);
    fileInputRef.current = input;

    return () => {
      input.removeEventListener('change', handleFileSelected);
      document.body.removeChild(input);
    };
  }, []);

  function handleFileSelected(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    (e.target as HTMLInputElement).value = '';

    if (!file.type.startsWith('image/')) {
      alert(language === 'ar' ? 'الملف المحدد ليس صورة' : 'Selected file is not an image');
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      alert(
        language === 'ar'
          ? `حجم الصورة يتجاوز الحد المسموح (100 كيلوبايت). الحجم الحالي: ${Math.round(file.size / 1024)} كيلوبايت`
          : `Image exceeds the 100KB limit. Current size: ${Math.round(file.size / 1024)}KB`
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      insertImageInEditor(src);
    };
    reader.readAsDataURL(file);
  }

  function insertImageInEditor(src: string) {
    const editor = editorRef.current;
    if (!editor) return;

    const wrapper = createImageWrapper(src, 300, 'center');
    editor.focus();

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.collapse(false);
      range.insertNode(wrapper);
      range.setStartAfter(wrapper);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      editor.appendChild(wrapper);
    }

    onContentChange(editor.innerHTML);
  }

  function createImageWrapper(src: string, width: number, alignment: 'left' | 'center' | 'right'): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-image-wrapper', 'true');
    wrapper.setAttribute('contenteditable', 'false');
    wrapper.style.cssText = getWrapperStyle(width, alignment);
    wrapper.setAttribute('data-alignment', alignment);
    wrapper.setAttribute('data-width', String(width));

    const img = document.createElement('img');
    img.src = src;
    img.draggable = false;
    img.style.cssText = 'width: 100%; display: block; border-radius: 4px; pointer-events: none;';

    const handleLeft = createHandle('left');
    const handleRight = createHandle('right');
    const toolbar = createAlignmentToolbar(alignment, wrapper, img, handleLeft, handleRight);

    wrapper.appendChild(toolbar);
    wrapper.appendChild(img);
    wrapper.appendChild(handleLeft);
    wrapper.appendChild(handleRight);

    wrapper.addEventListener('click', (e) => {
      e.stopPropagation();
      selectImage(wrapper);
    });

    handleLeft.addEventListener('mousedown', (e) => startResize(e, 'left', wrapper, img));
    handleRight.addEventListener('mousedown', (e) => startResize(e, 'right', wrapper, img));

    return wrapper;
  }

  function createHandle(side: 'left' | 'right'): HTMLElement {
    const handle = document.createElement('div');
    handle.setAttribute('data-handle', side);
    handle.style.cssText = `
      position: absolute;
      ${side}: -6px;
      top: 50%;
      transform: translateY(-50%);
      width: 12px;
      height: 28px;
      background-color: var(--color-accent, #3b82f6);
      border-radius: 3px;
      cursor: ew-resize;
      z-index: 10;
      display: none;
    `;
    return handle;
  }

  function createAlignmentToolbar(
    alignment: 'left' | 'center' | 'right',
    wrapper: HTMLElement,
    _img: HTMLImageElement,
    _handleLeft: HTMLElement,
    _handleRight: HTMLElement
  ): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.setAttribute('data-image-toolbar', 'true');
    toolbar.style.cssText = `
      position: absolute;
      top: -40px;
      left: 50%;
      transform: translateX(-50%);
      display: none;
      gap: 3px;
      background-color: var(--color-bg-primary, #fff);
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 6px;
      padding: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      z-index: 20;
      white-space: nowrap;
    `;
    toolbar.style.display = 'none';

    const alignButtons: Array<{ align: 'left' | 'center' | 'right'; icon: string; title: string }> = [
      {
        align: 'left',
        icon: '<path d="M4 6h16M4 12h10M4 18h16"/>',
        title: language === 'ar' ? 'محاذاة يسار' : 'Align left',
      },
      {
        align: 'center',
        icon: '<path d="M4 6h16M7 12h10M4 18h16"/>',
        title: language === 'ar' ? 'محاذاة وسط' : 'Align center',
      },
      {
        align: 'right',
        icon: '<path d="M4 6h16M10 12h10M4 18h16"/>',
        title: language === 'ar' ? 'محاذاة يمين' : 'Align right',
      },
    ];

    alignButtons.forEach(({ align, icon, title }) => {
      const btn = document.createElement('button');
      btn.title = title;
      btn.setAttribute('data-align-btn', align);
      btn.style.cssText = `
        padding: 3px 7px;
        border-radius: 4px;
        border: none;
        cursor: pointer;
        background-color: ${alignment === align ? 'var(--color-accent, #3b82f6)' : 'transparent'};
        color: ${alignment === align ? '#fff' : 'var(--color-text-secondary, #6b7280)'};
        display: inline-flex;
        align-items: center;
        justify-content: center;
      `;
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icon}</svg>`;
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        applyAlignment(wrapper, align, toolbar);
        onContentChange(editorRef.current?.innerHTML || '');
      });
      toolbar.appendChild(btn);
    });

    const sep = document.createElement('div');
    sep.style.cssText = 'width: 1px; background-color: var(--color-border, #e5e7eb); margin: 2px 3px; display: inline-block; height: 18px; vertical-align: middle;';
    toolbar.appendChild(sep);

    const deleteBtn = document.createElement('button');
    deleteBtn.title = language === 'ar' ? 'حذف الصورة' : 'Delete image';
    deleteBtn.style.cssText = `
      padding: 3px 7px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      background-color: transparent;
      color: var(--color-error, #ef4444);
      display: inline-flex;
      align-items: center;
      justify-content: center;
    `;
    deleteBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>`;
    deleteBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      wrapper.remove();
      onContentChange(editorRef.current?.innerHTML || '');
    });
    toolbar.appendChild(deleteBtn);

    return toolbar;
  }

  function applyAlignment(wrapper: HTMLElement, alignment: 'left' | 'center' | 'right', toolbar: HTMLElement) {
    wrapper.setAttribute('data-alignment', alignment);
    const width = parseInt(wrapper.getAttribute('data-width') || '300');
    wrapper.style.cssText = getWrapperStyle(width, alignment);

    toolbar.querySelectorAll('[data-align-btn]').forEach((btn) => {
      const btnEl = btn as HTMLElement;
      const btnAlign = btnEl.getAttribute('data-align-btn');
      btnEl.style.backgroundColor = btnAlign === alignment ? 'var(--color-accent, #3b82f6)' : 'transparent';
      btnEl.style.color = btnAlign === alignment ? '#fff' : 'var(--color-text-secondary, #6b7280)';
    });
  }

  function getWrapperStyle(width: number, alignment: 'left' | 'center' | 'right'): string {
    const marginLeft = alignment === 'center' ? 'auto' : alignment === 'right' ? 'auto' : '0';
    const marginRight = alignment === 'center' ? 'auto' : alignment === 'right' ? '0' : 'auto';
    return `
      display: block;
      position: relative;
      width: ${width}px;
      margin: 8px ${marginRight} 8px ${marginLeft};
      outline: none;
      border-radius: 4px;
      user-select: none;
    `;
  }

  function selectImage(wrapper: HTMLElement) {
    if (activeImageRef.current && activeImageRef.current !== wrapper.querySelector('img')) {
      deselectAllImages();
    }

    const img = wrapper.querySelector('img') as HTMLImageElement;
    activeImageRef.current = img;

    wrapper.style.outline = '2px solid var(--color-accent, #3b82f6)';

    const toolbar = wrapper.querySelector('[data-image-toolbar]') as HTMLElement;
    if (toolbar) toolbar.style.display = 'flex';

    const handleLeft = wrapper.querySelector('[data-handle="left"]') as HTMLElement;
    const handleRight = wrapper.querySelector('[data-handle="right"]') as HTMLElement;
    if (handleLeft) handleLeft.style.display = 'block';
    if (handleRight) handleRight.style.display = 'block';
  }

  function deselectAllImages() {
    const editor = editorRef.current;
    if (!editor) return;
    editor.querySelectorAll('[data-image-wrapper]').forEach((wrapper) => {
      (wrapper as HTMLElement).style.outline = 'none';
      const toolbar = wrapper.querySelector('[data-image-toolbar]') as HTMLElement;
      if (toolbar) toolbar.style.display = 'none';
      const handleLeft = wrapper.querySelector('[data-handle="left"]') as HTMLElement;
      const handleRight = wrapper.querySelector('[data-handle="right"]') as HTMLElement;
      if (handleLeft) handleLeft.style.display = 'none';
      if (handleRight) handleRight.style.display = 'none';
    });
    activeImageRef.current = null;
  }

  function startResize(e: MouseEvent, side: 'left' | 'right', wrapper: HTMLElement, img: HTMLImageElement) {
    e.preventDefault();
    e.stopPropagation();
    resizeDragRef.current = {
      startX: e.clientX,
      startWidth: parseInt(wrapper.getAttribute('data-width') || '300'),
      side,
      img,
      wrapper,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizeDragRef.current) return;
      const { startX, startWidth, side: dragSide, wrapper: w } = resizeDragRef.current;
      const delta = dragSide === 'right' ? moveEvent.clientX - startX : startX - moveEvent.clientX;
      const newWidth = Math.max(80, Math.min(800, startWidth + delta));
      w.style.width = `${newWidth}px`;
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      if (!resizeDragRef.current) return;
      const { startX, startWidth, side: dragSide, wrapper: w } = resizeDragRef.current;
      const delta = dragSide === 'right' ? upEvent.clientX - startX : startX - upEvent.clientX;
      const newWidth = Math.max(80, Math.min(800, startWidth + delta));
      w.style.width = `${newWidth}px`;
      w.setAttribute('data-width', String(newWidth));
      resizeDragRef.current = null;
      onContentChange(editorRef.current?.innerHTML || '');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleEditorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const wrapper = target.closest('[data-image-wrapper]') as HTMLElement | null;
      if (!wrapper) {
        deselectAllImages();
      }
    };

    editor.addEventListener('click', handleEditorClick);
    return () => editor.removeEventListener('click', handleEditorClick);
  }, [editorRef]);

  function rehydrateImages() {
    const editor = editorRef.current;
    if (!editor) return;

    editor.querySelectorAll('[data-image-wrapper]').forEach((existingWrapper) => {
      const wrapper = existingWrapper as HTMLElement;
      const img = wrapper.querySelector('img') as HTMLImageElement | null;
      if (!img) return;

      if (wrapper.querySelector('[data-image-toolbar]')) return;

      const alignment = (wrapper.getAttribute('data-alignment') as 'left' | 'center' | 'right') || 'center';
      const width = parseInt(wrapper.getAttribute('data-width') || '300');

      wrapper.style.cssText = getWrapperStyle(width, alignment);

      const handleLeft = createHandle('left');
      const handleRight = createHandle('right');
      const toolbar = createAlignmentToolbar(alignment, wrapper, img, handleLeft, handleRight);

      wrapper.insertBefore(toolbar, wrapper.firstChild);
      wrapper.appendChild(handleLeft);
      wrapper.appendChild(handleRight);

      wrapper.addEventListener('click', (e) => {
        e.stopPropagation();
        selectImage(wrapper);
      });

      handleLeft.addEventListener('mousedown', (e) => startResize(e, 'left', wrapper, img));
      handleRight.addEventListener('mousedown', (e) => startResize(e, 'right', wrapper, img));
    });
  }

  function triggerImageUpload() {
    fileInputRef.current?.click();
  }

  return { triggerImageUpload, rehydrateImages };
}
