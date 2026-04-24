import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Zap, Trophy, CheckCircle, ChevronDown, ChevronUp, ArrowLeft, PenLine } from 'lucide-react';
import FooterSection from '../components/landing/FooterSection';
import PartnerNav from '../components/partner/PartnerNav';

const WHY_CARDS = [
  {
    icon: Building2,
    titleAr: 'اكتشاف المواهب',
    titleEn: 'Talent Discovery',
    textAr: 'تصفح آلاف المشاريع الأدبية من كتّاب موهوبين.',
    textEn: 'Browse thousands of literary projects from talented writers.',
  },
  {
    icon: Zap,
    titleAr: 'تحليل ذكي للأعمال',
    titleEn: 'Smart Work Analysis',
    textAr: 'يقدم النظام تحليلات تساعدك على اكتشاف الأعمال الواعدة بسرعة.',
    textEn: 'The platform provides analytics to help you identify promising works quickly.',
  },
  {
    icon: Trophy,
    titleAr: 'إطلاق مسابقات',
    titleEn: 'Launch Competitions',
    textAr: 'أنشئ مسابقاتك الخاصة واجذب أفضل الأعمال مباشرة.',
    textEn: 'Create your own competitions and attract the best works directly.',
  },
];

const STEPS = [
  { ar: 'إنشاء حساب مؤسسة', en: 'Create Institutional Account' },
  { ar: 'إطلاق مسابقة أو استقبال أعمال', en: 'Launch Competition or Receive Works' },
  { ar: 'تقييم الأعمال', en: 'Evaluate Works' },
  { ar: 'اكتشاف المواهب', en: 'Discover Talents' },
];

const FEATURES = [
  { ar: 'إطلاق مسابقات أدبية', en: 'Launch literary competitions' },
  { ar: 'استقبال الأعمال مباشرة', en: 'Receive works directly' },
  { ar: 'تقييم احترافي للأعمال', en: 'Professional work evaluation' },
  { ar: 'إدارة المشاريع المقدمة', en: 'Manage submitted projects' },
  { ar: 'الوصول إلى كتاب جدد', en: 'Access to new writers' },
];

const WHO_LINKS = [
  { ar: 'دور النشر', en: 'Publishing Houses' },
  { ar: 'شركات الإنتاج السينمائي', en: 'Film Production Companies' },
  { ar: 'شركات الإنتاج التلفزيوني', en: 'TV Production Companies' },
  { ar: 'منتجو المسرح', en: 'Theatre Producers' },
  { ar: 'استوديوهات الإنتاج الصوتي', en: 'Audio Production Studios' },
];

const FAQS = [
  {
    qAr: 'هل الانضمام مجاني؟',
    qEn: 'Is joining free?',
    aAr: 'نعم، الانضمام إلى المنصة كمؤسسة مجاني تمامًا. يمكنك إنشاء حسابك والبدء في تصفح الأعمال وإطلاق المسابقات دون أي تكلفة.',
    aEn: 'Yes, joining the platform as an institution is completely free. You can create your account and start browsing works and launching competitions at no cost.',
  },
  {
    qAr: 'هل يتم مراجعة الحسابات؟',
    qEn: 'Are accounts reviewed?',
    aAr: 'نعم، يتم مراجعة طلبات إنشاء الحسابات المؤسسية للتحقق من هوية الجهة وضمان بيئة موثوقة لجميع المستخدمين.',
    aEn: 'Yes, institutional account applications are reviewed to verify the entity\'s identity and ensure a trustworthy environment for all users.',
  },
  {
    qAr: 'هل يمكن إطلاق مسابقات؟',
    qEn: 'Can competitions be launched?',
    aAr: 'بالتأكيد. يتيح لك النظام إنشاء مسابقات أدبية مخصصة، وتحديد معايير التقييم، واستقبال الأعمال من الكتّاب مباشرة.',
    aEn: 'Absolutely. The system allows you to create custom literary competitions, define evaluation criteria, and receive works from writers directly.',
  },
];

export default function Partners() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const isRTL = lang === 'ar';

  const footerContent = {
    col1_title: isRTL ? 'المنصة' : 'Platform',
    col2_title: isRTL ? 'روابط مهمة' : 'Important Links',
    col3_title: isRTL ? 'اتصل بنا' : 'Contact Us',
    col4_title: isRTL ? 'شركاء دووودة' : 'Doooda Partners',
    copyright: isRTL ? 'جميع الحقوق محفوظة لدووودة' : 'All rights reserved to Doooda',
    col1_features: isRTL ? 'المميزات' : 'Features',
    col1_academy: isRTL ? 'الأكاديمية' : 'Academy',
    col1_pricing: isRTL ? 'الأسعار' : 'Pricing',
    col1_community: isRTL ? 'المجتمع' : 'Community',
    col2_about: isRTL ? 'عن دووودة' : 'About Doooda',
    col2_contact: isRTL ? 'تواصل معنا' : 'Contact Us',
    col2_privacy: isRTL ? 'سياسة الخصوصية' : 'Privacy Policy',
    col2_terms: isRTL ? 'الشروط والأحكام' : 'Terms & Conditions',
    col3_email: 'hello@doooda.com',
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        backgroundColor: 'var(--color-bg-primary)',
        color: 'var(--color-text-primary)',
        fontFamily: isRTL ? "'Tajawal', sans-serif" : "'Roboto', system-ui, sans-serif",
      }}
    >
      <PartnerNav lang={lang} onLangChange={setLang} />

      {/* HERO */}
      <section id="hero" className="pt-32 pb-24 px-6 text-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-4xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 uppercase tracking-wider"
            style={{
              backgroundColor: '#fff1f1',
              color: 'var(--color-accent)',
              border: '1px solid rgba(214,40,40,0.15)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: 'var(--color-accent)' }}
            />
            {isRTL ? 'للمؤسسات والشركاء' : 'For Institutions & Partners'}
          </div>

          <h1
            className="text-5xl md:text-6xl font-black mb-6 tracking-tight"
            style={{ color: 'var(--color-text-primary)', lineHeight: '1.15' }}
          >
            {isRTL
              ? 'اكتشف المواهب الأدبية القادمة قبل أي شخص آخر'
              : 'Discover the Next Great Writers Before Anyone Else'}
          </h1>

          <p
            className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {isRTL
              ? 'دووودة تمنح دور النشر والمؤسسات الإنتاجية وصولًا مباشرًا إلى أعمال إبداعية جديدة من كتّاب حقيقيين يعملون على مشاريع مكتملة وقابلة للنشر.'
              : 'Doooda gives publishers and production companies direct access to new creative works from real writers developing complete, publishable projects.'}
          </p>

          <Link
            to="/partners/apply"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold text-white transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            style={{ backgroundColor: 'var(--color-accent)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--color-accent)')}
          >
            {isRTL ? 'إنشاء حساب مؤسسة' : 'Create Institutional Account'}
            <ArrowLeft className={`w-4 h-4 ${isRTL ? '' : 'rotate-180'}`} />
          </Link>
        </div>
      </section>

      {/* WHY DOOODA */}
      <section id="features" className="py-24 px-6" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              {isRTL ? 'لماذا دووودة؟' : 'Why Doooda?'}
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {WHY_CARDS.map((card, i) => (
              <div
                key={i}
                className="p-8 rounded-2xl transition-all hover:-translate-y-1"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                  style={{ backgroundColor: '#fff1f1' }}
                >
                  <card.icon className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  {isRTL ? card.titleAr : card.titleEn}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {isRTL ? card.textAr : card.textEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 px-6" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-14" style={{ color: 'var(--color-text-primary)' }}>
            {isRTL ? 'كيف يعمل النظام؟' : 'How It Works'}
          </h2>
          <div className="relative">
            {STEPS.map((step, i) => (
              <div key={i} className="relative">
                <div className="flex items-center gap-4 mb-0">
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{ backgroundColor: 'var(--color-accent)' }}
                  >
                    {i + 1}
                  </div>
                  <div
                    className="flex-1 py-5 px-6 rounded-xl text-sm font-medium"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                      textAlign: isRTL ? 'right' : 'left',
                    }}
                  >
                    {isRTL ? step.ar : step.en}
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className="w-0.5 h-6 my-1"
                    style={{
                      backgroundColor: 'var(--color-border)',
                      marginRight: isRTL ? '20px' : undefined,
                      marginLeft: isRTL ? undefined : '20px',
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES — dark section */}
      <section id="what-you-get" className="py-24 px-6" style={{ backgroundColor: '#111827' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#f9fafb' }}>
              {isRTL ? 'ما الذي تحصل عليه؟' : 'What You Get'}
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-5 rounded-xl"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
                <span className="text-sm font-medium" style={{ color: '#e5e7eb' }}>
                  {isRTL ? f.ar : f.en}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO USES — writers landing page link */}
      <section id="institutions" className="py-24 px-6" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              {isRTL ? 'من يستخدم دووودة للمؤسسات؟' : 'Who Uses Doooda Partners?'}
            </h2>
            <p className="text-base mt-2" style={{ color: 'var(--color-text-secondary)' }}>
              {isRTL ? 'المنصة مصمّمة لخدمة طيف واسع من المؤسسات الإبداعية' : 'The platform is designed for a wide range of creative institutions'}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {WHO_LINKS.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-5 py-4 rounded-xl text-sm font-medium"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
                {isRTL ? item.ar : item.en}
              </div>
            ))}
          </div>

          {/* Writers landing page link */}
          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-2xl"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
            }}
          >
            <div className={`flex items-start gap-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: '#fff1f1' }}
              >
                <PenLine className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
              </div>
              <div>
                <p className="text-sm font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  {isRTL ? 'هل أنت كاتب تبحث عن فرص؟' : 'Are you a writer looking for opportunities?'}
                </p>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {isRTL
                    ? 'اكتشف منصة دووودة للكتّاب واستفد من أدوات الكتابة الاحترافية'
                    : 'Discover the Doooda platform for writers and use professional writing tools'}
                </p>
              </div>
            </div>
            <Link
              to="/"
              className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
              style={{ backgroundColor: 'var(--color-accent)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--color-accent)')}
            >
              {isRTL ? 'منصة الكتّاب' : 'Writers Platform'}
              <ArrowLeft className={`w-4 h-4 ${isRTL ? '' : 'rotate-180'}`} />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              {isRTL ? 'أسئلة شائعة' : 'Frequently Asked Questions'}
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl overflow-hidden"
                style={{ border: '1px solid var(--color-border)' }}
              >
                <button
                  className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold transition-colors"
                  style={{
                    color: 'var(--color-text-primary)',
                    backgroundColor: openFaq === i ? 'var(--color-bg-secondary)' : 'var(--color-surface)',
                    textAlign: isRTL ? 'right' : 'left',
                  }}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span>{isRTL ? faq.qAr : faq.qEn}</span>
                  {openFaq === i
                    ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-tertiary)' }} />
                    : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-tertiary)' }} />
                  }
                </button>
                {openFaq === i && (
                  <div
                    className="px-6 pb-5 text-sm leading-relaxed"
                    style={{
                      color: 'var(--color-text-secondary)',
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderTop: '1px solid var(--color-border)',
                    }}
                  >
                    <p className="pt-4">{isRTL ? faq.aAr : faq.aEn}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — dark section */}
      <section id="join" className="py-24 px-6 text-center" style={{ backgroundColor: '#111827' }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: '#f9fafb' }}>
            {isRTL ? 'ابدأ اكتشاف المواهب الآن' : 'Start Discovering Talents Now'}
          </h2>
          <p className="text-base mb-8" style={{ color: '#9ca3af' }}>
            {isRTL
              ? 'انضم إلى المؤسسات الرائدة التي تكتشف الكتّاب الموهوبين على دووودة.'
              : 'Join leading institutions discovering talented writers on Doooda.'}
          </p>
          <Link
            to="/partners/apply"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold text-white transition-all hover:-translate-y-0.5 shadow-lg"
            style={{ backgroundColor: 'var(--color-accent)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--color-accent)')}
          >
            {isRTL ? 'إنشاء حساب مؤسسة' : 'Create Institutional Account'}
            <ArrowLeft className={`w-4 h-4 ${isRTL ? '' : 'rotate-180'}`} />
          </Link>
        </div>
      </section>

      <FooterSection content={footerContent} language={lang} isPartners />
    </div>
  );
}
