import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { getProjectActivityLogs } from '../services/api';
import type { ActivityLog, ActivityAction, ActivityEntityType } from '../types';

interface Props {
  projectId: string;
}

const ACTION_ICONS: Record<ActivityAction, string> = {
  edit_text: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  delete_text: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  ai_usage: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  role_change: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  create: 'M12 4v16m8-8H4',
  delete: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  update: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  invite: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
};

const ACTION_COLORS: Record<ActivityAction, { bg: string; text: string }> = {
  edit_text: { bg: 'rgba(59,130,246,0.1)', text: 'rgb(59,130,246)' },
  delete_text: { bg: 'rgba(239,68,68,0.1)', text: 'rgb(239,68,68)' },
  ai_usage: { bg: 'rgba(234,179,8,0.1)', text: 'rgb(161,110,0)' },
  role_change: { bg: 'rgba(168,85,247,0.12)', text: 'rgb(126,58,200)' },
  create: { bg: 'rgba(34,197,94,0.1)', text: 'rgb(22,163,74)' },
  delete: { bg: 'rgba(239,68,68,0.1)', text: 'rgb(239,68,68)' },
  update: { bg: 'rgba(59,130,246,0.1)', text: 'rgb(59,130,246)' },
  invite: { bg: 'rgba(34,197,94,0.1)', text: 'rgb(22,163,74)' },
};

const ACTION_LABELS_EN: Record<ActivityAction, string> = {
  edit_text: 'edited',
  delete_text: 'deleted text in',
  ai_usage: 'used AI in',
  role_change: 'changed role for',
  create: 'created',
  delete: 'deleted',
  update: 'updated',
  invite: 'invited collaborator to',
};

const ACTION_LABELS_AR: Record<ActivityAction, string> = {
  edit_text: 'عدّل',
  delete_text: 'حذف نصاً في',
  ai_usage: 'استخدم الذكاء الاصطناعي في',
  role_change: 'غيّر الدور في',
  create: 'أنشأ',
  delete: 'حذف',
  update: 'حدّث',
  invite: 'دعا متعاوناً إلى',
};

const ENTITY_LABELS_EN: Record<ActivityEntityType, string> = {
  scene: 'scene',
  chapter: 'chapter',
  project: 'project',
  character: 'character',
  collaborator: 'collaborator',
  comment: 'comment',
};

const ENTITY_LABELS_AR: Record<ActivityEntityType, string> = {
  scene: 'مشهد',
  chapter: 'فصل',
  project: 'مشروع',
  character: 'شخصية',
  collaborator: 'متعاون',
  comment: 'تعليق',
};

function formatRelativeTime(dateStr: string, isRtl: boolean): string {
  const ts = dateStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateStr) ? dateStr : dateStr + 'Z';
  const now = new Date();
  const date = new Date(ts);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (isRtl) {
    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    return date.toLocaleDateString('ar-SA');
  } else {
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

function groupByDate(logs: ActivityLog[]): Array<{ label: string; items: ActivityLog[] }> {
  const groups: Record<string, ActivityLog[]> = {};
  logs.forEach((log) => {
    const d = new Date(log.created_at);
    const key = d.toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(log);
  });
  return Object.entries(groups).map(([, items]) => {
    const d = new Date(items[0].created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    let label = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    if (d.toDateString() === today.toDateString()) label = 'Today';
    else if (d.toDateString() === yesterday.toDateString()) label = 'Yesterday';
    return { label, items };
  });
}

function groupByDateAr(logs: ActivityLog[]): Array<{ label: string; items: ActivityLog[] }> {
  const groups: Record<string, ActivityLog[]> = {};
  logs.forEach((log) => {
    const d = new Date(log.created_at);
    const key = d.toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(log);
  });
  return Object.entries(groups).map(([, items]) => {
    const d = new Date(items[0].created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    let label = d.toLocaleDateString('ar-SA', { month: 'long', day: 'numeric', year: 'numeric' });
    if (d.toDateString() === today.toDateString()) label = 'اليوم';
    else if (d.toDateString() === yesterday.toDateString()) label = 'أمس';
    return { label, items };
  });
}

export default function ActivityLogPanel({ projectId }: Props) {
  const { language } = useLanguage();
  const isRtl = language === 'ar';

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ActivityAction | 'all'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProjectActivityLogs(projectId, 100);
      setLogs(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = filter === 'all' ? logs : logs.filter((l) => l.action === filter);
  const groups = isRtl ? groupByDateAr(filtered) : groupByDate(filtered);

  const filterOptions: Array<{ value: ActivityAction | 'all'; labelEn: string; labelAr: string }> = [
    { value: 'all', labelEn: 'All', labelAr: 'الكل' },
    { value: 'edit_text', labelEn: 'Edits', labelAr: 'تعديلات' },
    { value: 'ai_usage', labelEn: 'AI Usage', labelAr: 'الذكاء الاصطناعي' },
    { value: 'create', labelEn: 'Created', labelAr: 'إنشاء' },
    { value: 'delete', labelEn: 'Deleted', labelAr: 'حذف' },
    { value: 'role_change', labelEn: 'Role Changes', labelAr: 'تغيير الأدوار' },
    { value: 'invite', labelEn: 'Invites', labelAr: 'دعوات' },
  ];

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {isRtl ? 'سجل النشاط' : 'Activity Log'}
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
            {isRtl ? 'تتبع جميع الإجراءات في المشروع' : 'Track all actions in this project'}
          </p>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--color-text-tertiary)' }}
          title={isRtl ? 'تحديث' : 'Refresh'}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-muted)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-5">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-all"
            style={{
              backgroundColor: filter === opt.value ? 'var(--color-accent)' : 'var(--color-muted)',
              color: filter === opt.value ? '#fff' : 'var(--color-text-secondary)',
            }}
          >
            {isRtl ? opt.labelAr : opt.labelEn}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div
            className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}
          />
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{ border: '1.5px dashed var(--color-border)' }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ backgroundColor: 'var(--color-muted)' }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-text-tertiary)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            {isRtl ? 'لا يوجد نشاط بعد' : 'No activity yet'}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
            {isRtl ? 'ستظهر الإجراءات هنا عند بدء العمل' : 'Actions will appear here as you work'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold" style={{ color: 'var(--color-text-tertiary)' }}>
                  {group.label}
                </span>
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
              </div>

              <div className="space-y-1">
                {group.items.map((log) => {
                  const colors = ACTION_COLORS[log.action];
                  const iconPath = ACTION_ICONS[log.action];
                  const actionLabel = isRtl ? ACTION_LABELS_AR[log.action] : ACTION_LABELS_EN[log.action];
                  const entityLabel = isRtl ? ENTITY_LABELS_AR[log.entity_type] : ENTITY_LABELS_EN[log.entity_type];
                  const relTime = formatRelativeTime(log.created_at, isRtl);

                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 py-2.5 px-3 rounded-lg transition-colors group"
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-muted)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: colors.bg }}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: colors.text }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
                        </svg>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                          <span className="font-semibold">{log.user_display_name || (isRtl ? 'مستخدم' : 'User')}</span>
                          {' '}
                          <span style={{ color: 'var(--color-text-secondary)' }}>{actionLabel}</span>
                          {' '}
                          <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.75rem' }}>{entityLabel}</span>
                          {log.entity_title ? (
                            <>
                              {' '}
                              <span
                                className="font-medium px-1.5 py-0.5 rounded text-xs"
                                style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-secondary)' }}
                              >
                                {log.entity_title}
                              </span>
                            </>
                          ) : null}
                        </p>
                      </div>

                      <span
                        className="text-xs shrink-0 mt-0.5"
                        style={{ color: 'var(--color-text-tertiary)' }}
                      >
                        {relTime}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
