export interface User {
  id: string;
  email?: string;
  penName?: string;
  gender?: 'male' | 'female' | 'other';
  timezone?: string;
  preferredLanguage?: 'ar' | 'en';
  role?: 'user' | 'admin';
  subscription?: {
    plan: string;
    status: string;
  };
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
}

export interface PlanData {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  name_en: string;
  tokens_initial: number;
  tokens_recurring: number;
  allow_token_purchase: boolean;
  max_token_cap: number | null;
  monthly_tokens: number;
  multiplier: number;
  price: number;
  price_monthly: number;
  features: PlanFeatures;
}

export interface PlanFeatures {
  academy?: boolean;
  competitions?: boolean;
  max_projects?: number;
  export_pdf?: boolean;
  export_word?: boolean;
  marketing?: boolean;
  doooda_daily_limit?: number | null;
  doooda_monthly_limit?: number | null;
  doooda_max_tokens?: number;
  doooda_context_budget?: number;
  [key: string]: unknown;
}

export type ProjectType =
  | 'novel'
  | 'short_story'
  | 'long_story'
  | 'book'
  | 'film_script'
  | 'tv_series'
  | 'theatre_play'
  | 'radio_series'
  | 'children_story';

export interface Project {
  id: string;
  user_id: string;
  title: string;
  project_type: ProjectType;
  idea?: string;
  target_word_count: number;
  current_word_count: number;
  progress_percentage: number;
  status: 'active' | 'completed' | 'archived';
  last_accessed_at: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  writing_schedule?: any;
  last_word_count?: number;
}

export interface Genre {
  id: string;
  name: string;
  name_ar: string;
  slug: string;
  category?: string;
  is_active: boolean;
  created_at: string;
}

export interface Tone {
  id: string;
  name: string;
  name_ar: string;
  slug: string;
  is_active: boolean;
  created_at: string;
}

export interface Chapter {
  id: string;
  project_id: string;
  chapter_number: number;
  title: string;
  content: string;
  word_count: number;
  summary?: string;
  position?: 'beginning' | 'middle' | 'end';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Scene {
  id: string;
  chapter_id: string;
  position: number;
  title: string;
  summary: string;
  hook?: string;
  content: string;
  word_count: number;
  completed: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
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
  page_group_id?: string | null;
  page_order?: number;
  reading_complexity_score?: number | null;
}

export interface SoundCue {
  id: string;
  label: string;
  timing: string;
  type: 'sfx' | 'music' | 'ambient' | 'silence';
}

export interface ProjectTypeSetting {
  id: string;
  project_type: ProjectType;
  is_enabled: boolean;
  ai_model_override: string | null;
  display_name_ar: string;
  display_name_en: string;
  icon: string | null;
  description_ar: string | null;
  description_en: string | null;
}

export interface Task {
  id: string;
  user_id: string;
  project_id: string;
  chapter_number?: number;
  scene_number?: number;
  chapter_id?: string;
  scene_id?: string;
  context_type: 'logline' | 'chapter_summary' | 'scene_summary' | 'scene_content';
  description: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface ProjectCharacter {
  id: string;
  project_id: string;
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
  speech_style?: string;
  dialect?: string;
  created_at: string;
}

export type CollaboratorRole = 'viewer' | 'editor' | 'manager';
export type CollaboratorStatus = 'pending' | 'active' | 'frozen' | 'rejected';
export type CollaboratorScopeType = 'project' | 'chapter' | 'scene';

export interface ProjectCollaborator {
  id: string;
  project_id: string;
  user_id: string;
  role: CollaboratorRole;
  status: CollaboratorStatus;
  invited_by: string;
  created_at: string;
  scope_type: CollaboratorScopeType;
  scope_id: string | null;
  display_name?: string;
  pen_name?: string;
  email?: string;
  scope_title?: string;
}

export interface CollaboratorUserResult {
  id: string;
  display_name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  message: string;
  statusCode: number;
}

export type ActivityAction = 'edit_text' | 'delete_text' | 'ai_usage' | 'role_change' | 'create' | 'delete' | 'update' | 'invite';
export type ActivityEntityType = 'scene' | 'chapter' | 'project' | 'character' | 'collaborator' | 'comment';

export interface ActivityLog {
  id: string;
  project_id: string;
  user_id: string;
  action: ActivityAction;
  entity_type: ActivityEntityType;
  entity_id: string | null;
  entity_title: string;
  meta: Record<string, unknown>;
  created_at: string;
  user_display_name?: string;
}

export type TicketStatus = 'open' | 'answered' | 'pending' | 'closed';

export interface SupportTicket {
  id: string;
  user_id: string;
  title: string;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_type: 'user' | 'admin';
  message: string;
  read: boolean;
  created_at: string;
}

export interface Comment {
  id: string;
  project_id: string;
  scene_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  status: 'open' | 'resolved';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  user_display_name?: string;
  replies?: Comment[];
  user?: { id: string; pen_name?: string; first_name?: string; email?: string };
}

export interface InlineComment {
  id: string;
  project_id: string;
  scene_id: string;
  user_id: string;
  content: string;
  anchor_start: number | null;
  anchor_end: number | null;
  selected_text: string | null;
  status: 'open' | 'resolved';
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_email?: string;
  reply_count?: number;
  replies?: InlineCommentReply[];
  user?: { id: string; pen_name?: string; first_name?: string; email?: string };
}

export interface InlineCommentReply {
  id: string;
  comment_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name?: string;
  author_email?: string;
}
