import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

type ExportType = 'users' | 'ai_usage' | 'token_logs' | 'projects';

export default function AdminBackup() {
  const [exporting, setExporting] = useState<ExportType | null>(null);
  const [lastExport, setLastExport] = useState<Record<ExportType, string | null>>({
    users: null,
    ai_usage: null,
    token_logs: null,
    projects: null,
  });

  function toCSV(data: any[], columns: string[]) {
    const header = columns.join(',');
    const rows = data.map(row =>
      columns.map(col => {
        const val = row[col];
        if (val === null || val === undefined) return '';
        const str = String(val).replace(/"/g, '""');
        return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
      }).join(',')
    );
    return [header, ...rows].join('\n');
  }

  function download(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportUsers() {
    setExporting('users');
    const { data, error } = await supabase
      .from('users')
      .select('id,email,pen_name,role,admin_role,plan_name,is_active,trial_enabled,plan_start_date,plan_expires_at,created_at,last_sign_in_at')
      .order('created_at', { ascending: false });
    if (!error && data) {
      const csv = toCSV(data, ['id','email','pen_name','role','admin_role','plan_name','is_active','trial_enabled','plan_start_date','plan_expires_at','created_at','last_sign_in_at']);
      download(csv, `doooda_users_${new Date().toISOString().split('T')[0]}.csv`);
      setLastExport(prev => ({ ...prev, users: new Date().toLocaleString() }));
    }
    setExporting(null);
  }

  async function exportAIUsage() {
    setExporting('ai_usage');
    const { data, error } = await supabase
      .from('ai_usage_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10000);
    if (!error && data && data.length > 0) {
      const cols = Object.keys(data[0]);
      const csv = toCSV(data, cols);
      download(csv, `doooda_ai_usage_${new Date().toISOString().split('T')[0]}.csv`);
      setLastExport(prev => ({ ...prev, ai_usage: new Date().toLocaleString() }));
    }
    setExporting(null);
  }

  async function exportTokenLogs() {
    setExporting('token_logs');
    const { data, error } = await supabase
      .from('token_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10000);
    if (!error && data && data.length > 0) {
      const cols = Object.keys(data[0]);
      const csv = toCSV(data, cols);
      download(csv, `doooda_tokens_${new Date().toISOString().split('T')[0]}.csv`);
      setLastExport(prev => ({ ...prev, token_logs: new Date().toLocaleString() }));
    } else {
      setLastExport(prev => ({ ...prev, token_logs: 'No data' }));
    }
    setExporting(null);
  }

  async function exportProjects() {
    setExporting('projects');
    const { data, error } = await supabase
      .from('projects')
      .select('id,user_id,title,project_type,target_word_count,current_word_count,progress_percentage,created_at,updated_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (!error && data) {
      const csv = toCSV(data, ['id','user_id','title','project_type','target_word_count','current_word_count','progress_percentage','created_at','updated_at']);
      download(csv, `doooda_projects_${new Date().toISOString().split('T')[0]}.csv`);
      setLastExport(prev => ({ ...prev, projects: new Date().toLocaleString() }));
    }
    setExporting(null);
  }

  const EXPORTS = [
    { id: 'users' as ExportType, label: 'Users Export', description: 'All user accounts with plan, status, dates', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', action: exportUsers },
    { id: 'ai_usage' as ExportType, label: 'AI Usage Report', description: 'All AI requests, costs, and token usage', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', action: exportAIUsage },
    { id: 'token_logs' as ExportType, label: 'Token Transactions', description: 'Token purchases, deductions, and balance history', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', action: exportTokenLogs },
    { id: 'projects' as ExportType, label: 'Projects Export', description: 'All projects with types, word counts, progress', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', action: exportProjects },
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Backup & Data Export</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
          Export platform data as CSV files for backup and reporting
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {EXPORTS.map(exp => (
          <div key={exp.id} className="p-5 rounded-xl" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(59,130,246,0.1)' }}>
                <svg className="w-5 h-5" style={{ color: 'var(--color-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={exp.icon} />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{exp.label}</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{exp.description}</p>
              </div>
            </div>
            {lastExport[exp.id] && (
              <p className="text-xs mb-3" style={{ color: 'var(--color-text-tertiary)' }}>Last export: {lastExport[exp.id]}</p>
            )}
            <button
              onClick={exp.action}
              disabled={exporting === exp.id}
              className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              style={{ backgroundColor: 'var(--color-accent)', color: '#fff', opacity: exporting === exp.id ? 0.7 : 1 }}
            >
              {exporting === exp.id ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Export CSV
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="p-5 rounded-xl" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <h3 className="font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>Maintenance Actions</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Clear Cache', desc: 'Clear application cache', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
            { label: 'Rebuild Analytics', desc: 'Recalculate all stats', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
            { label: 'Test AI Connection', desc: 'Ping active AI provider', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
          ].map(action => (
            <button
              key={action.label}
              className="p-4 rounded-xl text-left transition-colors"
              style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            >
              <svg className="w-5 h-5 mb-2" style={{ color: 'var(--color-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={action.icon} />
              </svg>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{action.label}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{action.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
