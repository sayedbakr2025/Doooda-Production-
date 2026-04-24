import type { AcademySkillLevel, AcademyCourseScore } from '../../types/academy';

const GRADE_COLORS: Record<string, string> = {
  A: '#22c55e',
  B: '#84cc16',
  C: '#f59e0b',
  D: '#f97316',
  F: '#ef4444',
};

const SKILL_ICONS: Record<string, string> = {
  plot: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
  character: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  dialogue: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  structure: 'M4 6h16M4 10h16M4 14h16M4 18h16',
  worldbuilding: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064',
  style: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z',
};

const DEFAULT_ICON = 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253';

const SKILL_LABELS_AR: Record<string, string> = {
  plot: 'الحبكة',
  character: 'الشخصية',
  dialogue: 'الحوار',
  structure: 'البنية',
  worldbuilding: 'بناء العالم',
  style: 'الأسلوب',
};

interface Props {
  skillLevels: AcademySkillLevel[];
  courseScores: AcademyCourseScore[];
  language?: string;
  isRTL: boolean;
}

export default function SkillProgressWidget({ skillLevels, courseScores, isRTL }: Props) {
  if (skillLevels.length === 0 && courseScores.length === 0) return null;

  const avgScore = courseScores.length > 0
    ? Math.round(courseScores.reduce((s, c) => s + c.score, 0) / courseScores.length)
    : null;

  const gradeDistribution = courseScores.reduce<Record<string, number>>((acc, cs) => {
    acc[cs.grade] = (acc[cs.grade] || 0) + 1;
    return acc;
  }, {});

  return (
    <section className="mb-10">
      <div className={`flex items-center gap-3 mb-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'rgba(59,130,246,0.12)' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#3b82f6' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div className={isRTL ? 'text-right' : ''}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {isRTL ? 'مستوى المهارات' : 'Skill Progress'}
          </h2>
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            {isRTL ? 'تطور مهاراتك الكتابية عبر الدورات' : 'Your writing skills development across courses'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {courseScores.length > 0 && (
          <div
            className="rounded-2xl p-5"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <h3 className={`text-sm font-bold mb-4 ${isRTL ? 'text-right' : ''}`} style={{ color: 'var(--color-text-primary)' }}>
              {isRTL ? 'درجات الدورات' : 'Course Scores'}
            </h3>

            {avgScore !== null && (
              <div className={`flex items-center gap-4 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center font-black text-xl shrink-0"
                  style={{
                    backgroundColor: `${GRADE_COLORS[avgScore >= 90 ? 'A' : avgScore >= 75 ? 'B' : avgScore >= 60 ? 'C' : avgScore >= 50 ? 'D' : 'F']}20`,
                    color: GRADE_COLORS[avgScore >= 90 ? 'A' : avgScore >= 75 ? 'B' : avgScore >= 60 ? 'C' : avgScore >= 50 ? 'D' : 'F'],
                  }}
                >
                  {avgScore}
                </div>
                <div className={isRTL ? 'text-right' : ''}>
                  <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                    {isRTL ? 'متوسط الدرجات' : 'Average score'}
                  </p>
                  <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {courseScores.length} {isRTL ? 'دورة مقيّمة' : 'scored courses'}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {courseScores.slice(0, 5).map((cs) => (
                <div key={cs.id} className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-black"
                    style={{
                      backgroundColor: `${GRADE_COLORS[cs.grade]}20`,
                      color: GRADE_COLORS[cs.grade],
                    }}
                  >
                    {cs.grade}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                        {cs.lessons_completed}/{cs.lessons_total} {isRTL ? 'درس' : 'lessons'}
                      </span>
                      <span className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {cs.score}%
                      </span>
                    </div>
                    <div className="w-full rounded-full h-1.5" style={{ backgroundColor: 'var(--color-muted)' }}>
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${cs.score}%`, backgroundColor: GRADE_COLORS[cs.grade] }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {Object.keys(gradeDistribution).length > 0 && (
              <div className={`flex flex-wrap gap-2 mt-4 pt-4 ${isRTL ? 'flex-row-reverse' : ''}`} style={{ borderTop: '1px solid var(--color-border)' }}>
                {(['A', 'B', 'C', 'D', 'F'] as const).filter((g) => gradeDistribution[g]).map((g) => (
                  <div
                    key={g}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{ backgroundColor: `${GRADE_COLORS[g]}20`, color: GRADE_COLORS[g] }}
                  >
                    {g}: {gradeDistribution[g]}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {skillLevels.length > 0 && (
          <div
            className="rounded-2xl p-5"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <h3 className={`text-sm font-bold mb-4 ${isRTL ? 'text-right' : ''}`} style={{ color: 'var(--color-text-primary)' }}>
              {isRTL ? 'المهارات الكتابية' : 'Writing Skills'}
            </h3>

            <div className="space-y-3">
              {skillLevels.map((skill) => {
                const iconPath = SKILL_ICONS[skill.skill_tag.toLowerCase()] || DEFAULT_ICON;
                const label = isRTL
                  ? (SKILL_LABELS_AR[skill.skill_tag.toLowerCase()] || skill.skill_tag)
                  : skill.skill_tag.charAt(0).toUpperCase() + skill.skill_tag.slice(1);
                const color = skill.score >= 80 ? '#22c55e' : skill.score >= 60 ? '#3b82f6' : skill.score >= 40 ? '#f59e0b' : '#ef4444';

                return (
                  <div key={skill.id} className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${color}15` }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={iconPath} />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`flex items-center justify-between mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                          {label}
                        </span>
                        <span className="text-xs font-bold" style={{ color }}>
                          {skill.score}
                        </span>
                      </div>
                      <div className="w-full rounded-full h-1.5" style={{ backgroundColor: 'var(--color-muted)' }}>
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ width: `${skill.score}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
