import { useState, useEffect } from 'react';
import {
  getAllWeeklyChallenges,
  createWeeklyChallenge,
  updateWeeklyChallenge,
  deleteWeeklyChallenge,
  getAllLearningPaths,
  createLearningPath,
  updateLearningPath,
  deleteLearningPath,
  setLearningPathCourses,
  getAllCourses,
} from '../../services/academyApi';
import type {
  AcademyWeeklyChallenge,
  AcademyLearningPath,
  AcademyCourse,
  AcademyChallengeSubmission,
  CourseLevel,
} from '../../types/academy';
import { supabase } from '../../lib/supabaseClient';

const LEVEL_OPTIONS: { value: CourseLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

type Section = 'challenges' | 'submissions' | 'paths';

const SECTION_LABELS: Record<Section, string> = {
  challenges: 'Weekly Challenges',
  submissions: 'Submissions',
  paths: 'Learning Paths',
};

export default function AdminAcademyIntelligence() {
  const [section, setSection] = useState<Section>('challenges');

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Academy Intelligence
        </h2>
      </div>

      <div className="flex gap-2 mb-6">
        {(['challenges', 'submissions', 'paths'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              backgroundColor: section === s ? 'var(--color-accent)' : 'var(--color-surface)',
              color: section === s ? '#fff' : 'var(--color-text-secondary)',
              border: `1px solid ${section === s ? 'var(--color-accent)' : 'var(--color-border)'}`,
            }}
          >
            {SECTION_LABELS[s]}
          </button>
        ))}
      </div>

      {section === 'challenges' && <WeeklyChallengesManager />}
      {section === 'submissions' && <ChallengeSubmissionsViewer />}
      {section === 'paths' && <LearningPathsManager />}
    </div>
  );
}

interface SubmissionWithChallenge extends AcademyChallengeSubmission {
  challenge_title?: string;
  user_email?: string;
  user_name?: string;
}

function ChallengeSubmissionsViewer() {
  const [submissions, setSubmissions] = useState<SubmissionWithChallenge[]>([]);
  const [challenges, setChallenges] = useState<AcademyWeeklyChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterChallenge, setFilterChallenge] = useState<string>('all');
  const [viewing, setViewing] = useState<SubmissionWithChallenge | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [{ data: subs }, challengeList] = await Promise.all([
        supabase
          .from('academy_challenge_submissions')
          .select(`
            *,
            academy_weekly_challenges (title_en, title_ar),
            users (email, first_name, last_name, pen_name)
          `)
          .order('created_at', { ascending: false }),
        getAllWeeklyChallenges(),
      ]);

      setChallenges(challengeList);
      setSubmissions(
        (subs || []).map((s: any) => ({
          ...s,
          challenge_title: s.academy_weekly_challenges?.title_en || s.academy_weekly_challenges?.title_ar || 'Unknown Challenge',
          user_email: s.users?.email || '',
          user_name: s.users?.pen_name || `${s.users?.first_name || ''} ${s.users?.last_name || ''}`.trim() || s.users?.email || 'Unknown',
        }))
      );
    } catch (err) {
      console.error('[ChallengeSubmissionsViewer] Load failed:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = filterChallenge === 'all'
    ? submissions
    : submissions.filter((s) => s.challenge_id === filterChallenge);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-accent)' }} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {filtered.length} submission{filtered.length !== 1 ? 's' : ''}
        </p>
        <select
          value={filterChallenge}
          onChange={(e) => setFilterChallenge(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm outline-none"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
        >
          <option value="all">All Challenges</option>
          {challenges.map((c) => (
            <option key={c.id} value={c.id}>{c.title_en || c.title_ar}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div
          className="text-center py-12 rounded-xl"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>No submissions yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Submissions from writers will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((sub) => (
            <div
              key={sub.id}
              className="rounded-xl p-4 flex items-start gap-3 cursor-pointer hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              onClick={() => setViewing(sub)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {sub.user_name}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                    {sub.challenge_title}
                  </span>
                </div>
                <p className="text-xs line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
                  {sub.content}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                  {new Date(sub.created_at).toLocaleString()}
                </p>
              </div>
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-text-tertiary)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          ))}
        </div>
      )}

      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setViewing(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl p-6 max-h-[85vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4 gap-3">
              <div>
                <h3 className="font-bold text-base" style={{ color: 'var(--color-text-primary)' }}>
                  {viewing.user_name}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                  {viewing.user_email} · {viewing.challenge_title} · {new Date(viewing.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setViewing(null)}
                className="p-1.5 rounded-lg shrink-0 hover:opacity-80"
                style={{ color: 'var(--color-text-tertiary)', backgroundColor: 'var(--color-bg-secondary)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div
              className="rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              {viewing.content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WeeklyChallengesManager() {
  const [challenges, setChallenges] = useState<AcademyWeeklyChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AcademyWeeklyChallenge | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      setChallenges(await getAllWeeklyChallenges());
    } catch (err) {
      console.error('[AdminAcademyIntelligence] Failed to load challenges:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this weekly challenge?')) return;
    try {
      await deleteWeeklyChallenge(id);
      setChallenges((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error('[AdminAcademyIntelligence] Delete challenge failed:', err);
    }
  }

  async function handleToggleActive(challenge: AcademyWeeklyChallenge) {
    try {
      const updated = await updateWeeklyChallenge(challenge.id, { is_active: !challenge.is_active });
      setChallenges((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err) {
      console.error('[AdminAcademyIntelligence] Toggle active failed:', err);
    }
  }

  const now = new Date();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-accent)' }} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
          style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Challenge
        </button>
      </div>

      {challenges.length === 0 ? (
        <div
          className="text-center py-12 rounded-xl"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>No weekly challenges yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Create your first challenge to engage learners</p>
        </div>
      ) : (
        <div className="space-y-3">
          {challenges.map((ch) => {
            const starts = new Date(ch.starts_at);
            const ends = new Date(ch.ends_at);
            const isLive = ch.is_active && now >= starts && now <= ends;
            const isUpcoming = ch.is_active && now < starts;
            const isEnded = now > ends;

            return (
              <div
                key={ch.id}
                className="rounded-xl p-4 flex items-start justify-between gap-4"
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                      {ch.title_en || ch.title_ar}
                    </span>
                    {isLive && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
                        Live
                      </span>
                    )}
                    {isUpcoming && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                        Upcoming
                      </span>
                    )}
                    {isEnded && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-tertiary)' }}>
                        Ended
                      </span>
                    )}
                    {!ch.is_active && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-tertiary)' }}>
                        Inactive
                      </span>
                    )}
                    {ch.tokens_reward > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                        +{ch.tokens_reward} tokens
                      </span>
                    )}
                  </div>
                  <p className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {ch.title_ar}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                    {starts.toLocaleDateString()} – {ends.toLocaleDateString()}
                  </p>
                  {ch.skill_tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {ch.skill_tags.map((t) => (
                        <span key={t} className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border)' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggleActive(ch)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                    style={{
                      backgroundColor: ch.is_active ? 'rgba(34,197,94,0.1)' : 'var(--color-muted)',
                      color: ch.is_active ? '#22c55e' : 'var(--color-text-tertiary)',
                    }}
                  >
                    {ch.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => { setEditing(ch); setShowForm(true); }}
                    className="p-1.5 rounded-lg transition-all hover:opacity-80"
                    style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-secondary)' }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(ch.id)}
                    className="p-1.5 rounded-lg transition-all hover:opacity-80"
                    style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <ChallengeFormModal
          challenge={editing}
          onClose={() => setShowForm(false)}
          onSaved={(ch) => {
            if (editing) {
              setChallenges((prev) => prev.map((c) => (c.id === ch.id ? ch : c)));
            } else {
              setChallenges((prev) => [ch, ...prev]);
            }
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

function ChallengeFormModal({
  challenge,
  onClose,
  onSaved,
}: {
  challenge: AcademyWeeklyChallenge | null;
  onClose: () => void;
  onSaved: (ch: AcademyWeeklyChallenge) => void;
}) {
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [form, setForm] = useState({
    title_en: challenge?.title_en || '',
    title_ar: challenge?.title_ar || '',
    prompt_en: challenge?.prompt_en || '',
    prompt_ar: challenge?.prompt_ar || '',
    skill_tags: challenge?.skill_tags?.join(', ') || '',
    starts_at: challenge?.starts_at?.slice(0, 16) || now.toISOString().slice(0, 16),
    ends_at: challenge?.ends_at?.slice(0, 16) || nextWeek.toISOString().slice(0, 16),
    is_active: challenge?.is_active ?? true,
    tokens_reward: challenge?.tokens_reward?.toString() || '0',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!form.title_en.trim() && !form.title_ar.trim()) {
      setError('Title (English or Arabic) is required');
      return;
    }
    if (!form.prompt_en.trim() && !form.prompt_ar.trim()) {
      setError('Prompt is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        title_en: form.title_en.trim(),
        title_ar: form.title_ar.trim(),
        prompt_en: form.prompt_en.trim(),
        prompt_ar: form.prompt_ar.trim(),
        skill_tags: form.skill_tags.split(',').map((t) => t.trim()).filter(Boolean),
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
        is_active: form.is_active,
        tokens_reward: parseInt(form.tokens_reward) || 0,
      };

      const result = challenge
        ? await updateWeeklyChallenge(challenge.id, payload)
        : await createWeeklyChallenge(payload);

      onSaved(result);
    } catch (err) {
      console.error('[ChallengeFormModal] Save failed:', err);
      setError('Failed to save challenge');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div
        className="w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {challenge ? 'Edit Challenge' : 'New Weekly Challenge'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-80" style={{ color: 'var(--color-text-tertiary)' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Title (English)</label>
              <input
                value={form.title_en}
                onChange={(e) => setForm({ ...form, title_en: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                placeholder="e.g. Write a Memorable Opening"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Title (Arabic)</label>
              <input
                value={form.title_ar}
                onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
                dir="rtl"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                placeholder="مثال: اكتب بداية لا تُنسى"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Prompt (English)</label>
            <textarea
              value={form.prompt_en}
              onChange={(e) => setForm({ ...form, prompt_en: e.target.value })}
              rows={4}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
              style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              placeholder="Write the challenge prompt in English..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Prompt (Arabic)</label>
            <textarea
              value={form.prompt_ar}
              onChange={(e) => setForm({ ...form, prompt_ar: e.target.value })}
              dir="rtl"
              rows={4}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
              style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              placeholder="اكتب الموضوع باللغة العربية..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Starts At</label>
              <input
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Ends At</label>
              <input
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Skill Tags (comma-separated)</label>
              <input
                value={form.skill_tags}
                onChange={(e) => setForm({ ...form, skill_tags: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                placeholder="plot, character, dialogue"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Token Reward</label>
              <input
                type="number"
                min="0"
                value={form.tokens_reward}
                onChange={(e) => setForm({ ...form, tokens_reward: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="challenge-active"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 rounded"
              style={{ accentColor: 'var(--color-accent)' }}
            />
            <label htmlFor="challenge-active" className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Active
            </label>
          </div>
        </div>

        {error && <p className="mt-3 text-xs" style={{ color: 'var(--color-error)' }}>{error}</p>}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-80"
            style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-secondary)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
          >
            {saving ? 'Saving...' : (challenge ? 'Save Changes' : 'Create Challenge')}
          </button>
        </div>
      </div>
    </div>
  );
}

function LearningPathsManager() {
  const [paths, setPaths] = useState<AcademyLearningPath[]>([]);
  const [courses, setCourses] = useState<AcademyCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AcademyLearningPath | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [pathsData, coursesData] = await Promise.all([getAllLearningPaths(), getAllCourses()]);
      setPaths(pathsData);
      setCourses(coursesData);
    } catch (err) {
      console.error('[LearningPathsManager] Load failed:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this learning path?')) return;
    try {
      await deleteLearningPath(id);
      setPaths((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('[LearningPathsManager] Delete failed:', err);
    }
  }

  async function handleToggleActive(path: AcademyLearningPath) {
    try {
      const updated = await updateLearningPath(path.id, { is_active: !path.is_active });
      setPaths((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      console.error('[LearningPathsManager] Toggle failed:', err);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-accent)' }} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
          style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Learning Path
        </button>
      </div>

      {paths.length === 0 ? (
        <div
          className="text-center py-12 rounded-xl"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>No learning paths yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Create paths to guide learners through structured journeys</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paths.map((path) => (
            <div
              key={path.id}
              className="rounded-xl p-4 flex items-start justify-between gap-4"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                    {path.title_en || path.title_ar}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: path.target_level === 'beginner' ? 'rgba(34,197,94,0.12)' : path.target_level === 'intermediate' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                      color: path.target_level === 'beginner' ? '#22c55e' : path.target_level === 'intermediate' ? '#f59e0b' : '#ef4444',
                    }}
                  >
                    {path.target_level}
                  </span>
                  {!path.is_active && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-tertiary)' }}>
                      Inactive
                    </span>
                  )}
                </div>
                {path.title_ar && <p className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>{path.title_ar}</p>}
                {path.skill_tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {path.skill_tags.map((t) => (
                      <span key={t} className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border)' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleToggleActive(path)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                  style={{
                    backgroundColor: path.is_active ? 'rgba(34,197,94,0.1)' : 'var(--color-muted)',
                    color: path.is_active ? '#22c55e' : 'var(--color-text-tertiary)',
                  }}
                >
                  {path.is_active ? 'Active' : 'Inactive'}
                </button>
                <button
                  onClick={() => { setEditing(path); setShowForm(true); }}
                  className="p-1.5 rounded-lg transition-all hover:opacity-80"
                  style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-secondary)' }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(path.id)}
                  className="p-1.5 rounded-lg transition-all hover:opacity-80"
                  style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <LearningPathFormModal
          path={editing}
          allCourses={courses}
          onClose={() => setShowForm(false)}
          onSaved={(p) => {
            if (editing) {
              setPaths((prev) => prev.map((x) => (x.id === p.id ? p : x)));
            } else {
              setPaths((prev) => [...prev, p]);
            }
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

function LearningPathFormModal({
  path,
  allCourses,
  onClose,
  onSaved,
}: {
  path: AcademyLearningPath | null;
  allCourses: AcademyCourse[];
  onClose: () => void;
  onSaved: (p: AcademyLearningPath) => void;
}) {
  const [form, setForm] = useState({
    title_en: path?.title_en || '',
    title_ar: path?.title_ar || '',
    description_en: path?.description_en || '',
    description_ar: path?.description_ar || '',
    target_level: (path?.target_level || 'beginner') as CourseLevel,
    skill_tags: path?.skill_tags?.join(', ') || '',
    is_active: path?.is_active ?? true,
    order_index: path?.order_index?.toString() || '0',
  });
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>(
    (path?.courses || []).map((c) => c.id)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function toggleCourse(courseId: string) {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
  }

  function moveCourse(courseId: string, direction: 'up' | 'down') {
    setSelectedCourseIds((prev) => {
      const idx = prev.indexOf(courseId);
      if (idx < 0) return prev;
      const next = [...prev];
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }

  async function handleSave() {
    if (!form.title_en.trim() && !form.title_ar.trim()) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        title_en: form.title_en.trim(),
        title_ar: form.title_ar.trim(),
        description_en: form.description_en.trim(),
        description_ar: form.description_ar.trim(),
        target_level: form.target_level,
        skill_tags: form.skill_tags.split(',').map((t) => t.trim()).filter(Boolean),
        is_active: form.is_active,
        order_index: parseInt(form.order_index) || 0,
      };

      const result = path
        ? await updateLearningPath(path.id, payload)
        : await createLearningPath(payload);

      await setLearningPathCourses(result.id, selectedCourseIds);

      onSaved({ ...result, courses: selectedCourseIds.map((id) => allCourses.find((c) => c.id === id)!).filter(Boolean) });
    } catch (err) {
      console.error('[LearningPathFormModal] Save failed:', err);
      setError('Failed to save learning path');
    } finally {
      setSaving(false);
    }
  }

  const orderedSelected = selectedCourseIds.map((id) => allCourses.find((c) => c.id === id)).filter(Boolean) as AcademyCourse[];
  const unselected = allCourses.filter((c) => !selectedCourseIds.includes(c.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div
        className="w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {path ? 'Edit Learning Path' : 'New Learning Path'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-80" style={{ color: 'var(--color-text-tertiary)' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Title (English)</label>
              <input
                value={form.title_en}
                onChange={(e) => setForm({ ...form, title_en: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                placeholder="e.g. Fiction Writing Fundamentals"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Title (Arabic)</label>
              <input
                value={form.title_ar}
                onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
                dir="rtl"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                placeholder="مثال: أساسيات كتابة الرواية"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Description (English)</label>
              <textarea
                value={form.description_en}
                onChange={(e) => setForm({ ...form, description_en: e.target.value })}
                rows={2}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
                style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Description (Arabic)</label>
              <textarea
                value={form.description_ar}
                onChange={(e) => setForm({ ...form, description_ar: e.target.value })}
                dir="rtl"
                rows={2}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
                style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Target Level</label>
              <select
                value={form.target_level}
                onChange={(e) => setForm({ ...form, target_level: e.target.value as CourseLevel })}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              >
                {LEVEL_OPTIONS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Order Index</label>
              <input
                type="number"
                min="0"
                value={form.order_index}
                onChange={(e) => setForm({ ...form, order_index: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: 'var(--color-accent)' }}
                />
                <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Active</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Skill Tags (comma-separated)</label>
            <input
              value={form.skill_tags}
              onChange={(e) => setForm({ ...form, skill_tags: e.target.value })}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              placeholder="plot, character, dialogue"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              Courses in Path ({selectedCourseIds.length} selected)
            </label>

            {orderedSelected.length > 0 && (
              <div className="mb-3 space-y-1.5">
                {orderedSelected.map((c, idx) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ backgroundColor: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}
                  >
                    <span className="text-xs font-bold w-5 shrink-0" style={{ color: '#22c55e' }}>{idx + 1}</span>
                    <span className="flex-1 text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {c.title_en || c.title_ar}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => moveCourse(c.id, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded hover:opacity-80 disabled:opacity-30"
                        style={{ color: 'var(--color-text-tertiary)' }}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveCourse(c.id, 'down')}
                        disabled={idx === orderedSelected.length - 1}
                        className="p-1 rounded hover:opacity-80 disabled:opacity-30"
                        style={{ color: 'var(--color-text-tertiary)' }}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => toggleCourse(c.id)}
                        className="p-1 rounded hover:opacity-80"
                        style={{ color: '#ef4444' }}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div
              className="rounded-xl overflow-hidden max-h-48 overflow-y-auto"
              style={{ border: '1px solid var(--color-border)' }}
            >
              {unselected.length === 0 ? (
                <p className="px-3 py-2 text-xs text-center" style={{ color: 'var(--color-text-tertiary)' }}>
                  All courses added
                </p>
              ) : (
                unselected.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => toggleCourse(c.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:opacity-80 transition-opacity"
                    style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-accent)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-sm truncate" style={{ color: 'var(--color-text-secondary)' }}>
                      {c.title_en || c.title_ar}
                    </span>
                    <span
                      className="text-xs ml-auto px-1.5 py-0.5 rounded shrink-0"
                      style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-tertiary)' }}
                    >
                      {c.level}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {error && <p className="mt-3 text-xs" style={{ color: 'var(--color-error)' }}>{error}</p>}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-80"
            style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-secondary)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
          >
            {saving ? 'Saving...' : (path ? 'Save Changes' : 'Create Path')}
          </button>
        </div>
      </div>
    </div>
  );
}
