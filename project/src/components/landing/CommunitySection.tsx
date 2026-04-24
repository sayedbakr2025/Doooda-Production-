import { MessageCircle, Shield, Flag } from 'lucide-react';

interface CommunityContent {
  section_label: string;
  title: string;
  description: string;
  col1_title: string;
  col1_desc: string;
  col2_title: string;
  col2_desc: string;
  col3_title: string;
  col3_desc: string;
  note: string;
}

interface CommunitySectionProps {
  content: CommunityContent;
  language: 'ar' | 'en';
}

export default function CommunitySection({ content, language }: CommunitySectionProps) {
  const isRTL = language === 'ar';

  const columns = [
    {
      icon: MessageCircle,
      title: content.col1_title,
      desc: content.col1_desc,
    },
    {
      icon: Shield,
      title: content.col2_title,
      desc: content.col2_desc,
    },
    {
      icon: Flag,
      title: content.col3_title,
      desc: content.col3_desc,
    },
  ];

  return (
    <section id="community" className="py-24" style={{ backgroundColor: '#f8f8f8' }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14" dir={isRTL ? 'rtl' : 'ltr'}>
          <span
            className="inline-block text-xs font-bold uppercase tracking-widest mb-3 px-3 py-1 rounded-full"
            style={{ color: '#374151', backgroundColor: '#ebebeb' }}
          >
            {content.section_label}
          </span>
          <h2
            className="text-3xl md:text-4xl font-black mb-4"
            style={{ color: '#111827' }}
          >
            {content.title}
          </h2>
          <p className="text-base max-w-xl mx-auto" style={{ color: '#6b7280' }}>
            {content.description}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10" dir={isRTL ? 'rtl' : 'ltr'}>
          {columns.map((col, i) => {
            const Icon = col.icon;
            return (
              <div
                key={i}
                className="p-7 rounded-2xl flex flex-col items-center text-center gap-4 hover:-translate-y-1 transition-all"
                style={{ backgroundColor: '#ffffff', border: '1.5px solid #e5e7eb' }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#111827' }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold mb-1" style={{ color: '#111827' }}>
                    {col.title}
                  </h3>
                  {col.desc && (
                    <p className="text-sm" style={{ color: '#6b7280' }}>
                      {col.desc}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {content.note && (
          <div className="text-center" dir={isRTL ? 'rtl' : 'ltr'}>
            <span
              className="inline-block text-sm px-4 py-2 rounded-full"
              style={{ backgroundColor: '#ebebeb', color: '#6b7280' }}
            >
              {content.note}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
