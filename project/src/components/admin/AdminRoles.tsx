import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface AdminRole {
  id: string;
  name: string;
  display_name: string;
  description: string;
  is_active: boolean;
}

interface Permission {
  id: string;
  role_name: string;
  resource: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_create: boolean;
}

interface AdminUser {
  id: string;
  email: string;
  pen_name: string | null;
  role: string;
  admin_role: string | null;
  is_active: boolean;
  created_at: string;
}

const RESOURCES = [
  'users','plans','ai_providers','plot_templates','homepage','project_types',
  'messages','smtp','publishers','analytics','errors','security','branding',
  'tracking','platform_settings','admin_roles','backup',
];

export default function AdminRoles() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'roles' | 'permissions' | 'admins'>('admins');
  const [selectedRole, setSelectedRole] = useState<string>('super_admin');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newRoleForm, setNewRoleForm] = useState({ name: '', display_name: '', description: '' });
  const [showNewRoleForm, setShowNewRoleForm] = useState(false);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [addAdminEmail, setAddAdminEmail] = useState('');
  const [addAdminRole, setAddAdminRole] = useState('');
  const [addAdminLoading, setAddAdminLoading] = useState(false);
  const [addAdminError, setAddAdminError] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [rolesRes, permsRes, adminsRes] = await Promise.all([
      supabase.from('admin_roles').select('*').order('name'),
      supabase.from('admin_role_permissions').select('*').order('role_name').order('resource'),
      supabase.from('users').select('id,email,pen_name,role,admin_role,is_active,created_at').eq('role', 'admin').order('created_at'),
    ]);
    if (rolesRes.error) setError(rolesRes.error.message);
    else setRoles(rolesRes.data || []);
    setPermissions(permsRes.data || []);
    setAdmins(adminsRes.data || []);
    setLoading(false);
  }

  function getPermission(roleName: string, resource: string): Permission | undefined {
    return permissions.find(p => p.role_name === roleName && p.resource === resource);
  }

  async function togglePermission(roleName: string, resource: string, field: keyof Pick<Permission, 'can_view' | 'can_edit' | 'can_delete' | 'can_create'>) {
    const existing = getPermission(roleName, resource);
    if (existing) {
      const newVal = !existing[field];
      const { error } = await supabase.from('admin_role_permissions').update({ [field]: newVal }).eq('id', existing.id);
      if (!error) setPermissions(prev => prev.map(p => p.id === existing.id ? { ...p, [field]: newVal } : p));
    } else {
      const newPerm = { role_name: roleName, resource, can_view: false, can_edit: false, can_delete: false, can_create: false, [field]: true };
      const { data, error } = await supabase.from('admin_role_permissions').insert([newPerm]).select().single();
      if (!error && data) setPermissions(prev => [...prev, data]);
    }
  }

  async function updateAdminRole(userId: string, adminRole: string | null) {
    setSaving(true);
    const { error } = await supabase.from('users').update({ admin_role: adminRole }).eq('id', userId);
    if (!error) setAdmins(prev => prev.map(a => a.id === userId ? { ...a, admin_role: adminRole } : a));
    setSaving(false);
  }

  async function createRole() {
    if (!newRoleForm.name || !newRoleForm.display_name) return;
    const { data, error } = await supabase.from('admin_roles').insert([newRoleForm]).select().single();
    if (!error && data) {
      setRoles(prev => [...prev, data]);
      setNewRoleForm({ name: '', display_name: '', description: '' });
      setShowNewRoleForm(false);
    } else if (error) setError(error.message);
  }

  async function addAdmin() {
    if (!addAdminEmail.trim()) return;
    setAddAdminLoading(true);
    setAddAdminError(null);
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id,email,pen_name,role,admin_role,is_active,created_at')
      .eq('email', addAdminEmail.trim().toLowerCase())
      .maybeSingle();
    if (findError) { setAddAdminError(findError.message); setAddAdminLoading(false); return; }
    if (!user) { setAddAdminError('No user found with this email address.'); setAddAdminLoading(false); return; }
    const { error: updateError } = await supabase
      .from('users')
      .update({ role: 'admin', admin_role: addAdminRole || null })
      .eq('id', user.id);
    if (updateError) { setAddAdminError(updateError.message); setAddAdminLoading(false); return; }
    setAdmins(prev => {
      const existing = prev.find(a => a.id === user.id);
      if (existing) return prev.map(a => a.id === user.id ? { ...a, role: 'admin', admin_role: addAdminRole || null } : a);
      return [...prev, { ...user, role: 'admin', admin_role: addAdminRole || null }];
    });
    setShowAddAdminModal(false);
    setAddAdminEmail('');
    setAddAdminRole('');
    setAddAdminLoading(false);
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Admin Roles & Permissions</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
          Multi-level admin roles with granular permission control
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--color-error)' }}>
          {error}
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {(['admins', 'permissions', 'roles'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 rounded-lg text-sm font-medium capitalize"
            style={{
              backgroundColor: activeTab === tab ? 'var(--color-accent)' : 'var(--color-surface)',
              color: activeTab === tab ? '#fff' : 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            {tab === 'admins' ? 'Admin Users' : tab === 'permissions' ? 'Permission Matrix' : 'Roles'}
          </button>
        ))}
      </div>

      {showAddAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>Add Admin User</h3>
            {addAdminError && (
              <div className="mb-3 p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--color-error)' }}>
                {addAdminError}
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>User Email</label>
                <input
                  type="email"
                  placeholder="user@example.com"
                  value={addAdminEmail}
                  onChange={e => setAddAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Admin Role</label>
                <select
                  value={addAdminRole}
                  onChange={e => setAddAdminRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                >
                  <option value="">— No Role —</option>
                  {roles.map(r => <option key={r.name} value={r.name}>{r.display_name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={addAdmin}
                disabled={addAdminLoading || !addAdminEmail.trim()}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: 'var(--color-accent)', color: '#fff', opacity: addAdminLoading || !addAdminEmail.trim() ? 0.6 : 1 }}
              >
                {addAdminLoading ? 'Adding...' : 'Add Admin'}
              </button>
              <button
                onClick={() => { setShowAddAdminModal(false); setAddAdminEmail(''); setAddAdminRole(''); setAddAdminError(null); }}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--color-text-tertiary)' }}>Loading...</div>
      ) : activeTab === 'admins' ? (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowAddAdminModal(true)}
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
            >
              + Add Admin
            </button>
          </div>
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          <div className="grid grid-cols-5 gap-3 px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)' }}>
            <span className="col-span-2">Admin</span><span>Current Role</span><span>Status</span><span>Joined</span>
          </div>
          {admins.map((admin, idx) => (
            <div key={admin.id} className="grid grid-cols-5 gap-3 px-5 py-4 items-center" style={{ backgroundColor: 'var(--color-surface)', borderBottom: idx < admins.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
              <div className="col-span-2">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{admin.email}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{admin.pen_name || 'No pen name'}</p>
              </div>
              <select
                value={admin.admin_role || ''}
                onChange={e => updateAdminRole(admin.id, e.target.value || null)}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg text-sm"
                style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              >
                <option value="">— No Role —</option>
                {roles.map(r => <option key={r.name} value={r.name}>{r.display_name}</option>)}
              </select>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium w-fit" style={{ backgroundColor: admin.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: admin.is_active ? 'var(--color-success)' : 'var(--color-error)' }}>
                {admin.is_active ? 'Active' : 'Inactive'}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{new Date(admin.created_at).toLocaleDateString()}</span>
            </div>
          ))}
          {admins.length === 0 && (
            <div className="p-8 text-center" style={{ color: 'var(--color-text-tertiary)' }}>No admin users found</div>
          )}
        </div>
        </div>
      ) : activeTab === 'permissions' ? (
        <div>
          <div className="flex gap-2 mb-4 flex-wrap">
            {roles.map(role => (
              <button
                key={role.name}
                onClick={() => setSelectedRole(role.name)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{
                  backgroundColor: selectedRole === role.name ? 'var(--color-accent)' : 'var(--color-surface)',
                  color: selectedRole === role.name ? '#fff' : 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {role.display_name}
              </button>
            ))}
          </div>

          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
            <div className="grid grid-cols-6 gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)' }}>
              <span className="col-span-2">Resource</span>
              <span className="text-center">View</span>
              <span className="text-center">Edit</span>
              <span className="text-center">Delete</span>
              <span className="text-center">Create</span>
            </div>
            {RESOURCES.map((resource, idx) => {
              const perm = getPermission(selectedRole, resource);
              const isSuperAdmin = selectedRole === 'super_admin';
              return (
                <div key={resource} className="grid grid-cols-6 gap-2 px-4 py-3 items-center" style={{ backgroundColor: 'var(--color-surface)', borderBottom: idx < RESOURCES.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                  <span className="col-span-2 text-sm capitalize font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {resource.replace(/_/g, ' ')}
                  </span>
                  {(['can_view', 'can_edit', 'can_delete', 'can_create'] as const).map(field => (
                    <div key={field} className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={isSuperAdmin ? true : (perm?.[field] || false)}
                        onChange={() => !isSuperAdmin && togglePermission(selectedRole, resource, field)}
                        disabled={isSuperAdmin}
                        className="w-4 h-4 rounded cursor-pointer"
                        style={{ accentColor: 'var(--color-accent)' }}
                      />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {selectedRole === 'super_admin' && (
            <p className="text-xs mt-3 text-center" style={{ color: 'var(--color-text-tertiary)' }}>
              Super Admin always has full access to all resources
            </p>
          )}
        </div>
      ) : (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowNewRoleForm(!showNewRoleForm)}
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
            >
              + New Role
            </button>
          </div>

          {showNewRoleForm && (
            <div className="mb-4 p-5 rounded-xl" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <h3 className="font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>Create New Role</h3>
              <div className="grid grid-cols-3 gap-3">
                <input type="text" placeholder="Role name (e.g., support_admin)" value={newRoleForm.name} onChange={e => setNewRoleForm(p => ({ ...p, name: e.target.value.toLowerCase().replace(/\s+/g, '_') }))} className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
                <input type="text" placeholder="Display name" value={newRoleForm.display_name} onChange={e => setNewRoleForm(p => ({ ...p, display_name: e.target.value }))} className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
                <input type="text" placeholder="Description" value={newRoleForm.description} onChange={e => setNewRoleForm(p => ({ ...p, description: e.target.value }))} className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={createRole} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}>Create</button>
                <button onClick={() => setShowNewRoleForm(false)} className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>Cancel</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {roles.map(role => (
              <div key={role.id} className="p-5 rounded-xl" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{role.display_name}</h3>
                    <code className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{role.name}</code>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: role.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: role.is_active ? 'var(--color-success)' : 'var(--color-error)' }}>
                    {role.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>{role.description}</p>
                <p className="text-xs mt-3" style={{ color: 'var(--color-text-tertiary)' }}>
                  {permissions.filter(p => p.role_name === role.name).length} resource permissions configured
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
