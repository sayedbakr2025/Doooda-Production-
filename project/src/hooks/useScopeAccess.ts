import { useState, useEffect } from 'react';
import { getMyScopeAccess, type ScopeAccess } from '../services/api';
import { supabase } from '../lib/supabaseClient';

interface ScopeCheck {
  loading: boolean;
  allowed: boolean;
  isOwner: boolean;
  access: ScopeAccess | null;
}

export function useScopeAccess(
  projectId: string | undefined,
  scopeType: 'chapter' | 'scene',
  scopeId: string | undefined,
  projectOwnerId: string | undefined
): ScopeCheck {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [access, setAccess] = useState<ScopeAccess | null>(null);

  useEffect(() => {
    if (!projectId || !scopeId || !projectOwnerId) {
      setLoading(true);
      return;
    }

    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAllowed(false); setLoading(false); return; }

      if (user.id === projectOwnerId) {
        setIsOwner(true);
        setAllowed(true);
        setLoading(false);
        return;
      }

      const scopeAccess = await getMyScopeAccess(projectId);
      setAccess(scopeAccess);

      if (!scopeAccess) { setAllowed(false); setLoading(false); return; }
      if (scopeAccess.scope_type === 'project') { setAllowed(true); setLoading(false); return; }
      if (scopeAccess.scope_type === scopeType && scopeAccess.scope_id === scopeId) {
        setAllowed(true);
        setLoading(false);
        return;
      }
      setAllowed(false);
      setLoading(false);
    })();
  }, [projectId, scopeType, scopeId, projectOwnerId]);

  return { loading, allowed, isOwner, access };
}
