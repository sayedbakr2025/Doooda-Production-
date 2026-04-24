import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Button from '../Button';

const IANA_TIMEZONES = [
  'UTC',
  'Africa/Abidjan', 'Africa/Cairo', 'Africa/Casablanca', 'Africa/Johannesburg',
  'Africa/Lagos', 'Africa/Nairobi', 'Africa/Tripoli', 'Africa/Tunis',
  'America/Anchorage', 'America/Bogota', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Mexico_City', 'America/New_York', 'America/Sao_Paulo',
  'America/Toronto', 'America/Vancouver',
  'Asia/Baghdad', 'Asia/Bangkok', 'Asia/Beirut', 'Asia/Dubai', 'Asia/Hong_Kong',
  'Asia/Jakarta', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Kuwait', 'Asia/Manila',
  'Asia/Qatar', 'Asia/Riyadh', 'Asia/Seoul', 'Asia/Shanghai', 'Asia/Singapore',
  'Asia/Tehran', 'Asia/Tokyo',
  'Atlantic/Azores',
  'Australia/Melbourne', 'Australia/Perth', 'Australia/Sydney',
  'Europe/Amsterdam', 'Europe/Athens', 'Europe/Berlin', 'Europe/Brussels',
  'Europe/Budapest', 'Europe/Copenhagen', 'Europe/Dublin', 'Europe/Helsinki',
  'Europe/Istanbul', 'Europe/Lisbon', 'Europe/London', 'Europe/Madrid',
  'Europe/Moscow', 'Europe/Oslo', 'Europe/Paris', 'Europe/Prague',
  'Europe/Rome', 'Europe/Stockholm', 'Europe/Vienna', 'Europe/Warsaw',
  'Pacific/Auckland', 'Pacific/Fiji', 'Pacific/Honolulu',
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'EGP', 'SAR', 'AED', 'KWD', 'QAR', 'JOD', 'MAD', 'TND', 'DZD', 'LYD', 'SDG'];

interface Prize {
  id?: string;
  competition_id?: string;
  position: number;
  title_ar: string;
  title_en: string;
  reward_description_ar: string;
  reward_description_en: string;
  amount: string;
  currency: string;
  _key: string;
}

interface Competition {
  id: string;
  title_ar: string;
  title_en: string;
  organizer_name_ar: string;
  organizer_name_en: string;
  description_ar: string;
  description_en: string;
  submission_conditions_ar: string;
  submission_conditions_en: string;
  submission_start_at: string;
  submission_end_at: string;
  timezone: string;
  submission_method: 'email' | 'external_link';
  submission_email: string | null;
  submission_link: string | null;
  is_active: boolean;
  status: 'upcoming' | 'open' | 'expired';
  created_at: string;
}

const EMPTY_FORM = (): Omit<Competition, 'id' | 'created_at' | 'status'> => ({
  title_ar: '',
  title_en: '',
  organizer_name_ar: '',
  organizer_name_en: '',
  description_ar: '',
  description_en: '',
  submission_conditions_ar: '',
  submission_conditions_en: '',
  submission_start_at: '',
  submission_end_at: '',
  timezone: 'Africa/Cairo',
  submission_method: 'external_link',
  submission_email: null,
  submission_link: null,
  is_active: true,
});

const EMPTY_PRIZE = (position: number): Prize => ({
  position,
  title_ar: '',
  title_en: '',
  reward_description_ar: '',
  reward_description_en: '',
  amount: '',
  currency: '',
  _key: `${Date.now()}-${Math.random()}`,
});

function statusBadge(status: Competition['status']) {
  const map: Record<Competition['status'], { label: string; bg: string; color: string }> = {
    upcoming: { label: 'Upcoming', bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
    open:     { label: 'Open',     bg: 'rgba(34,197,94,0.12)',  color: '#22c55e' },
    expired:  { label: 'Expired',  bg: 'rgba(239,68,68,0.12)',  color: '#ef4444' },
  };
  const s = map[status];
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminCompetitions() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Competition | null>(null);
  const [form, setForm] = useState(EMPTY_FORM());
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase
      .from('competitions')
      .select('*')
      .order('created_at', { ascending: false });
    if (err) { setError(err.message); }
    else { setCompetitions(data || []); }
    setLoading(false);
  }

  async function loadPrizes(competitionId: string) {
    const { data } = await supabase
      .from('competition_prizes')
      .select('*')
      .eq('competition_id', competitionId)
      .order('position', { ascending: true });
    return (data || []).map(p => ({ ...p, amount: p.amount != null ? String(p.amount) : '', _key: p.id })) as Prize[];
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM());
    setPrizes([EMPTY_PRIZE(1)]);
    setShowModal(true);
  }

  async function openEdit(c: Competition) {
    setEditing(c);
    setForm({
      title_ar: c.title_ar,
      title_en: c.title_en,
      organizer_name_ar: c.organizer_name_ar,
      organizer_name_en: c.organizer_name_en,
      description_ar: c.description_ar,
      description_en: c.description_en,
      submission_conditions_ar: c.submission_conditions_ar,
      submission_conditions_en: c.submission_conditions_en,
      submission_start_at: c.submission_start_at ? c.submission_start_at.slice(0, 16) : '',
      submission_end_at: c.submission_end_at ? c.submission_end_at.slice(0, 16) : '',
      timezone: c.timezone,
      submission_method: c.submission_method,
      submission_email: c.submission_email,
      submission_link: c.submission_link,
      is_active: c.is_active,
    });
    const loaded = await loadPrizes(c.id);
    setPrizes(loaded.length ? loaded : [EMPTY_PRIZE(1)]);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
    setError('');
  }

  async function toggleActive(c: Competition) {
    const { error: err } = await supabase
      .from('competitions')
      .update({ is_active: !c.is_active })
      .eq('id', c.id);
    if (err) { setError(err.message); return; }
    setCompetitions(prev => prev.map(x => x.id === c.id ? { ...x, is_active: !x.is_active } : x));
  }

  async function save() {
    setSaving(true);
    setError('');

    if (form.submission_start_at && form.submission_end_at) {
      if (new Date(form.submission_start_at) >= new Date(form.submission_end_at)) {
        setError('تاريخ بداية التقديم يجب أن يكون قبل تاريخ النهاية / Submission start date must be before end date');
        setSaving(false);
        return;
      }
    }

    const payload = {
      ...form,
      submission_email: form.submission_method === 'email' ? form.submission_email : null,
      submission_link:  form.submission_method === 'external_link' ? form.submission_link : null,
    };

    let competitionId = editing?.id;

    if (editing) {
      const { error: err } = await supabase
        .from('competitions')
        .update(payload)
        .eq('id', editing.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { data, error: err } = await supabase
        .from('competitions')
        .insert(payload)
        .select()
        .single();
      if (err) { setError(err.message); setSaving(false); return; }
      competitionId = data.id;
    }

    if (editing) {
      await supabase.from('competition_prizes').delete().eq('competition_id', editing.id);
    }

    const validPrizes = prizes.filter(p => p.title_ar.trim() || p.title_en.trim());
    if (validPrizes.length > 0) {
      const prizeRows = validPrizes.map((p, idx) => ({
        competition_id: competitionId,
        position: p.position || idx + 1,
        title_ar: p.title_ar,
        title_en: p.title_en,
        reward_description_ar: p.reward_description_ar,
        reward_description_en: p.reward_description_en,
        amount: p.amount !== '' ? parseFloat(p.amount) : null,
        currency: p.currency || null,
      }));
      const { error: prizeErr } = await supabase.from('competition_prizes').insert(prizeRows);
      if (prizeErr) { setError(prizeErr.message); setSaving(false); return; }
    }

    await load();
    setSaving(false);
    closeModal();
  }

  async function deleteCompetition(id: string) {
    const { error: err } = await supabase.from('competitions').delete().eq('id', id);
    if (err) { setError(err.message); return; }
    setDeleteConfirm(null);
    await load();
  }

  function addPrize() {
    const nextPos = prizes.length + 1;
    setPrizes(prev => [...prev, EMPTY_PRIZE(nextPos)]);
  }

  function removePrize(key: string) {
    setPrizes(prev => prev.filter(p => p._key !== key).map((p, i) => ({ ...p, position: i + 1 })));
  }

  function movePrize(key: string, dir: -1 | 1) {
    setPrizes(prev => {
      const idx = prev.findIndex(p => p._key === key);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr.map((p, i) => ({ ...p, position: i + 1 }));
    });
  }

  function updatePrize(key: string, field: keyof Omit<Prize, '_key'>, value: string | number) {
    setPrizes(prev => prev.map(p => p._key === key ? { ...p, [field]: value } : p));
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-secondary)',
    color: 'var(--color-text-primary)',
    fontSize: '14px',
    outline: 'none',
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    resize: 'vertical',
    minHeight: '80px',
    fontFamily: 'inherit',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    marginBottom: '4px',
    color: 'var(--color-text-secondary)',
  };

  const sectionHeadingStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--color-border)',
    marginBottom: '12px',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Competitions</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>Manage literary contests visible to writers</p>
        </div>
        <Button onClick={openCreate}>+ Add Competition</Button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48" style={{ color: 'var(--color-text-tertiary)' }}>
          Loading...
        </div>
      ) : competitions.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-text-tertiary)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>No competitions yet. Add your first one.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Title</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Organizer</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Status</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Start</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-secondary)' }}>End</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Timezone</th>
                <th className="text-center px-4 py-3 font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Active</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {competitions.map((c, idx) => (
                <tr
                  key={c.id}
                  style={{
                    backgroundColor: idx % 2 === 0 ? 'var(--color-surface)' : 'var(--color-bg-secondary)',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{c.title_ar || '—'}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{c.title_en || '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div style={{ color: 'var(--color-text-primary)' }}>{c.organizer_name_ar || '—'}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{c.organizer_name_en}</div>
                  </td>
                  <td className="px-4 py-3">{statusBadge(c.status)}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>{formatDate(c.submission_start_at)}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>{formatDate(c.submission_end_at)}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{c.timezone}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(c)}
                      className="relative inline-flex items-center"
                      title={c.is_active ? 'Deactivate' : 'Activate'}
                    >
                      <span
                        className="block transition-colors duration-200"
                        style={{
                          width: '36px',
                          height: '20px',
                          borderRadius: '10px',
                          backgroundColor: c.is_active ? 'var(--color-accent)' : 'var(--color-border)',
                        }}
                      />
                      <span
                        className="absolute block transition-transform duration-200"
                        style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          backgroundColor: '#fff',
                          top: '3px',
                          left: c.is_active ? '19px' : '3px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(c)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-hover, var(--color-border))')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-bg-secondary)')}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(c.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-xl p-6 w-full max-w-sm" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>Delete Competition?</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>This will permanently delete the competition and all its prizes. This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <button
                onClick={() => deleteCompetition(deleteConfirm)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: '#ef4444' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-xl w-full max-w-3xl my-8" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {editing ? 'Edit Competition' : 'Add Competition'}
              </h3>
              <button onClick={closeModal} className="p-1.5 rounded-lg" style={{ color: 'var(--color-text-tertiary)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {error && (
                <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                  {error}
                </div>
              )}

              <div>
                <p style={sectionHeadingStyle}>Basic Info</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={labelStyle}>Title (Arabic)</label>
                    <input
                      dir="rtl"
                      style={inputStyle}
                      value={form.title_ar}
                      onChange={e => setForm(f => ({ ...f, title_ar: e.target.value }))}
                      placeholder="عنوان المسابقة"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Title (English)</label>
                    <input
                      style={inputStyle}
                      value={form.title_en}
                      onChange={e => setForm(f => ({ ...f, title_en: e.target.value }))}
                      placeholder="Competition title"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Organizer Name (Arabic)</label>
                    <input
                      dir="rtl"
                      style={inputStyle}
                      value={form.organizer_name_ar}
                      onChange={e => setForm(f => ({ ...f, organizer_name_ar: e.target.value }))}
                      placeholder="اسم الجهة المنظمة"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Organizer Name (English)</label>
                    <input
                      style={inputStyle}
                      value={form.organizer_name_en}
                      onChange={e => setForm(f => ({ ...f, organizer_name_en: e.target.value }))}
                      placeholder="Organizer name"
                    />
                  </div>
                </div>
              </div>

              <div>
                <p style={sectionHeadingStyle}>Description</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={labelStyle}>Description (Arabic)</label>
                    <textarea
                      dir="rtl"
                      style={textareaStyle}
                      value={form.description_ar}
                      onChange={e => setForm(f => ({ ...f, description_ar: e.target.value }))}
                      placeholder="وصف المسابقة..."
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Description (English)</label>
                    <textarea
                      style={textareaStyle}
                      value={form.description_en}
                      onChange={e => setForm(f => ({ ...f, description_en: e.target.value }))}
                      placeholder="Competition description..."
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Submission Conditions (Arabic)</label>
                    <textarea
                      dir="rtl"
                      style={textareaStyle}
                      value={form.submission_conditions_ar}
                      onChange={e => setForm(f => ({ ...f, submission_conditions_ar: e.target.value }))}
                      placeholder="شروط التقديم..."
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Submission Conditions (English)</label>
                    <textarea
                      style={textareaStyle}
                      value={form.submission_conditions_en}
                      onChange={e => setForm(f => ({ ...f, submission_conditions_en: e.target.value }))}
                      placeholder="Submission conditions..."
                    />
                  </div>
                </div>
              </div>

              <div>
                <p style={sectionHeadingStyle}>Submission Window</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label style={labelStyle}>Start Date & Time</label>
                    <input
                      type="datetime-local"
                      style={inputStyle}
                      value={form.submission_start_at}
                      onChange={e => setForm(f => ({ ...f, submission_start_at: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>End Date & Time</label>
                    <input
                      type="datetime-local"
                      style={inputStyle}
                      value={form.submission_end_at}
                      onChange={e => setForm(f => ({ ...f, submission_end_at: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Timezone</label>
                    <select
                      style={inputStyle}
                      value={form.timezone}
                      onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
                    >
                      {IANA_TIMEZONES.map(tz => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <p style={sectionHeadingStyle}>Submission Method</p>
                <div className="flex gap-4 mb-4">
                  {(['email', 'external_link'] as const).map(method => (
                    <label key={method} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="submission_method"
                        value={method}
                        checked={form.submission_method === method}
                        onChange={() => setForm(f => ({ ...f, submission_method: method }))}
                        style={{ accentColor: 'var(--color-accent)' }}
                      />
                      <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        {method === 'email' ? 'Email' : 'External Link'}
                      </span>
                    </label>
                  ))}
                </div>
                {form.submission_method === 'email' && (
                  <div>
                    <label style={labelStyle}>Submission Email</label>
                    <input
                      type="email"
                      style={inputStyle}
                      value={form.submission_email || ''}
                      onChange={e => setForm(f => ({ ...f, submission_email: e.target.value }))}
                      placeholder="submissions@organizer.com"
                    />
                  </div>
                )}
                {form.submission_method === 'external_link' && (
                  <div>
                    <label style={labelStyle}>Submission Link</label>
                    <input
                      type="url"
                      style={inputStyle}
                      value={form.submission_link || ''}
                      onChange={e => setForm(f => ({ ...f, submission_link: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                )}
              </div>

              <div>
                <p style={sectionHeadingStyle}>Prizes</p>
                <div className="space-y-4">
                  {prizes.map((prize, idx) => (
                    <div
                      key={prize._key}
                      className="rounded-xl p-4"
                      style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                          Prize #{prize.position}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => movePrize(prize._key, -1)}
                            disabled={idx === 0}
                            className="p-1 rounded"
                            style={{ color: idx === 0 ? 'var(--color-border)' : 'var(--color-text-tertiary)' }}
                            title="Move up"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => movePrize(prize._key, 1)}
                            disabled={idx === prizes.length - 1}
                            className="p-1 rounded"
                            style={{ color: idx === prizes.length - 1 ? 'var(--color-border)' : 'var(--color-text-tertiary)' }}
                            title="Move down"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {prizes.length > 1 && (
                            <button
                              onClick={() => removePrize(prize._key)}
                              className="p-1 rounded ml-1"
                              style={{ color: '#ef4444' }}
                              title="Remove prize"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label style={labelStyle}>Title (Arabic)</label>
                          <input
                            dir="rtl"
                            style={inputStyle}
                            value={prize.title_ar}
                            onChange={e => updatePrize(prize._key, 'title_ar', e.target.value)}
                            placeholder="الجائزة الأولى"
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Title (English)</label>
                          <input
                            style={inputStyle}
                            value={prize.title_en}
                            onChange={e => updatePrize(prize._key, 'title_en', e.target.value)}
                            placeholder="First Prize"
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Reward Description (Arabic)</label>
                          <textarea
                            dir="rtl"
                            style={{ ...textareaStyle, minHeight: '60px' }}
                            value={prize.reward_description_ar}
                            onChange={e => updatePrize(prize._key, 'reward_description_ar', e.target.value)}
                            placeholder="وصف الجائزة..."
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Reward Description (English)</label>
                          <textarea
                            style={{ ...textareaStyle, minHeight: '60px' }}
                            value={prize.reward_description_en}
                            onChange={e => updatePrize(prize._key, 'reward_description_en', e.target.value)}
                            placeholder="Reward description..."
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label style={labelStyle}>Amount (optional)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            style={inputStyle}
                            value={prize.amount}
                            onChange={e => updatePrize(prize._key, 'amount', e.target.value)}
                            placeholder="e.g. 5000"
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Currency (optional)</label>
                          <select
                            style={inputStyle}
                            value={prize.currency}
                            onChange={e => updatePrize(prize._key, 'currency', e.target.value)}
                          >
                            <option value="">— Select currency —</option>
                            {CURRENCIES.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addPrize}
                  className="mt-3 flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  style={{ color: 'var(--color-accent)', border: '1px dashed var(--color-accent)', background: 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(var(--color-accent-rgb,59,130,246),0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Prize
                </button>
              </div>

              <div>
                <p style={sectionHeadingStyle}>Visibility</p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                    className="relative inline-flex items-center"
                  >
                    <span
                      className="block transition-colors duration-200"
                      style={{
                        width: '40px',
                        height: '22px',
                        borderRadius: '11px',
                        backgroundColor: form.is_active ? 'var(--color-accent)' : 'var(--color-border)',
                      }}
                    />
                    <span
                      className="absolute block transition-transform duration-200"
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: '#fff',
                        top: '3px',
                        left: form.is_active ? '21px' : '3px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }}
                    />
                  </button>
                  <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                    {form.is_active ? 'Active — visible to writers' : 'Inactive — hidden from writers'}
                  </span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--color-border)' }}>
              <Button variant="outline" onClick={closeModal} disabled={saving}>Cancel</Button>
              <Button onClick={save} disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Competition'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
