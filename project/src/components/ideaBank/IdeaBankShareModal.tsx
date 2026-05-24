import { useState, useEffect, useCallback } from 'react';
import { X, Search, UserPlus, Trash2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { IdeaBankCollaborator, IdeaBankRole } from '../../types';
import {
  getIdeaBankCollaborators,
  addIdeaBankCollaborator,
  updateIdeaBankCollaborator,
  removeIdeaBankCollaborator,
  searchUserByEmailForIdeaBank,
} from '../../services/api';

interface IdeaBankShareModalProps {
  bankId: string;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const ROLES: { key: IdeaBankRole; labelEn: string; labelAr: string; descEn: string; descAr: string }[] = [
  { key: 'viewer', labelEn: 'Viewer', labelAr: 'مشاهد', descEn: 'Can view ideas and vote results', descAr: 'يمكن مشاهدة الأفكار ونتائج التصويت' },
  { key: 'voter', labelEn: 'Voter', labelAr: 'مصوّت', descEn: 'Can view ideas and vote', descAr: 'يمكن مشاهدة الأفكار والتصويت' },
  { key: 'editor', labelEn: 'Editor', labelAr: 'محرّر', descEn: 'Can create, edit, finalize ideas and manage polls', descAr: 'يمكن إنشاء وتعديل واعتماد الأفكار وإدارة التصويت' },
];

export default function IdeaBankShareModal({ bankId, isOpen, onClose, onRefresh }: IdeaBankShareModalProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [collaborators, setCollaborators] = useState<IdeaBankCollaborator[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState<{ id: string; pen_name: string | null; email: string | null } | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectedRole, setSelectedRole] = useState<IdeaBankRole>('viewer');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCollaborators = useCallback(async () => {
    try {
      const collabs = await getIdeaBankCollaborators(bankId);
      setCollaborators(collabs);
    } catch (err) {
      console.error('[IdeaBankShare] Failed to load collaborators:', err);
    }
  }, [bankId]);

  useEffect(() => {
    if (isOpen) loadCollaborators();
  }, [isOpen, loadCollaborators]);

  const handleSearch = async () => {
    if (!searchEmail.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const result = await searchUserByEmailForIdeaBank(searchEmail.trim());
      setSearchResult(result);
      if (!result) {
        setError(isRTL ? 'لم يتم العثور على مستخدم بهذا البريد' : 'No user found with this email');
      }
    } catch {
      setError(isRTL ? 'خطأ في البحث' : 'Search error');
    } finally {
      setSearching(false);
    }
  };

  const handleAddCollaborator = async () => {
    if (!searchResult) return;
    setAdding(true);
    setError(null);
    try {
      await addIdeaBankCollaborator(bankId, searchResult.id, selectedRole);
      setSearchResult(null);
      setSearchEmail('');
      await loadCollaborators();
      onRefresh();
    } catch (err: any) {
      setError(err.message || (isRTL ? 'خطأ في الإضافة' : 'Failed to add'));
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    try {
      await removeIdeaBankCollaborator(collaboratorId);
      await loadCollaborators();
      onRefresh();
    } catch (err) {
      console.error('[IdeaBankShare] Failed to remove:', err);
    }
  };

  const handleRoleChange = async (collaboratorId: string, newRole: IdeaBankRole) => {
    try {
      await updateIdeaBankCollaborator(collaboratorId, { role: newRole });
      await loadCollaborators();
    } catch (err) {
      console.error('[IdeaBankShare] Failed to update role:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-md mx-4 rounded-xl shadow-2xl" style={{ backgroundColor: 'var(--color-surface)', direction: isRTL ? 'rtl' : 'ltr' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {isRTL ? 'مشاركة بنك الأفكار' : 'Share Idea Bank'}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--color-text-tertiary)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              {isRTL ? 'دعوة شخص عبر البريد الإلكتروني' : 'Invite by email'}
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={searchEmail}
                onChange={e => setSearchEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder={isRTL ? 'أدخل البريد الإلكتروني' : 'Enter email'}
                className="flex-1 px-3 py-2 rounded-lg text-sm"
                style={{ backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="px-3 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search result */}
          {searchResult && (
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {searchResult.pen_name || searchResult.email}
                </span>
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value as IdeaBankRole)}
                  className="flex-1 px-2 py-1 rounded text-sm"
                  style={{ backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                >
                  {ROLES.map(role => (
                    <option key={role.key} value={role.key}>
                      {isRTL ? role.labelAr : role.labelEn}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddCollaborator}
                  disabled={adding}
                  className="px-3 py-1 rounded text-sm font-medium"
                  style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
                >
                  {isRTL ? 'إضافة' : 'Add'}
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
          )}

          {/* Collaborators list */}
          {collaborators.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                {isRTL ? 'المتعاونون' : 'Collaborators'}
              </h4>
              <div className="space-y-2">
                {collaborators.map(collab => (
                  <div key={collab.id} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {collab.penName || collab.email || collab.userId.slice(0, 8)}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }}>
                        {collab.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={collab.role}
                        onChange={e => handleRoleChange(collab.id, e.target.value as IdeaBankRole)}
                        className="px-2 py-0.5 rounded text-xs"
                        style={{ backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                      >
                        {ROLES.map(role => (
                          <option key={role.key} value={role.key}>
                            {isRTL ? role.labelAr : role.labelEn}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleRemoveCollaborator(collab.id)}
                        className="p-1 rounded hover:opacity-70"
                        style={{ color: '#ef4444' }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Role descriptions */}
          <div className="mt-2">
            <h4 className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
              {isRTL ? 'الأدوار:' : 'Roles:'}
            </h4>
            {ROLES.map(role => (
              <div key={role.key} className="flex items-start gap-2 py-1">
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  {isRTL ? role.labelAr : role.labelEn}:
                </span>
                <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                  {isRTL ? role.descAr : role.descEn}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}