import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { api, getProjectTasksProgress, getProjectScenesProgress, getUserStats, getEnabledProjectTypes, getGenres, getTones, setProjectGenres, setProjectTone, getSharedProjects, getNotifications } from '../services/api';
import type { Project, ProjectType, ProjectTypeSetting, Genre, Tone, CollaboratorRole } from '../types';
import { GENRE_SLUGS_BY_TYPE } from '../utils/genreConfig';
import Button from '../components/Button';
import Input from '../components/Input';
import GlobalHeader from '../components/GlobalHeader';
import { t } from '../utils/translations';
import DailyGoalModal from '../components/dashboard/DailyGoalModal';
import ConfettiCelebration from '../components/dashboard/ConfettiCelebration';
import { useDailyGoal } from '../hooks/useDailyGoal';
import { getProjectTypeConfig } from '../utils/projectTypeConfig';
import PromoPopup from '../components/PromoPopup';
import MarketingPanel from '../features/marketing/MarketingPanel';

function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

const ROLE_LABELS: Record<CollaboratorRole, { ar: string; en: string }> = {
  viewer: { ar: 'مشاهد', en: 'Viewer' },
  editor: { ar: 'محرر', en: 'Editor' },
  manager: { ar: 'مدير', en: 'Manager' },
};

export default function Dashboard() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectsTab, setActiveProjectsTab] = useState<'owned' | 'shared'>(
    searchParams.get('tab') === 'shared' ? 'shared' : 'owned'
  );
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [projectsTasksProgress, setProjectsTasksProgress] = useState<Record<string, { total: number; completed: number; percentage: number }>>({});
  const [projectsScenesProgress, setProjectsScenesProgress] = useState<Record<string, { total: number; completed: number; percentage: number }>>({});
  const [totalWordsAllTime, setTotalWordsAllTime] = useState(0);
  const [marketingProject, setMarketingProject] = useState<Project | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sharedProjects, setSharedProjects] = useState<Array<{ project: Project; role: CollaboratorRole; status: string }>>([]);
  const [pendingInviteProjectIds, setPendingInviteProjectIds] = useState<Set<string>>(new Set());
  const [_unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const { goalState, streakState, showConfetti, setShowConfetti, saveGoal } = useDailyGoal(user?.id);

  async function handleDeleteProject(projectId: string) {
    setDeleting(true);
    try {
      await api.deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Failed to delete project:', err);
    } finally {
      setDeleting(false);
    }
  }

  const getProgressColor = (percentage: number) => {
    if (percentage <= 40) return 'var(--color-error)';
    if (percentage <= 70) return 'var(--color-warning)';
    return 'var(--color-success)';
  };

  useEffect(() => {
    loadProjects();
    getUserStats().then(s => setTotalWordsAllTime(s.totalWordsAllTime)).catch(console.error);
    getNotifications().then(ns => setUnreadNotificationCount(ns.filter(n => !n.read).length)).catch(() => {});
    getSharedProjects().then(async (shared) => {
      setSharedProjects(shared);
      const statusesMap: Record<string, string> = {};
      const pendingIds = new Set<string>();
      shared.forEach(item => {
        statusesMap[item.project.id] = item.status;
        if (item.status === 'pending') pendingIds.add(item.project.id);
      });
      setPendingInviteProjectIds(pendingIds);
      const scenesMap: Record<string, { total: number; completed: number; percentage: number }> = {};
      await Promise.all(
        shared.map(async ({ project }) => {
          try {
            scenesMap[project.id] = await getProjectScenesProgress(project.id);
          } catch {
            scenesMap[project.id] = { total: 0, completed: 0, percentage: 0 };
          }
        })
      );
      setProjectsScenesProgress(prev => ({ ...prev, ...scenesMap }));
    }).catch(() => {});

    const onProjectsChanged = () => {
      loadProjects();
      setActiveProjectsTab('shared');
      getSharedProjects().then(setSharedProjects).catch(() => {});
    };
    window.addEventListener('projects-changed', onProjectsChanged);
    return () => window.removeEventListener('projects-changed', onProjectsChanged);
  }, [searchParams.get('refresh')]);

  const completedProjectsCount = useMemo(() => {
    return Object.values(projectsScenesProgress).filter(p => p.total > 0 && p.percentage >= 100).length;
  }, [projectsScenesProgress]);

  const sharedProjectRoles = useMemo(() => {
    return sharedProjects.reduce<Record<string, CollaboratorRole>>((acc, item) => {
      acc[item.project.id] = item.role;
      return acc;
    }, {});
  }, [sharedProjects]);

  const ownedProjects = useMemo(() => {
    if (!user?.id) return [];
    return projects.filter(project => project.user_id === user.id);
  }, [projects, user?.id]);

  const sharedOnlyProjects = useMemo(() => {
    if (!user?.id) return [];
    return projects.filter(project => project.user_id !== user.id);
  }, [projects, user?.id]);

  const visibleProjects = activeProjectsTab === 'owned' ? ownedProjects : sharedOnlyProjects;

  async function loadProjects() {
    try {
      const data = await api.getProjects();
      setProjects(data);

      const progressMap: Record<string, { total: number; completed: number; percentage: number }> = {};
      const scenesMap: Record<string, { total: number; completed: number; percentage: number }> = {};
      await Promise.all(
        data.map(async (project) => {
          try {
            const [tasksProgress, scenesProgress] = await Promise.all([
              getProjectTasksProgress(project.id),
              getProjectScenesProgress(project.id),
            ]);
            progressMap[project.id] = tasksProgress;
            scenesMap[project.id] = scenesProgress;
          } catch (error) {
            console.error(`Failed to load progress for project ${project.id}:`, error);
            progressMap[project.id] = { total: 0, completed: 0, percentage: 0 };
            scenesMap[project.id] = { total: 0, completed: 0, percentage: 0 };
          }
        })
      );
      setProjectsTasksProgress(progressMap);
      setProjectsScenesProgress(scenesMap);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  }

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.greeting.morning', language);
    if (hour < 17) return t('dashboard.greeting.afternoon', language);
    return t('dashboard.greeting.evening', language);
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <PromoPopup />
      <GlobalHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div
          className="rounded-2xl p-8 mb-8"
          style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            <div className="flex-1 min-w-0">
              <h2 className="text-3xl font-bold mb-2">
                {getGreeting()}, {user?.user_metadata?.pen_name || user?.user_metadata?.first_name || t('dashboard.greeting.writer', language)}!
              </h2>
              <p className="text-lg opacity-90">
                {new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p className="mt-3 text-base opacity-90">{t('dashboard.greeting.ready', language)}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 lg:gap-6 shrink-0 items-stretch">
              <div className="flex flex-col gap-4" style={{ minWidth: '220px' }}>
                <div
                  className="rounded-xl p-5 flex flex-col justify-center gap-1 flex-1"
                  style={{ backgroundColor: 'rgba(0,0,0,0.18)' }}
                >
                  <span className="text-2xl font-black leading-none">
                    {completedProjectsCount.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}
                  </span>
                  <span className="text-xs font-medium opacity-80">{language === 'ar' ? 'مشروع مكتمل' : 'Completed Projects'}</span>
                </div>
                <div
                  className="rounded-xl p-5 flex flex-col justify-center gap-1 flex-1"
                  style={{ backgroundColor: 'rgba(0,0,0,0.18)' }}
                >
                  <span className="text-2xl font-black leading-none">
                    {totalWordsAllTime.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}
                  </span>
                  <span className="text-xs font-medium opacity-80">{language === 'ar' ? 'كلمة في جميع المشاريع' : 'Total Words Written'}</span>
                </div>
              </div>

              <div
                className="rounded-xl p-5 flex flex-col gap-3"
                style={{ backgroundColor: 'rgba(0,0,0,0.18)', minWidth: '220px' }}
              >
                <div>
                  <p className="text-sm font-semibold opacity-80 mb-1">{language === 'ar' ? 'حدد هدفًا لنفسك' : 'Set Your Daily Goal'}</p>
                  <p className="text-xs opacity-70 leading-relaxed">{language === 'ar' ? 'إبداعك يستحق الالتزام حتى يمتعنا' : 'Your creativity deserves consistent commitment'}</p>
                </div>

                {goalState.goalWords && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs opacity-70">
                        {goalState.todayWords.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')} / {goalState.goalWords.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')} {language === 'ar' ? 'كلمة' : 'words'}
                      </span>
                      <span className="text-xs font-bold">
                        {Math.min(100, Math.round((goalState.todayWords / goalState.goalWords) * 100))}%
                      </span>
                    </div>
                    <div className="w-full rounded-full h-2" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.round((goalState.todayWords / goalState.goalWords) * 100))}%`,
                          backgroundColor: goalState.goalReached ? '#4ade80' : 'white',
                        }}
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setShowGoalModal(true)}
                  className="text-sm font-semibold py-2 px-4 rounded-lg transition-all hover:scale-105 active:scale-95"
                  style={{ backgroundColor: 'white', color: 'var(--color-accent)' }}
                >
                  {goalState.goalWords
                    ? (language === 'ar' ? 'تعديل الهدف اليومي' : 'Edit Daily Goal')
                    : (language === 'ar' ? 'حدد الهدف اليومي' : 'Set Daily Goal')
                  }
                </button>

                {goalState.goalReached && (
                  <p className="text-sm font-semibold text-center" style={{ color: '#86efac' }}>
                    {language === 'ar' ? 'مرحى! لقد حققت هدفك اليومي، استمر' : 'Well done! You reached your daily goal, keep it up!'}
                  </p>
                )}
                {!goalState.goalReached && goalState.goalMissedYesterday && goalState.goalWords && (
                  <p className="text-sm opacity-80 text-center">
                    {language === 'ar' ? 'لا بأس، اكتب اليوم وعوّض ما فاتك' : "No worries, write today and make up for what you missed"}
                  </p>
                )}
              </div>

              <div
                className="rounded-xl p-5 flex flex-col items-center justify-center gap-3"
                style={{ backgroundColor: 'rgba(0,0,0,0.18)', minWidth: '160px' }}
              >
                <div className="relative flex items-center justify-center">
                  <span className="text-5xl font-black leading-none">
                    {streakState.loading ? '—' : streakState.currentStreak.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}
                  </span>
                  {!streakState.loading && streakState.currentStreak > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className="absolute w-3 h-3"
                          viewBox="0 0 24 24"
                          fill="white"
                          style={{
                            opacity: 0.35,
                            top: `${-18 + i * 9}%`,
                            left: `${-20 + i * 10}%`,
                            transform: `rotate(${i * 36}deg) translate(${28 + i * 4}px, 0)`,
                          }}
                        >
                          <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                        </svg>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs font-medium opacity-80 text-center leading-tight">
                  {language === 'ar' ? 'يوم من الالتزام والنجاح' : 'days of commitment'}
                </p>
                <p className="text-xs opacity-60 text-center">{language === 'ar' ? 'عداد أيام التحدي' : 'Writing Streak'}</p>
              </div>
            </div>
          </div>
        </div>

        {showGoalModal && (
          <DailyGoalModal
            currentGoal={goalState.goalWords}
            onSave={async (goal) => {
              await saveGoal(goal);
              setShowGoalModal(false);
            }}
            onClose={() => setShowGoalModal(false)}
          />
        )}

        {showConfetti && (
          <ConfettiCelebration onDone={() => setShowConfetti(false)} />
        )}

        <div className="flex items-center mb-6 justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {language === 'ar' ? 'المشاريع' : 'Projects'}
            </h3>
            <div
              className="inline-flex items-center gap-2 p-1 rounded-xl"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <button
                onClick={() => setActiveProjectsTab('owned')}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  backgroundColor: activeProjectsTab === 'owned' ? 'var(--color-accent)' : 'transparent',
                  color: activeProjectsTab === 'owned' ? 'white' : 'var(--color-text-secondary)',
                }}
              >
                {language === 'ar' ? `مشاريعي (${ownedProjects.length})` : `My Projects (${ownedProjects.length})`}
              </button>
              <button
                onClick={() => setActiveProjectsTab('shared')}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  backgroundColor: activeProjectsTab === 'shared' ? 'var(--color-accent)' : 'transparent',
                  color: activeProjectsTab === 'shared' ? 'white' : 'var(--color-text-secondary)',
                }}
              >
                {language === 'ar' ? `مشاريع مشتركة (${sharedOnlyProjects.length})` : `Shared Projects (${sharedOnlyProjects.length})`}
              </button>
            </div>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            {t('dashboard.newProject', language)}
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-accent)' }}></div>
          </div>
        ) : visibleProjects.length === 0 ? (
          <div className="text-center py-12 rounded-xl shadow-sm" style={{ backgroundColor: 'var(--color-surface)' }}>
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              {activeProjectsTab === 'owned'
                ? t('dashboard.noProjects', language)
                : (language === 'ar' ? 'لا توجد مشاريع مشتركة بعد' : 'No shared projects yet')}
            </h3>
            <p className="mb-6" style={{ color: 'var(--color-text-secondary)' }}>
              {activeProjectsTab === 'owned'
                ? t('dashboard.noProjectsDesc', language)
                : (language === 'ar' ? 'عندما يشارك أحدهم مشروعًا معك سيظهر هنا.' : 'When someone shares a project with you, it will appear here.')}
            </p>
            {activeProjectsTab === 'owned' && (
              <Button onClick={() => setShowCreateModal(true)}>
                {t('dashboard.createFirstProject', language)}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleProjects.map((project) => {
              const sceneProg = projectsScenesProgress[project.id];
              const isComplete = sceneProg?.total > 0 && sceneProg?.percentage >= 100;
              const isShared = project.user_id !== user?.id;
              const sharedRole = isShared ? sharedProjectRoles[project.id] : null;
              return (
                <div key={project.id} className="card flex flex-col relative group">
                  {!isShared && (
                  <button
                    onClick={(e) => { e.preventDefault(); setDeleteConfirmId(project.id); }}
                    className="absolute top-3 opacity-0 group-hover:opacity-100 transition-opacity z-10 p-1.5 rounded-lg"
                    style={{
                      [language === 'ar' ? 'left' : 'right']: '12px',
                      backgroundColor: 'var(--color-error-bg)',
                      color: 'var(--color-error)',
                    }}
                    title={language === 'ar' ? 'حذف المشروع' : 'Delete project'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  )}
                  <Link
                    to={`/projects/${project.id}`}
                    className="flex-1 block hover:opacity-90 transition-opacity"
                  >
                    <div className="flex items-start justify-between mb-4 gap-3">
                      <div className="min-w-0">
                        <h4 className="text-xl font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{project.title}</h4>
                        {isShared && (
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {pendingInviteProjectIds.has(project.id) ? (
                              <span
                                className="text-xs font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap animate-pulse"
                                style={{ backgroundColor: 'rgba(214,40,40,0.12)', color: 'var(--color-accent)' }}
                              >
                                {language === 'ar' ? '🔔 دعوة جديدة' : '🔔 New Invite'}
                              </span>
                            ) : (
                              <span
                                className="text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap"
                                style={{ backgroundColor: 'rgba(59,130,246,0.14)', color: '#2563eb' }}
                              >
                                {language === 'ar' ? 'مشروع مشترك' : 'Shared Project'}
                              </span>
                            )}
                            {sharedRole && (
                              <span
                                className="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                                style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-secondary)' }}
                              >
                                {language === 'ar' ? ROLE_LABELS[sharedRole].ar : ROLE_LABELS[sharedRole].en}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {isComplete && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: 'var(--color-success)' }}>
                          {language === 'ar' ? 'مكتمل' : 'Complete'}
                        </span>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium mb-3" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-accent)' }}>
                      <span>{getProjectTypeConfig(project.project_type).icon}</span>
                      <span>{language === 'ar' ? getProjectTypeConfig(project.project_type).labelAr : getProjectTypeConfig(project.project_type).labelEn}</span>
                    </span>
                    <p className="mb-4 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>{project.idea ? stripHtml(project.idea) : t('common.noDescription', language)}</p>
                    <div className="flex items-center justify-between text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                      <span>{project.current_word_count.toLocaleString()} {t('dashboard.words', language)}</span>
                      <span>{new Date(project.updated_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</span>
                    </div>
                    {sceneProg && sceneProg.total > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                          <span>{language === 'ar' ? 'التقدم' : 'Progress'}</span>
                          <span>{sceneProg.completed} / {sceneProg.total}</span>
                        </div>
                        <div className="w-full rounded-full h-2" style={{ backgroundColor: 'var(--color-muted)' }}>
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{ width: `${sceneProg.percentage}%`, backgroundColor: getProgressColor(sceneProg.percentage) }}
                          />
                        </div>
                      </div>
                    )}
                    {projectsTasksProgress[project.id] && projectsTasksProgress[project.id].total > 0 && (
                      <div className="mt-3 pt-3" style={{ borderTop: `1px solid var(--color-border)` }}>
                        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                          <span>{language === 'ar' ? 'الملاحظات' : 'Notes'}</span>
                          <span>{projectsTasksProgress[project.id].completed} / {projectsTasksProgress[project.id].total}</span>
                        </div>
                        <div className="w-full rounded-full h-2" style={{ backgroundColor: 'var(--color-muted)' }}>
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{ width: `${projectsTasksProgress[project.id].percentage}%`, backgroundColor: getProgressColor(projectsTasksProgress[project.id].percentage) }}
                          />
                        </div>
                      </div>
                    )}
                  </Link>
                  {isComplete && (
                    <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                      <button
                        onClick={(e) => { e.preventDefault(); setMarketingProject(project); }}
                        className="w-full py-2 rounded-lg text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
                      >
                        🚀 {t('marketing.button', language)}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {false && sharedProjects.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center mb-6">
              <h3 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {language === 'ar' ? 'المشاريع المشتركة' : 'Shared With Me'}
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sharedProjects.map(({ project, role }) => {
                const sceneProg = projectsScenesProgress[project.id];
                const ROLE_LABELS: Record<CollaboratorRole, { ar: string; en: string }> = {
                  viewer: { ar: 'مشاهد', en: 'Viewer' },
                  editor: { ar: 'محرر', en: 'Editor' },
                  manager: { ar: 'مدير', en: 'Manager' },
                };
                return (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="card flex flex-col hover:opacity-90 transition-opacity"
                  >
                    <div className="flex items-start justify-between mb-3 gap-2">
                      <h4 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {project.title}
                      </h4>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span
                          className="text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap"
                          style={{ backgroundColor: 'rgba(var(--color-accent-rgb, 59,130,246),0.12)', color: 'var(--color-accent)' }}
                        >
                          {language === 'ar' ? 'مشروع مشترك' : 'Shared Project'}
                        </span>
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                          style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-secondary)' }}
                        >
                          {language === 'ar' ? ROLE_LABELS[role].ar : ROLE_LABELS[role].en}
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium mb-3" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-accent)' }}>
                      <span>{getProjectTypeConfig(project.project_type).icon}</span>
                      <span>{language === 'ar' ? getProjectTypeConfig(project.project_type).labelAr : getProjectTypeConfig(project.project_type).labelEn}</span>
                    </span>
                    <p className="mb-4 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
                      {project.idea ? stripHtml(project.idea) : t('common.noDescription', language)}
                    </p>
                    <div className="flex items-center justify-between text-sm mt-auto" style={{ color: 'var(--color-text-tertiary)' }}>
                      <span>{project.current_word_count.toLocaleString()} {t('dashboard.words', language)}</span>
                      <span>{new Date(project.updated_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</span>
                    </div>
                    {sceneProg && sceneProg.total > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                          <span>{language === 'ar' ? 'التقدم' : 'Progress'}</span>
                          <span>{sceneProg.completed} / {sceneProg.total}</span>
                        </div>
                        <div className="w-full rounded-full h-2" style={{ backgroundColor: 'var(--color-muted)' }}>
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{ width: `${sceneProg.percentage}%`, backgroundColor: getProgressColor(sceneProg.percentage) }}
                          />
                        </div>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(project) => {
            setProjects([...projects, project]);
            setShowCreateModal(false);
            navigate(`/projects/${project.id}`);
          }}
        />
      )}

      {marketingProject && (
        <MarketingPanel
          project={marketingProject}
          onClose={() => setMarketingProject(null)}
        />
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-xl shadow-xl p-6 w-full max-w-sm" style={{ backgroundColor: 'var(--color-surface)' }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              {language === 'ar' ? 'حذف المشروع' : 'Delete Project'}
            </h3>
            <p className="mb-6 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {language === 'ar'
                ? 'هل أنت متأكد من حذف هذا المشروع؟ لن تتمكن من استرجاعه.'
                : 'Are you sure you want to delete this project? This action cannot be undone.'}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-primary)' }}
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => handleDeleteProject(deleteConfirmId)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: 'var(--color-error)', color: 'white', opacity: deleting ? 0.7 : 1 }}
              >
                {deleting
                  ? (language === 'ar' ? 'جاري الحذف...' : 'Deleting...')
                  : (language === 'ar' ? 'حذف' : 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: (project: Project) => void }) {
  const { language } = useLanguage();
  const [title, setTitle] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('novel');
  const [idea, setIdea] = useState('');
  const [targetWordCount, setTargetWordCount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [enabledTypes, setEnabledTypes] = useState<ProjectTypeSetting[]>([]);
  const [allGenres, setAllGenres] = useState<Genre[]>([]);
  const [allTones, setAllTones] = useState<Tone[]>([]);
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);
  const [selectedToneId, setSelectedToneId] = useState<string | null>(null);

  useEffect(() => {
    getEnabledProjectTypes().then(setEnabledTypes).catch(() => {});
    getGenres().then(setAllGenres).catch(() => {});
    getTones().then(setAllTones).catch(() => {});
  }, []);

  const allowedGenreSlugs = GENRE_SLUGS_BY_TYPE[projectType] || [];
  const filteredGenres = allGenres.filter(g => allowedGenreSlugs.includes(g.slug));

  function handleTypeChange(type: ProjectType) {
    setProjectType(type);
    setSelectedGenreIds([]);
    setSelectedToneId(null);
  }

  function toggleGenre(id: string) {
    setSelectedGenreIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!title.trim()) {
      setError(t('project.create.titleRequired', language) || 'Project title is required');
      setLoading(false);
      return;
    }

    const wordCount = parseInt(targetWordCount);
    if (!targetWordCount || isNaN(wordCount) || wordCount <= 0) {
      setError(t('project.create.invalidWordCount', language) || 'Target word count is required and must be a positive number');
      setLoading(false);
      return;
    }

    try {
      const project = await api.createProject({
        title,
        project_type: projectType,
        idea: idea || undefined,
        target_word_count: wordCount
      });
      await Promise.all([
        selectedGenreIds.length > 0 ? setProjectGenres(project.id, selectedGenreIds) : Promise.resolve(),
        selectedToneId ? setProjectTone(project.id, selectedToneId) : Promise.resolve(),
      ]);
      onCreated(project);
    } catch (err) {
      console.error('Project creation failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  const selectedTypeConfig = getProjectTypeConfig(projectType);

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{t('project.create.title', language)}</h3>
          <button onClick={onClose} style={{ color: 'var(--color-text-tertiary)' }}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: `1px solid var(--color-error)`, color: 'var(--color-error)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t('project.create.projectTitle', language)}
            placeholder={t('project.create.titlePlaceholder', language)}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              {language === 'ar' ? 'نوع المشروع' : 'Project Type'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(enabledTypes.length > 0 ? enabledTypes : []).map((typeSetting) => {
                const cfg = getProjectTypeConfig(typeSetting.project_type as ProjectType);
                const isSelected = projectType === typeSetting.project_type;
                return (
                  <button
                    key={typeSetting.project_type}
                    type="button"
                    onClick={() => handleTypeChange(typeSetting.project_type as ProjectType)}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center"
                    style={{
                      borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                      backgroundColor: isSelected ? 'var(--color-muted)' : 'var(--color-bg-secondary)',
                      color: isSelected ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    }}
                  >
                    <span className="text-2xl">{cfg.icon}</span>
                    <span className="text-xs font-medium leading-tight">
                      {language === 'ar' ? cfg.labelAr : cfg.labelEn}
                    </span>
                  </button>
                );
              })}
            </div>
            {selectedTypeConfig.structureNote && (
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
                {language === 'ar' ? selectedTypeConfig.structureNote.ar : selectedTypeConfig.structureNote.en}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>{t('project.create.targetWordCount', language)}</label>
            <Input
              type="number"
              placeholder={t('project.create.targetPlaceholder', language)}
              value={targetWordCount}
              onChange={(e) => setTargetWordCount(e.target.value)}
              min="1"
              required
            />
          </div>

          {filteredGenres.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                {language === 'ar' ? 'التصنيف الأدبي' : 'Genre'}
                <span className="text-xs ms-2" style={{ color: 'var(--color-text-tertiary)' }}>
                  {language === 'ar' ? '(اختر حتى 3)' : '(up to 3)'}
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                {filteredGenres.map(g => {
                  const selected = selectedGenreIds.includes(g.id);
                  const disabled = !selected && selectedGenreIds.length >= 3;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleGenre(g.id)}
                      className="px-3 py-1 rounded-full text-xs font-medium border transition-all"
                      style={{
                        borderColor: selected ? 'var(--color-accent)' : 'var(--color-border)',
                        backgroundColor: selected ? 'var(--color-accent)' : 'transparent',
                        color: selected ? '#fff' : disabled ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
                        opacity: disabled ? 0.5 : 1,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {language === 'ar' ? g.name_ar : g.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {allTones.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                {language === 'ar' ? 'النبرة العامة' : 'Tone'}
              </label>
              <div className="flex flex-wrap gap-2">
                {allTones.map(tone => {
                  const selected = selectedToneId === tone.id;
                  return (
                    <button
                      key={tone.id}
                      type="button"
                      onClick={() => setSelectedToneId(selected ? null : tone.id)}
                      className="px-3 py-1 rounded-full text-xs font-medium border transition-all"
                      style={{
                        borderColor: selected ? 'var(--color-accent)' : 'var(--color-border)',
                        backgroundColor: selected ? 'var(--color-accent)' : 'transparent',
                        color: selected ? '#fff' : 'var(--color-text-secondary)',
                      }}
                    >
                      {language === 'ar' ? tone.name_ar : tone.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>{t('project.create.idea', language)}</label>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder={t('project.create.ideaPlaceholder', language)}
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              {t('project.create.cancel', language)}
            </Button>
            <Button type="submit" variant="primary" loading={loading} className="flex-1">
              {t('project.create.create', language)}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
