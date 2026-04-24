import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

interface PromoPopup {
  id: string;
  title_ar: string;
  title_en: string;
  body_ar: string;
  body_en: string;
  image_url: string | null;
  trigger_mode: 'once' | 'always';
  is_active: boolean;
}

export default function PromoPopup() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [popup, setPopup] = useState<PromoPopup | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadActivePopup();
  }, [user]);

  async function loadActivePopup() {
    try {
      const { data: popups } = await supabase
        .from('promo_popups')
        .select('*')
        .eq('is_active', true)
        .limit(1);

      if (!popups || popups.length === 0) return;

      const activePopup = popups[0] as PromoPopup;

      if (activePopup.trigger_mode === 'once') {
        const { data: view } = await supabase
          .from('promo_popup_views')
          .select('id')
          .eq('popup_id', activePopup.id)
          .eq('user_id', user!.id)
          .maybeSingle();

        if (view) return;
      }

      setPopup(activePopup);
      setVisible(true);
    } catch (err) {
      console.error('Failed to load promo popup:', err);
    }
  }

  async function handleClose() {
    setVisible(false);
    if (!popup || !user) return;

    try {
      await supabase
        .from('promo_popup_views')
        .upsert({ popup_id: popup.id, user_id: user.id }, { onConflict: 'popup_id,user_id' });
    } catch (err) {
      console.error('Failed to record popup view:', err);
    }

    setTimeout(() => setPopup(null), 300);
  }

  if (!popup || !visible) return null;

  const isRtl = language === 'ar';
  const title = isRtl ? popup.title_ar : popup.title_en;
  const body = isRtl ? popup.body_ar : popup.body_en;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-popup"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <button
          onClick={handleClose}
          className="absolute top-3 z-10 p-2 rounded-full transition-colors"
          style={{
            [isRtl ? 'left' : 'right']: '12px',
            backgroundColor: 'var(--color-bg-secondary)',
            color: 'var(--color-text-tertiary)',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-tertiary)')}
        >
          <X className="w-4 h-4" />
        </button>

        <div className={`flex ${popup.image_url ? (isRtl ? 'flex-row-reverse' : 'flex-row') : 'flex-col'}`}>
          {popup.image_url && (
            <div
              className="shrink-0"
              style={{ width: '220px', minHeight: '220px' }}
            >
              <img
                src={popup.image_url}
                alt=""
                className="w-full h-full object-cover"
                style={{ minHeight: '220px', maxHeight: '320px' }}
              />
            </div>
          )}

          <div className="flex flex-col justify-center p-8 flex-1 min-w-0">
            {title && (
              <h2
                className="text-xl font-bold mb-3 leading-snug"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {title}
              </h2>
            )}
            {body && (
              <p
                className="text-sm leading-relaxed whitespace-pre-line"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {body}
              </p>
            )}

            <button
              onClick={handleClose}
              className="mt-6 self-start px-5 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: '#fff',
              }}
            >
              {isRtl ? 'حسنًا، شكرًا!' : 'Got it, thanks!'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes popup-in {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-popup {
          animation: popup-in 0.25s cubic-bezier(0.34,1.56,0.64,1) both;
        }
      `}</style>
    </div>
  );
}
