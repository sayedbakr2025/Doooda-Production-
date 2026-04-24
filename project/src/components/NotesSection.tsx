import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjectTasks, createTask, updateTask } from '../services/api';
import type { Task } from '../types';
import NoteModal from './NoteModal';

interface NotesSectionProps {
  projectId: string;
  language: 'ar' | 'en';
}

export default function NotesSection({ projectId, language }: NotesSectionProps) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNoteModal, setShowNoteModal] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [projectId]);

  async function loadTasks() {
    try {
      const data = await getProjectTasks(projectId);
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateNote(noteData: { description: string; chapterId?: string; sceneId?: string }) {
    await createTask({
      project_id: projectId,
      context_type: 'logline',
      description: noteData.description,
      chapter_id: noteData.chapterId,
      scene_id: noteData.sceneId,
    });
    await loadTasks();
  }

  function handleOpenSource(task: Task) {
    if (task.scene_id && task.chapter_id) {
      navigate(`/projects/${projectId}/chapters/${task.chapter_id}/scenes/${task.scene_id}`);
    } else if (task.chapter_id) {
      navigate(`/projects/${projectId}/chapters/${task.chapter_id}`);
    }
  }

  async function handleToggleTask(taskId: string, completed: boolean) {
    try {
      await updateTask(taskId, { completed });
      setTasks(tasks.map(t => t.id === taskId ? { ...t, completed } : t));
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  }

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const getProgressColor = (percentage: number) => {
    if (percentage <= 40) return 'var(--color-error)';
    if (percentage <= 70) return 'var(--color-warning)';
    return 'var(--color-success)';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-accent)' }}></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {language === 'ar' ? 'قائمة الملاحظات' : 'Notes / To-Do List'}
          </h3>
          {totalTasks > 0 && (
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              {completedTasks} {language === 'ar' ? 'من' : 'of'} {totalTasks} {language === 'ar' ? 'مكتمل' : 'completed'} ({progressPercentage}%)
            </p>
          )}
        </div>
        <button
          onClick={() => setShowNoteModal(true)}
          className="px-4 py-2 text-white rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--color-accent)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent)'}
        >
          + {language === 'ar' ? 'إضافة ملاحظة' : 'Add Note'}
        </button>
      </div>

      {totalTasks > 0 && (
        <div className="mb-4">
          <div className="w-full rounded-full h-2" style={{ backgroundColor: 'var(--color-border)' }}>
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${progressPercentage}%`, backgroundColor: getProgressColor(progressPercentage) }}
            />
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-5xl mb-3">📝</div>
          <h4 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            {language === 'ar' ? 'لا توجد ملاحظات بعد' : 'No notes yet'}
          </h4>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {language === 'ar'
              ? 'أضف ملاحظات لتتبع أفكارك ومهامك'
              : 'Add notes to track your thoughts and tasks'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:shadow-sm transition-shadow"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: `1px solid var(--color-border-light)`
              }}
            >
              <input
                type="checkbox"
                checked={task.completed}
                onChange={(e) => handleToggleTask(task.id, e.target.checked)}
                className="mt-1 w-4 h-4 rounded cursor-pointer"
                style={{ accentColor: 'var(--color-accent)' }}
              />
              <div className="flex-1">
                <p
                  className={task.completed ? 'line-through' : ''}
                  style={{
                    color: task.completed ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)'
                  }}
                  dir={language === 'ar' ? 'rtl' : 'ltr'}
                >
                  {task.description}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                  {new Date(task.created_at).toLocaleDateString(
                    language === 'ar' ? 'ar-SA' : 'en-US',
                    { year: 'numeric', month: 'short', day: 'numeric' }
                  )}
                </p>
              </div>
              {(task.chapter_id || task.scene_id) && (
                <button
                  onClick={() => handleOpenSource(task)}
                  className="px-3 py-1 rounded text-sm transition-colors"
                  style={{
                    color: 'var(--color-accent)',
                    border: '1px solid var(--color-accent)',
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-accent)';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--color-accent)';
                  }}
                  title={language === 'ar' ? 'فتح المصدر' : 'Open Source'}
                >
                  {language === 'ar' ? 'فتح' : 'Open'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showNoteModal && (
        <NoteModal
          projectId={projectId}
          contextType="logline"
          onClose={() => setShowNoteModal(false)}
          onSave={handleCreateNote}
          language={language}
        />
      )}
    </div>
  );
}
