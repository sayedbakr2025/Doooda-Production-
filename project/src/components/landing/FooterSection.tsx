import { Link } from 'react-router-dom';
import DooodaLogo from '../DooodaLogo';

interface FooterContent {
  col1_title: string;
  col2_title: string;
  col3_title: string;
  col4_title: string;
  copyright: string;
  col1_features: string;
  col1_academy: string;
  col1_pricing: string;
  col1_community: string;
  col2_about: string;
  col2_contact: string;
  col2_privacy: string;
  col2_terms: string;
  col3_email: string;
}

interface FooterLink {
  label: string;
  href: string;
  isInternal?: boolean;
}

interface FooterSectionProps {
  content: FooterContent;
  language: 'ar' | 'en';
  isPartners?: boolean;
}

export default function FooterSection({ content, language, isPartners = false }: FooterSectionProps) {
  const isRTL = language === 'ar';

  const cols = [
    {
      title: content.col1_title,
      links: [
        { label: content.col1_features, href: '#features' },
        { label: content.col1_academy, href: '#academy' },
        { label: content.col1_pricing, href: '#pricing' },
        { label: content.col1_community, href: '#community' },
      ],
    },
    {
      title: content.col2_title,
      links: [
        { label: content.col2_about, href: '#about' },
        { label: content.col2_contact, href: '#contact' },
        { label: content.col2_privacy, href: '#privacy' },
        { label: content.col2_terms, href: '#terms' },
      ],
    },
    {
      title: content.col3_title,
      links: [
        { label: content.col3_email, href: `mailto:${content.col3_email}` },
      ],
    },
    {
      title: content.col4_title,
      links: isPartners
        ? [
            {
              label: language === 'ar' ? 'برنامج التسويق بالعمولة' : 'Affiliate Program',
              href: '/affiliate',
              isInternal: true,
            },
          ]
        : [
            {
              label: language === 'ar' ? 'دور النشر والمؤسسات الإنتاجية' : 'Publishers & Production Partners',
              href: '/partners',
              isInternal: true,
            },
            {
              label: language === 'ar' ? 'برنامج التسويق بالعمولة' : 'Affiliate Program',
              href: '/affiliate',
              isInternal: true,
            },
          ],
    },
  ];

  return (
    <footer style={{ backgroundColor: '#0f172a' }}>
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div
          className={`grid grid-cols-1 md:grid-cols-5 gap-10 mb-12 ${isRTL ? 'text-right' : 'text-left'}`}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <div className="md:col-span-1">
            <div style={{ opacity: 0.9 }}>
              <div style={{ transform: 'scale(0.75)', transformOrigin: isRTL ? 'right top' : 'left top' }}>
                <DooodaLogo light />
              </div>
            </div>
            <p className="text-sm mt-2" style={{ color: '#6b7280' }}>
              {language === 'ar' ? 'منصة الكاتب الاحترافي' : 'The Professional Writer\'s Platform'}
            </p>
          </div>

          {cols.map((col, i) => (
            <div key={i}>
              <h4 className="text-sm font-bold mb-4 text-white">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link: FooterLink, j) => (
                  <li key={j}>
                    {link.isInternal ? (
                      <Link
                        to={link.href}
                        className="text-sm transition-colors"
                        style={{ color: '#6b7280' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#d1d5db')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        className="text-sm transition-colors"
                        style={{ color: '#6b7280' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#d1d5db')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className={`pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}
          style={{ borderTop: '1px solid #1f2937' }}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <p className="text-xs" style={{ color: '#4b5563' }}>
            © {new Date().getFullYear()} Doooda — {content.copyright}
          </p>
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Link
              to={isPartners ? '/partners/login' : '/login'}
              className="text-xs transition-colors"
              style={{ color: '#4b5563' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#9ca3af')}
              onMouseLeave={e => (e.currentTarget.style.color = '#4b5563')}
            >
              {language === 'ar' ? 'تسجيل الدخول' : 'Log In'}
            </Link>
            <Link
              to={isPartners ? '/partners/apply' : '/signup'}
              className="text-xs transition-colors"
              style={{ color: '#4b5563' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#9ca3af')}
              onMouseLeave={e => (e.currentTarget.style.color = '#4b5563')}
            >
              {language === 'ar' ? 'إنشاء حساب' : 'Sign Up'}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
