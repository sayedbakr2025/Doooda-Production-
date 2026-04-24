import { invokeWithAuth } from '@/lib/supabaseClient';
import type { WritingContext } from '../components/doooda/dooodaContext';

export async function askDoooda(
  message: string,
  language: "ar" | "en",
  contextOrSelectedText?: string,
  mode?: "explain" | "review" | "idea",
  writingContext?: WritingContext
) {
  console.log('[askDoooda] Calling edge function:', {
    messageLength: message.length,
    language,
    hasContext: !!contextOrSelectedText,
    mode
  });

  const payload: {
    messages: Array<{ role: string; content: string }>;
    language: string;
    mode?: string;
    context?: string;
    selectedText?: string;
    projectType?: string;
    genres?: string[];
    tone?: string;
    project_id?: string;
    characterContext?: {
      character: {
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
      };
      dialogue: {
        dialogueName: string;
        dialogueText: string;
      };
    };
  } = {
    messages: [{ role: "user", content: message }],
    language,
  };

  if (mode) {
    payload.mode = mode;
  }

  if (contextOrSelectedText) {
    payload.selectedText = contextOrSelectedText;
  }

  if (writingContext?.projectType) {
    payload.projectType = writingContext.projectType;
  }

  if (writingContext?.genres && writingContext.genres.length > 0) {
    payload.genres = writingContext.genres;
  }

  if (writingContext?.tone) {
    payload.tone = writingContext.tone;
  }

  if (writingContext?.projectId) {
    payload.project_id = writingContext.projectId;
  }

  if (writingContext?.characterContext) {
    const ch = writingContext.characterContext.character;
    payload.characterContext = {
      character: {
        id: ch.id,
        name: ch.name,
        dialogue_name: ch.dialogue_name,
        description: ch.description,
        personality_traits: ch.personality_traits,
        background: ch.background,
        speaking_style: ch.speaking_style,
        speech_style: ch.speech_style,
        dialect: ch.dialect,
        goals: ch.goals,
        fears: ch.fears,
        age: ch.age,
        gender: ch.gender,
        residence: ch.residence,
        likes: ch.likes,
        dislikes: ch.dislikes,
        life_goal: ch.life_goal,
        psychological_issue: ch.psychological_issue,
        childhood_trauma: ch.childhood_trauma,
        trauma_impact_adulthood: ch.trauma_impact_adulthood,
        education: ch.education,
        job: ch.job,
        work_relationships: ch.work_relationships,
        neighbor_relationships: ch.neighbor_relationships,
        clothing_style: ch.clothing_style,
      },
      dialogue: {
        dialogueName: writingContext.characterContext.dialogue.dialogueName,
        dialogueText: writingContext.characterContext.dialogue.dialogueText,
      },
    };
  }

  const { data, error, requiresAuth } = await invokeWithAuth('ask-doooda', {
    body: payload
  });

  if (requiresAuth) {
    console.error("[askDoooda] Authentication required");
    throw new Error("You must be logged in to use Doooda");
  }

  if (error) {
    console.error("[askDoooda] Edge function error:", error);
    throw new Error(`Ask Doooda failed: ${error.message || JSON.stringify(error)}`);
  }

  if (data?.type === 'LIMIT_REACHED' || data?.status === 402) {
    console.log("[askDoooda] 402 Payment Required:", data);
    return {
      error: data.error || "انتهى رصيدك من التوكنز",
      type: "LIMIT_REACHED",
      status: 402
    };
  }

  console.log('[askDoooda] Success, received reply:', {
    hasData: !!data,
    hasReply: !!data?.reply,
    replyLength: data?.reply?.length,
    type: data?.type
  });

  return data;
}
