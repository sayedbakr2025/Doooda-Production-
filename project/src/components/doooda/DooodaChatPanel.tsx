import { useState, useEffect, useRef, useCallback, FormEvent } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { t } from '../../utils/translations';
import { useDooodaAccess } from './useDooodaAccess';
import { supabase, invokeWithAuth } from '../../lib/supabaseClient';
import { askDoooda } from '../../api/askDoooda';
import { type WritingModeId, inferWritingMode } from './writingModes';
import { checkAbuse, resetAbuseTracker } from './abuseProtection';

function playReplySound() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // metallic click
    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.connect(clickGain);
    clickGain.connect(ctx.destination);
    click.type = 'square';
    click.frequency.setValueAtTime(1800, now);
    click.frequency.exponentialRampToValueAtTime(60, now + 0.04);
    clickGain.gain.setValueAtTime(0.08, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    click.start(now);
    click.stop(now + 0.04);

    // carriage ding (bell)
    const bell = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bell.connect(bellGain);
    bellGain.connect(ctx.destination);
    bell.type = 'sine';
    bell.frequency.setValueAtTime(2400, now + 0.06);
    bell.frequency.exponentialRampToValueAtTime(2800, now + 0.09);
    bellGain.gain.setValueAtTime(0, now + 0.05);
    bellGain.gain.linearRampToValueAtTime(0.1, now + 0.06);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    bell.start(now + 0.05);
    bell.stop(now + 0.2);

    // subtle strike thud
    const noise = ctx.createOscillator();
    const noiseGain = ctx.createGain();
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.type = 'triangle';
    noise.frequency.setValueAtTime(150, now + 0.01);
    noise.frequency.exponentialRampToValueAtTime(40, now + 0.05);
    noiseGain.gain.setValueAtTime(0.06, now + 0.01);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    noise.start(now + 0.01);
    noise.stop(now + 0.05);
  } catch {}
}
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
import {
  createSupportTicket,
  addSupportMessage,
  getSupportMessages,
  getUserTickets,
  markSupportMessagesRead,
} from '../../services/api';
import type { SupportTicket } from '../../types';

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

type ChatMode = 'ask_doooda' | 'support';

export default function DooodaChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [contextText, setContextText] = useState<string | null>(null);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [activeMode, setActiveMode] = useState<WritingModeId>('explain');
  const [sessionLang, setSessionLang] = useState<SessionLang | null>(null);
  const [writingCtx, setWritingCtx] = useState<WritingContext | null>(null);
  const [tokensBalance, setTokensBalance] = useState<number | null>(null);
  const [chatMode, setChatMode] = useState<ChatMode>('ask_doooda');
  const [supportTicket, setSupportTicket] = useState<SupportTicket | null>(null);
  const [ticketList, setTicketList] = useState<SupportTicket[]>([]);
  const [showTicketList, setShowTicketList] = useState(false);
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
      setChatMode('ask_doooda');
      setSupportTicket(null);
      setTicketList([]);
      setShowTicketList(false);
      resetAbuseTracker();
      setSessionLang(null);
      setWritingCtx(null);
    }, 200);
  }, []);

  const switchToAskDoooda = useCallback(() => {
    if (chatMode === 'ask_doooda') return;
    setChatMode('ask_doooda');
    setSupportTicket(null);
    setMessages([{
      id: crypto.randomUUID(),
      text: t('doooda.greeting.neutral', language),
      isUser: false,
      timestamp: new Date(),
    }]);
  }, [chatMode, language]);

  const switchToSupport = useCallback(async () => {
    if (chatMode === 'support') return;
    setChatMode('support');
    setSupportTicket(null);
    setShowTicketList(true);
    setMessages([]);
    if (user) {
      try {
        const tickets = await getUserTickets(user.id);
        setTicketList(tickets);
      } catch (err) {
        console.error('[DooodaChatPanel] load tickets:', err);
      }
    }
  }, [chatMode, user]);

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

  useEffect(() => {
    if (isOpen && chatMode === 'support' && user && supportTicket) {
      (async () => {
        try {
          const msgs = await getSupportMessages(supportTicket.id);
          setMessages(msgs.map((m) => ({
            id: m.id,
            text: m.message,
            isUser: m.sender_type === 'user',
            timestamp: new Date(m.created_at),
          })));
          await markSupportMessagesRead(supportTicket.id, 'admin');
          const tickets = await getUserTickets(user.id);
          setTicketList(tickets);
        } catch (err) {
          console.error('[DooodaChatPanel] loadSupportMessages:', err);
        }
      })();
    }
  }, [isOpen, chatMode, user, supportTicket?.id]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || inputDisabled) return;

    if (chatMode === 'support') {
      await handleSupportSend(trimmed);
      return;
    }

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
      } else if (reason === 'no_plan' || reason === 'no_active_provider') {
        const tokenData = await fetchUserTokens();
        if (tokenData && tokenData.tokens_balance > 0) {
          // User has tokens but check_doooda_access said no_plan — proceed anyway
        } else {
          const noPlanMsg: ChatMessage = {
            id: crypto.randomUUID(),
            text: language === 'ar'
              ? 'لقد نفدت رصيد التوكنز الخاص بك. قم بالترقية أو شراء توكنز إضافية للمتابعة.'
              : 'You have used all your tokens. Upgrade or purchase additional tokens to continue.',
            isUser: false,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, userMsg, noPlanMsg]);
          setInput('');
          return;
        }
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

      playReplySound();

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

  const handleSupportSend = async (text: string) => {
    if (!user) return;
    setInputDisabled(true);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      text,
      isUser: true,
      timestamp: new Date(),
    };
    const confirmId = crypto.randomUUID();
    const confirmMsg: ChatMessage = {
      id: confirmId,
      text: language === 'ar'
        ? '✅ تم استلام رسالتك وسيتم الرد في أسرع وقت ممكن.'
        : '✅ Your message has been received. We will respond as soon as possible.',
      isUser: false,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg, confirmMsg]);
    setInput('');

    try {
      if (!supportTicket) {
        const result = await createSupportTicket(user.id, text);
        setSupportTicket(result as SupportTicket);
        setShowTicketList(false);
        const tickets = await getUserTickets(user.id);
        setTicketList(tickets);
      } else {
        await addSupportMessage(supportTicket.id, text, 'user');
      }
    } catch (err) {
      console.error('[DooodaChatPanel] Support send error:', err);
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        text: language === 'ar'
          ? 'حدث خطأ في إرسال الرسالة. حاول مرة أخرى.'
          : 'Error sending message. Please try again.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setInputDisabled(false);
    }
  };

  const selectTicket = useCallback(async (ticket: SupportTicket) => {
    setSupportTicket(ticket);
    setShowTicketList(false);
    setInputDisabled(true);
    try {
      const msgs = await getSupportMessages(ticket.id);
      setMessages(msgs.map((m) => ({
        id: m.id,
        text: m.message,
        isUser: m.sender_type === 'user',
        timestamp: new Date(m.created_at),
      })));
      await markSupportMessagesRead(ticket.id, 'admin');
    } catch (err) {
      console.error('[DooodaChatPanel] selectTicket error:', err);
    } finally {
      setInputDisabled(false);
    }
  }, []);

  const startNewTicket = useCallback(() => {
    setSupportTicket(null);
    setShowTicketList(false);
    setMessages([{
      id: crypto.randomUUID(),
      text: language === 'ar'
        ? 'أهلاً بك في الدعم الفني! كيف نقدر نساعدك؟'
        : 'Welcome to support! How can we help you?',
      isUser: false,
      timestamp: new Date(),
    }]);
  }, [language]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
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
                {chatMode === 'support'
                  ? (language === 'ar' ? 'الدعم الفني' : 'Technical Support')
                  : t('doooda.subtitle', language)}
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
            <button
              onClick={switchToAskDoooda}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: chatMode === 'ask_doooda' ? 'var(--color-accent)' : 'transparent',
                color: chatMode === 'ask_doooda' ? '#fff' : 'var(--color-text-secondary)',
                border: chatMode === 'ask_doooda' ? 'none' : '1px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (chatMode !== 'ask_doooda') {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                }
              }}
              onMouseLeave={(e) => {
                if (chatMode !== 'ask_doooda') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              {language === 'ar' ? 'اسأل دووودة' : 'Ask Doooda'}
            </button>
            <button
              onClick={switchToSupport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: chatMode === 'support' ? 'var(--color-accent)' : 'transparent',
                color: chatMode === 'support' ? '#fff' : 'var(--color-text-secondary)',
                border: chatMode === 'support' ? 'none' : '1px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (chatMode !== 'support') {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                }
              }}
              onMouseLeave={(e) => {
                if (chatMode !== 'support') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {language === 'ar' ? 'الدعم' : 'Support'}
            </button>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
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
          {chatMode === 'support' && showTicketList && (
            <div className="space-y-2">
              <button
                onClick={startNewTicket}
                className="w-full text-left rounded-xl px-4 py-3 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: '#fff',
                }}
              >
                {language === 'ar' ? '➕ تذكرة جديدة' : '➕ New Ticket'}
              </button>
              {ticketList.length > 0 && (
                <>
                  <div className="text-xs font-medium pt-2" style={{ color: 'var(--color-text-tertiary)' }}>
                    {language === 'ar' ? 'تذاكرك النشطة:' : 'Your active tickets:'}
                  </div>
                  {ticketList.map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => selectTicket(ticket)}
                      className="w-full text-left rounded-xl px-4 py-3 text-sm transition-colors"
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium" style={{ maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ticket.title || (language === 'ar' ? 'بدون عنوان' : 'No title')}
                        </span>
                        <span className="text-xs" style={{
                          color: ticket.status === 'open' ? '#22c55e' : ticket.status === 'answered' ? '#3b82f6' : '#f59e0b',
                        }}>
                          {language === 'ar'
                            ? ({ open: 'مفتوح', answered: 'تم الرد', pending: 'قيد الانتظار' } as Record<string, string>)[ticket.status] || ticket.status
                            : ticket.status}
                        </span>
                      </div>
                      <div className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                        #{ticket.id.slice(0, 8)} · {new Date(ticket.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}

          {!(chatMode === 'support' && showTicketList) && (chatMode === 'ask_doooda' && (contextText || (writingCtx && contextLevel && contextLevel !== 'project'))) && (
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

        {/* Support ticket status & nav */}
        {chatMode === 'support' && supportTicket && !showTicketList && (
          <div
            className="flex items-center justify-between px-4 py-1.5 text-xs"
            style={{
              borderTop: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-tertiary)',
            }}
          >
            <button
              onClick={() => { setShowTicketList(true); setSupportTicket(null); setMessages([]); }}
              className="text-xs font-medium"
              style={{ color: 'var(--color-accent)', cursor: 'pointer' }}
            >
              {language === 'ar' ? '← رجوع للتذاكر' : '← Back to tickets'}
            </button>
            <div className="flex items-center gap-3">
              <span>
                {language === 'ar' ? `تذكرة #${supportTicket.id.slice(0, 8)}` : `Ticket #${supportTicket.id.slice(0, 8)}`}
              </span>
              <span style={{
                color: supportTicket.status === 'open'
                  ? '#22c55e'
                  : supportTicket.status === 'answered'
                    ? '#3b82f6'
                    : supportTicket.status === 'pending'
                      ? '#f59e0b'
                      : '#6b7280',
              }}>
                {language === 'ar'
                  ? ({ open: 'مفتوح', answered: 'تم الرد', pending: 'قيد الانتظار', closed: 'مغلق' } as Record<string, string>)[supportTicket.status] || supportTicket.status
                  : supportTicket.status}
              </span>
            </div>
          </div>
        )}

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
            placeholder={chatMode === 'support'
              ? (language === 'ar' ? 'اكتب رسالتك للدعم...' : 'Type your support message...')
              : t('doooda.inputPlaceholder', language)}
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
