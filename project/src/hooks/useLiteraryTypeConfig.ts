import { useState, useEffect } from 'react';
import type { ProjectType, LiteraryTypeConfig } from '../types';
import { getLiteraryTypeConfigFromProjectType, buildLiteraryTypeConfigFromDB } from '../utils/hierarchyConfig';
import { supabase } from '../services/api';

export function useLiteraryTypeConfig(projectType: ProjectType | undefined): {
  config: LiteraryTypeConfig | null;
  loading: boolean;
  error: string | null;
} {
  const [config, setConfig] = useState<LiteraryTypeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectType) {
      setConfig(null);
      setLoading(false);
      return;
    }

    const fallback = getLiteraryTypeConfigFromProjectType(projectType);

    async function fetchConfig() {
      setLoading(true);
      setError(null);

      try {
        const { data, error: dbError } = await supabase
          .from('literary_type_configs')
          .select('*')
          .eq('project_type', projectType)
          .maybeSingle();

        if (dbError) {
          console.warn('[useLiteraryTypeConfig] DB fetch failed, using static config:', dbError.message);
          setConfig(fallback);
          return;
        }

        if (data) {
          setConfig(buildLiteraryTypeConfigFromDB(data));
        } else {
          setConfig(fallback);
        }
      } catch (err) {
        console.warn('[useLiteraryTypeConfig] Error, using static config:', err);
        setConfig(fallback);
      } finally {
        setLoading(false);
      }
    }

    fetchConfig();
  }, [projectType]);

  return { config, loading, error };
}