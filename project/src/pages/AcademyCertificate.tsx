import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import GlobalHeader from '../components/GlobalHeader';
import { getCertificateById, getCourseById } from '../services/academyApi';
import { supabase } from '../services/api';
import type { AcademyCertificate, AcademyCourse } from '../types/academy';

export default function AcademyCertificatePage() {
  const { id } = useParams<{ id: string }>();
  const { language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'ar';

  const [certificate, setCertificate] = useState<AcademyCertificate | null>(null);
  const [course, setCourse] = useState<AcademyCourse | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      try {
        const cert = await getCertificateById(id!);
        if (!cert) { setLoading(false); return; }
        setCertificate(cert);

        const courseData = await getCourseById(cert.course_id);
        setCourse(courseData);

        const { data: userData } = await supabase
          .from('users')
          .select('pen_name, first_name, last_name')
          .eq('id', cert.user_id)
          .maybeSingle();

        if (userData) {
          setRecipientName(
            userData.pen_name ||
            [userData.first_name, userData.last_name].filter(Boolean).join(' ') ||
            (isRTL ? 'كاتب' : 'Writer')
          );
        } else if (user) {
          setRecipientName(
            user.user_metadata?.pen_name ||
            user.user_metadata?.first_name ||
            (isRTL ? 'كاتب' : 'Writer')
          );
        }
      } catch (err) {
        console.error('[AcademyCertificate] Failed to load:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, user]);

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <GlobalHeader />
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-accent)' }} />
        </div>
      </div>
    );
  }

  if (!certificate || !course) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <GlobalHeader />
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            {isRTL ? 'الشهادة غير موجودة' : 'Certificate not found'}
          </p>
          <Link to="/academy" className="text-sm" style={{ color: 'var(--color-accent)' }}>
            {isRTL ? 'العودة للأكاديمية' : 'Back to Academy'}
          </Link>
        </div>
      </div>
    );
  }

  const courseTitle = language === 'ar' ? course.title_ar : course.title_en;
  const issuedDate = new Date(certificate.issued_at).toLocaleDateString(
    language === 'ar' ? 'ar-SA' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' }
  );

  const certNumber = certificate.id.split('-')[0].toUpperCase();

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <GlobalHeader />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className={`flex items-center gap-3 mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Link
            to={`/academy/course/${course.id}`}
            className={`flex items-center gap-1.5 text-sm hover:opacity-80 transition-opacity ${isRTL ? 'flex-row-reverse' : ''}`}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <svg className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {isRTL ? 'العودة للدورة' : 'Back to course'}
          </Link>
        </div>

        <div
          id="certificate-card"
          className="relative rounded-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fffbeb 100%)',
            border: '2px solid rgba(245,158,11,0.4)',
            boxShadow: '0 20px 60px rgba(245,158,11,0.15), 0 4px 16px rgba(0,0,0,0.08)',
          }}
        >
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `repeating-linear-gradient(
                45deg,
                #f59e0b 0,
                #f59e0b 1px,
                transparent 0,
                transparent 50%
              )`,
              backgroundSize: '20px 20px',
            }}
          />

          <div
            className="absolute top-0 left-0 right-0 h-2"
            style={{ background: 'linear-gradient(90deg, #f59e0b, #d97706, #f59e0b)' }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-2"
            style={{ background: 'linear-gradient(90deg, #f59e0b, #d97706, #f59e0b)' }}
          />

          <div className="relative px-8 sm:px-16 py-14 text-center" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-center mb-6">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  boxShadow: '0 4px 16px rgba(245,158,11,0.4)',
                }}
              >
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
            </div>

            <p
              className="text-xs font-bold tracking-widest uppercase mb-2"
              style={{ color: '#b45309' }}
            >
              {isRTL ? 'أكاديمية دوودة' : 'Doooda Academy'}
            </p>

            <h1
              className="text-2xl sm:text-3xl font-black mb-1"
              style={{ color: '#92400e', letterSpacing: '-0.02em' }}
            >
              {isRTL ? 'شهادة إتمام' : 'Certificate of Completion'}
            </h1>

            <div
              className="w-24 h-0.5 mx-auto my-5"
              style={{ background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)' }}
            />

            <p className="text-sm mb-3" style={{ color: '#78350f' }}>
              {isRTL ? 'يُشهد بأن' : 'This is to certify that'}
            </p>

            <h2
              className="text-3xl sm:text-4xl font-black mb-3"
              style={{ color: '#78350f', fontStyle: 'italic' }}
            >
              {recipientName}
            </h2>

            <p className="text-sm mb-4" style={{ color: '#78350f' }}>
              {isRTL ? 'قد أتم/أتمت بنجاح دورة' : 'has successfully completed the course'}
            </p>

            <div
              className="inline-block px-6 py-3 rounded-2xl mb-8"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                boxShadow: '0 2px 8px rgba(245,158,11,0.3)',
              }}
            >
              <p className="text-base sm:text-xl font-black text-white leading-tight">
                {courseTitle}
              </p>
            </div>

            <div
              className="w-24 h-0.5 mx-auto mb-8"
              style={{ background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)' }}
            />

            <div
              className={`flex items-center justify-between text-xs ${isRTL ? 'flex-row-reverse' : ''}`}
              style={{ color: '#92400e' }}
            >
              <div>
                <p className="font-bold mb-0.5">{isRTL ? 'تاريخ الإصدار' : 'Issue Date'}</p>
                <p>{issuedDate}</p>
              </div>
              <div className="text-center">
                <div
                  className="w-12 h-12 rounded-full border-2 flex items-center justify-center mx-auto mb-1"
                  style={{ borderColor: '#f59e0b' }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#f59e0b' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <p style={{ color: '#f59e0b' }}>Doooda</p>
              </div>
              <div className={isRTL ? 'text-left' : 'text-right'}>
                <p className="font-bold mb-0.5">{isRTL ? 'رقم الشهادة' : 'Certificate No.'}</p>
                <p className="font-mono">{certNumber}</p>
              </div>
            </div>
          </div>
        </div>

        <div
          className="mt-6 rounded-2xl p-5"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: 'rgba(245,158,11,0.1)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#f59e0b' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-sm mb-1" style={{ color: 'var(--color-text-primary)' }}>
                {isRTL ? 'شهادة رقمية' : 'Digital Certificate'}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {isRTL
                  ? 'هذه شهادة رقمية تؤكد إتمامك للدورة. يمكنك حفظها كصورة من خلال زر الحفظ أدناه. تصدير PDF قادم قريباً.'
                  : 'This is a digital certificate confirming your course completion. You can save it as an image using the button below. PDF export coming soon.'}
              </p>
              <div className={`flex items-center gap-3 mt-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={() => window.print()}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 ${isRTL ? 'flex-row-reverse' : ''}`}
                  style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  {isRTL ? 'طباعة / حفظ' : 'Print / Save'}
                </button>
                <Link
                  to="/academy"
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                  style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                >
                  {isRTL ? 'استكشف المزيد' : 'Explore more courses'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
