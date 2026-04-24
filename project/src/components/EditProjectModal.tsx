import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { api, getEnabledProjectTypes, getGenres, getTones, setProjectGenres, setProjectTone } from '../services/api';
import type { Project, ProjectType, ProjectTypeSetting, Genre, Tone } from '../types';
import { GENRE_SLUGS_BY_TYPE } from '../utils/genreConfig';
import Button from './Button';
import Input from './Input';
import { t } from '../utils/translations';
import { getProjectTypeConfig } from '../utils/projectTypeConfig';
import { X } from 'lucide-react';

interface Props {
  project: Project;
  initialGenres: Genre[];
  initialTone: Tone | null;
  onClose: () => void;
  onSaved: (updated: Project, genres: Genre[], tone: Tone | null) => void;
}

export default function EditProjectModal({ project, initialGenres, initialTone, onClose, onSaved }: Props) {
  const { language } = useLanguage();

  const [title, setTitle] = useState(project.title);
  const [projectType, setProjectType] = useState<ProjectType>(project.project_type);
  const [idea, setIdea] = useState(project.idea || '');
  const [targetWordCount, setTargetWordCount] = useState(String(project.target_word_count));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [enabledTypes, setEnabledTypes] = useState<ProjectTypeSetting[]>([]);
  const [allGenres, setAllGenres] = useState<Genre[]>([]);
  const [allTones, setAllTones] = useState<Tone[]>([]);
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>(initialGenres.map(g => g.id));
  const [selectedToneId, setSelectedToneId] = useState<string | null>(initialTone?.id ?? null);

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
    setError('');

    if (!title.trim()) {
      setError(language === 'ar' ? 'عنوان المشروع مطلوب' : 'Project title is required');
      return;
    }

    const wordCount = parseInt(targetWordCount);
    if (!targetWordCount || isNaN(wordCount) || wordCount <= 0) {
      setError(language === 'ar' ? 'عدد الكلمات المستهدف يجب أن يكون رقماً موجباً' : 'Target word count must be a positive number');
      return;
    }

    setLoading(true);
    try {
      const updated = await api.updateProject(project.id, {
        title: title.trim(),
        project_type: projectType,
        idea: idea || undefined,
        target_word_count: wordCount,
      });

      await Promise.all([
        setProjectGenres(project.id, selectedGenreIds),
        setProjectTone(project.id, selectedToneId),
      ]);

      const updatedGenres = allGenres.filter(g => selectedGenreIds.includes(g.id));
      const updatedTone = allTones.find(t => t.id === selectedToneId) ?? null;

      onSaved(updated, updatedGenres, updatedTone);
    } catch (err) {
      const msg = err instanceof Error ? err.message : (language === 'ar' ? 'فشل حفظ التغييرات' : 'Failed to save changes');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const selectedTypeConfig = getProjectTypeConfig(projectType);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {language === 'ar' ? 'إعدادات المشروع' : 'Project Settings'}
          </h3>
          <button onClick={onClose} style={{ color: 'var(--color-text-tertiary)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div
            className="px-4 py-3 rounded-lg text-sm"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid var(--color-error)', color: 'var(--color-error)' }}
          >
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
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              {t('project.create.targetWordCount', language)}
            </label>
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
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              {t('project.create.idea', language)}
            </label>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder={t('project.create.ideaPlaceholder', language)}
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              {t('project.create.cancel', language)}
            </Button>
            <Button type="submit" variant="primary" loading={loading} className="flex-1">
              {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
