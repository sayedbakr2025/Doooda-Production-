import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface Character {
  id: string;
  name: string;
  dialogue_name: string;
  description?: string;
  personality_traits?: string;
  background?: string;
  speaking_style?: string;
  speech_style?: string;
  dialect?: string;
  goals?: string;
  fears?: string;
  age?: string;
  gender?: string;
  residence?: string;
  likes?: string;
  dislikes?: string;
  life_goal?: string;
  psychological_issue?: string;
  childhood_trauma?: string;
  trauma_impact_adulthood?: string;
  education?: string;
  job?: string;
  work_relationships?: string;
  neighbor_relationships?: string;
  clothing_style?: string;
}

interface CharacterDialogueModalProps {
  projectId: string;
  onClose: () => void;
  onSelectCharacter: (character: Character) => void;
  language: 'ar' | 'en';
}

export default function CharacterDialogueModal({
  projectId,
  onClose,
  onSelectCharacter,
  language,
}: CharacterDialogueModalProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCharacters();
  }, [projectId]);

  async function fetchCharacters() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('project_characters')
        .select('id, name, dialogue_name, description, personality_traits, background, speaking_style, speech_style, dialect, fears, goals, age, gender, residence, likes, dislikes, life_goal, psychological_issue, childhood_trauma, trauma_impact_adulthood, education, job, work_relationships, neighbor_relationships, clothing_style')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      setCharacters(data || []);
    } catch (err) {
      console.error('Failed to fetch characters:', err);
      setError(language === 'ar' ? 'فشل تحميل الشخصيات' : 'Failed to load characters');
    } finally {
      setLoading(false);
    }
  }

  const handleSelect = (character: Character) => {
    onSelectCharacter(character);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div
        className="rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        <div className="px-6 py-4" style={{ borderBottom: `1px solid var(--color-border)` }}>
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {language === 'ar' ? 'جلب شخصية للحوار' : 'Insert Character Dialogue'}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-accent)' }}></div>
            </div>
          )}

          {error && (
            <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: 'var(--color-error-light)', border: `1px solid var(--color-error)` }}>
              <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>
            </div>
          )}

          {!loading && !error && characters.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                {language === 'ar' ? 'لا توجد شخصيات في هذا المشروع' : 'No characters in this project'}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {language === 'ar' ? 'قم بإنشاء شخصيات أولاً من إعدادات المشروع' : 'Create characters first from project settings'}
              </p>
            </div>
          )}

          {!loading && !error && characters.length > 0 && (
            <div className="space-y-2">
              {characters.map((character) => (
                <button
                  key={character.id}
                  onClick={() => handleSelect(character)}
                  className="w-full text-left px-4 py-3 rounded-lg transition-colors"
                  style={{ backgroundColor: 'var(--color-bg-secondary)', border: `1px solid var(--color-border)` }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                    e.currentTarget.style.borderColor = 'var(--color-accent)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                        {character.dialogue_name}
                      </div>
                      <div className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                        {language === 'ar' ? 'الاسم الكامل: ' : 'Full name: '}
                        <span>{character.name}</span>
                      </div>
                      {character.speaking_style && (
                        <div className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                          {language === 'ar' ? 'أسلوب الكلام: ' : 'Speaking style: '}
                          <span className="line-clamp-1">{character.speaking_style}</span>
                        </div>
                      )}
                      {character.description && (
                        <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          <span className="line-clamp-1">{character.description}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-accent)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4" style={{ borderTop: `1px solid var(--color-border)` }}>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 rounded-lg font-medium transition-colors"
            style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'}
          >
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
