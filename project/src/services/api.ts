import { supabase } from '../lib/supabaseClient';
import type { User, Project, Chapter, Scene, Task, ProjectType, ProjectTypeSetting, Genre, Tone, ActivityLog, ActivityAction, ActivityEntityType, Comment, SupportTicket, SupportMessage, TicketStatus } from '../types';

export { supabase };

class ApiClient {
  async login(email: string, password: string) {
    console.log('[API] Attempting login with:', { email });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[API] Login error:', {
        message: error.message,
        status: error.status,
        name: error.name,
      });
      throw error;
    }

    console.log('[API] Login successful:', {
      userId: data.user?.id,
      email: data.user?.email,
    });

    return data;
  }

  async signup(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      }
    });

    if (error) throw error;

    // Check if email confirmation is required
    if (data.user && !data.session) {
      throw new Error('CONFIRMATION_REQUIRED');
    }

    return data;
  }

  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  }

  async getProjects(): Promise<Project[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: ownedProjects, error: ownedError } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('last_accessed_at', { ascending: false });

    if (ownedError) throw ownedError;

    const { data: collabRows } = await supabase
      .from('project_collaborators')
      .select('project_id, status')
      .eq('user_id', user.id);

    const collabProjectIds = (collabRows || []).filter((c: any) => c.status === 'active').map((c: any) => c.project_id);

    let sharedProjects: any[] = [];
    if (collabProjectIds.length > 0) {
      const { data: sharedData, error: sharedError } = await supabase
        .from('projects')
        .select('*')
        .in('id', collabProjectIds)
        .order('last_accessed_at', { ascending: false });

      if (sharedError) throw sharedError;
      sharedProjects = sharedData || [];
    }

    const allProjects = [...(ownedProjects || []), ...sharedProjects];
    const seen = new Set<string>();
    const unique = allProjects.filter((p: any) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    const filtered = unique.filter((p: any) => {
      if (p.deleted_at) return false;
      if (p.status !== 'active' && p.status !== 'completed') return false;
      return true;
    });

    return filtered as Project[];
  }

  async createProject(projectData: {
    title: string;
    project_type: ProjectType;
    idea?: string;
    target_word_count: number;
  }): Promise<Project> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Validate required fields
    if (!projectData.title || projectData.title.trim().length === 0) {
      throw new Error('Project title is required');
    }

    if (!projectData.project_type) {
      throw new Error('Project type is required');
    }

    // Validate target word count (now required)
    if (!projectData.target_word_count || projectData.target_word_count <= 0) {
      throw new Error('Target word count is required and must be greater than 0');
    }

    const { data, error } = await supabase
      .from('projects')
      .insert([{
        user_id: user.id,
        title: projectData.title.trim(),
        project_type: projectData.project_type,
        idea: projectData.idea?.trim() || null,
        target_word_count: projectData.target_word_count,
        current_word_count: 0,
        progress_percentage: 0
      }])
      .select()
      .single();

    if (error) {
      console.error('Project creation error:', error);

      // Handle specific error cases
      if (error.message.includes('project limit exceeded')) {
        const match = error.message.match(/maximum of (\d+) projects for your (\w+) plan/);
        if (match) {
          const [, limit, plan] = match;
          throw new Error(`You have reached the maximum of ${limit} projects for your ${plan} plan. Please upgrade or delete unused projects.`);
        }
        throw new Error('You have reached your project limit. Please upgrade your plan or delete unused projects.');
      }

      if (error.code === '23505') {
        throw new Error('A project with this title already exists');
      }

      if (error.code === '23503') {
        throw new Error('Unable to create project. Please try logging out and back in.');
      }

      if (error.message.includes('permission denied') || error.code === '42501') {
        throw new Error('You do not have permission to create projects');
      }

      // Generic error with more context
      throw new Error(error.message || 'Failed to create project. Please try again.');
    }

    if (!data) {
      throw new Error('Project was not created. Please try again.');
    }

    return data;
  }

  async getProject(id: string): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Project not found');
    return data;
  }

  async deleteProject(id: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  async updateProject(id: string, updates: { title?: string; project_type?: string; idea?: string; target_word_count?: number; status?: 'active' | 'completed' | 'archived' }): Promise<Project> {
    const { error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    return { id, ...updates } as Project;
  }

  async getChapters(projectId: string): Promise<Chapter[]> {
    const { data, error } = await supabase
      .from('chapters')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('chapter_number', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async updateProfile(updates: Partial<User>): Promise<User> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.auth.updateUser({
      data: updates
    });

    if (error) throw error;
    return data.user as User;
  }

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
}

export const api = new ApiClient();

export async function getProject(projectId: string): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Project not found');
  return data;
}

export async function getAdminDashboard() {
  const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
  if (error) throw error;
  return data;
}

export async function getAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function updateUserStatus(userId: string, isActive: boolean) {
  const { error } = await supabase
    .from('users')
    .update({ is_active: isActive })
    .eq('id', userId);
  if (error) throw error;
}

export async function updateUserPlan(userId: string, updates: {
  plan?: string;
  tokens_balance?: number;
  role?: string;
}) {
  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId);
  if (error) throw error;
}

export async function getUserOverrides(userId: string) {
  const { data, error } = await supabase
    .from('user_overrides')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createUserOverride(data: {
  user_id: string;
  override_type: string;
  override_value: Record<string, unknown>;
  reason?: string;
  expires_at?: string | null;
}) {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('user_overrides')
    .insert([{
      ...data,
      granted_by_admin_id: authData.user.id,
    }]);
  if (error) throw error;
}

export async function deactivateUserOverride(overrideId: string) {
  const { error } = await supabase
    .from('user_overrides')
    .update({ is_active: false })
    .eq('id', overrideId);
  if (error) throw error;
}

export async function getPlans() {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .order('price_monthly', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function updatePlan(planId: string, updates: any) {
  const { error } = await supabase
    .from('plans')
    .update(updates)
    .eq('id', planId);
  if (error) throw error;
}

export async function getMessageTemplates() {
  const { data, error } = await supabase
    .from('message_templates')
    .select('*')
    .order('key', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function updateMessageTemplate(templateId: string, updates: any) {
  const { error } = await supabase
    .from('message_templates')
    .update(updates)
    .eq('id', templateId);
  if (error) throw error;
}

export async function getSMTPSettings() {
  const { data, error } = await supabase
    .from('smtp_settings')
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateSMTPSettings(settings: any) {
  const { error } = await supabase
    .from('smtp_settings')
    .upsert(settings);
  if (error) throw error;
}

export async function testSMTP(email: string) {
  const { error } = await supabase.rpc('send_test_email', { test_email: email });
  if (error) throw error;
}

export async function getPublishers() {
  const { data, error } = await supabase
    .from('publishers')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createPublisher(publisher: any) {
  const { error } = await supabase
    .from('publishers')
    .insert([publisher]);
  if (error) throw error;
}

export async function updatePublisher(publisherId: string, updates: any) {
  const { error } = await supabase
    .from('publishers')
    .update(updates)
    .eq('id', publisherId);
  if (error) throw error;
}

export async function deletePublisher(publisherId: string) {
  const { error } = await supabase
    .from('publishers')
    .delete()
    .eq('id', publisherId);
  if (error) throw error;
}

export async function createChapter(projectId: string, chapterData: { title: string; summary?: string }) {
  const { data: existingChapters, error: fetchError } = await supabase
    .from('chapters')
    .select('chapter_number')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('chapter_number', { ascending: false })
    .limit(1);

  if (fetchError) throw fetchError;

  const nextChapterNumber = existingChapters && existingChapters.length > 0
    ? existingChapters[0].chapter_number + 1
    : 1;

  const { data, error } = await supabase
    .from('chapters')
    .insert([{
      project_id: projectId,
      title: chapterData.title,
      summary: chapterData.summary || '',
      chapter_number: nextChapterNumber,
      word_count: 0
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createScene(chapterId: string, sceneData: {
  title: string;
  summary?: string;
  scene_type?: 'INT' | 'EXT' | 'INT/EXT' | null;
  time_of_day?: 'DAY' | 'NIGHT' | 'DAWN' | 'DUSK' | 'CONTINUOUS' | 'LATER' | null;
  location?: string | null;
  camera_shot?: string | null;
  camera_angle?: string | null;
  background_sound?: string | null;
  sound_cues?: any[];
  voice_tone?: string | null;
  has_silence_marker?: boolean;
  page_number?: number | null;
}) {
  const { data: existingScenes, error: fetchError } = await supabase
    .from('scenes')
    .select('position')
    .eq('chapter_id', chapterId)
    .is('deleted_at', null)
    .order('position', { ascending: false })
    .limit(1);

  if (fetchError) throw fetchError;

  const nextPosition = existingScenes && existingScenes.length > 0
    ? existingScenes[0].position + 1
    : 1;

  const { data, error } = await supabase
    .from('scenes')
    .insert([{
      chapter_id: chapterId,
      title: sceneData.title,
      summary: sceneData.summary || '',
      position: nextPosition,
      word_count: 0,
      scene_type: sceneData.scene_type || null,
      time_of_day: sceneData.time_of_day || null,
      location: sceneData.location || null,
      camera_shot: sceneData.camera_shot || null,
      camera_angle: sceneData.camera_angle || null,
      background_sound: sceneData.background_sound || null,
      sound_cues: sceneData.sound_cues || [],
      voice_tone: sceneData.voice_tone || null,
      has_silence_marker: sceneData.has_silence_marker || false,
      page_number: sceneData.page_number || null,
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getProjectTypeSettings(): Promise<ProjectTypeSetting[]> {
  const { data, error } = await supabase
    .from('project_type_settings')
    .select('*')
    .order('project_type');
  if (error) throw error;
  return data || [];
}

export async function updateProjectTypeSetting(projectType: string, updates: Partial<ProjectTypeSetting>) {
  const { error } = await supabase
    .from('project_type_settings')
    .update(updates)
    .eq('project_type', projectType);
  if (error) throw error;
}

export async function getEnabledProjectTypes(): Promise<ProjectTypeSetting[]> {
  const { data, error } = await supabase
    .from('project_type_settings')
    .select('*')
    .eq('is_enabled', true)
    .order('project_type');
  if (error) throw error;
  return data || [];
}

export async function createCharacter(projectId: string, characterData: {
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
}) {
  const { data, error } = await supabase
    .from('project_characters')
    .insert([{
      project_id: projectId,
      name: characterData.name,
      dialogue_name: characterData.dialogue_name,
      description: characterData.description || '',
      personality_traits: characterData.personality_traits || '',
      background: characterData.background || '',
      speaking_style: characterData.speaking_style || '',
      goals: characterData.goals || '',
      fears: characterData.fears || '',
      age: characterData.age || '',
      gender: characterData.gender || '',
      residence: characterData.residence || '',
      likes: characterData.likes || '',
      dislikes: characterData.dislikes || '',
      life_goal: characterData.life_goal || '',
      psychological_issue: characterData.psychological_issue || '',
      childhood_trauma: characterData.childhood_trauma || '',
      trauma_impact_adulthood: characterData.trauma_impact_adulthood || '',
      education: characterData.education || '',
      job: characterData.job || '',
      work_relationships: characterData.work_relationships || '',
      neighbor_relationships: characterData.neighbor_relationships || '',
      clothing_style: characterData.clothing_style || '',
      speech_style: characterData.speech_style || '',
      dialect: characterData.dialect || '',
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getCharacters(projectId: string) {
  const { data, error } = await supabase
    .from('project_characters')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function updateCharacter(characterId: string, characterData: {
  name?: string;
  dialogue_name?: string;
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
}) {
  const { data, error } = await supabase
    .from('project_characters')
    .update({
      name: characterData.name,
      dialogue_name: characterData.dialogue_name,
      description: characterData.description || '',
      personality_traits: characterData.personality_traits || '',
      background: characterData.background || '',
      speaking_style: characterData.speaking_style || '',
      goals: characterData.goals || '',
      fears: characterData.fears || '',
      age: characterData.age || '',
      gender: characterData.gender || '',
      residence: characterData.residence || '',
      likes: characterData.likes || '',
      dislikes: characterData.dislikes || '',
      life_goal: characterData.life_goal || '',
      psychological_issue: characterData.psychological_issue || '',
      childhood_trauma: characterData.childhood_trauma || '',
      trauma_impact_adulthood: characterData.trauma_impact_adulthood || '',
      education: characterData.education || '',
      job: characterData.job || '',
      work_relationships: characterData.work_relationships || '',
      neighbor_relationships: characterData.neighbor_relationships || '',
      clothing_style: characterData.clothing_style || '',
      speech_style: characterData.speech_style || '',
      dialect: characterData.dialect || '',
    })
    .eq('id', characterId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCharacter(characterId: string): Promise<void> {
  const { error } = await supabase
    .from('project_characters')
    .delete()
    .eq('id', characterId);

  if (error) throw error;
}

export async function getChapter(chapterId: string): Promise<Chapter> {
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('id', chapterId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Chapter not found');
  return data;
}

export async function getScenes(chapterId: string): Promise<Scene[]> {
  const { data, error } = await supabase
    .from('scenes')
    .select('*')
    .eq('chapter_id', chapterId)
    .is('deleted_at', null)
    .order('position', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getScene(sceneId: string): Promise<Scene> {
  const { data, error } = await supabase
    .from('scenes')
    .select('*')
    .eq('id', sceneId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Scene not found');
  return data;
}

export async function updateScene(sceneId: string, updates: Partial<Scene>) {
  const { error } = await supabase
    .from('scenes')
    .update(updates)
    .eq('id', sceneId);
  if (error) throw error;
}

export async function updateChapterOrder(chapters: Array<{ id: string; chapter_number: number }>) {
  const updates = chapters.map(ch =>
    supabase
      .from('chapters')
      .update({ chapter_number: ch.chapter_number })
      .eq('id', ch.id)
  );

  await Promise.all(updates);
}

export async function updateSceneOrder(scenes: Array<{ id: string; position: number }>) {
  const updates = scenes.map(scene =>
    supabase
      .from('scenes')
      .update({ position: scene.position })
      .eq('id', scene.id)
  );

  await Promise.all(updates);
}

export async function createTask(taskData: {
  project_id: string;
  context_type: 'logline' | 'chapter_summary' | 'scene_summary' | 'scene_content';
  description: string;
  chapter_number?: number;
  scene_number?: number;
  chapter_id?: string;
  scene_id?: string;
}): Promise<Task> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('tasks')
    .insert([{
      user_id: user.id,
      project_id: taskData.project_id,
      context_type: taskData.context_type,
      description: taskData.description,
      chapter_number: taskData.chapter_number || null,
      scene_number: taskData.scene_number || null,
      chapter_id: taskData.chapter_id || null,
      scene_id: taskData.scene_id || null,
      completed: false
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getProjectTasks(projectId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function updateTask(taskId: string, updates: { completed?: boolean; description?: string }): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', taskId);

  if (error) throw error;
}

export async function getProjectTasksProgress(projectId: string): Promise<{ total: number; completed: number; percentage: number }> {
  const { data, error } = await supabase
    .from('tasks')
    .select('completed')
    .eq('project_id', projectId)
    .is('deleted_at', null);

  if (error) throw error;

  const tasks = data || [];
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, percentage };
}

export async function createReference(projectId: string, referenceData: {
  reference_name: string;
  author_name?: string;
  translator_name?: string;
  editor_name?: string;
  page_number?: string;
  quote?: string;
  edition?: string;
  publication_year?: string;
  publisher?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('book_references')
    .insert([{
      user_id: user.id,
      project_id: projectId,
      reference_name: referenceData.reference_name,
      author_name: referenceData.author_name || null,
      translator_name: referenceData.translator_name || null,
      editor_name: referenceData.editor_name || null,
      page_number: referenceData.page_number || null,
      quote: referenceData.quote || null,
      edition: referenceData.edition || null,
      publication_year: referenceData.publication_year || null,
      publisher: referenceData.publisher || null
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getReferences(projectId: string) {
  const { data, error } = await supabase
    .from('book_references')
    .select('*')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function updateReference(referenceId: string, referenceData: {
  reference_name?: string;
  author_name?: string;
  translator_name?: string;
  editor_name?: string;
  page_number?: string;
  quote?: string;
  edition?: string;
  publication_year?: string;
  publisher?: string;
}) {
  const { data, error } = await supabase
    .from('book_references')
    .update({
      reference_name: referenceData.reference_name,
      author_name: referenceData.author_name || null,
      translator_name: referenceData.translator_name || null,
      editor_name: referenceData.editor_name || null,
      page_number: referenceData.page_number || null,
      quote: referenceData.quote || null,
      edition: referenceData.edition || null,
      publication_year: referenceData.publication_year || null,
      publisher: referenceData.publisher || null
    })
    .eq('id', referenceId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteReference(referenceId: string): Promise<void> {
  const { error } = await supabase
    .from('book_references')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', referenceId);

  if (error) throw error;
}

export async function deleteScene(sceneId: string): Promise<void> {
  const { error } = await supabase
    .from('scenes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', sceneId);

  if (error) throw error;
}

export async function deleteChapter(chapterId: string): Promise<void> {
  const { error } = await supabase
    .from('chapters')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', chapterId);

  if (error) throw error;
}

export async function toggleChapterActive(chapterId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('chapters')
    .update({ is_active: isActive })
    .eq('id', chapterId);

  if (error) throw error;
}

export async function toggleSceneActive(sceneId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('scenes')
    .update({ is_active: isActive })
    .eq('id', sceneId);

  if (error) throw error;
}

export async function toggleSceneCompleted(sceneId: string, completed: boolean): Promise<void> {
  const { error } = await supabase
    .from('scenes')
    .update({ completed })
    .eq('id', sceneId);

  if (error) throw error;
}

export async function getProjectScenesProgress(projectId: string): Promise<{ total: number; completed: number; percentage: number }> {
  const { data, error } = await supabase
    .from('scenes')
    .select('completed, chapters!inner(project_id, is_active, deleted_at)')
    .eq('chapters.project_id', projectId)
    .eq('chapters.is_active', true)
    .is('chapters.deleted_at', null)
    .is('deleted_at', null)
    .eq('is_active', true);

  if (error) throw error;

  const scenes = data || [];
  const total = scenes.length;
  const completedCount = scenes.filter((s: any) => s.completed).length;
  const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return { total, completed: completedCount, percentage };
}

export async function getUserStats(): Promise<{ totalWordsAllTime: number }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id')
    .eq('user_id', user.id)
    .is('deleted_at', null);

  if (projectsError) throw projectsError;

  const projectIds = (projects || []).map(p => p.id);
  let totalWordsAllTime = 0;

  if (projectIds.length > 0) {
    const { data: scenes, error: scenesError } = await supabase
      .from('scenes')
      .select('word_count, chapters!inner(project_id)')
      .in('chapters.project_id', projectIds)
      .is('deleted_at', null);

    if (!scenesError && scenes) {
      totalWordsAllTime = scenes.reduce((sum: number, s: any) => sum + (s.word_count || 0), 0);
    }
  }

  return { totalWordsAllTime };
}

export async function getPlotTemplates() {
  const { data, error } = await supabase
    .from('plot_templates')
    .select('*')
    .eq('is_active', true)
    .order('category')
    .order('name');

  if (error) throw error;
  return data;
}

export async function applyPlotTemplate(projectId: string, templateId: string, chapterCount: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let { data: plotProject, error: plotProjectError } = await supabase
    .from('plot_projects')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();

  if (plotProjectError) throw plotProjectError;

  if (!plotProject) {
    const { data: newPlotProject, error: createError } = await supabase
      .from('plot_projects')
      .insert({ project_id: projectId })
      .select()
      .single();

    if (createError) throw createError;
    plotProject = newPlotProject;
  }

  const { data: existingChapters } = await supabase
    .from('plot_chapters')
    .select('id')
    .eq('plot_project_id', plotProject.id);

  if (existingChapters && existingChapters.length > 0) {
    const chapterIds = existingChapters.map(ch => ch.id);
    await supabase
      .from('plot_chapters')
      .delete()
      .in('id', chapterIds);
  }

  const { data: template, error: templateError } = await supabase
    .from('plot_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (templateError) throw templateError;
  if (!template) throw new Error('Template not found');

  const stages = template.stages as any[];
  const chaptersPerStage = Math.floor(chapterCount / stages.length);
  let remainingChapters = chapterCount % stages.length;
  let currentOrderIndex = 1;

  const newChapters = [];

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    let chaptersForThisStage = chaptersPerStage;
    if (remainingChapters > 0) {
      chaptersForThisStage++;
      remainingChapters--;
    }

    for (let j = 0; j < chaptersForThisStage; j++) {
      const tensionLevel = Math.max(1, Math.min(10, stage.default_tension || 2));
      const paceLevel = Math.max(1, Math.min(10, stage.default_pace || 2));

      newChapters.push({
        plot_project_id: plotProject.id,
        order_index: currentOrderIndex,
        title: `${stage.label} - ${j + 1}/${chaptersForThisStage}`,
        summary: stage.guidance,
        goal: null,
        tension_level: tensionLevel,
        pace_level: paceLevel,
        has_climax: stage.is_climax_stage || false,
        system_notes: `Stage: ${stage.key}`,
        user_notes: null,
      });
      currentOrderIndex++;
    }
  }

  const { data: insertedChapters, error: insertError } = await supabase
    .from('plot_chapters')
    .insert(newChapters)
    .select();

  if (insertError) throw insertError;

  return insertedChapters;
}

export async function getGenres(): Promise<Genre[]> {
  const { data, error } = await supabase
    .from('genres')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getTones(): Promise<Tone[]> {
  const { data, error } = await supabase
    .from('tones')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getProjectGenres(projectId: string): Promise<Genre[]> {
  const { data, error } = await supabase
    .from('project_genres')
    .select('genre_id, genres(*)')
    .eq('project_id', projectId);
  if (error) throw error;
  return (data || []).map((row: any) => row.genres).filter(Boolean);
}

export async function getProjectTone(projectId: string): Promise<Tone | null> {
  const { data, error } = await supabase
    .from('project_tones')
    .select('tone_id, tones(*)')
    .eq('project_id', projectId)
    .maybeSingle();
  if (error) throw error;
  return data ? (data as any).tones : null;
}

export async function setProjectGenres(projectId: string, genreIds: string[]): Promise<void> {
  await supabase.from('project_genres').delete().eq('project_id', projectId);
  if (genreIds.length === 0) return;
  const rows = genreIds.map(id => ({ project_id: projectId, genre_id: id }));
  const { error } = await supabase.from('project_genres').insert(rows);
  if (error) throw error;
}

export async function setProjectTone(projectId: string, toneId: string | null): Promise<void> {
  await supabase.from('project_tones').delete().eq('project_id', projectId);
  if (!toneId) return;
  const { error } = await supabase.from('project_tones').insert({ project_id: projectId, tone_id: toneId });
  if (error) throw error;
}

export async function adminGetAllGenres(): Promise<Genre[]> {
  const { data, error } = await supabase
    .from('genres')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function adminUpsertGenre(genre: Partial<Genre> & { name: string; name_ar: string; slug: string }): Promise<void> {
  if (genre.id) {
    const { error } = await supabase.from('genres').update(genre).eq('id', genre.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('genres').insert(genre);
    if (error) throw error;
  }
}

export async function adminToggleGenre(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('genres').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
}

export async function adminGetAllTones(): Promise<Tone[]> {
  const { data, error } = await supabase
    .from('tones')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function adminUpsertTone(tone: Partial<Tone> & { name: string; name_ar: string; slug: string }): Promise<void> {
  if (tone.id) {
    const { error } = await supabase.from('tones').update(tone).eq('id', tone.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('tones').insert(tone);
    if (error) throw error;
  }
}

export async function adminToggleTone(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('tones').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
}

import type { ProjectCollaborator, CollaboratorRole, CollaboratorScopeType, CollaboratorUserResult } from '../types';

export async function searchUserByEmail(email: string): Promise<CollaboratorUserResult | null> {
  console.log('EMAIL INPUT:', email);

  const cleanEmail = email.trim().toLowerCase();
  console.log('CLEAN EMAIL:', cleanEmail);

  if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) return null;

  const { data, error } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, pen_name')
    .eq('email', cleanEmail)
    .limit(1)
    .maybeSingle();

  console.log('QUERY RESULT:', data);
  console.log('QUERY ERROR:', error);

  if (error) {
    console.error('QUERY ERROR DETAILS:', error);
    return null;
  }
  if (!data) return null;

  const display_name =
    data.pen_name?.trim() ||
    [data.first_name, data.last_name].filter(Boolean).join(' ').trim() ||
    data.email;

  return { id: data.id, display_name, email: data.email } as CollaboratorUserResult;
}

export async function getProjectCollaborators(projectId: string): Promise<ProjectCollaborator[]> {
  const { data, error } = await supabase
    .from('project_collaborators')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  if (!data || data.length === 0) return [];

  const userIds = data.map((c: any) => c.user_id);
  const { data: userData } = await supabase.rpc('get_collaborator_display_names', { user_ids: userIds });

  const nameMap: Record<string, { display_name: string; email: string }> = {};
  if (userData && Array.isArray(userData)) {
    userData.forEach((u: any) => { nameMap[u.id] = u; });
  }

  return (data || []).map((c: any) => ({
    ...c,
    display_name: nameMap[c.user_id]?.display_name || c.user_id,
    email: nameMap[c.user_id]?.email || '',
  }));
}

export async function getProjectCollaboratorsWithNames(projectId: string): Promise<ProjectCollaborator[]> {
  return getProjectCollaborators(projectId);
}

export async function addProjectCollaborator(
  projectId: string,
  userId: string,
  role: CollaboratorRole,
  scopeType: CollaboratorScopeType = 'project',
  scopeId: string | null = null
): Promise<ProjectCollaborator> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('project_collaborators')
    .insert({
      project_id:  projectId,
      user_id:     userId,
      role,
      status:      'pending',
      invited_by:  user.id,
      scope_type:  scopeType,
      scope_id:    scopeId ?? projectId,
      scope_title: null,
    })
    .select()
    .single();
  if (error) {
    console.error('[addProjectCollaborator] insert failed:', error);
    throw new Error(error.message || 'Failed to add collaborator');
  }
  return data;
}

export async function logProjectActivity(
  projectId: string,
  action: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('project_activity').insert({
    project_id: projectId,
    user_id: user.id,
    action,
    metadata,
  });
}

export async function updateCollaboratorRole(
  collaboratorId: string,
  role: CollaboratorRole
): Promise<void> {
  const { data: collab } = await supabase
    .from('project_collaborators')
    .select('project_id, user_id, role')
    .eq('id', collaboratorId)
    .single();

  const { error } = await supabase
    .from('project_collaborators')
    .update({ role })
    .eq('id', collaboratorId);
  if (error) throw error;

  if (collab && collab.role !== role) {
    await logProjectActivity(collab.project_id, 'changed_role', {
      target_user_id: collab.user_id,
      old_role: collab.role,
      new_role: role,
    });
  }
}

export async function updateCollaboratorStatus(
  collaboratorId: string,
  status: 'active' | 'frozen'
): Promise<void> {
  const { error } = await supabase
    .from('project_collaborators')
    .update({ status })
    .eq('id', collaboratorId);
  if (error) throw error;
}

export async function removeProjectCollaborator(collaboratorId: string): Promise<void> {
  const { error } = await supabase
    .from('project_collaborators')
    .delete()
    .eq('id', collaboratorId);
  if (error) throw error;
}

export async function getSharedProjects(): Promise<Array<{ project: any; role: CollaboratorRole; status: string }>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('project_collaborators')
    .select('role, status, project_id')
    .eq('user_id', user.id)
    .in('status', ['active', 'pending']);
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const projectIds = data.map((c: any) => c.project_id);
  const { data: projects, error: projError } = await supabase
    .from('projects')
    .select('*')
    .in('id', projectIds)
    .eq('status', 'active')
    .is('deleted_at', null);
  if (projError) throw projError;

  return (projects || []).map((project: any) => {
    const collab = data.find((c: any) => c.project_id === project.id);
    return { project, role: collab?.role as CollaboratorRole, status: collab?.status };
  });
}

export async function getMyCollaboratorRole(projectId: string): Promise<CollaboratorRole | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('project_collaborators')
    .select('role, status')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  return data ? (data.role as CollaboratorRole) : null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string | null;
  message: string | null;
  data: Record<string, any> | null;
  category: string;
  cta_label: string | null;
  cta_link: string | null;
  title_ar: string | null;
  message_ar: string | null;
  cta_label_ar: string | null;
  read: boolean;
  created_at: string;
}

export async function getNotifications(): Promise<Notification[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data || []) as Notification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false);
  if (error) throw error;
}

export async function acceptCollaborationInvitation(notification: Notification): Promise<void> {
  const data = notification.data || {};
  const project_id = data.project_id as string | undefined;
  const role = data.role as CollaboratorRole | undefined;
  if (!project_id || !role) throw new Error('Invalid invitation data');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: collab } = await supabase
    .from('project_collaborators')
    .select('id, status')
    .eq('project_id', project_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!collab) {
    await markNotificationRead(notification.id);
    throw new Error('INVITE_REVOKED');
  }

  if (collab.status === 'active') {
    await markNotificationRead(notification.id);
    return;
  }

  if (collab.status === 'frozen') {
    await markNotificationRead(notification.id);
    throw new Error('ACCESS_FROZEN');
  }

  if (collab.status === 'rejected') {
    await markNotificationRead(notification.id);
    throw new Error('INVITE_REVOKED');
  }

  const { error } = await supabase.from('project_collaborators')
    .update({ status: 'active' })
    .eq('id', collab.id);

  if (error) {
    if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
      await markNotificationRead(notification.id);
      return;
    }
    throw new Error(error.message || 'Failed to accept invitation');
  }

  await markNotificationRead(notification.id);
  await logProjectActivity(project_id, 'accepted_invite', { role });
}

export async function rejectCollaborationInvitation(notification: Notification): Promise<void> {
  const data = notification.data || {};
  const project_id = data.project_id as string | undefined;

  if (project_id) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('project_collaborators')
        .update({ status: 'rejected' })
        .eq('project_id', project_id)
        .eq('user_id', user.id)
        .eq('status', 'pending');
    }
    await logProjectActivity(project_id, 'rejected_invite');
  }

  await markNotificationRead(notification.id);
}

export async function sendCollaborationInvitation(
  projectId: string,
  inviteeId: string,
  role: CollaboratorRole,
  projectTitle: string,
  scopeType: CollaboratorScopeType = 'project',
  scopeId: string | null = null,
  scopeTitle?: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (user.id === inviteeId) {
    throw new Error('SELF_INVITE');
  }

  const { data: projectData } = await supabase
    .from('projects')
    .select('id, deleted_at, status')
    .eq('id', projectId)
    .maybeSingle();

  if (!projectData || projectData.deleted_at) {
    throw new Error('PROJECT_DELETED');
  }

  const { data: existing } = await supabase
    .from('project_collaborators')
    .select('id, status')
    .eq('project_id', projectId)
    .eq('user_id', inviteeId)
    .maybeSingle();

  if (existing) {
    if (existing.status === 'active') throw new Error('ALREADY_ACTIVE');
    if (existing.status === 'pending') throw new Error('ALREADY_PENDING');
    if (existing.status === 'frozen') throw new Error('ACCESS_FROZEN');
    if (existing.status === 'rejected') {
      await supabase.from('project_collaborators')
        .delete()
        .eq('id', existing.id);
    }
  }

  const { data: existingNotification } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', inviteeId)
    .eq('type', 'project_invite')
    .eq('read', false)
    .contains('data', { project_id: projectId })
    .maybeSingle();

  if (existingNotification) {
    throw new Error('INVITE_ALREADY_SENT');
  }

  const isScoped = scopeType !== 'project' && !!scopeId;
  const resolvedScopeType = isScoped ? scopeType : 'project';
  const resolvedScopeId   = isScoped ? scopeId   : projectId;
  const resolvedScopeTitle = isScoped ? (scopeTitle ?? null) : null;

  const { error } = await supabase.from('project_collaborators').insert({
    project_id:  projectId,
    user_id:     inviteeId,
    role,
    status:      'pending',
    invited_by:  user.id,
    scope_type:  resolvedScopeType,
    scope_id:    resolvedScopeId,
    scope_title: resolvedScopeTitle,
  });

  if (error) {
    if (error.code === '23505') return;
    console.error('[sendCollaborationInvitation] insert failed:', error);
    throw new Error(error.message || 'Failed to create collaborator record');
  }

  await supabase.from('notifications').insert({
    user_id: inviteeId,
    type: 'project_invite',
    title: 'دعوة لمشروع',
    message: 'تمت دعوتك للمشاركة في مشروع',
    data: {
      project_id: projectId,
      project_title: projectTitle,
      role,
      scope_type: resolvedScopeType,
      scope_id: resolvedScopeId,
    },
  });

  await logProjectActivity(projectId, 'invited_user', {
    target_user_id: inviteeId,
    role,
    scope_type: resolvedScopeType,
  });
}

export async function getProjectOwnerId(projectId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_project_owner_id', { p_project_id: projectId });
  if (error) return null;
  return data as string | null;
}

export async function requestItemDeletion(
  projectId: string,
  itemType: 'scene' | 'chapter',
  itemId: string,
  itemTitle: string,
  projectTitle: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.rpc('request_item_deletion', {
    p_project_id: projectId,
    p_requester_id: user.id,
    p_item_type: itemType,
    p_item_id: itemId,
    p_item_title: itemTitle,
    p_project_title: projectTitle,
  });
  if (error) throw error;
}

export async function approveDeletionRequest(notification: Notification): Promise<void> {
  const data = notification.data || {};
  const { item_type, item_id } = data;
  if (!item_type || !item_id) throw new Error('Invalid deletion request data');

  if (item_type === 'scene') {
    await deleteScene(item_id);
  } else if (item_type === 'chapter') {
    await deleteChapter(item_id);
  } else {
    throw new Error('Unknown item type');
  }

  await markNotificationRead(notification.id);
}

export async function rejectDeletionRequest(notification: Notification): Promise<void> {
  await markNotificationRead(notification.id);
}

export async function getMyCollaboratorRoleForProject(projectId: string): Promise<CollaboratorRole | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('project_collaborators')
    .select('role, status')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  return data ? (data.role as CollaboratorRole) : null;
}

export interface ScopeAccess {
  role: CollaboratorRole;
  scope_type: CollaboratorScopeType;
  scope_id: string | null;
}

export async function getMyScopeAccess(projectId: string): Promise<ScopeAccess | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('project_collaborators')
    .select('role, status, scope_type, scope_id')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!data) return null;
  return {
    role: data.role as CollaboratorRole,
    scope_type: (data.scope_type || 'project') as CollaboratorScopeType,
    scope_id: data.scope_id || null,
  };
}

export async function canAccessScope(
  projectId: string,
  scopeType: 'chapter' | 'scene',
  scopeId: string
): Promise<boolean> {
  const access = await getMyScopeAccess(projectId);
  if (!access) return false;
  if (access.scope_type === 'project') return true;
  if (access.scope_type === scopeType && access.scope_id === scopeId) return true;
  return false;
}

// =============================================
// ACTIVITY LOGS
// =============================================

export async function logActivity(
  projectId: string,
  action: ActivityAction,
  entityType: ActivityEntityType,
  entityTitle: string,
  entityId?: string | null,
  meta?: Record<string, unknown>
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('activity_logs').insert({
    project_id: projectId,
    user_id: user.id,
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    entity_title: entityTitle,
    meta: meta || {},
  });
}

export async function getProjectActivityLogs(
  projectId: string,
  limit = 50
): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;

  const logs = (data || []) as ActivityLog[];

  if (logs.length === 0) return logs;

  const userIds = [...new Set(logs.map((l) => l.user_id))];
  const { data: users } = await supabase
    .from('users')
    .select('id, email, raw_user_meta_data')
    .in('id', userIds);

  const nameMap: Record<string, string> = {};
  (users || []).forEach((u: any) => {
    nameMap[u.id] =
      u.raw_user_meta_data?.pen_name ||
      u.raw_user_meta_data?.first_name ||
      (u.email ? u.email.split('@')[0] : u.id);
  });

  return logs.map((l) => ({ ...l, user_display_name: nameMap[l.user_id] || l.user_id }));
}

// =============================================
// COMMENTS
// =============================================

export async function getSceneComments(sceneId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('scene_id', sceneId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const all = (data || []) as Comment[];

  if (all.length === 0) return [];

  const userIds = [...new Set(all.map((c) => c.user_id))];
  const { data: users } = await supabase
    .from('users')
    .select('id, email, raw_user_meta_data')
    .in('id', userIds);

  const nameMap: Record<string, string> = {};
  (users || []).forEach((u: any) => {
    nameMap[u.id] =
      u.raw_user_meta_data?.pen_name ||
      u.raw_user_meta_data?.first_name ||
      (u.email ? u.email.split('@')[0] : u.id);
  });

  const withNames = all.map((c) => ({ ...c, user_display_name: nameMap[c.user_id] || c.user_id, replies: [] as Comment[] }));

  const roots: Comment[] = [];
  const map: Record<string, Comment> = {};
  withNames.forEach((c) => { map[c.id] = c; });
  withNames.forEach((c) => {
    if (c.parent_id && map[c.parent_id]) {
      map[c.parent_id].replies!.push(c);
    } else if (!c.parent_id) {
      roots.push(c);
    }
  });

  return roots;
}

export async function addComment(
  projectId: string,
  sceneId: string,
  content: string,
  parentId?: string | null
): Promise<Comment> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('comments')
    .insert({
      project_id: projectId,
      scene_id: sceneId,
      user_id: user.id,
      content,
      parent_id: parentId || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Comment;
}

export async function resolveComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('comments')
    .update({ status: 'resolved' })
    .eq('id', commentId);
  if (error) throw error;
}

export async function reopenComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('comments')
    .update({ status: 'open' })
    .eq('id', commentId);
  if (error) throw error;
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', commentId);
  if (error) throw error;
}

// =============================================
// SUPPORT TICKETS
// =============================================

export async function createSupportTicket(
  userId: string,
  firstMessage: string
): Promise<SupportTicket & { firstMessageId: string }> {
  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .insert({
      user_id: userId,
      title: firstMessage.slice(0, 80),
      status: 'open',
    })
    .select()
    .single();

  if (ticketError) throw ticketError;

  const { data: msg, error: msgError } = await supabase
    .from('support_messages')
    .insert({
      ticket_id: ticket.id,
      sender_type: 'user',
      message: firstMessage,
    })
    .select()
    .single();

  if (msgError) throw msgError;

  return { ...ticket, firstMessageId: msg.id };
}

export async function addSupportMessage(
  ticketId: string,
  message: string,
  senderType: 'user' | 'admin'
): Promise<SupportMessage> {
  const { data, error } = await supabase
    .from('support_messages')
    .insert({
      ticket_id: ticketId,
      sender_type: senderType,
      message,
    })
    .select()
    .single();

  if (error) throw error;
  return data as SupportMessage;
}

export async function getSupportMessages(
  ticketId: string
): Promise<SupportMessage[]> {
  const { data, error } = await supabase
    .from('support_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as SupportMessage[];
}

export async function getUserActiveTicket(
  userId: string
): Promise<SupportTicket | null> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['open', 'answered', 'pending'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as SupportTicket | null;
}

export async function getUserTickets(
  userId: string
): Promise<SupportTicket[]> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'closed')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data || []) as SupportTicket[];
}

export async function closeSupportTicket(ticketId: string): Promise<void> {
  const { error } = await supabase
    .from('support_tickets')
    .update({ status: 'closed', updated_at: new Date().toISOString() })
    .eq('id', ticketId);
  if (error) throw error;
}

export async function getAllSupportTickets(
  statusFilter?: TicketStatus
): Promise<(SupportTicket & { user_email?: string })[]> {
  let query = supabase
    .from('support_tickets')
    .select('*')
    .order('updated_at', { ascending: false });

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;
  if (error) throw error;

  const tickets = (data || []) as SupportTicket[];

  if (tickets.length === 0) return [];

  const userIds = [...new Set(tickets.map((t) => t.user_id))];
  const { data: users } = await supabase
    .from('users')
    .select('id, email, pen_name')
    .in('id', userIds);

  const userMap = new Map((users || []).map((u: any) => [u.id, u]));

  return tickets.map((ticket) => ({
    ...ticket,
    user_email: userMap.get(ticket.user_id)?.email || '',
    user_pen_name: userMap.get(ticket.user_id)?.pen_name || '',
  })) as any;
}

export async function adminReplyToTicket(
  ticketId: string,
  message: string
): Promise<SupportMessage> {
  const msg = await addSupportMessage(ticketId, message, 'admin');

  await supabase
    .from('support_tickets')
    .update({ status: 'answered', updated_at: new Date().toISOString() })
    .eq('id', ticketId);

  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('user_id, title')
    .eq('id', ticketId)
    .maybeSingle();

  if (ticket) {
    await supabase.from('notifications').insert({
      user_id: ticket.user_id,
      type: 'support_reply',
      title: 'تم الرد على تذكرتك من دعم دووودة',
      message: message.length > 100 ? message.slice(0, 100) + '...' : message,
      category: 'important',
      read: false,
    });
  }

  return msg;
}

export async function adminUpdateTicketStatus(
  ticketId: string,
  status: TicketStatus
): Promise<void> {
  const { error } = await supabase
    .from('support_tickets')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', ticketId);
  if (error) throw error;
}

export async function markSupportMessagesRead(
  ticketId: string,
  senderType: 'user' | 'admin'
): Promise<void> {
  const { error } = await supabase
    .from('support_messages')
    .update({ read: true })
    .eq('ticket_id', ticketId)
    .eq('sender_type', senderType)
    .eq('read', false);
  if (error) console.error('[markSupportMessagesRead]', error);
}
