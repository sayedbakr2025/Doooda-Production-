import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  getAllCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseModules,
  createModule,
  deleteModule,
  createLesson,
  deleteLesson,
} from '../../services/academyApi';
import type { AcademyCourse, AcademyModule, AcademyLesson, CourseLevel, LessonContentType, CourseLanguage } from '../../types/academy';

const LEVELS: { value: CourseLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const LANGUAGES: { value: CourseLanguage; label: string }[] = [
  { value: 'ar', label: 'العربية' },
  { value: 'en', label: 'English' },
  { value: 'both', label: 'العربية + English' },
];

const CATEGORIES = [
  'Fiction Writing',
  'Poetry',
  'Screenwriting',
  'Non-fiction',
  'Journalism',
  'Creative Writing',
  'Story Structure',
  'Character Development',
  'World Building',
  'Editing & Revision',
  'Publishing',
  'Self-Publishing',
];

const CONTENT_TYPES: { value: LessonContentType; label: string }[] = [
  { value: 'video', label: 'Video' },
  { value: 'article', label: 'Article' },
  { value: 'exercise', label: 'Exercise' },
  { value: 'pdf', label: 'PDF' },
];

type View = 'courses' | 'modules';

export default function AdminAcademy() {
  const [courses, setCourses] = useState<AcademyCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('courses');
  const [selectedCourse, setSelectedCourse] = useState<AcademyCourse | null>(null);
  const [modules, setModules] = useState<AcademyModule[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<AcademyCourse | null>(null);
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState<string | null>(null);

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    setLoading(true);
    try {
      const data = await getAllCourses();
      setCourses(data);
    } catch (err) {
      console.error('[AdminAcademy] Failed to load courses:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadModules(course: AcademyCourse) {
    setModulesLoading(true);
    try {
      const data = await getCourseModules(course.id);
      setModules(data);
    } catch (err) {
      console.error('[AdminAcademy] Failed to load modules:', err);
    } finally {
      setModulesLoading(false);
    }
  }

  function openCourse(course: AcademyCourse) {
    setSelectedCourse(course);
    setView('modules');
    loadModules(course);
  }

  function backToCourses() {
    setView('courses');
    setSelectedCourse(null);
    setModules([]);
  }

  async function handleDeleteCourse(id: string) {
    if (!confirm('Delete this course and all its content?')) return;
    try {
      await deleteCourse(id);
      setCourses((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error('[AdminAcademy] Delete failed:', err);
    }
  }

  async function handleDeleteModule(id: string) {
    if (!confirm('Delete this module and all its lessons?')) return;
    try {
      await deleteModule(id);
      setModules((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error('[AdminAcademy] Delete module failed:', err);
    }
  }

  async function handleDeleteLesson(moduleId: string, lessonId: string) {
    if (!confirm('Delete this lesson?')) return;
    try {
      await deleteLesson(lessonId);
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId
            ? { ...m, lessons: (m.lessons || []).filter((l) => l.id !== lessonId) }
            : m
        )
      );
    } catch (err) {
      console.error('[AdminAcademy] Delete lesson failed:', err);
    }
  }

  async function handleTogglePublish(course: AcademyCourse) {
    try {
      const updated = await updateCourse(course.id, { is_published: !course.is_published });
      setCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err) {
      console.error('[AdminAcademy] Toggle publish failed:', err);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          {view === 'modules' && selectedCourse ? (
            <div className="flex items-center gap-3">
              <button
                onClick={backToCourses}
                className="flex items-center gap-1.5 text-sm hover:opacity-80 transition-opacity"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Courses
              </button>
              <span style={{ color: 'var(--color-border)' }}>/</span>
              <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {selectedCourse.title_en || selectedCourse.title_ar}
              </h2>
            </div>
          ) : (
            <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Academy Management
            </h2>
          )}
        </div>
        <div className="flex items-center gap-3">
          {view === 'courses' ? (
            <button
              onClick={() => { setEditingCourse(null); setShowCourseForm(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Course
            </button>
          ) : (
            <button
              onClick={() => setShowModuleForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Module
            </button>
          )}
        </div>
      </div>

      {view === 'courses' ? (
        <CoursesList
          courses={courses}
          loading={loading}
          onOpen={openCourse}
          onEdit={(c) => { setEditingCourse(c); setShowCourseForm(true); }}
          onDelete={handleDeleteCourse}
          onTogglePublish={handleTogglePublish}
        />
      ) : (
        <ModulesList
          modules={modules}
          loading={modulesLoading}
          onDeleteModule={handleDeleteModule}
          onDeleteLesson={handleDeleteLesson}
          onAddLesson={(moduleId) => setShowLessonForm(moduleId)}
        />
      )}

      {showCourseForm && (
        <CourseFormModal
          course={editingCourse}
          onClose={() => setShowCourseForm(false)}
          onSaved={(c) => {
            if (editingCourse) {
              setCourses((prev) => prev.map((x) => (x.id === c.id ? c : x)));
            } else {
              setCourses((prev) => [...prev, c]);
            }
            setShowCourseForm(false);
          }}
        />
      )}

      {showModuleForm && selectedCourse && (
        <ModuleFormModal
          courseId={selectedCourse.id}
          orderIndex={modules.length}
          onClose={() => setShowModuleForm(false)}
          onSaved={(mod) => {
            setModules((prev) => [...prev, { ...mod, lessons: [] }]);
            setShowModuleForm(false);
          }}
        />
      )}

      {showLessonForm && (
        <LessonFormModal
          moduleId={showLessonForm}
          orderIndex={
            (modules.find((m) => m.id === showLessonForm)?.lessons || []).length
          }
          onClose={() => setShowLessonForm(null)}
          onSaved={(lesson) => {
            setModules((prev) =>
              prev.map((m) =>
                m.id === showLessonForm
                  ? { ...m, lessons: [...(m.lessons || []), lesson] }
                  : m
              )
            );
            setShowLessonForm(null);
          }}
        />
      )}
    </div>
  );
}

function CoursesList({
  courses,
  loading,
  onOpen,
  onEdit,
  onDelete,
  onTogglePublish,
}: {
  courses: AcademyCourse[];
  loading: boolean;
  onOpen: (c: AcademyCourse) => void;
  onEdit: (c: AcademyCourse) => void;
  onDelete: (id: string) => void;
  onTogglePublish: (c: AcademyCourse) => void;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-accent)' }} />
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div
        className="text-center py-16 rounded-xl"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <p className="text-lg font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
          No courses yet
        </p>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Create your first course to get started
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--color-border)' }}
    >
      <table className="w-full">
        <thead>
          <tr style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
            {['Title', 'Category', 'Level', 'Language', 'Access', 'Status', 'Actions'].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {courses.map((course) => (
            <tr
              key={course.id}
              style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
            >
              <td className="px-4 py-3">
                <button
                  onClick={() => onOpen(course)}
                  className="font-semibold text-sm text-left hover:underline"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {course.title_en || course.title_ar}
                </button>
                {course.title_ar && course.title_en && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{course.title_ar}</p>
                )}
              </td>
              <td className="px-4 py-3">
                {course.category && (
                  <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ backgroundColor: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
                    {course.category}
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <span
                  className="text-xs px-2 py-0.5 rounded capitalize font-medium"
                  style={{
                    backgroundColor: course.level === 'beginner' ? 'rgba(34,197,94,0.1)'
                      : course.level === 'intermediate' ? 'rgba(245,158,11,0.1)'
                      : 'rgba(239,68,68,0.1)',
                    color: course.level === 'beginner' ? '#22c55e'
                      : course.level === 'intermediate' ? '#f59e0b'
                      : '#ef4444',
                  }}
                >
                  {course.level}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className="text-xs px-2 py-0.5 rounded font-medium"
                  style={{
                    backgroundColor: course.language === 'ar' ? 'rgba(59,130,246,0.1)'
                      : course.language === 'en' ? 'rgba(34,197,94,0.1)'
                      : 'rgba(139,92,246,0.1)',
                    color: course.language === 'ar' ? '#3b82f6'
                      : course.language === 'en' ? '#22c55e'
                      : '#8b5cf6',
                  }}
                >
                  {course.language === 'ar' ? 'AR' : course.language === 'en' ? 'EN' : 'AR+EN'}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className="text-xs px-2 py-0.5 rounded font-medium"
                  style={{
                    backgroundColor: !course.is_paid ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                    color: !course.is_paid ? '#22c55e' : '#f59e0b',
                  }}
                >
                  {!course.is_paid ? 'Free' : `${course.price_tokens || 0} tokens`}
                </span>
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => onTogglePublish(course)}
                  title={course.is_published ? 'Click to unpublish' : 'Click to publish'}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-semibold border transition-all hover:opacity-90"
                  style={
                    course.is_published
                      ? { backgroundColor: 'rgba(34,197,94,0.1)', color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)' }
                      : { backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)' }
                  }
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: course.is_published ? '#22c55e' : '#f59e0b' }}
                  />
                  {course.is_published ? 'Published' : 'Draft — Click to Publish'}
                </button>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpen(course)}
                    className="text-xs px-2.5 py-1 rounded font-medium transition-opacity hover:opacity-80"
                    style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-accent)' }}
                  >
                    Manage
                  </button>
                  <button
                    onClick={() => onEdit(course)}
                    className="text-xs px-2.5 py-1 rounded font-medium transition-opacity hover:opacity-80"
                    style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-secondary)' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(course.id)}
                    className="text-xs px-2.5 py-1 rounded font-medium transition-opacity hover:opacity-80"
                    style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
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
  );
}

function ModulesList({
  modules,
  loading,
  onDeleteModule,
  onDeleteLesson,
  onAddLesson,
}: {
  modules: AcademyModule[];
  loading: boolean;
  onDeleteModule: (id: string) => void;
  onDeleteLesson: (moduleId: string, lessonId: string) => void;
  onAddLesson: (moduleId: string) => void;
}) {
  const [openModules, setOpenModules] = useState<Set<string>>(new Set(modules.map((m) => m.id)));

  useEffect(() => {
    if (modules.length > 0) {
      setOpenModules(new Set(modules.map((m) => m.id)));
    }
  }, [modules.length]);

  function toggleModule(id: string) {
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-accent)' }} />
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <div className="text-center py-16 rounded-xl" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <p className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>No modules yet</p>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Add a module to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {modules.map((mod, idx) => (
        <div
          key={mod.id}
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: openModules.has(mod.id) ? '1px solid var(--color-border)' : 'none' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
              >
                {idx + 1}
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{mod.title}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                  {(mod.lessons || []).length} lessons
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onAddLesson(mod.id)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80"
                style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-accent)' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Lesson
              </button>
              <button
                onClick={() => onDeleteModule(mod.id)}
                className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80"
                style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
              >
                Delete
              </button>
              <button
                onClick={() => toggleModule(mod.id)}
                className="p-1"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                <svg
                  className={`w-4 h-4 transition-transform ${openModules.has(mod.id) ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {openModules.has(mod.id) && (
            <div>
              {(mod.lessons || []).length === 0 ? (
                <div className="px-5 py-4 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                  No lessons yet. Add the first lesson to this module.
                </div>
              ) : (
                (mod.lessons || []).map((lesson, lIdx) => (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between px-5 py-3"
                    style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium w-5 text-center" style={{ color: 'var(--color-text-tertiary)' }}>
                        {lIdx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{lesson.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className="text-xs capitalize px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-tertiary)' }}
                          >
                            {lesson.content_type}
                          </span>
                          {lesson.duration_minutes && (
                            <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                              {lesson.duration_minutes} min
                            </span>
                          )}
                          {lesson.is_preview && (
                            <span className="text-xs font-medium" style={{ color: '#22c55e' }}>Preview</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteLesson(mod.id, lesson.id)}
                      className="text-xs px-2.5 py-1 rounded font-medium transition-opacity hover:opacity-80"
                      style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CourseFormModal({
  course,
  onClose,
  onSaved,
}: {
  course: AcademyCourse | null;
  onClose: () => void;
  onSaved: (c: AcademyCourse) => void;
}) {
  const [form, setForm] = useState({
    title_ar: course?.title_ar || '',
    title_en: course?.title_en || '',
    description: course?.description || '',
    description_ar: course?.description_ar || '',
    description_en: course?.description_en || '',
    level: (course?.level || 'beginner') as CourseLevel,
    category: course?.category || '',
    language: (course?.language || 'ar') as CourseLanguage,
    is_free: course?.is_free ?? true,
    is_paid: course?.is_paid ?? false,
    price_tokens: course?.price_tokens?.toString() || '',
    instructor_name: course?.instructor_name || '',
    instructor_bio: course?.instructor_bio || '',
    is_published: course?.is_published || false,
    cover_image: course?.cover_image || '',
    order_index: course?.order_index?.toString() || '0',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  async function handleImageUpload(file: File) {
    setUploadingImage(true);
    setError('');
    try {
      const ext = file.name.split('.').pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('course-images')
        .upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('course-images').getPublicUrl(path);
      setForm((prev) => ({ ...prev, cover_image: data.publicUrl }));
    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        title_ar: form.title_ar,
        title_en: form.title_en,
        description: form.description,
        description_ar: form.description_ar,
        description_en: form.description_en,
        level: form.level,
        category: form.category,
        language: form.language,
        is_free: !form.is_paid,
        is_paid: form.is_paid,
        price_tokens: form.is_paid ? (parseInt(form.price_tokens) || null) : null,
        instructor_name: form.instructor_name,
        instructor_bio: form.instructor_bio,
        is_published: form.is_published,
        cover_image: form.cover_image || null,
        order_index: parseInt(form.order_index) || 0,
      };

      let saved: AcademyCourse;
      if (course) {
        saved = await updateCourse(course.id, payload);
      } else {
        saved = await createCourse(payload);
      }
      onSaved(saved);
    } catch (err: any) {
      setError(err.message || 'Failed to save course');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {course ? 'Edit Course' : 'New Course'}
          </h3>
          <button onClick={onClose} style={{ color: 'var(--color-text-tertiary)' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Title (Arabic)</label>
            <input
              className="input-field w-full"
              value={form.title_ar}
              onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
              placeholder="عنوان الدورة بالعربية"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Title (English)</label>
            <input
              className="input-field w-full"
              value={form.title_en}
              onChange={(e) => setForm({ ...form, title_en: e.target.value })}
              placeholder="Course title in English"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Description (General)</label>
            <textarea
              className="input-field w-full resize-none"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Course description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Description (Arabic)</label>
              <textarea
                className="input-field w-full resize-none"
                rows={2}
                value={form.description_ar}
                onChange={(e) => setForm({ ...form, description_ar: e.target.value })}
                placeholder="وصف الدورة بالعربية..."
                style={{ direction: 'rtl' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Description (English)</label>
              <textarea
                className="input-field w-full resize-none"
                rows={2}
                value={form.description_en}
                onChange={(e) => setForm({ ...form, description_en: e.target.value })}
                placeholder="Course description in English..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Instructor Name</label>
            <input
              className="input-field w-full"
              value={form.instructor_name}
              onChange={(e) => setForm({ ...form, instructor_name: e.target.value })}
              placeholder="e.g. Dr. Ahmed Hassan"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Instructor Bio</label>
            <textarea
              className="input-field w-full resize-none"
              rows={3}
              value={form.instructor_bio}
              onChange={(e) => setForm({ ...form, instructor_bio: e.target.value })}
              placeholder="Brief bio about the instructor..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Level</label>
              <select
                className="input-field w-full"
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value as CourseLevel })}
              >
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Language</label>
              <select
                className="input-field w-full"
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value as CourseLanguage })}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Category</label>
              <input
                list="categories"
                className="input-field w-full"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. Fiction Writing"
              />
              <datalist id="categories">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Order Index</label>
              <input
                type="number"
                className="input-field w-full"
                value={form.order_index}
                onChange={(e) => setForm({ ...form, order_index: e.target.value })}
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Cover Image</label>
            <div
              className="relative rounded-xl overflow-hidden"
              style={{ border: '2px dashed var(--color-border)', minHeight: '120px' }}
            >
              {form.cover_image ? (
                <div className="relative">
                  <img
                    src={form.cover_image}
                    alt="Cover preview"
                    className="w-full h-32 object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <label
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-opacity hover:opacity-90"
                      style={{ backgroundColor: '#fff', color: '#111' }}
                    >
                      Change
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, cover_image: '' }))}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ backgroundColor: '#ef4444', color: '#fff' }}
                    >
                      Remove
                    </button>
                  </div>
                  {uploadingImage && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
                    </div>
                  )}
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-28 cursor-pointer gap-2 hover:opacity-80 transition-opacity">
                  {uploadingImage ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: 'var(--color-accent)' }} />
                  ) : (
                    <>
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-text-tertiary)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Click to upload image</span>
                      <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>JPG, PNG, WebP · max 5MB</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <input
                type="checkbox"
                checked={form.is_paid}
                onChange={(e) => setForm({ ...form, is_paid: e.target.checked })}
                className="rounded"
              />
              Paid course
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                className="rounded"
              />
              Published
            </label>
          </div>

          {form.is_paid && (
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Price (tokens)</label>
              <input
                type="number"
                className="input-field w-full"
                value={form.price_tokens}
                onChange={(e) => setForm({ ...form, price_tokens: e.target.value })}
                placeholder="100"
                min="0"
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
            >
              {saving ? 'Saving...' : (course ? 'Save Changes' : 'Create Course')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModuleFormModal({
  courseId,
  orderIndex,
  onClose,
  onSaved,
}: {
  courseId: string;
  orderIndex: number;
  onClose: () => void;
  onSaved: (mod: AcademyModule) => void;
}) {
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError('');
    try {
      const mod = await createModule({ course_id: courseId, title, order_index: orderIndex });
      onSaved(mod);
    } catch (err: any) {
      setError(err.message || 'Failed to create module');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-2xl max-w-md w-full p-6" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Add Module</h3>
          <button onClick={onClose} style={{ color: 'var(--color-text-tertiary)' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Module Title</label>
            <input
              className="input-field w-full"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Introduction to Character Development"
              autoFocus
              required
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
            >
              {saving ? 'Adding...' : 'Add Module'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LessonFormModal({
  moduleId,
  orderIndex,
  onClose,
  onSaved,
}: {
  moduleId: string;
  orderIndex: number;
  onClose: () => void;
  onSaved: (lesson: AcademyLesson) => void;
}) {
  const [form, setForm] = useState({
    title: '',
    content_type: 'video' as LessonContentType,
    content_url: '',
    duration_minutes: '',
    is_preview: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    setError('');
    try {
      const lesson = await createLesson({
        module_id: moduleId,
        title: form.title,
        content_type: form.content_type,
        content_url: form.content_url || null,
        duration_minutes: parseInt(form.duration_minutes) || null,
        order_index: orderIndex,
        is_preview: form.is_preview,
      });
      onSaved(lesson);
    } catch (err: any) {
      setError(err.message || 'Failed to create lesson');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-2xl max-w-md w-full p-6" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Add Lesson</h3>
          <button onClick={onClose} style={{ color: 'var(--color-text-tertiary)' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Lesson Title</label>
            <input
              className="input-field w-full"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Lesson title"
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Content Type</label>
              <select
                className="input-field w-full"
                value={form.content_type}
                onChange={(e) => setForm({ ...form, content_type: e.target.value as LessonContentType })}
              >
                {CONTENT_TYPES.map((ct) => (
                  <option key={ct.value} value={ct.value}>{ct.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Duration (min)</label>
              <input
                type="number"
                className="input-field w-full"
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                placeholder="15"
                min="1"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Content URL / Text</label>
            <textarea
              className="input-field w-full resize-none"
              rows={3}
              value={form.content_url}
              onChange={(e) => setForm({ ...form, content_url: e.target.value })}
              placeholder="Video URL, article text, exercise instructions, or PDF URL..."
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <input
              type="checkbox"
              checked={form.is_preview}
              onChange={(e) => setForm({ ...form, is_preview: e.target.checked })}
              className="rounded"
            />
            Free preview (accessible without enrollment)
          </label>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
            >
              {saving ? 'Adding...' : 'Add Lesson'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
