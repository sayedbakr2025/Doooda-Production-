export type NarrativeClassification =
  | 'core'
  | 'supportive'
  | 'setup'
  | 'breathing'
  | 'transition'
  | 'weak_impact'
  | 'potential_filler';

export interface NarrativeDimensions {
  plot_progression: number;
  character_development: number;
  information_value: number;
  emotional_function: number;
  conflict_presence: number;
  narrative_necessity: number;
}

export interface CriticUiWarning {
  type: string;
  message: string;
  indices: number[];
}

export function getClassificationLabel(
  classification: NarrativeClassification | string | undefined | null,
  language: 'ar' | 'en',
) {
  if (!classification) return '';
  const ar: Record<string, string> = {
    core: 'محوري',
    supportive: 'داعم',
    setup: 'تمهيدي',
    breathing: 'تنفيسي',
    transition: 'انتقالي',
    weak_impact: 'ضعيف التأثير',
    potential_filler: 'حشوي محتمل',
  };
  const en: Record<string, string> = {
    core: 'Core',
    supportive: 'Supportive',
    setup: 'Setup',
    breathing: 'Breathing',
    transition: 'Transition',
    weak_impact: 'Weak Impact',
    potential_filler: 'Potential Filler',
  };
  return language === 'ar' ? (ar[classification] ?? classification) : (en[classification] ?? classification);
}

export function getClassificationColor(classification: NarrativeClassification | string | undefined | null) {
  switch (classification) {
    case 'core':
      return 'bg-red-600 text-white';
    case 'supportive':
      return 'bg-blue-600 text-white';
    case 'setup':
      return 'bg-amber-500 text-white';
    case 'breathing':
      return 'bg-teal-600 text-white';
    case 'transition':
      return 'bg-slate-500 text-white';
    case 'weak_impact':
      return 'bg-orange-500 text-white';
    case 'potential_filler':
      return 'bg-red-700 text-white';
    default:
      return 'bg-gray-600 text-white';
  }
}

export function getScenePurposeLabel(purpose?: string | null, language: 'ar' | 'en' = 'en') {
  if (!purpose) return '';
  if (language === 'ar') {
    switch (purpose) {
      case 'conflict': return 'تصعيد';
      case 'setup': return 'تمهيد';
      case 'payoff': return 'حصاد';
      case 'transition': return 'انتقال';
      default: return purpose;
    }
  }
  switch (purpose) {
    case 'conflict': return 'Escalation';
    case 'setup': return 'Setup';
    case 'payoff': return 'Payoff';
    case 'transition': return 'Transition';
    default: return purpose;
  }
}

export function getDisplayedTags(
  tagsAr: string[] | undefined,
  tagsEn: string[] | undefined,
  language: 'ar' | 'en',
) {
  return language === 'ar' ? (tagsAr ?? []) : (tagsEn ?? []);
}
