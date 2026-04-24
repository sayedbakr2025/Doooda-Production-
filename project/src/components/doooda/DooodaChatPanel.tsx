import { useState, useEffect, useRef, useCallback, FormEvent } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { t } from '../../utils/translations';
import { useDooodaAccess } from './useDooodaAccess';
import { supabase, invokeWithAuth } from '../../lib/supabaseClient';
import { askDoooda } from '../../api/askDoooda';
import { type WritingModeId, DEFAULT_MODE, MODE_ORDER, inferWritingMode } from './writingModes';
import { checkAbuse, resetAbuseTracker } from './abuseProtection';
import {
  type SessionLang,
  detectTextLanguage,
  detectLanguageOverride,
  isDominanceClear,
  getClarificationQuestion,
} from './sessionLanguage';
import {
  type WritingContext,
  type ContextLevel,
  resolveContextLevel,
} from './dooodaContext';
import { buildCharacterContext } from './characterAwareMode';

interface UserTokenData {
  id: string;
  plan: string;
  tokens_balance: number;
}

async function fetchUserTokens(): Promise<UserTokenData | null> {
  try {
    const { data, error, requiresAuth } = await invokeWithAuth<UserTokenData>('me', {
      method: 'GET'
    });

    if (requiresAuth) {
      console.warn('[fetchUserTokens] Auth required');
      return null;
    }

    if (error) {
      console.error('[fetchUserTokens] Error:', error);
      return null;
    }

    console.log('[fetchUserTokens] Success:', data);
    return data;
  } catch (err) {
    console.error('[fetchUserTokens] Error:', err);
    return null;
  }
}

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  mode?: WritingModeId;
}

interface OpenDooodaDetail {
  source: 'floating-button' | 'context-menu';
  selectedText?: string;
  writingContext?: WritingContext;
}

function ModeIcon({ mode, size = 14 }: { mode: WritingModeId; size?: number }) {
  if (mode === 'explain') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    );
  }
  if (mode === 'review') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="9" y1="18" x2="15" y2="18" />
      <line x1="10" y1="22" x2="14" y2="22" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
  );
}

export default function DooodaChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [contextText, setContextText] = useState<string | null>(null);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [activeMode, setActiveMode] = useState<WritingModeId>(DEFAULT_MODE);
  const [modeAutoInferred, setModeAutoInferred] = useState(false);
  const [sessionLang, setSessionLang] = useState<SessionLang | null>(null);
  const [writingCtx, setWritingCtx] = useState<WritingContext | null>(null);
  const [tokensBalance, setTokensBalance] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { language } = useLanguage();
  const { user } = useAuth();
  const access = useDooodaAccess();

  const activeLang: SessionLang = sessionLang ?? (language as SessionLang);

  const contextLevel: ContextLevel | null = writingCtx ? resolveContextLevel(writingCtx) : null;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current && !inputDisabled) {
      setTimeout(() => inputRef.current?.focus(), 220);
    }
  }, [isOpen, inputDisabled]);

  useEffect(() => {
    if (isOpen) {
      console.log('[DooodaChatPanel] Panel opened, user:', user?.id);
      fetchUserTokens().then(data => {
        if (data) {
          console.log('[DooodaChatPanel] Setting tokens balance:', data.tokens_balance);
          setTokensBalance(data.tokens_balance);
        } else {
          console.log('[DooodaChatPanel] No token data returned');
        }
      });
    }
  }, [isOpen, user]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setIsOpen(false);
      resetAbuseTracker();
      setSessionLang(null);
      setWritingCtx(null);
    }, 200);
  }, []);

  const openPanel = useCallback(async (detail?: OpenDooodaDetail) => {
    if (detail?.writingContext) {
      if (!detail.writingContext.characterContext && detail.selectedText && detail.writingContext.projectId) {
        const characterContext = await buildCharacterContext(
          detail.selectedText,
          detail.writingContext.projectId
        );
        if (characterContext) {
          detail.writingContext.characterContext = characterContext;
        }
      }
      setWritingCtx(detail.writingContext);
    }

    if (detail?.source === 'context-menu' && detail.selectedText) {
      const detectedLang = detectTextLanguage(detail.selectedText);
      if (detectedLang) setSessionLang(detectedLang);

      const greetingLang = detectedLang ?? language;
      setContextText(detail.selectedText);
      setMessages([{
        id: crypto.randomUUID(),
        text: t('doooda.greeting.context', greetingLang),
        isUser: false,
        timestamp: new Date(),
      }]);
      setInput('');
      setInputDisabled(false);
    } else if (messages.length === 0) {
      setContextText(null);
      setSessionLang(null);
      setMessages([{
        id: crypto.randomUUID(),
        text: t('doooda.greeting.neutral', language),
        isUser: false,
        timestamp: new Date(),
      }]);
      setInputDisabled(false);
    }
    setIsClosing(false);
    setIsOpen(true);
  }, [language, messages.length]);

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const detail = (e as CustomEvent<OpenDooodaDetail>).detail;
      openPanel(detail);
    };

    const handleToggle = (e: Event) => {
      const detail = (e as CustomEvent<OpenDooodaDetail>).detail;
      if (isOpen && !isClosing) {
        handleClose();
      } else if (!isOpen) {
        openPanel(detail);
      }
    };

    window.addEventListener('open-doooda-chat', handleOpen);
    window.addEventListener('toggle-doooda-chat', handleToggle);
    return () => {
      window.removeEventListener('open-doooda-chat', handleOpen);
      window.removeEventListener('toggle-doooda-chat', handleToggle);
    };
  }, [language, isOpen, isClosing, openPanel, handleClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) handleClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || inputDisabled) return;

    const { data: { session } } = await supabase.auth.getSession();

    console.log('[DooodaChatPanel] Session check:', {
      sessionExists: !!session,
      accessTokenExists: !!(session?.access_token),
    });

    if (!session || !session.access_token) {
      console.error('[DooodaChatPanel] No valid session or access token');
      const authMsg: ChatMessage = {
        id: crypto.randomUUID(),
        text: language === 'ar'
          ? 'يجب تسجيل الدخول لاستخدام المساعد.'
          : 'You must be logged in to use Doooda.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, authMsg]);
      setInputDisabled(true);
      return;
    }

    const tokenData = await fetchUserTokens();
    if (tokenData) {
      setTokensBalance(tokenData.tokens_balance);
    }

    const freshAccess = await access.refresh(true);

    if (!freshAccess || !freshAccess.allowed) {
      const reason = freshAccess?.reason;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        text: trimmed,
        isUser: true,
        timestamp: new Date(),
      };

      if (reason === 'daily_limit' || reason === 'monthly_limit') {
        const limitText = reason === 'daily_limit'
          ? t('doooda.limitReached', language)
          : t('doooda.limitReached', language);
        const upgradeHint = language === 'ar'
          ? 'لو حابب نشتغل أكتر، ممكن تترقّى لخطة أعلى وأنا هكون موجود دايمًا.'
          : 'If you\'d like us to work more together, upgrading your plan gives you more time with me.';
        const limitMsg: ChatMessage = {
          id: crypto.randomUUID(),
          text: `${limitText}\n\n${upgradeHint}`,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMsg, limitMsg]);
        setInput('');
      } else {
        const unavailMsg: ChatMessage = {
          id: crypto.randomUUID(),
          text: t('doooda.unavailable', language),
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMsg, unavailMsg]);
        setInput('');
      }
      return;
    }

    const langOverride = detectLanguageOverride(trimmed);
    if (langOverride) {
      setSessionLang(langOverride);
    }

    const currentLang: SessionLang = langOverride ?? activeLang;

    if (!langOverride && !isDominanceClear(trimmed)) {
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        text: trimmed,
        isUser: true,
        timestamp: new Date(),
      };
      const clarifyMsg: ChatMessage = {
        id: crypto.randomUUID(),
        text: getClarificationQuestion(currentLang),
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg, clarifyMsg]);
      setInput('');
      return;
    }

    if (!langOverride) {
      const detected = detectTextLanguage(trimmed);
      if (detected && detected !== activeLang && !sessionLang) {
        setSessionLang(detected);
      }
    }

    const abuseResult = checkAbuse(trimmed, currentLang);

    if (abuseResult.intercepted && abuseResult.response) {
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        text: trimmed,
        isUser: true,
        timestamp: new Date(),
      };
      const redirectMsg: ChatMessage = {
        id: crypto.randomUUID(),
        text: abuseResult.response,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg, redirectMsg]);
      setInput('');
      return;
    }

    const inferred = inferWritingMode(trimmed);
    const resolvedMode = inferred ?? activeMode;
    if (inferred && inferred !== activeMode) {
      setActiveMode(inferred);
      setModeAutoInferred(true);
      setTimeout(() => setModeAutoInferred(false), 2000);
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      text: trimmed,
      isUser: true,
      timestamp: new Date(),
      mode: resolvedMode,
    };

    const pendingId = crypto.randomUUID();
    const pendingReply: ChatMessage = {
      id: pendingId,
      text: t('doooda.thinking', currentLang),
      isUser: false,
      timestamp: new Date(),
      mode: resolvedMode,
    };

    setMessages((prev) => [...prev, userMsg, pendingReply]);
    setInput('');
    setInputDisabled(true);

    try {
      const response = await askDoooda(
        trimmed,
        currentLang,
        contextText || undefined,
        resolvedMode,
        writingCtx || undefined
      );

      if (response.status === 402 || response.type === 'LIMIT_REACHED') {
        const upsellMsg = currentLang === 'ar'
          ? response.error || 'انتهى رصيدك من التوكنز. قم بالترقية أو شراء توكنز إضافية.'
          : response.error || 'Your tokens have run out. Please upgrade or purchase additional tokens.';

        const dooodaMsg: ChatMessage = {
          id: crypto.randomUUID(),
          text: upsellMsg,
          isUser: false,
          timestamp: new Date(),
          mode: resolvedMode,
        };

        setMessages((prev) =>
          prev.filter((m) => m.id !== pendingId).concat(dooodaMsg)
        );

        setInputDisabled(true);

        if (typeof response.tokens_left === 'number') {
          setTokensBalance(response.tokens_left);
        } else {
          const updatedTokenData = await fetchUserTokens();
          if (updatedTokenData) {
            setTokensBalance(updatedTokenData.tokens_balance);
          }
        }
        return;
      }

      const dooodaMsg: ChatMessage = {
        id: crypto.randomUUID(),
        text: response.reply || response,
        isUser: false,
        timestamp: new Date(),
        mode: resolvedMode,
      };

      setMessages((prev) =>
        prev.filter((m) => m.id !== pendingId).concat(dooodaMsg)
      );

      if (typeof response.tokens_left === 'number') {
        setTokensBalance(response.tokens_left);
      } else {
        const updatedTokenData = await fetchUserTokens();
        if (updatedTokenData) {
          setTokensBalance(updatedTokenData.tokens_balance);
        }
      }

      setInputDisabled(false);
    } catch (err) {
      console.error('[DooodaChatPanel] Error calling askDoooda:', err);

      const errorMsg = currentLang === 'ar'
        ? 'تعذر الاتصال بالمساعد حاليًا.'
        : 'Unable to reach Doooda right now.';

      const dooodaErrorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        text: errorMsg,
        isUser: false,
        timestamp: new Date(),
        mode: resolvedMode,
      };

      setMessages((prev) =>
        prev.filter((m) => m.id !== pendingId).concat(dooodaErrorMsg)
      );

      setInputDisabled(false);
    }

    access.invalidateCache();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleModeSelect = (mode: WritingModeId) => {
    setActiveMode(mode);
  };

  if (!isOpen && !isClosing) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[9998]"
        style={{
          backgroundColor: 'rgba(0,0,0,0.3)',
          animation: isClosing
            ? 'dooodaOverlayOut 0.2s ease-in forwards'
            : 'dooodaOverlayIn 0.2s ease-out',
        }}
        onClick={handleClose}
      />

      <div
        className="fixed z-[10000] flex flex-col"
        style={{
          bottom: '100px',
          left: '28px',
          right: 'auto',
          width: '380px',
          maxWidth: 'calc(100vw - 56px)',
          height: '520px',
          maxHeight: 'calc(100vh - 140px)',
          borderRadius: '20px',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          animation: isClosing
            ? 'dooodaPanelOut 0.2s cubic-bezier(0.4, 0, 1, 1) forwards'
            : 'dooodaPanelIn 0.2s cubic-bezier(0, 0, 0.2, 1)',
          transformOrigin: 'bottom left',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-tertiary)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(0,0,0,0.25)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <div className="flex gap-1 items-center">
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#fff', display: 'block' }} />
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--color-accent)', display: 'block' }} />
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#fff', display: 'block' }} />
              </div>
            </div>
            <div>
              <h3
                className="font-semibold text-sm"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {t('doooda.title', language)}
              </h3>
              <span
                className="text-xs"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {t('doooda.subtitle', language)}
              </span>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = 'transparent')
            }
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Mode selector strip */}
        <div
          className="flex items-center justify-between gap-2 px-4 py-2"
          style={{
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          <div className="flex items-center gap-1">
          {MODE_ORDER.map((modeId) => {
            const isActive = activeMode === modeId;
            return (
              <button
                key={modeId}
                onClick={() => handleModeSelect(modeId)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  backgroundColor: isActive
                    ? 'var(--color-accent)'
                    : 'transparent',
                  color: isActive
                    ? '#fff'
                    : 'var(--color-text-secondary)',
                  border: isActive
                    ? 'none'
                    : '1px solid transparent',
                  transform: modeAutoInferred && isActive ? 'scale(1.05)' : 'scale(1)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <ModeIcon mode={modeId} size={13} />
                {t(`doooda.mode.${modeId}`, language)}
              </button>
            );
          })}
          </div>

          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <span>🪙</span>
            <span>{tokensBalance !== null ? tokensBalance.toLocaleString() : '...'}</span>
          </div>
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
          style={{ backgroundColor: 'var(--color-bg-secondary)' }}
        >
          {(contextText || (writingCtx && contextLevel && contextLevel !== 'project')) && (
            <div
              className="rounded-lg px-3 py-2 text-xs mb-2"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border-light)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <span
                className="font-medium block mb-1"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {contextLevel === 'selected_text'
                  ? t('doooda.selectedContext', language)
                  : contextLevel === 'scene' && writingCtx?.scene
                    ? (language === 'ar' ? writingCtx.scene.title : writingCtx.scene.title)
                    : contextLevel === 'chapter' && writingCtx?.chapter
                      ? (language === 'ar'
                        ? `${writingCtx.chapter.title} - ${writingCtx.chapter.number} الفصل`
                        : `Chapter ${writingCtx.chapter.number} - ${writingCtx.chapter.title}`)
                      : contextLevel === 'logline'
                        ? (language === 'ar' ? 'الخط الدرامي' : 'Logline')
                        : t('doooda.selectedContext', language)}
              </span>
              <span className="line-clamp-3">
                {contextText
                  || (writingCtx?.scene?.summary)
                  || (writingCtx?.chapter?.summary)
                  || (writingCtx?.logline ? writingCtx.logline.replace(/<[^>]+>/g, '').slice(0, 200) : '')}
              </span>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="rounded-2xl px-4 py-2.5 max-w-[85%] text-sm"
                style={
                  msg.isUser
                    ? {
                        backgroundColor: 'var(--color-accent)',
                        color: '#fff',
                        borderBottomRightRadius: '6px',
                        borderBottomLeftRadius: '20px',
                      }
                    : {
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-text-primary)',
                        border: '1px solid var(--color-border-light)',
                        borderBottomLeftRadius: '6px',
                        borderBottomRightRadius: '20px',
                      }
                }
              >
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="px-4 py-3 flex items-end gap-2"
          style={{
            borderTop: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={inputDisabled}
            placeholder={t('doooda.inputPlaceholder', language)}
            className="flex-1 resize-none text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 disabled:opacity-50"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              maxHeight: '100px',
            }}
          />
          <button
            type="submit"
            disabled={inputDisabled || !input.trim()}
            className="shrink-0 flex items-center justify-center rounded-xl transition-colors disabled:opacity-40"
            style={{
              width: '40px',
              height: '40px',
              backgroundColor: input.trim() && !inputDisabled
                ? 'var(--color-accent)'
                : 'var(--color-bg-tertiary)',
              color: input.trim() && !inputDisabled ? '#fff' : 'var(--color-text-tertiary)',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    </>
  );
}
