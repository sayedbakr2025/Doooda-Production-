import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import {
  updateCollaboratorRole,
  updateCollaboratorStatus,
  removeProjectCollaborator,
  logActivity,
} from '../services/api';
import type { ProjectCollaborator, CollaboratorRole, CollaboratorScopeType } from '../types';
import ConfirmActionModal from './ConfirmActionModal';
import { supabase } from '../lib/supabaseClient';

interface Props {
  projectId: string;
  isOwner: boolean;
  canManage: boolean;
  onShareClick: () => void;
}

interface PendingRoleChange {
  collaboratorId: string;
  newRole: CollaboratorRole;
  name: string;
}

interface PendingFreeze {
  collaborator: ProjectCollaborator;
  name: string;
}

const ROLE_LABELS: Record<CollaboratorRole, { ar: string; en: string }> = {
  viewer: { ar: 'مشاهد', en: 'Viewer' },
  editor: { ar: 'محرر', en: 'Editor' },
  manager: { ar: 'مدير', en: 'Manager' },
};

const SCOPE_LABELS: Record<CollaboratorScopeType, { ar: string; en: string }> = {
  project: { ar: 'المشروع كامل', en: 'Full project' },
  chapter: { ar: 'فصل محدد', en: 'Chapter only' },
  scene: { ar: 'مشهد محدد', en: 'Scene only' },
};

const SCOPE_COLORS: Record<CollaboratorScopeType, { bg: string; text: string }> = {
  project: { bg: 'rgba(59,130,246,0.1)', text: 'rgb(59,130,246)' },
  chapter: { bg: 'rgba(14,165,233,0.1)', text: 'rgb(14,165,233)' },
  scene: { bg: 'rgba(34,197,94,0.1)', text: 'rgb(22,163,74)' },
};

const ROLE_DESCRIPTIONS: Record<CollaboratorRole, { ar: string; en: string }> = {
  viewer: { ar: 'قراءة فقط', en: 'Read only' },
  editor: { ar: 'تعديل المحتوى', en: 'Edit content' },
  manager: { ar: 'إدارة + طلب حذف', en: 'Manage + request deletion' },
};

export default function CollaboratorsPanel({ projectId, isOwner: _isOwner, canManage, onShareClick }: Props) {
  const { language } = useLanguage();
  const isRtl = language === 'ar';

  const [collaborators, setCollaborators] = useState<ProjectCollaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [openRoleMenuId, setOpenRoleMenuId] = useState<string | null>(null);
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({});
  const [emails, setEmails] = useState<Record<string, string>>({});

  const [pendingRoleChange, setPendingRoleChange] = useState<PendingRoleChange | null>(null);
  const [pendingFreeze, setPendingFreeze] = useState<PendingFreeze | null>(null);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [pendingRemoveName, setPendingRemoveName] = useState<string>('');
  const [confirmLoading, setConfirmLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await loadCollaboratorsWithUsers(projectId);
      setCollaborators(data.collabs);
      setDisplayNames(data.names);
      setEmails(data.emailMap);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [projectId]);

  const executeRoleChange = async (collaboratorId: string, role: CollaboratorRole, name: string) => {
    setConfirmLoading(true);
    setActioningId(collaboratorId);
    try {
      await updateCollaboratorRole(collaboratorId, role);
      setCollaborators(prev => prev.map(c => c.id === collaboratorId ? { ...c, role } : c));
      logActivity(projectId, 'role_change', 'collaborator', name, collaboratorId, { new_role: role });
    } catch {
    } finally {
      setConfirmLoading(false);
      setActioningId(null);
      setPendingRoleChange(null);
    }
  };

  const executeFreeze = async (c: ProjectCollaborator, name: string) => {
    const newStatus = c.status === 'active' ? 'frozen' : 'active';
    setConfirmLoading(true);
    setActioningId(c.id);
    try {
      await updateCollaboratorStatus(c.id, newStatus);
      setCollaborators(prev => prev.map(x => x.id === c.id ? { ...x, status: newStatus } : x));
      logActivity(projectId, 'update', 'collaborator', name, c.id, { new_status: newStatus });
    } catch {
    } finally {
      setConfirmLoading(false);
      setActioningId(null);
      setPendingFreeze(null);
    }
  };

  const executeRemove = async (collaboratorId: string) => {
    setConfirmLoading(true);
    setActioningId(collaboratorId);
    try {
      await removeProjectCollaborator(collaboratorId);
      setCollaborators(prev => prev.filter(c => c.id !== collaboratorId));
    } catch {
    } finally {
      setConfirmLoading(false);
      setActioningId(null);
      setPendingRemoveId(null);
    }
  };

  const roles: CollaboratorRole[] = ['viewer', 'editor', 'manager'];

  const statusColor = (status: string) =>
    status === 'active' ? 'var(--color-success)' : 'var(--color-warning)';

  const statusBg = (status: string) =>
    status === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)';

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {isRtl ? 'المتعاونون' : 'Collaborators'}
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
            {collaborators.length === 0
              ? (isRtl ? 'لا يوجد متعاونون حتى الآن' : 'No collaborators yet')
              : (isRtl
                  ? `${collaborators.length} متعاون`
                  : `${collaborators.length} collaborator${collaborators.length !== 1 ? 's' : ''}`)}
          </p>
        </div>
        {canManage && (
          <button
            onClick={onShareClick}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {isRtl ? 'إضافة متعاون' : 'Add Collaborator'}
          </button>
        )}
      </div>

      {collaborators.length === 0 ? (
        <div
          className="rounded-xl p-10 text-center"
          style={{ border: '1.5px dashed var(--color-border)' }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ backgroundColor: 'var(--color-muted)' }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-text-tertiary)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            {isRtl ? 'لا يوجد متعاونون حتى الآن' : 'No collaborators yet'}
          </p>
          {canManage && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
              {isRtl
                ? 'اضغط على "إضافة متعاون" لمشاركة المشروع'
                : 'Click "Add Collaborator" to share this project'}
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl" style={{ border: '1px solid var(--color-border)' }}>
          <div
            className="grid text-xs font-semibold px-4 py-2.5"
            style={{
              gridTemplateColumns: canManage ? '1fr 120px 90px 110px 130px' : '1fr 120px 90px 110px',
              backgroundColor: 'var(--color-muted)',
              color: 'var(--color-text-tertiary)',
            }}
          >
            <span>{isRtl ? 'المستخدم' : 'User'}</span>
            <span>{isRtl ? 'الصلاحية' : 'Role'}</span>
            <span>{isRtl ? 'الحالة' : 'Status'}</span>
            <span>{isRtl ? 'النطاق' : 'Scope'}</span>
            {canManage && <span className="text-center">{isRtl ? 'الإجراءات' : 'Actions'}</span>}
          </div>

          {collaborators.map((c, idx) => {
            const name = displayNames[c.user_id] || c.display_name || c.user_id;
            const emailStr = emails[c.user_id] || c.email || '';
            const initials = name.charAt(0).toUpperCase();
            const isActioning = actioningId === c.id;
            const isFrozen = c.status === 'frozen';

            return (
              <div
                key={c.id}
                className="grid items-center px-4 py-3 transition-colors"
                style={{
                  gridTemplateColumns: canManage ? '1fr 120px 90px 110px 130px' : '1fr 120px 90px 110px',
                  borderTop: idx > 0 ? '1px solid var(--color-border)' : 'none',
                  backgroundColor: isFrozen
                    ? 'rgba(234,179,8,0.04)'
                    : isActioning
                    ? 'var(--color-muted)'
                    : 'var(--color-surface)',
                  opacity: isActioning ? 0.7 : 1,
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white relative"
                    style={{ backgroundColor: isFrozen ? 'var(--color-text-tertiary)' : 'var(--color-accent)' }}
                  >
                    {initials}
                    {isFrozen && (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center border-2"
                        style={{ backgroundColor: '#d97706', borderColor: 'var(--color-surface)' }}
                        title={isRtl ? 'مجمّد' : 'Frozen'}
                      >
                        <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {name}
                      {isFrozen && (
                        <span className="ms-2 text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(234,179,8,0.15)', color: '#ca8a04' }}>
                          {isRtl ? 'مجمّد' : 'Frozen'}
                        </span>
                      )}
                    </p>
                    {emailStr && (
                      <p className="text-xs truncate" style={{ color: 'var(--color-text-tertiary)' }}>
                        {emailStr}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  {canManage ? (
                    <div className="relative">
                      <button
                        onClick={() => setOpenRoleMenuId(openRoleMenuId === c.id ? null : c.id)}
                        disabled={isActioning}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        style={{
                          backgroundColor: 'var(--color-muted)',
                          color: 'var(--color-text-primary)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        <span>{isRtl ? ROLE_LABELS[c.role].ar : ROLE_LABELS[c.role].en}</span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {openRoleMenuId === c.id && (
                        <div
                          className="absolute z-20 mt-1 rounded-lg shadow-lg py-1 min-w-[140px]"
                          style={{
                            backgroundColor: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            [isRtl ? 'right' : 'left']: 0,
                          }}
                        >
                          {roles.map((r) => (
                            <button
                              key={r}
                              onClick={() => {
                                if (r !== c.role) {
                                  setPendingRoleChange({ collaboratorId: c.id, newRole: r, name });
                                }
                                setOpenRoleMenuId(null);
                              }}
                              className="w-full px-3 py-2 text-xs text-start transition-colors"
                              style={{
                                color: r === c.role ? 'var(--color-accent)' : 'var(--color-text-primary)',
                                fontWeight: r === c.role ? 600 : 400,
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-muted)')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span>{isRtl ? ROLE_LABELS[r].ar : ROLE_LABELS[r].en}</span>
                                {r === c.role && (
                                  <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-accent)' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                                {r === 'manager' && r !== c.role && (
                                  <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#ca8a04' }}>
                                    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2 2h10v2H7v-2z"/>
                                  </svg>
                                )}
                              </div>
                              <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}>
                                {isRtl ? ROLE_DESCRIPTIONS[r].ar : ROLE_DESCRIPTIONS[r].en}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span
                      className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-secondary)' }}
                    >
                      {isRtl ? ROLE_LABELS[c.role].ar : ROLE_LABELS[c.role].en}
                      {c.role === 'manager' && (
                        <svg className="inline w-3 h-3 ms-1" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#ca8a04' }}>
                          <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2 2h10v2H7v-2z"/>
                        </svg>
                      )}
                    </span>
                  )}
                </div>

                <div>
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: statusBg(c.status), color: statusColor(c.status) }}
                  >
                    {c.status === 'active'
                      ? (isRtl ? 'نشط' : 'Active')
                      : (isRtl ? 'مجمّد' : 'Frozen')}
                  </span>
                </div>

                <div>
                  {(() => {
                    const scopeType: CollaboratorScopeType = (c.scope_type as CollaboratorScopeType) || 'project';
                    const colors = SCOPE_COLORS[scopeType];
                    const label = isRtl ? SCOPE_LABELS[scopeType].ar : SCOPE_LABELS[scopeType].en;
                    return (
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full inline-block"
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                        title={c.scope_title || label}
                      >
                        {label}
                      </span>
                    );
                  })()}
                </div>

                {canManage && (
                  <div className="flex items-center gap-1.5 justify-center">
                    <button
                      onClick={() => setPendingFreeze({ collaborator: c, name })}
                      disabled={isActioning}
                      title={c.status === 'active'
                        ? (isRtl ? 'تجميد الوصول' : 'Freeze access')
                        : (isRtl ? 'تفعيل الوصول' : 'Restore access')}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: isFrozen ? 'rgb(22,163,74)' : 'var(--color-text-tertiary)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-muted)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {c.status === 'active' ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => { setPendingRemoveId(c.id); setPendingRemoveName(name); }}
                      disabled={isActioning}
                      title={isRtl ? 'إزالة من المشروع' : 'Remove from project'}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: 'var(--color-error)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pendingRoleChange && (
        <ConfirmActionModal
          title="Change Role"
          titleAr="تغيير الصلاحية"
          message={`Change ${pendingRoleChange.name}'s role to ${ROLE_LABELS[pendingRoleChange.newRole].en}?`}
          messageAr={`هل تريد تغيير صلاحية ${pendingRoleChange.name} إلى ${ROLE_LABELS[pendingRoleChange.newRole].ar}؟`}
          detail={`New role: ${ROLE_LABELS[pendingRoleChange.newRole].en} — ${ROLE_DESCRIPTIONS[pendingRoleChange.newRole].en}`}
          detailAr={`الصلاحية الجديدة: ${ROLE_LABELS[pendingRoleChange.newRole].ar} — ${ROLE_DESCRIPTIONS[pendingRoleChange.newRole].ar}`}
          confirmLabel="Change Role"
          confirmLabelAr="تغيير الصلاحية"
          variant="warning"
          loading={confirmLoading}
          onConfirm={() => executeRoleChange(pendingRoleChange.collaboratorId, pendingRoleChange.newRole, pendingRoleChange.name)}
          onCancel={() => setPendingRoleChange(null)}
        />
      )}

      {pendingFreeze && (
        <ConfirmActionModal
          title={pendingFreeze.collaborator.status === 'active' ? 'Freeze Access' : 'Restore Access'}
          titleAr={pendingFreeze.collaborator.status === 'active' ? 'تجميد الوصول' : 'استعادة الوصول'}
          message={
            pendingFreeze.collaborator.status === 'active'
              ? `Freeze ${pendingFreeze.name}'s access to this project?`
              : `Restore ${pendingFreeze.name}'s access to this project?`
          }
          messageAr={
            pendingFreeze.collaborator.status === 'active'
              ? `هل تريد تجميد وصول ${pendingFreeze.name} إلى هذا المشروع؟`
              : `هل تريد استعادة وصول ${pendingFreeze.name} إلى هذا المشروع؟`
          }
          detail={
            pendingFreeze.collaborator.status === 'active'
              ? 'The user will immediately lose access until you restore it.'
              : 'The user will regain access to their assigned scope immediately.'
          }
          detailAr={
            pendingFreeze.collaborator.status === 'active'
              ? 'سيفقد المستخدم الوصول فوراً حتى تقوم باستعادته.'
              : 'سيستعيد المستخدم الوصول إلى نطاقه المحدد فوراً.'
          }
          confirmLabel={pendingFreeze.collaborator.status === 'active' ? 'Freeze' : 'Restore'}
          confirmLabelAr={pendingFreeze.collaborator.status === 'active' ? 'تجميد' : 'استعادة'}
          variant={pendingFreeze.collaborator.status === 'active' ? 'warning' : 'info'}
          loading={confirmLoading}
          onConfirm={() => executeFreeze(pendingFreeze.collaborator, pendingFreeze.name)}
          onCancel={() => setPendingFreeze(null)}
        />
      )}

      {pendingRemoveId && (
        <ConfirmActionModal
          title="Remove Collaborator"
          titleAr="إزالة المتعاون"
          message={`Remove ${pendingRemoveName} from this project?`}
          messageAr={`هل تريد إزالة ${pendingRemoveName} من هذا المشروع؟`}
          detail="This action cannot be undone. The user will immediately lose all access."
          detailAr="لا يمكن التراجع عن هذا الإجراء. سيفقد المستخدم جميع صلاحياته فوراً."
          confirmLabel="Remove"
          confirmLabelAr="إزالة"
          variant="danger"
          loading={confirmLoading}
          onConfirm={() => executeRemove(pendingRemoveId)}
          onCancel={() => { setPendingRemoveId(null); setPendingRemoveName(''); }}
        />
      )}
    </div>
  );
}

async function loadCollaboratorsWithUsers(projectId: string) {
  const { data, error } = await supabase
    .from('project_collaborators')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!data || data.length === 0) return { collabs: [], names: {}, emailMap: {} };

  const userIds: string[] = data.map((c: any) => c.user_id);

  const { data: userData } = await supabase
    .rpc('get_collaborator_names', { p_user_ids: userIds });

  const names: Record<string, string> = {};
  const emailMap: Record<string, string> = {};

  (userData || []).forEach((u: any) => {
    names[u.id] = u.pen_name || u.id;
    emailMap[u.id] = u.email || '';
  });

  return { collabs: data as ProjectCollaborator[], names, emailMap };
}
