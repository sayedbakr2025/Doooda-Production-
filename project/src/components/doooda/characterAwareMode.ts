import { supabase } from '../../lib/supabaseClient';

export interface Character {
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

export interface CharacterDialogue {
  dialogueName: string;
  dialogueText: string;
  fullText: string;
}

export interface CharacterContext {
  character: Character;
  dialogue: CharacterDialogue;
}

const DIALOGUE_PATTERN_NEWLINE = /^([^\n:]+):\s*\n(.+)/s;
const DIALOGUE_PATTERN_INLINE = /^([^\n:]{1,100}):\s*(.+)/s;

export function detectCharacterDialogue(text: string): CharacterDialogue | null {
  const trimmedText = text.trim();
  if (!trimmedText) return null;

  let match = trimmedText.match(DIALOGUE_PATTERN_NEWLINE);
  if (!match) {
    match = trimmedText.match(DIALOGUE_PATTERN_INLINE);
  }
  if (!match) return null;

  const [, dialogueName, dialogueText] = match;

  if (!dialogueName || !dialogueText) return null;

  const cleanDialogueName = dialogueName.trim();
  const cleanDialogueText = dialogueText.trim();

  if (cleanDialogueName.length === 0 || cleanDialogueText.length === 0) return null;

  if (cleanDialogueName.length > 100) return null;

  return {
    dialogueName: cleanDialogueName,
    dialogueText: cleanDialogueText,
    fullText: trimmedText,
  };
}

export async function fetchCharacterByDialogueName(
  projectId: string,
  dialogueName: string
): Promise<Character | null> {
  try {
    const { data, error } = await supabase
      .from('project_characters')
      .select('*')
      .eq('project_id', projectId)
      .eq('dialogue_name', dialogueName)
      .maybeSingle();

    if (error) {
      console.error('Error fetching character:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error fetching character:', error);
    return null;
  }
}

export async function buildCharacterContext(
  selectedText: string,
  projectId: string
): Promise<CharacterContext | null> {
  const dialogue = detectCharacterDialogue(selectedText);
  if (!dialogue) return null;

  const character = await fetchCharacterByDialogueName(projectId, dialogue.dialogueName);
  if (!character) return null;

  return {
    character,
    dialogue,
  };
}

export function buildCharacterAnalysisPrompt(
  characterContext: CharacterContext,
  language: 'ar' | 'en'
): string {
  const { character, dialogue } = characterContext;
  const effectiveSpeakingStyle = character.speech_style || character.speaking_style;
  let prompt = '';

  if (language === 'ar') {
    prompt = `**تحليل الحوار من منظور الشخصية**\n\n`;
    prompt += `الشخصية: ${character.name} (${character.dialogue_name})\n\n`;

    if (character.age || character.gender) {
      const parts = [];
      if (character.age) parts.push(`العمر: ${character.age}`);
      if (character.gender) parts.push(`الجنس: ${character.gender}`);
      prompt += `**معلومات أساسية:**\n${parts.join(' | ')}\n\n`;
    }

    if (character.description) {
      prompt += `**الوصف:**\n${character.description}\n\n`;
    }

    if (character.personality_traits) {
      prompt += `**السمات الشخصية:**\n${character.personality_traits}\n\n`;
    }

    if (character.background) {
      prompt += `**الخلفية:**\n${character.background}\n\n`;
    }

    if (character.education || character.job) {
      const parts = [];
      if (character.education) parts.push(`التعليم: ${character.education}`);
      if (character.job) parts.push(`المهنة: ${character.job}`);
      prompt += `**التعليم والمهنة:**\n${parts.join(' | ')}\n\n`;
    }

    if (character.residence) {
      prompt += `**مكان الإقامة:**\n${character.residence}\n\n`;
    }

    if (character.psychological_issue) {
      prompt += `**المشكلة النفسية:**\n${character.psychological_issue}\n\n`;
    }

    if (character.childhood_trauma) {
      prompt += `**الصدمة في الطفولة:**\n${character.childhood_trauma}\n\n`;
    }

    if (character.trauma_impact_adulthood) {
      prompt += `**تأثير الصدمة في مرحلة البلوغ:**\n${character.trauma_impact_adulthood}\n\n`;
    }

    if (character.likes || character.dislikes) {
      if (character.likes) prompt += `**ما يحبه:**\n${character.likes}\n\n`;
      if (character.dislikes) prompt += `**ما يكرهه:**\n${character.dislikes}\n\n`;
    }

    if (character.life_goal) {
      prompt += `**الهدف في الحياة:**\n${character.life_goal}\n\n`;
    }

    if (character.work_relationships) {
      prompt += `**علاقات العمل:**\n${character.work_relationships}\n\n`;
    }

    if (character.neighbor_relationships) {
      prompt += `**علاقات الجيران:**\n${character.neighbor_relationships}\n\n`;
    }

    if (character.clothing_style) {
      prompt += `**أسلوب الملبس:**\n${character.clothing_style}\n\n`;
    }

    if (effectiveSpeakingStyle) {
      prompt += `**أسلوب الكلام:**\n${effectiveSpeakingStyle}\n\n`;
    }

    if (character.dialect) {
      prompt += `**اللكنة/اللهجة المحددة للشخصية:**\n${character.dialect}\n\n`;
    }

    if (character.goals) {
      prompt += `**الأهداف:**\n${character.goals}\n\n`;
    }

    if (character.fears) {
      prompt += `**المخاوف:**\n${character.fears}\n\n`;
    }

    prompt += `**الحوار المراد تحليله:**\n${dialogue.dialogueText}\n\n`;
    prompt += `---\n\n`;
    prompt += `**تحذير مهم جداً:** لا تستنتج أي توقعات أو قيود من اسم الشخصية أو لقبها. التقييم يعتمد فقط على الخصائص المذكورة صراحةً أعلاه (أسلوب الكلام، اللهجة، السمات الشخصية). إذا لم تكن هناك خصائص محددة تتعارض مع الحوار، فالحوار مقبول.\n\n`;
    prompt += `**مهمتك:**\n`;
    prompt += `حلّل الحوار بناءً على خصائص الشخصية المذكورة صراحةً أعلاه فقط. يجب أن تبدأ تحليلك بـ:\n\n`;

    if (effectiveSpeakingStyle) {
      prompt += `**⚠️ أولاً - مطابقة أسلوب الكلام (الأهم):**\n`;
      prompt += `أسلوب كلام الشخصية المحدد هو: **"${effectiveSpeakingStyle}"**\n`;
      prompt += `هل الحوار مكتوب بهذا الأسلوب؟ إذا لم يكن كذلك، وضّح بدقة:\n`;
      prompt += `- ما الأسلوب المستخدم في الحوار فعلياً؟\n`;
      prompt += `- ما الكلمات/التعبيرات التي تخالف الأسلوب المحدد؟\n`;
      prompt += `- كيف تُكتب هذه الكلمات بالأسلوب الصحيح؟\n\n`;
    }

    if (character.dialect) {
      prompt += `**ثانياً - مطابقة اللهجة:**\n`;
      prompt += `لهجة الشخصية المحددة: **"${character.dialect}"**\n`;
      prompt += `هل الحوار يستخدم هذه اللهجة؟ إذا لم يكن كذلك، اذكر الكلمات/التعبيرات الخاطئة والصحيحة.\n\n`;
    }

    prompt += `**ثم قيّم (بناءً على الخصائص المحددة فقط، لا على افتراضات من الاسم):**\n`;
    prompt += `1. هل الحوار متسق مع السمات الشخصية المذكورة صراحةً أعلاه؟\n`;
    prompt += `2. هل الحوار يعكس أهداف الشخصية ودوافعها المذكورة؟\n`;
    prompt += `3. هل هناك اتساق عاطفي مع الخلفية والمخاوف المذكورة؟\n\n`;

    prompt += `**صيغة الرد:**\n`;
    prompt += `ابدأ بمطابقة أسلوب الكلام واللهجة أولاً إذا كانا محددين، ثم انتقل لباقي التحليل.\n`;
    prompt += `إذا كان الحوار متوافقاً مع جميع الخصائص المحددة، قل ذلك بوضوح.\n`;
    prompt += `في نهاية ردك، قدّم نسخة معدّلة من الحوار فقط إذا كان هناك فعلاً تعارض مع الخصائص المحددة.\n\n`;
    prompt += `**ملاحظة مهمة:** كن دقيقاً ومحدداً. استشهد بالخصائص المحددة والكلمات/التعبيرات المخالفة لها فقط. لا تحكم على الحوار بناءً على اسم الشخصية أو لقبها.`;
  } else {
    prompt = `**Character-Aware Dialogue Analysis**\n\n`;
    prompt += `Character: ${character.name} (${character.dialogue_name})\n\n`;

    if (character.age || character.gender) {
      const parts = [];
      if (character.age) parts.push(`Age: ${character.age}`);
      if (character.gender) parts.push(`Gender: ${character.gender}`);
      prompt += `**Basic Info:**\n${parts.join(' | ')}\n\n`;
    }

    if (character.description) {
      prompt += `**Description:**\n${character.description}\n\n`;
    }

    if (character.personality_traits) {
      prompt += `**Personality Traits:**\n${character.personality_traits}\n\n`;
    }

    if (character.background) {
      prompt += `**Background:**\n${character.background}\n\n`;
    }

    if (character.education || character.job) {
      const parts = [];
      if (character.education) parts.push(`Education: ${character.education}`);
      if (character.job) parts.push(`Job: ${character.job}`);
      prompt += `**Education & Profession:**\n${parts.join(' | ')}\n\n`;
    }

    if (character.residence) {
      prompt += `**Residence:**\n${character.residence}\n\n`;
    }

    if (character.psychological_issue) {
      prompt += `**Psychological Issue:**\n${character.psychological_issue}\n\n`;
    }

    if (character.childhood_trauma) {
      prompt += `**Childhood Trauma:**\n${character.childhood_trauma}\n\n`;
    }

    if (character.trauma_impact_adulthood) {
      prompt += `**Trauma Impact on Adulthood:**\n${character.trauma_impact_adulthood}\n\n`;
    }

    if (character.likes || character.dislikes) {
      if (character.likes) prompt += `**Likes:**\n${character.likes}\n\n`;
      if (character.dislikes) prompt += `**Dislikes:**\n${character.dislikes}\n\n`;
    }

    if (character.life_goal) {
      prompt += `**Life Goal:**\n${character.life_goal}\n\n`;
    }

    if (character.work_relationships) {
      prompt += `**Work Relationships:**\n${character.work_relationships}\n\n`;
    }

    if (character.neighbor_relationships) {
      prompt += `**Neighbor Relationships:**\n${character.neighbor_relationships}\n\n`;
    }

    if (character.clothing_style) {
      prompt += `**Clothing Style:**\n${character.clothing_style}\n\n`;
    }

    if (effectiveSpeakingStyle) {
      prompt += `**Speaking Style:**\n${effectiveSpeakingStyle}\n\n`;
    }

    if (character.dialect) {
      prompt += `**Character's Defined Dialect/Language Style:**\n${character.dialect}\n\n`;
    }

    if (character.goals) {
      prompt += `**Goals:**\n${character.goals}\n\n`;
    }

    if (character.fears) {
      prompt += `**Fears:**\n${character.fears}\n\n`;
    }

    prompt += `**Dialogue to Analyze:**\n${dialogue.dialogueText}\n\n`;
    prompt += `---\n\n`;
    prompt += `**CRITICAL WARNING:** Do NOT infer any expectations or restrictions from the character's name or title. Evaluation must be based ONLY on the explicitly stated traits above (speaking style, dialect, personality traits). If no defined traits conflict with the dialogue, the dialogue is acceptable.\n\n`;
    prompt += `**Your Task:**\n`;
    prompt += `Analyze the dialogue based ONLY on the explicitly stated character traits above. Start your analysis with:\n\n`;

    if (effectiveSpeakingStyle) {
      prompt += `**⚠️ First - Speaking Style Match (Most Important):**\n`;
      prompt += `The character's defined speaking style is: **"${effectiveSpeakingStyle}"**\n`;
      prompt += `Is the dialogue written in this style? If not, specify:\n`;
      prompt += `- What style is actually used in the dialogue?\n`;
      prompt += `- Which specific words/expressions violate the defined style?\n`;
      prompt += `- How should those words/expressions be written in the correct style?\n\n`;
    }

    if (character.dialect) {
      prompt += `**Second - Dialect Match:**\n`;
      prompt += `The character's defined dialect: **"${character.dialect}"**\n`;
      prompt += `Does the dialogue use this dialect? If not, list the wrong and correct words/expressions.\n\n`;
    }

    prompt += `**Then evaluate (based ONLY on explicitly defined traits, not assumptions from the name):**\n`;
    prompt += `1. Does the dialogue match the explicitly stated personality traits?\n`;
    prompt += `2. Does the dialogue reflect the stated goals and motivations?\n`;
    prompt += `3. Is there emotional consistency with the stated background and fears?\n\n`;

    prompt += `**Response Format:**\n`;
    prompt += `Start with the speaking style and dialect match first if defined, then continue with the rest of the analysis.\n`;
    prompt += `If the dialogue is consistent with all defined traits, state that clearly.\n`;
    prompt += `At the end, provide a revised version of the dialogue ONLY if there is an actual conflict with the defined traits.\n\n`;
    prompt += `**Important:** Be precise and specific. Reference only the defined traits and the exact violating words/expressions. Do NOT judge the dialogue based on the character's name or title.`;
  }

  return prompt;
}
