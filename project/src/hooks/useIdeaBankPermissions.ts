import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/api';

type IdeaBankPermission = 'owner' | 'editor' | 'voter' | 'viewer' | null;

export function useIdeaBankPermissions(bankId: string | undefined, projectId: string | undefined) {
  const [effectiveRole, setEffectiveRole] = useState<IdeaBankPermission>(null);
  const [loading, setLoading] = useState(true);

  const resolveRole = useCallback(async () => {
    if (!bankId || !projectId) {
      setEffectiveRole(null);
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setEffectiveRole(null); setLoading(false); return; }

      const { data: project } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', projectId)
        .single();

      if (project?.user_id === user.id) {
        setEffectiveRole('owner');
        setLoading(false);
        return;
      }

      const { data: projectCollab } = await supabase
        .from('project_collaborators')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      let inheritedRole: string | null = null;
      if (projectCollab) {
        if (projectCollab.role === 'manager' || projectCollab.role === 'editor') inheritedRole = 'editor';
        else if (projectCollab.role === 'viewer') inheritedRole = 'viewer';
      }

      const { data: ibCollab } = await supabase
        .from('idea_bank_collaborators')
        .select('role')
        .eq('idea_bank_id', bankId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      const explicitRole = ibCollab?.role || null;

      const rolePriority: Record<string, number> = { owner: 4, editor: 3, voter: 2, viewer: 1 };
      const inherited = inheritedRole ? (rolePriority[inheritedRole] || 0) : 0;
      const explicit = explicitRole ? (rolePriority[explicitRole] || 0) : 0;
      const maxPriority = Math.max(inherited, explicit);

      if (maxPriority === 0) {
        setEffectiveRole(null);
      } else {
        const roleMap: Record<number, 'owner' | 'editor' | 'voter' | 'viewer'> = {
          4: 'owner', 3: 'editor', 2: 'voter', 1: 'viewer',
        };
        setEffectiveRole(roleMap[maxPriority]);
      }
    } catch {
      setEffectiveRole(null);
    } finally {
      setLoading(false);
    }
  }, [bankId, projectId]);

  useEffect(() => {
    resolveRole();
  }, [resolveRole]);

  const canEdit = effectiveRole === 'owner' || effectiveRole === 'editor';
  const canVote = effectiveRole === 'owner' || effectiveRole === 'editor' || effectiveRole === 'voter';
  const canView = effectiveRole !== null;
  const canManageCollaborators = effectiveRole === 'owner';
  const canCreateIdeas = canEdit;
  const canFinalize = canEdit;
  const canManagePolls = canEdit;
  const canImport = effectiveRole === 'owner';

  return {
    effectiveRole,
    loading,
    canEdit,
    canVote,
    canView,
    canManageCollaborators,
    canCreateIdeas,
    canFinalize,
    canManagePolls,
    canImport,
    refresh: resolveRole,
  };
}