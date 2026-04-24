import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface ContentItem {
  section: string;
  key: string;
  value_ar: string;
  value_en: string;
  sort_order: number;
}

type ContentMap = Record<string, Record<string, { ar: string; en: string }>>;

export function useHomepageContent() {
  const [content, setContent] = useState<ContentMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContent() {
      try {
        const { data } = await supabase
          .from('homepage_content')
          .select('section, key, value_ar, value_en, sort_order')
          .eq('is_active', true)
          .order('sort_order');

        if (data) {
          const map: ContentMap = {};
          data.forEach((item: ContentItem) => {
            if (!map[item.section]) map[item.section] = {};
            map[item.section][item.key] = { ar: item.value_ar, en: item.value_en };
          });
          setContent(map);
        }
      } catch {
        // fallback to empty — defaults handle it
      } finally {
        setLoading(false);
      }
    }
    fetchContent();
  }, []);

  function get(section: string, key: string, lang: 'ar' | 'en', fallback = ''): string {
    return content[section]?.[key]?.[lang] ?? fallback;
  }

  return { content, loading, get };
}
