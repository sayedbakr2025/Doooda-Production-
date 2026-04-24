import { useEffect, useState } from 'react';
import { invokeWithAuth } from '../../lib/supabaseClient';
import Input from '../Input';
import UserManageModal from './UserManageModal';

interface AdminUser {
  id: string;
  email: string;
  role: string;
  pen_name?: string;
  first_name?: string;
  last_name?: string;
  plan: string;
  tokens_balance: number;
  created_at: string;
  admin_role?: string;
}

type RoleFilter = 'all' | 'writer' | 'admin';

const planColors: Record<string, string> = {
  FREE: 'var(--color-text-secondary)',
  STANDARD: 'var(--color-info)',
  PRO: 'var(--color-success)',
};

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      setError('');
      const { data, error: fetchError } = await invokeWithAuth<{ users: AdminUser[] }>(
        'admin-users',
        { method: 'GET' }
      );

      if (fetchError) {
        setError(`Failed to load users: ${fetchError.message || JSON.stringify(fetchError)}`);
        return;
      }
      setUsers(data?.users || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to load users: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  const filtered = users.filter(u => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch = !term
      || u.email.toLowerCase().includes(term)
      || u.pen_name?.toLowerCase().includes(term)
      || u.first_name?.toLowerCase().includes(term)
      || u.last_name?.toLowerCase().includes(term);
    return matchesRole && matchesSearch;
  });

  const writerCount = users.filter(u => u.role === 'writer').length;
  const adminCount = users.filter(u => u.role === 'admin').length;

  function getUserDisplayName(u: AdminUser) {
    return u.pen_name || [u.first_name, u.last_name].filter(Boolean).join(' ') || '—';
  }

  const thStyle: React.CSSProperties = {
    color: 'var(--color-text-tertiary)',
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: 'var(--color-accent)' }} />
        <span style={{ color: 'var(--color-text-secondary)' }}>Loading users...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>User Management</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
            {users.length} total — {writerCount} writers, {adminCount} admins
          </p>
        </div>
        <div className="w-64">
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div
          className="rounded-lg p-4 mb-4 text-sm"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-error) 10%, transparent)', border: '1px solid var(--color-error)', color: 'var(--color-error)' }}
        >
          {error}
        </div>
      )}

      <div className="flex gap-1 mb-4">
        {(['all', 'writer', 'admin'] as RoleFilter[]).map(role => (
          <button
            key={role}
            onClick={() => setRoleFilter(role)}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{
              backgroundColor: roleFilter === role ? 'var(--color-accent)' : 'transparent',
              color: roleFilter === role ? '#fff' : 'var(--color-text-secondary)',
            }}
            onMouseEnter={(e) => { if (roleFilter !== role) e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; }}
            onMouseLeave={(e) => { if (roleFilter !== role) e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            {role === 'all' ? `All (${users.length})` : role === 'writer' ? `Writers (${writerCount})` : `Admins (${adminCount})`}
          </button>
        ))}
      </div>

      <div
        className="rounded-lg shadow overflow-hidden"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border-light)' }}
      >
        <table className="min-w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider" style={thStyle}>User</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider" style={thStyle}>Role</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider" style={thStyle}>Plan</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider" style={thStyle}>Tokens</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider" style={thStyle}>Joined</th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider" style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr
                key={user.id}
                style={{ borderBottom: '1px solid var(--color-border-light)' }}
              >
                <td className="px-5 py-4">
                  <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {getUserDisplayName(user)}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{user.email}</div>
                </td>
                <td className="px-5 py-4">
                  <span
                    className="px-2 py-0.5 text-xs font-semibold rounded-full"
                    style={{
                      backgroundColor: user.role === 'admin'
                        ? 'color-mix(in srgb, var(--color-warning) 15%, transparent)'
                        : 'color-mix(in srgb, var(--color-info) 15%, transparent)',
                      color: user.role === 'admin' ? 'var(--color-warning)' : 'var(--color-info)',
                    }}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span
                    className="text-xs font-semibold uppercase"
                    style={{ color: planColors[user.plan?.toUpperCase()] || 'var(--color-text-secondary)' }}
                  >
                    {user.plan || 'free'}
                  </span>
                </td>
                <td className="px-5 py-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {user.tokens_balance ?? 0}
                </td>
                <td className="px-5 py-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-5 py-4 text-right">
                  <button
                    onClick={() => setSelectedUser(user)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--color-accent)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-accent) 10%, transparent)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    Manage
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                  {searchTerm ? 'No users match your search.' : 'No users found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <UserManageModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSaved={() => {
            loadUsers();
          }}
        />
      )}
    </div>
  );
}
