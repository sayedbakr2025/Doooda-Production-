import { useState, useEffect } from 'react';
import Button from './Button';
import Input from './Input';

interface Character {
  id?: string;
  name: string;
  dialogue_name: string;
  description?: string;
  personality_traits?: string;
  background?: string;
  speaking_style?: string;
  goals?: string;
  fears?: string;
  age?: string;
  gender?: string;
  clothing_style?: string;
  speech_style?: string;
  psychological_issue?: string;
  likes?: string;
  dislikes?: string;
  childhood_trauma?: string;
  trauma_impact_adulthood?: string;
  education?: string;
  job?: string;
  work_relationships?: string;
  residence?: string;
  neighbor_relationships?: string;
  life_goal?: string;
  dialect?: string;
}

interface CharacterModalProps {
  projectId: string;
  onClose: () => void;
  onSave: (character: Character) => Promise<void>;
  initialName?: string;
  existingCharacter?: Character | null;
  language: 'ar' | 'en';
}

const textareaStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-primary)',
};

export default function CharacterModal({
  onClose,
  onSave,
  initialName = '',
  existingCharacter,
  language,
}: CharacterModalProps) {
  const [name, setName] = useState(initialName);
  const [dialogueName, setDialogueName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [clothingStyle, setClothingStyle] = useState('');
  const [speechStyle, setSpeechStyle] = useState('');
  const [psychologicalIssue, setPsychologicalIssue] = useState('');
  const [likes, setLikes] = useState('');
  const [dislikes, setDislikes] = useState('');
  const [fears, setFears] = useState('');
  const [childhoodTrauma, setChildhoodTrauma] = useState('');
  const [traumaImpactAdulthood, setTraumaImpactAdulthood] = useState('');
  const [education, setEducation] = useState('');
  const [job, setJob] = useState('');
  const [workRelationships, setWorkRelationships] = useState('');
  const [residence, setResidence] = useState('');
  const [neighborRelationships, setNeighborRelationships] = useState('');
  const [lifeGoal, setLifeGoal] = useState('');
  const [dialect, setDialect] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingCharacter) {
      setName(existingCharacter.name);
      setDialogueName(existingCharacter.dialogue_name || '');
      setAge(existingCharacter.age || '');
      setGender(existingCharacter.gender || '');
      setClothingStyle(existingCharacter.clothing_style || '');
      setSpeechStyle(existingCharacter.speech_style || '');
      setPsychologicalIssue(existingCharacter.psychological_issue || '');
      setLikes(existingCharacter.likes || '');
      setDislikes(existingCharacter.dislikes || '');
      setFears(existingCharacter.fears || '');
      setChildhoodTrauma(existingCharacter.childhood_trauma || '');
      setTraumaImpactAdulthood(existingCharacter.trauma_impact_adulthood || '');
      setEducation(existingCharacter.education || '');
      setJob(existingCharacter.job || '');
      setWorkRelationships(existingCharacter.work_relationships || '');
      setResidence(existingCharacter.residence || '');
      setNeighborRelationships(existingCharacter.neighbor_relationships || '');
      setLifeGoal(existingCharacter.life_goal || '');
      setDialect(existingCharacter.dialect || '');
    }
  }, [existingCharacter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dialogueName.trim()) return;

    try {
      setSaving(true);
      setError(null);
      await onSave({
        name: name.trim(),
        dialogue_name: dialogueName.trim(),
        age: age.trim(),
        gender: gender.trim(),
        residence: residence.trim(),
        likes: likes.trim(),
        dislikes: dislikes.trim(),
        fears: fears.trim(),
        life_goal: lifeGoal.trim(),
        psychological_issue: psychologicalIssue.trim(),
        childhood_trauma: childhoodTrauma.trim(),
        trauma_impact_adulthood: traumaImpactAdulthood.trim(),
        education: education.trim(),
        job: job.trim(),
        work_relationships: workRelationships.trim(),
        neighbor_relationships: neighborRelationships.trim(),
        clothing_style: clothingStyle.trim(),
        speech_style: speechStyle.trim(),
        dialect: dialect.trim(),
        description: [age.trim() && `العمر: ${age.trim()}`, gender.trim() && `الجنس: ${gender.trim()}`, residence.trim() && `يقيم في: ${residence.trim()}`].filter(Boolean).join(' | '),
        personality_traits: [likes.trim() && `يحب: ${likes.trim()}`, dislikes.trim() && `يكره: ${dislikes.trim()}`].filter(Boolean).join(' | '),
        background: [education.trim() && `التعليم: ${education.trim()}`, job.trim() && `الوظيفة: ${job.trim()}`, childhoodTrauma.trim() && `صدمة الطفولة: ${childhoodTrauma.trim()}`, traumaImpactAdulthood.trim() && `تأثيرها: ${traumaImpactAdulthood.trim()}`].filter(Boolean).join(' | '),
        speaking_style: [speechStyle.trim() && `أسلوب الكلام: ${speechStyle.trim()}`, clothingStyle.trim() && `الملابس: ${clothingStyle.trim()}`, dialect.trim() && `اللهجة: ${dialect.trim()}`].filter(Boolean).join(' | '),
        goals: lifeGoal.trim() || undefined,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save character:', error);
      setError(language === 'ar' ? 'فشل حفظ الشخصية. حاول مرة أخرى.' : 'Failed to save character. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--color-surface)' }}>
        <h3 className="text-xl font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>
          {existingCharacter
            ? (language === 'ar' ? 'تعديل الشخصية' : 'Edit Character')
            : (language === 'ar' ? 'إضافة شخصية' : 'Add Character')
          }
        </h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div
              className="p-3 rounded-lg text-sm"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-error) 10%, transparent)',
                border: '1px solid var(--color-error)',
                color: 'var(--color-error)',
              }}
            >
              {error}
            </div>
          )}

          <div className="space-y-4">
            <h4 className="font-semibold pb-2" style={{ color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)' }}>
              {language === 'ar' ? 'المعلومات الأساسية' : 'Basic Information'}
            </h4>

            <Input
              label={language === 'ar' ? 'اسم الشخصية *' : 'Character Name *'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder={language === 'ar' ? 'مثال: سيد ممدوح' : 'e.g., John Doe'}
            />

            <Input
              label={language === 'ar' ? 'الاسم الخاص (للحوار) *' : 'Unique Name (for dialogue) *'}
              value={dialogueName}
              onChange={(e) => setDialogueName(e.target.value)}
              required
              placeholder={language === 'ar' ? 'مثال: سيد كلبش' : 'e.g., Johnny'}
            />
            <p className="text-xs -mt-2" style={{ color: 'var(--color-text-secondary)' }}>
              {language === 'ar'
                ? 'هذا هو الاسم الفريد الذي سيظهر عند جلب الشخصية للحوار ويستخدمه دووودة لتحليل الشخصية'
                : 'This is the unique name shown when inserting character dialogue and used by Doooda for character analysis'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={language === 'ar' ? 'العمر' : 'Age'}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder={language === 'ar' ? 'مثال: 25 سنة' : 'e.g., 25 years'}
              />
              <Input
                label={language === 'ar' ? 'الجنس' : 'Gender'}
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                placeholder={language === 'ar' ? 'مثال: ذكر، أنثى' : 'e.g., Male, Female'}
              />
            </div>

            <Input
              label={language === 'ar' ? 'مكان الإقامة' : 'Residence'}
              value={residence}
              onChange={(e) => setResidence(e.target.value)}
              placeholder={language === 'ar' ? 'مثال: القاهرة، مصر' : 'e.g., Cairo, Egypt'}
            />
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold pb-2" style={{ color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)' }}>
              {language === 'ar' ? 'الشخصية والطباع' : 'Personality & Traits'}
            </h4>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                {language === 'ar' ? 'الأشياء التي تحبها' : 'Likes'}
              </label>
              <textarea
                value={likes}
                onChange={(e) => setLikes(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
                style={textareaStyle}
                placeholder={language === 'ar' ? 'ما الذي تحبه الشخصية؟' : 'What does the character like?'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                {language === 'ar' ? 'الأشياء التي تكرهها' : 'Dislikes'}
              </label>
              <textarea
                value={dislikes}
                onChange={(e) => setDislikes(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
                style={textareaStyle}
                placeholder={language === 'ar' ? 'ما الذي تكرهه الشخصية؟' : 'What does the character dislike?'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                {language === 'ar' ? 'المخاوف' : 'Fears'}
              </label>
              <textarea
                value={fears}
                onChange={(e) => setFears(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
                style={textareaStyle}
                placeholder={language === 'ar' ? 'ما الذي تخافه الشخصية؟' : 'What does the character fear?'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                {language === 'ar' ? 'الهدف في الحياة' : 'Life Goal'}
              </label>
              <textarea
                value={lifeGoal}
                onChange={(e) => setLifeGoal(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
                style={textareaStyle}
                placeholder={language === 'ar' ? 'ما هو هدف الشخصية في الحياة؟' : 'What is the character\'s life goal?'}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold pb-2" style={{ color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)' }}>
              {language === 'ar' ? 'الحالة النفسية والصدمات' : 'Psychological Profile'}
            </h4>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                {language === 'ar' ? 'المشكلة النفسية' : 'Psychological Issue'}
              </label>
              <textarea
                value={psychologicalIssue}
                onChange={(e) => setPsychologicalIssue(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
                style={textareaStyle}
                placeholder={language === 'ar' ? 'وصف المشكلة النفسية إن وجدت' : 'Describe psychological issue if any'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                {language === 'ar' ? 'صدمة الطفولة' : 'Childhood Trauma'}
              </label>
              <textarea
                value={childhoodTrauma}
                onChange={(e) => setChildhoodTrauma(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
                style={textareaStyle}
                placeholder={language === 'ar' ? 'هل تعرضت لصدمة في الطفولة؟' : 'Any childhood trauma?'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                {language === 'ar' ? 'تأثير الصدمة على البلوغ' : 'Trauma Impact on Adulthood'}
              </label>
              <textarea
                value={traumaImpactAdulthood}
                onChange={(e) => setTraumaImpactAdulthood(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
                style={textareaStyle}
                placeholder={language === 'ar' ? 'كيف أثرت الصدمة على حياتها البالغة؟' : 'How did trauma impact adult life?'}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold pb-2" style={{ color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)' }}>
              {language === 'ar' ? 'العلاقات الاجتماعية' : 'Social Relationships'}
            </h4>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                {language === 'ar' ? 'العلاقة مع زملاء العمل' : 'Relationship with Coworkers'}
              </label>
              <textarea
                value={workRelationships}
                onChange={(e) => setWorkRelationships(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
                style={textareaStyle}
                placeholder={language === 'ar' ? 'كيف يتعامل مع زملاء العمل؟' : 'How does the character work with colleagues?'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                {language === 'ar' ? 'العلاقة مع الجيران' : 'Relationship with Neighbors'}
              </label>
              <textarea
                value={neighborRelationships}
                onChange={(e) => setNeighborRelationships(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
                style={textareaStyle}
                placeholder={language === 'ar' ? 'كيف يتعامل مع جيرانه؟' : 'How does the character interact with neighbors?'}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold pb-2" style={{ color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)' }}>
              {language === 'ar' ? 'الخلفية المهنية والتعليمية' : 'Professional & Educational Background'}
            </h4>

            <Input
              label={language === 'ar' ? 'التعليم' : 'Education'}
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              placeholder={language === 'ar' ? 'مثال: بكالوريوس هندسة' : 'e.g., Bachelor in Engineering'}
            />

            <Input
              label={language === 'ar' ? 'الوظيفة' : 'Job'}
              value={job}
              onChange={(e) => setJob(e.target.value)}
              placeholder={language === 'ar' ? 'مثال: مهندس برمجيات' : 'e.g., Software Engineer'}
            />
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold pb-2" style={{ color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)' }}>
              {language === 'ar' ? 'المظهر والأسلوب' : 'Appearance & Style'}
            </h4>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                {language === 'ar' ? 'أسلوب الملابس' : 'Clothing Style'}
              </label>
              <textarea
                value={clothingStyle}
                onChange={(e) => setClothingStyle(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
                style={textareaStyle}
                placeholder={language === 'ar' ? 'كيف تلبس الشخصية؟' : 'How does the character dress?'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                {language === 'ar' ? 'أسلوب الكلام' : 'Speech Style'}
              </label>
              <textarea
                value={speechStyle}
                onChange={(e) => setSpeechStyle(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
                style={textareaStyle}
                placeholder={language === 'ar' ? 'كيف تتكلم الشخصية؟' : 'How does the character speak?'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                {language === 'ar' ? 'اللهجة' : 'Dialect'}
              </label>
              <textarea
                value={dialect}
                onChange={(e) => setDialect(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
                style={textareaStyle}
                placeholder={language === 'ar' ? 'مثال: لهجة صعيدية، لهجة إسكندرانية، لهجة شامية...' : 'e.g., Egyptian dialect, Gulf dialect...'}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
            <Button type="submit" disabled={saving || !name.trim() || !dialogueName.trim()} className="flex-1">
              {saving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ' : 'Save')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={saving}
              className="flex-1"
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
