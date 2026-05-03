import { useState, useRef } from 'react';
import Button from './Button';
import ContextMenu from './ContextMenu';
import { diacritizeText } from '../api/diacritizeText';
import type { ProjectType, SoundCue } from '../types';
import { getProjectTypeConfig } from '../utils/projectTypeConfig';

interface SceneData {
  title: string;
  summary?: string;
  hook?: string;
  scene_type?: 'INT' | 'EXT' | 'INT/EXT' | null;
  time_of_day?: 'DAY' | 'NIGHT' | 'DAWN' | 'DUSK' | 'CONTINUOUS' | 'LATER' | null;
  location?: string | null;
  camera_shot?: string | null;
  camera_angle?: string | null;
  background_sound?: string | null;
  sound_cues?: SoundCue[];
  voice_tone?: string | null;
  has_silence_marker?: boolean;
  page_number?: number | null;
  page_type?: 'single' | 'double';
}

interface SceneModalProps {
  chapterId: string;
  onClose: () => void;
  onSave: (scene: SceneData) => Promise<void>;
  language: 'ar' | 'en';
  isBookProject?: boolean;
  projectType?: ProjectType;
}

interface ContextMenuState {
  x: number;
  y: number;
  options: Array<{
    label: string;
    onClick?: () => void;
    submenu?: Array<{ label: string; onClick: () => void; disabled?: boolean }>;
    disabled?: boolean;
  }>;
}

const SCENE_TYPES = ['INT', 'EXT', 'INT/EXT'] as const;
const TIME_OF_DAY = ['DAY', 'NIGHT', 'DAWN', 'DUSK', 'CONTINUOUS', 'LATER'] as const;
const CAMERA_SHOTS = ['CLOSE-UP', 'MEDIUM SHOT', 'WIDE SHOT', 'EXTREME CLOSE-UP', 'EXTREME WIDE', 'TWO-SHOT', 'OVER-THE-SHOULDER', 'POV'];
const CAMERA_ANGLES = ['EYE LEVEL', 'HIGH ANGLE', 'LOW ANGLE', 'DUTCH ANGLE', 'AERIAL', "BIRD'S EYE", "WORM'S EYE"];
const VOICE_TONES = ['NORMAL', 'WHISPERING', 'SHOUTING', 'CRYING', 'LAUGHING', 'NARRATION', 'ECHO'];
const SOUND_CUE_TYPES = ['sfx', 'music', 'ambient', 'silence'] as const;

export default function SceneModal({
  chapterId: _chapterId,
  onClose,
  onSave,
  language = 'ar',
  projectType = 'novel',
}: SceneModalProps) {
  const typeConfig = getProjectTypeConfig(projectType);
  console.log('🎨 SceneModal: projectType=', projectType, 'typeConfig.hasChildrenFields=', typeConfig.hasChildrenFields);
  const showChildrenFields = typeConfig.hasChildrenFields; // Use actual config
  
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [hook, setHook] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isDiacritizing, setIsDiacritizing] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [sceneType, setSceneType] = useState<'INT' | 'EXT' | 'INT/EXT'>('INT');
  const [timeOfDay, setTimeOfDay] = useState<typeof TIME_OF_DAY[number]>('DAY');
  const [location, setLocation] = useState('');
  const [cameraShot, setCameraShot] = useState('');
  const [cameraAngle, setCameraAngle] = useState('');
  const [backgroundSound, setBackgroundSound] = useState('');
  const [soundCues, setSoundCues] = useState<SoundCue[]>([]);
  const [voiceTone, setVoiceTone] = useState('');
  const [hasSilenceMarker, setHasSilenceMarker] = useState(false);
  const [pageNumber, setPageNumber] = useState('');
  const [pageType, setPageType] = useState<'single' | 'double'>('single');
  
  const isChildrenStory = projectType === 'children_story';

  const getUnitLabel = () => language === 'ar' ? typeConfig.unitLabelAr : typeConfig.unitLabelEn;

  const fieldStyle = {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  };

  const labelStyle = { color: 'var(--color-text-secondary)' };

  const addSoundCue = () => {
    setSoundCues(prev => [...prev, {
      id: crypto.randomUUID(),
      label: '',
      timing: '',
      type: 'sfx',
    }]);
  };

  const updateSoundCue = (id: string, field: keyof SoundCue, value: string) => {
    setSoundCues(prev => prev.map(cue => cue.id === id ? { ...cue, [field]: value } : cue));
  };

  const removeSoundCue = (id: string) => {
    setSoundCues(prev => prev.filter(cue => cue.id !== id));
  };

  const handleDiacritize = async (mode: 'light' | 'full') => {
    if (!selectedText || !titleInputRef.current) return;
    if (language !== 'ar') {
      alert('Diacritization is available for Arabic text only');
      return;
    }
    setIsDiacritizing(true);
    try {
      const result = await diacritizeText(selectedText, mode, language);
      if ('error' in result) { alert(result.error); return; }
      if (result.diacritizedText) {
        const input = titleInputRef.current;
        const start = input.selectionStart ?? 0;
        const end = input.selectionEnd ?? 0;
        const newTitle = title.substring(0, start) + result.diacritizedText + title.substring(end);
        setTitle(newTitle);
        setTimeout(() => {
          input.focus();
          const newCursorPos = start + result.diacritizedText.length;
          input.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
      }
    } catch {
      alert(language === 'ar' ? 'حدث خطأ أثناء تشكيل النص' : 'An error occurred while diacritizing the text');
    } finally {
      setIsDiacritizing(false);
    }
  };

  const handleTitleContextMenu = (e: React.MouseEvent<HTMLInputElement>) => {
    e.preventDefault();
    const input = e.currentTarget;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const selected = title.substring(start, end);
    setSelectedText(selected);
    if (!selected || selected.length === 0) return;
    const isArabic = language === 'ar';
    const diacritizeDisabled = !isArabic || isDiacritizing;
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      options: [{
        label: language === 'ar' ? 'تشكيل النص' : 'Diacritize Text',
        disabled: diacritizeDisabled,
        submenu: [
          { label: language === 'ar' ? 'تشكيل خفيف' : 'Light Diacritization', onClick: () => handleDiacritize('light'), disabled: diacritizeDisabled },
          { label: language === 'ar' ? 'تشكيل كامل' : 'Full Diacritization', onClick: () => handleDiacritize('full'), disabled: diacritizeDisabled },
        ],
      }],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      setSaving(true);
      setError(null);
      await onSave({
        title: title.trim(),
        summary: summary.trim() || undefined,
        hook: hook.trim() || undefined,
        ...(typeConfig.hasScriptFields && {
          scene_type: sceneType,
          time_of_day: timeOfDay,
          location: location.trim() || null,
          camera_shot: cameraShot || null,
          camera_angle: cameraAngle || null,
        }),
        ...(typeConfig.hasSoundFields && {
          background_sound: backgroundSound.trim() || null,
          sound_cues: soundCues,
          voice_tone: voiceTone || null,
          has_silence_marker: hasSilenceMarker,
        }),
        ...(typeConfig.hasChildrenFields && {
          page_number: pageNumber ? parseInt(pageNumber) : null,
          page_type: isChildrenStory ? pageType : undefined,
        }),
      });
      onClose();
    } catch (error) {
      console.error('Failed to save scene:', error);
      setError(language === 'ar'
        ? `فشل حفظ ${getUnitLabel()}. حاول مرة أخرى.`
        : `Failed to save ${getUnitLabel()}. Please try again.`);
      setSaving(false);
    }
  };

  const inputClass = "w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2";
  const selectClass = "w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--color-surface)' }}>
        <h3 className="text-xl font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>
          {language === 'ar'
            ? `إضافة ${typeConfig.unitLabelAr} جديد`
            : `Add New ${typeConfig.unitLabelEn}`}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* TEST: Force show children fields section */}
          <div style={{background: 'red', color: 'white', padding: '10px', textAlign: 'center'}}>
            TEST: showChildrenFields = {String(showChildrenFields)}
          </div>
          
          {error && (
            <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--color-error) 10%, transparent)', border: '1px solid var(--color-error)', color: 'var(--color-error)' }}>
              {error}
            </div>
          )}

          {typeConfig.hasScriptFields && (
            <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
                {language === 'ar' ? 'ترويسة المشهد' : 'Scene Header'}
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={labelStyle}>INT / EXT</label>
                  <select className={selectClass} style={fieldStyle} value={sceneType} onChange={(e) => setSceneType(e.target.value as typeof sceneType)}>
                    {SCENE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1" style={labelStyle}>{language === 'ar' ? 'الموقع' : 'Location'}</label>
                  <input type="text" className={inputClass} style={fieldStyle} value={location} onChange={(e) => setLocation(e.target.value)} placeholder={language === 'ar' ? 'مثال: المطبخ، الشارع الرئيسي' : 'e.g. Kitchen, Main Street'} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={labelStyle}>{language === 'ar' ? 'الوقت' : 'Time'}</label>
                  <select className={selectClass} style={fieldStyle} value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value as typeof timeOfDay)}>
                    {TIME_OF_DAY.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={labelStyle}>{language === 'ar' ? 'نوع اللقطة' : 'Camera Shot'}</label>
                  <select className={selectClass} style={fieldStyle} value={cameraShot} onChange={(e) => setCameraShot(e.target.value)}>
                    <option value="">{language === 'ar' ? 'اختياري' : 'Optional'}</option>
                    {CAMERA_SHOTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={labelStyle}>{language === 'ar' ? 'زاوية الكاميرا' : 'Camera Angle'}</label>
                  <select className={selectClass} style={fieldStyle} value={cameraAngle} onChange={(e) => setCameraAngle(e.target.value)}>
                    <option value="">{language === 'ar' ? 'اختياري' : 'Optional'}</option>
                    {CAMERA_ANGLES.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              {location && (
                <div className="px-3 py-2 rounded font-mono text-sm font-bold" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}>
                  {sceneType}. {location.toUpperCase()} – {timeOfDay}
                </div>
              )}
            </div>
          )}

          {typeConfig.hasSoundFields && (
            <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
                {language === 'ar' ? 'المؤثرات الصوتية' : 'Sound Design'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={labelStyle}>{language === 'ar' ? 'صوت الخلفية' : 'Background Sound'}</label>
                  <input type="text" className={inputClass} style={fieldStyle} value={backgroundSound} onChange={(e) => setBackgroundSound(e.target.value)} placeholder={language === 'ar' ? 'مثال: أصوات الشارع، موسيقى هادئة' : 'e.g. Street ambiance, Soft music'} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={labelStyle}>{language === 'ar' ? 'نبرة الصوت' : 'Voice Tone'}</label>
                  <select className={selectClass} style={fieldStyle} value={voiceTone} onChange={(e) => setVoiceTone(e.target.value)}>
                    <option value="">{language === 'ar' ? 'اختياري' : 'Optional'}</option>
                    {VOICE_TONES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={hasSilenceMarker} onChange={(e) => setHasSilenceMarker(e.target.checked)} />
                <span className="text-sm" style={labelStyle}>{language === 'ar' ? 'علامة صمت (Silence Marker)' : 'Silence Marker'}</span>
              </label>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium" style={labelStyle}>{language === 'ar' ? 'قائمة الإشارات الصوتية' : 'Sound Cues'}</label>
                  <button type="button" onClick={addSoundCue} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-accent)' }}>
                    + {language === 'ar' ? 'إضافة إشارة' : 'Add Cue'}
                  </button>
                </div>
                {soundCues.map((cue) => (
                  <div key={cue.id} className="flex items-center gap-2 mb-2">
                    <select className="px-2 py-1.5 text-xs rounded" style={fieldStyle} value={cue.type} onChange={(e) => updateSoundCue(cue.id, 'type', e.target.value)}>
                      {SOUND_CUE_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                    </select>
                    <input type="text" className="flex-1 px-2 py-1.5 text-xs rounded" style={fieldStyle} value={cue.label} onChange={(e) => updateSoundCue(cue.id, 'label', e.target.value)} placeholder={language === 'ar' ? 'وصف الإشارة' : 'Cue description'} />
                    <input type="text" className="w-20 px-2 py-1.5 text-xs rounded" style={fieldStyle} value={cue.timing} onChange={(e) => updateSoundCue(cue.id, 'timing', e.target.value)} placeholder={language === 'ar' ? 'التوقيت' : 'Timing'} />
                    <button type="button" onClick={() => removeSoundCue(cue.id)} style={{ color: 'var(--color-error)' }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showChildrenFields && (
            <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
                {language === 'ar' ? 'نوع الصفحة' : 'Page Type'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center justify-center gap-2 p-3 rounded-lg cursor-pointer transition-all ${pageType === 'single' ? 'ring-2 ring-[var(--color-accent)]' : ''}`} style={{ backgroundColor: pageType === 'single' ? 'var(--color-muted)' : 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <input type="radio" name="pageType" value="single" checked={pageType === 'single'} onChange={() => setPageType('single')} className="sr-only" />
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {language === 'ar' ? 'صفحة فردية' : 'Single Page'}
                  </span>
                </label>
                <label className={`flex items-center justify-center gap-2 p-3 rounded-lg cursor-pointer transition-all ${pageType === 'double' ? 'ring-2 ring-[var(--color-accent)]' : ''}`} style={{ backgroundColor: pageType === 'double' ? 'var(--color-muted)' : 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <input type="radio" name="pageType" value="double" checked={pageType === 'double'} onChange={() => setPageType('double')} className="sr-only" />
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {language === 'ar' ? 'صفحة مزدوجة' : 'Double Page'}
                  </span>
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={labelStyle}>
                  {language === 'ar' ? 'رقم الصفحة' : 'Page Number'}
                </label>
                <input type="number" min="1" className={inputClass} style={fieldStyle} value={pageNumber} onChange={(e) => setPageNumber(e.target.value)} placeholder={language === 'ar' ? 'رقم الصفحة' : 'Page number'} />
              </div>
              {pageType === 'double' && (
                <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                  {language === 'ar' 
                    ? 'ستحتاج لإدخال صفحتين للمشهد المزدوج' 
                    : 'You will need to add two scenes for the double page'}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2" style={labelStyle}>
              {language === 'ar' ? `عنوان ${typeConfig.unitLabelAr}` : `${typeConfig.unitLabelEn} Title`}
            </label>
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onContextMenu={handleTitleContextMenu}
              required
              className={inputClass}
              style={fieldStyle}
              placeholder={language === 'ar' ? `أدخل عنوان ${typeConfig.unitLabelAr}` : `Enter ${typeConfig.unitLabelEn.toLowerCase()} title`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={labelStyle}>
              {language === 'ar' ? `ملخص ${typeConfig.unitLabelAr}` : `${typeConfig.unitLabelEn} Summary`}
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={4}
              className={inputClass}
              style={fieldStyle}
              placeholder={language === 'ar' ? `ملخص مختصر عن ${typeConfig.unitLabelAr}` : `Brief summary of the ${typeConfig.unitLabelEn.toLowerCase()}`}
            />
          </div>

          {!typeConfig.hasScriptFields && !typeConfig.hasSoundFields && (
            <div>
              <label className="block text-sm font-medium mb-2" style={labelStyle}>
                {language === 'ar' ? 'الخطاف (ما يجعل القارئ يستمر)' : 'Hook (What keeps readers engaged)'}
              </label>
              <textarea
                value={hook}
                onChange={(e) => setHook(e.target.value)}
                rows={3}
                className={inputClass}
                style={fieldStyle}
                placeholder={language === 'ar' ? 'ما الذي يجعل القارئ يريد معرفة ما يحدث بعد ذلك؟' : 'What makes the reader want to know what happens next?'}
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={saving || !title.trim()} className="flex-1">
              {saving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ' : 'Save')}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving} className="flex-1">
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </form>

        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            options={contextMenu.options}
            onClose={() => setContextMenu(null)}
          />
        )}
      </div>
    </div>
  );
}
