import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import useVoiceToText, { type DetectedCommand } from '../hooks/useVoiceToText';
import { resolveCommand } from '../utils/voiceCommands';

function insertAtCursor(editor: HTMLDivElement, text: string) {
  editor.focus();
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    document.execCommand('insertText', false, text);
    return;
  }

  if (!text.includes('\n')) {
    document.execCommand('insertText', false, text);
    return;
  }

  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) {
    document.execCommand('insertText', false, text);
    return;
  }

  range.deleteContents();

  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) {
      const br = document.createElement('br');
      range.insertNode(br);
      range.setStartAfter(br);
      range.collapse(true);
    }
    if (lines[i]) {
      const t = document.createTextNode(lines[i]);
      range.insertNode(t);
      range.setStartAfter(t);
      range.collapse(true);
    }
  }

  const newRange = document.createRange();
  newRange.setStart(range.endContainer, range.endOffset);
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);
}

interface VoiceToTextButtonProps {
  editorRef: React.RefObject<HTMLDivElement | null>;
  onContentChange?: (e?: any) => void;
}

export default function VoiceToTextButton({ editorRef, onContentChange }: VoiceToTextButtonProps) {
  const { language } = useLanguage();
  const isRtl = language === 'ar';
  const [lastCommand, setLastCommand] = useState<DetectedCommand | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const commandTimeoutRef = useRef<NodeJS.Timeout>();
  const langRef = useRef<'ar-EG' | 'en-US'>(isRtl ? 'ar-EG' : 'en-US');

  const {
    isListening,
    interimTranscript,
    detectedCommands,
    stopListening,
    toggleListening,
    isSupported,
    lang,
    setLang,
  } = useVoiceToText({
    lang: isRtl ? 'ar-EG' : 'en-US',
    onFinalTranscript: (text) => {
      if (!editorRef.current) return;

      const commands = [];
      let remaining = text;
      const prefixRe = langRef.current === 'ar-EG' ? /[اأ]مر\s+/g : /do command\s+/g;
      let pm: RegExpExecArray | null;

      while ((pm = prefixRe.exec(remaining)) !== null) {
        const after = remaining.slice(pm.index + pm[0].length);
        let found = false;
        for (let wc = 3; wc >= 1 && !found; wc--) {
          const wr = new RegExp(`^(\\S+(?:\\s+\\S+){0,${wc - 1}})`);
          const wm = wr.exec(after);
          if (!wm) continue;
          const cmd = wm[1].trim();
          const symbol = resolveCommand(cmd, langRef.current);
          if (symbol === null) continue;

          let fullLen = pm[0].length + wm[0].length;
          const sufRe = langRef.current === 'ar-EG' ? /^\s+(?:ا)?نف[ذد]/ : /^\s+go/;
          const sufM = sufRe.exec(after.slice(wm[0].length));
          if (sufM) fullLen += sufM[0].length;

          commands.push({ start: pm.index, end: pm.index + fullLen, symbol });
          found = true;
        }
      }

      if (commands.length === 0) {
        insertAtCursor(editorRef.current, text + ' ');
        onContentChange?.();
        return;
      }

      let lastEnd = 0;
      for (const cmd of commands) {
        if (cmd.start > lastEnd) {
          insertAtCursor(editorRef.current, remaining.slice(lastEnd, cmd.start));
        }

        insertAtCursor(editorRef.current, cmd.symbol);

        lastEnd = cmd.end;
        setLastCommand({ command: '', fullMatch: '', index: cmd.start });
      }

      if (lastEnd < remaining.length) {
        insertAtCursor(editorRef.current, remaining.slice(lastEnd) + ' ');
      }

      setTimeout(() => setLastCommand(null), 300);
      onContentChange?.();
    },
  });

  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  useEffect(() => {
    return () => {
      if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
    };
  }, []);

  if (!isSupported) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={toggleListening}
        className="p-2 rounded flex items-center justify-center transition-all"
        style={{
          backgroundColor: isListening ? 'rgba(239,68,68,0.15)' : 'transparent',
          color: isListening ? 'rgb(239,68,68)' : 'var(--editor-toolbar-text)',
          width: '36px',
          height: '36px',
        }}
        onMouseEnter={(e) => {
          if (!isListening) e.currentTarget.style.backgroundColor = 'var(--editor-toolbar-hover)';
        }}
        onMouseLeave={(e) => {
          if (!isListening) e.currentTarget.style.backgroundColor = 'transparent';
        }}
        title={isRtl ? 'إملاء صوتي' : 'Voice dictation'}
      >
        {isListening ? (
          <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>

      {isListening && (
        <div
          className="absolute top-full mt-1 z-50 rounded-lg shadow-lg px-2 py-1.5 flex items-center gap-2"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            [isRtl ? 'right' : 'left']: 0,
            whiteSpace: 'nowrap',
          }}
        >
          <span className="flex gap-0.5">
            <span className="w-1 h-3 rounded-full animate-pulse" style={{ backgroundColor: 'rgb(239,68,68)', animationDelay: '0ms' }} />
            <span className="w-1 h-3 rounded-full animate-pulse" style={{ backgroundColor: 'rgb(239,68,68)', animationDelay: '150ms' }} />
            <span className="w-1 h-3 rounded-full animate-pulse" style={{ backgroundColor: 'rgb(239,68,68)', animationDelay: '300ms' }} />
          </span>

          {interimTranscript && (
            <span className="text-xs max-w-[180px] overflow-hidden text-ellipsis" style={{ color: 'rgb(239,68,68)' }} dir={lang === 'ar-EG' ? 'rtl' : 'ltr'}>
              {interimTranscript}
            </span>
          )}

          {lastCommand && (
            <span className="text-xs font-semibold" style={{ color: 'rgb(59,130,246)' }}>
              {isRtl ? 'أمر: ' : 'Cmd: '}{lastCommand.command}
            </span>
          )}

          {detectedCommands.length > 0 && !lastCommand && (
            <span className="text-xs" style={{ color: 'rgb(59,130,246)' }}>
              {detectedCommands.length}
            </span>
          )}

          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as 'ar-EG' | 'en-US')}
            className="text-xs px-1 py-0.5 rounded outline-none cursor-pointer"
            style={{
              backgroundColor: 'var(--color-muted)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
            }}
          >
            <option value="ar-EG">عربي</option>
            <option value="en-US">EN</option>
          </select>

          <button
            onClick={() => { stopListening(); }}
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ color: 'var(--color-error)' }}
          >
            {isRtl ? 'إيقاف' : 'Stop'}
          </button>
        </div>
      )}
    </div>
  );
}
