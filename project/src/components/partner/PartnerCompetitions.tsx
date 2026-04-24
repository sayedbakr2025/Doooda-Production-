import { useState, useEffect } from 'react';
import { Trophy, Plus, FileText, Zap, Calendar, ArrowLeft, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../contexts/LanguageContext';
import type { InstitutionalAccount } from '../../contexts/InstitutionAuthContext';
import PartnerCreateCompetitionModal from './PartnerCreateCompetitionModal';
import PartnerReceivedWorks from './PartnerReceivedWorks';

interface Competition {
  id: string;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  submission_start_at: string;
  submission_end_at: string;
  timezone: string;
  is_active: boolean;
  boost_enabled: boolean;
  boost_budget_tokens: number;
  boost_tokens_spent: number;
  status: 'upcoming' | 'open' | 'expired';
  partner_id: string;
  created_at: string;
}

interface Props {
  institution: InstitutionalAccount;
}

const STATUS_META = {
  open: { label: { ar: 'مفتوح', en: 'Open' }, color: '#16a34a', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)' },
  upcoming: { label: { ar: 'قادم', en: 'Upcoming' }, color: '#2563eb', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)' },
  expired: { label: { ar: 'منتهي', en: 'Expired' }, color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.2)' },
};

export default function PartnerCompetitions({ institution }: Props) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadCompetitions();
  }, [institution.id]);

  async function loadCompetitions() {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('institution-data', {
      body: { action: 'get_competitions', institution_id: institution.id },
    });

    if (!error && data && !data.error) {
      setCompetitions(data.competitions || []);
      setSubmissionCounts(data.submissionCounts || {});
    }

    setLoading(false);
  }

  if (selectedCompId) {
    const comp = competitions.find(c => c.id === selectedCompId);
    return (
      <PartnerReceivedWorks
        competition={comp!}
        institution={institution}
        onBack={() => setSelectedCompId(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {isRTL ? 'المسابقات' : 'Competitions'}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
            {competitions.length > 0
              ? `${competitions.length} ${isRTL ? 'مسابقة' : 'competition' + (competitions.length !== 1 ? 's' : '')}`
              : isRTL ? 'لا توجد مسابقات بعد' : 'No competitions yet'}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
          style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
        >
          <Plus className="w-4 h-4" />
          {isRTL ? 'مسابقة جديدة' : 'New Competition'}
        </button>
      </div>

      {competitions.length === 0 ? (
        <div
          className="rounded-2xl px-6 py-16 text-center"
          style={{ backgroundColor: 'var(--color-bg-secondary)', border: '2px dashed var(--color-border)' }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'rgba(var(--accent-rgb, 59,130,246),0.1)' }}
          >
            <Trophy className="w-7 h-7" style={{ color: 'var(--color-accent)' }} />
          </div>
          <p className="text-sm font-semibold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
            {isRTL ? 'لا توجد مسابقات بعد' : 'No competitions yet'}
          </p>
          <p className="text-xs mb-5 max-w-xs mx-auto leading-relaxed" style={{ color: 'var(--color-text-tertiary)' }}>
            {isRTL
              ? 'أنشئ مسابقتك الأولى وابدأ باستقبال الأعمال الأدبية من الكتّاب'
              : 'Create your first competition and start receiving literary submissions from writers'}
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold mx-auto transition-all hover:opacity-90"
            style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
          >
            <Plus className="w-4 h-4" />
            {isRTL ? 'إنشاء مسابقة' : 'Create Competition'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {competitions.map(c => {
            const statusKey = (c.status || 'open') as keyof typeof STATUS_META;
            const st = STATUS_META[statusKey] || STATUS_META.open;
            const title = isRTL ? c.title_ar : c.title_en;
            const subCount = submissionCounts[c.id] || 0;

            return (
              <div
                key={c.id}
                className="rounded-2xl p-5 transition-all"
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        {title}
                      </h3>
                      <span
                        className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                        style={{ backgroundColor: st.bg, color: st.color, border: `1px solid ${st.border}` }}
                      >
                        {st.label[isRTL ? 'ar' : 'en']}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
                      <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>
                        {new Date(c.submission_start_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-GB')}
                        {' — '}
                        {new Date(c.submission_end_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-GB')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <div
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                        style={{
                          backgroundColor: 'var(--color-bg-secondary)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {subCount} {isRTL ? 'عمل' : 'work' + (subCount !== 1 ? 's' : '')}
                      </div>

                      {c.boost_enabled && (
                        <div
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                          style={{
                            backgroundColor: 'rgba(234,179,8,0.08)',
                            border: '1px solid rgba(234,179,8,0.2)',
                            color: '#ca8a04',
                          }}
                        >
                          <Zap className="w-3.5 h-3.5" />
                          {isRTL ? 'مروّجة' : 'Boosted'}
                          {' · '}
                          {c.boost_tokens_spent.toLocaleString()} / {c.boost_budget_tokens.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedCompId(c.id)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90 flex-shrink-0"
                    style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
                  >
                    {isRTL ? 'الأعمال المستلمة' : 'View Works'}
                    <BackArrow className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <PartnerCreateCompetitionModal
          institution={institution}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadCompetitions(); }}
        />
      )}
    </div>
  );
}
