import { useLanguage } from '../contexts/LanguageContext';
import { useHomepageContent } from '../hooks/useHomepageContent';
import LandingNav from '../components/landing/LandingNav';
import HeroSection from '../components/landing/HeroSection';
import WhySection from '../components/landing/WhySection';
import CriticSection from '../components/landing/CriticSection';
import DiacriticsSection from '../components/landing/DiacriticsSection';
import AcademySection from '../components/landing/AcademySection';
import CommunitySection from '../components/landing/CommunitySection';
import MarketingSection from '../components/landing/MarketingSection';
import PricingSection from '../components/landing/PricingSection';
import CtaSection from '../components/landing/CtaSection';
import FooterSection from '../components/landing/FooterSection';

export default function Welcome() {
  const { language } = useLanguage();
  const { get, loading } = useHomepageContent();
  const lang = language;

  const nav = {
    features: get('nav', 'features', lang, lang === 'ar' ? 'المميزات' : 'Features'),
    academy: get('nav', 'academy', lang, lang === 'ar' ? 'الأكاديمية' : 'Academy'),
    community: get('nav', 'community', lang, lang === 'ar' ? 'المجتمع' : 'Community'),
    pricing: get('nav', 'pricing', lang, lang === 'ar' ? 'الأسعار' : 'Pricing'),
    links_label: get('nav', 'links_label', lang, lang === 'ar' ? 'روابط مهمة' : 'Links'),
    about: get('nav', 'about', lang, lang === 'ar' ? 'عن دووودة' : 'About Doooda'),
    contact: get('nav', 'contact', lang, lang === 'ar' ? 'تواصل مع دووودة' : 'Contact Us'),
    privacy: get('nav', 'privacy', lang, lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'),
    terms: get('nav', 'terms', lang, lang === 'ar' ? 'الشروط والأحكام' : 'Terms & Conditions'),
    login: get('nav', 'login', lang, lang === 'ar' ? 'تسجيل الدخول' : 'Log In'),
    signup_cta: get('nav', 'signup_cta', lang, lang === 'ar' ? 'ابدأ مجانًا' : 'Start Free'),
  };

  const hero = {
    headline: get('hero', 'headline', lang, lang === 'ar' ? 'اكتب بوعي. حلّل بعمق. طوّر قصتك باحتراف.' : 'Write with intention. Analyze deeply. Craft your story professionally.'),
    subheadline: get('hero', 'subheadline', lang, ''),
    cta_primary: get('hero', 'cta_primary', lang, lang === 'ar' ? 'ابدأ مشروعك الآن' : 'Start Your Project Now'),
    cta_secondary: get('hero', 'cta_secondary', lang, lang === 'ar' ? 'شاهد كيف تعمل المنصة' : 'See How It Works'),
    badge_1: get('hero', 'badge_1', lang, lang === 'ar' ? 'مساعد كتابة ذكي' : 'Smart Writing Assistant'),
    badge_2: get('hero', 'badge_2', lang, lang === 'ar' ? 'ناقد بنيوي احترافي' : 'Professional Story Critic'),
    badge_3: get('hero', 'badge_3', lang, lang === 'ar' ? 'تحليل درامي متقدم' : 'Advanced Dramatic Analysis'),
  };

  const why = {
    section_title: get('why', 'section_title', lang, lang === 'ar' ? 'لماذا دووودة مختلفة؟' : 'Why Doooda is Different?'),
    feat1_title: get('why', 'feat1_title', lang, lang === 'ar' ? 'مساعد كتابة واعٍ' : 'Conscious Writing Assistant'),
    feat1_desc: get('why', 'feat1_desc', lang, ''),
    feat2_title: get('why', 'feat2_title', lang, lang === 'ar' ? 'ناقد درامي احترافي' : 'Professional Dramatic Critic'),
    feat2_desc: get('why', 'feat2_desc', lang, ''),
    feat3_title: get('why', 'feat3_title', lang, lang === 'ar' ? 'رؤية كاملة لمشروعك' : 'Full Project Vision'),
    feat3_desc: get('why', 'feat3_desc', lang, ''),
    feat4_title: get('why', 'feat4_title', lang, lang === 'ar' ? 'مدقق لغوي' : 'Language Proofreader'),
    feat4_desc: get('why', 'feat4_desc', lang, ''),
  };

  const critic = {
    section_label: get('critic', 'section_label', lang, lang === 'ar' ? 'دووودة الناقد' : 'Doooda Critic'),
    title: get('critic', 'title', lang, lang === 'ar' ? 'تحليل درامي شامل لحبكتك' : 'Comprehensive Dramatic Analysis of Your Plot'),
    point1: get('critic', 'point1', lang, lang === 'ar' ? 'تقييم جودة الحبكة' : 'Plot quality assessment'),
    point2: get('critic', 'point2', lang, lang === 'ar' ? 'كشف الحشو وضعف التصعيد' : 'Detect filler and weak buildup'),
    point3: get('critic', 'point3', lang, lang === 'ar' ? 'اكتشاف الذروات غير المكتملة' : 'Discover incomplete climaxes'),
    point4: get('critic', 'point4', lang, lang === 'ar' ? 'تقرير أكاديمي كامل' : 'Complete academic report'),
  };

  const diacritics = {
    section_label: get('diacritics', 'section_label', lang, lang === 'ar' ? 'التشكيل وعلامات الترقيم' : 'Diacritics & Punctuation'),
    title: get('diacritics', 'title', lang, lang === 'ar' ? 'اكتب بالعربية كما يجب أن تُكتب.' : 'Write Arabic the way it should be written.'),
    description: get('diacritics', 'description', lang, ''),
    before_label: get('diacritics', 'before_label', lang, lang === 'ar' ? 'قبل التشكيل' : 'Before'),
    after_label: get('diacritics', 'after_label', lang, lang === 'ar' ? 'بعد التشكيل' : 'After'),
    before_text: get('diacritics', 'before_text', lang, ''),
    after_text: get('diacritics', 'after_text', lang, ''),
    bullet1: get('diacritics', 'bullet1', lang, lang === 'ar' ? 'وضع تشكيل خفيف' : 'Light diacritization mode'),
    bullet2: get('diacritics', 'bullet2', lang, lang === 'ar' ? 'وضع تشكيل كامل' : 'Full diacritization mode'),
    bullet3: get('diacritics', 'bullet3', lang, lang === 'ar' ? 'استبدال مباشر للنص المظلل' : 'Direct replacement of selected text'),
    bullet4: get('diacritics', 'bullet4', lang, lang === 'ar' ? 'يعمل على اللغة العربية فقط' : 'Works on Arabic language only'),
    tip: get('diacritics', 'tip', lang, lang === 'ar' ? 'للحصول على نتيجة أدق، ظلل الجملة بالكامل' : 'For best results, select the entire sentence before applying.'),
    cta: get('diacritics', 'cta', lang, lang === 'ar' ? 'جرّب التشكيل داخل المشهد' : 'Try diacritization inside a scene'),
  };

  const academy = {
    section_label: get('academy', 'section_label', lang, lang === 'ar' ? 'الأكاديمية' : 'Academy'),
    title: get('academy', 'title', lang, lang === 'ar' ? 'كل ما يحتاج الكاتب تعلمه بشكل محترف' : 'Everything a Writer Needs to Learn Professionally'),
    point1: get('academy', 'point1', lang, lang === 'ar' ? 'كورسات متخصصة' : 'Specialized courses'),
    point2: get('academy', 'point2', lang, lang === 'ar' ? 'ورش عمل تفاعلية' : 'Interactive workshops'),
    point3: get('academy', 'point3', lang, lang === 'ar' ? 'كورسات تسويق خاصة للكتَاب' : 'Marketing courses exclusively for writers'),
    point4: get('academy', 'point4', lang, lang === 'ar' ? 'كورسات نشر وتسويق متخصصة' : 'Specialized publishing & marketing courses'),
  };

  const community = {
    section_label: get('community', 'section_label', lang, lang === 'ar' ? 'المجتمع' : 'Community'),
    title: get('community', 'title', lang, lang === 'ar' ? 'لست وحدك في رحلتك.' : 'You are not alone on your journey.'),
    description: get('community', 'description', lang, ''),
    col1_title: get('community', 'col1_title', lang, lang === 'ar' ? 'نقاشات مفتوحة' : 'Open Discussions'),
    col1_desc: get('community', 'col1_desc', lang, ''),
    col2_title: get('community', 'col2_title', lang, lang === 'ar' ? 'بيئة آمنة' : 'Safe Environment'),
    col2_desc: get('community', 'col2_desc', lang, ''),
    col3_title: get('community', 'col3_title', lang, lang === 'ar' ? 'تبليغ عن إساءة' : 'Report Abuse'),
    col3_desc: get('community', 'col3_desc', lang, ''),
    note: get('community', 'note', lang, lang === 'ar' ? 'متاح لكل المستخدمين، مجاني ومدفوع' : 'Available to all users, free and paid'),
  };

  const marketing = {
    section_label: get('marketing', 'section_label', lang, lang === 'ar' ? 'التسويق والنشر' : 'Marketing & Publishing'),
    title: get('marketing', 'title', lang, lang === 'ar' ? 'عندما تنتهي… لا تتوقف.' : "When you're done… don't stop."),
    point1: get('marketing', 'point1', lang, lang === 'ar' ? 'تصدير مشروعك بصيغ PDF و Word بضغطة واحدة' : 'Export your project as PDF & Word in one click'),
    point2: get('marketing', 'point2', lang, lang === 'ar' ? 'قاعدة بيانات دور النشر والوكلاء الأدبيين' : 'Database of publishers & literary agents'),
    point3: get('marketing', 'point3', lang, lang === 'ar' ? 'مسابقات أدبية خاصة بمجتمع دووودة' : 'Exclusive literary competitions for Doooda community'),
    point4: get('marketing', 'point4', lang, lang === 'ar' ? 'أدوات تسويقية لمشروعك الأدبي' : 'Marketing tools for your literary project'),
  };

  const pricing = {
    section_title: get('pricing', 'section_title', lang, lang === 'ar' ? 'اختر الباقة المناسبة لك' : 'Choose the Right Plan for You'),
    plan1_name: get('pricing', 'plan1_name', lang, lang === 'ar' ? 'كاتب هاوي' : 'Hobbyist Writer'),
    plan1_price: get('pricing', 'plan1_price', lang, lang === 'ar' ? 'مجانًا' : 'Free'),
    plan1_period: get('pricing', 'plan1_period', lang, lang === 'ar' ? 'للأبد' : 'Forever'),
    plan2_name: get('pricing', 'plan2_name', lang, lang === 'ar' ? 'كاتب جاد' : 'Serious Writer'),
    plan2_price: get('pricing', 'plan2_price', lang, lang === 'ar' ? '7$' : '$7'),
    plan2_period: get('pricing', 'plan2_period', lang, lang === 'ar' ? 'شهريًا' : '/month'),
    plan3_name: get('pricing', 'plan3_name', lang, lang === 'ar' ? 'كاتب محترف' : 'Professional Writer'),
    plan3_price: get('pricing', 'plan3_price', lang, lang === 'ar' ? '15$' : '$15'),
    plan3_period: get('pricing', 'plan3_period', lang, lang === 'ar' ? 'شهريًا' : '/month'),
    cta: get('pricing', 'cta', lang, lang === 'ar' ? 'ابدأ الآن' : 'Get Started'),
    tokens_label: get('pricing', 'tokens_label', lang, lang === 'ar' ? 'باقات توكينز لزيادة الرصيد' : 'Token packages to increase balance'),
  };

  const cta = {
    title: get('cta', 'title', lang, lang === 'ar' ? 'ابدأ رحلتك الآن' : 'Start Your Journey Now'),
    subtitle: get('cta', 'subtitle', lang, ''),
    button: get('cta', 'button', lang, lang === 'ar' ? 'ابدأ مجانًا' : 'Start Free'),
  };

  const footer = {
    col1_title: get('footer', 'col1_title', lang, lang === 'ar' ? 'المنصة' : 'Platform'),
    col2_title: get('footer', 'col2_title', lang, lang === 'ar' ? 'روابط مهمة' : 'Important Links'),
    col3_title: get('footer', 'col3_title', lang, lang === 'ar' ? 'اتصل بنا' : 'Contact Us'),
    col4_title: get('footer', 'col4_title', lang, lang === 'ar' ? 'شركاء دووودة' : 'Doooda Partners'),
    copyright: get('footer', 'copyright', lang, lang === 'ar' ? 'جميع الحقوق محفوظة لدووودة' : 'All rights reserved to Doooda'),
    col1_features: get('footer', 'col1_features', lang, lang === 'ar' ? 'المميزات' : 'Features'),
    col1_academy: get('footer', 'col1_academy', lang, lang === 'ar' ? 'الأكاديمية' : 'Academy'),
    col1_pricing: get('footer', 'col1_pricing', lang, lang === 'ar' ? 'الأسعار' : 'Pricing'),
    col1_community: get('footer', 'col1_community', lang, lang === 'ar' ? 'المجتمع' : 'Community'),
    col2_about: get('footer', 'col2_about', lang, lang === 'ar' ? 'عن دووودة' : 'About Doooda'),
    col2_contact: get('footer', 'col2_contact', lang, lang === 'ar' ? 'تواصل معنا' : 'Contact Us'),
    col2_privacy: get('footer', 'col2_privacy', lang, lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'),
    col2_terms: get('footer', 'col2_terms', lang, lang === 'ar' ? 'الشروط والأحكام' : 'Terms & Conditions'),
    col3_email: get('footer', 'col3_email', lang, 'hello@doooda.com'),
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#ffffff' }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }} />
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#ffffff' }} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <LandingNav content={nav} />
      <HeroSection content={hero} language={lang} />
      <WhySection content={why} language={lang} />
      <CriticSection content={critic} language={lang} />
      <DiacriticsSection content={diacritics} language={lang} />
      <AcademySection content={academy} language={lang} />
      <CommunitySection content={community} language={lang} />
      <MarketingSection content={marketing} language={lang} />
      <PricingSection content={pricing} language={lang} />
      <CtaSection content={cta} language={lang} />
      <FooterSection content={footer} language={lang} />
    </div>
  );
}
