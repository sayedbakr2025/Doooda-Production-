import { supabase } from './api';

export type CommunityCategory = 'general' | 'craft' | 'feedback' | 'publishing' | 'technical' | 'request_feedback';

export type ModerationStatus = 'published' | 'pending_review' | 'rejected';

export interface CommunityTopic {
  id: string;
  title: string;
  content: string;
  category: CommunityCategory;
  user_id: string;
  is_pinned: boolean;
  is_locked: boolean;
  replies_count: number;
  likes_count: number;
  hot_score: number;
  views_count: number;
  deleted_at: string | null;
  moderation_status: ModerationStatus;
  moderation_flags: Record<string, boolean> | null;
  created_at: string;
  updated_at: string;
  author?: { id: string; name: string | null; email: string };
}

export interface CommunityReply {
  id: string;
  topic_id: string;
  user_id: string;
  content: string;
  is_edited: boolean;
  likes_count: number;
  parent_reply_id: string | null;
  deleted_at: string | null;
  moderation_status: ModerationStatus;
  moderation_flags: Record<string, boolean> | null;
  created_at: string;
  updated_at: string;
  author?: { id: string; name: string | null; email: string };
}

export interface CommunityReport {
  id: string;
  reported_content_type: 'topic' | 'reply';
  reported_content_id: string;
  reporter_user_id: string;
  reason: string;
  resolved: boolean;
  admin_action: string | null;
  admin_note: string | null;
  resolved_at: string | null;
  created_at: string;
  reported_topic?: CommunityTopic | null;
  reported_reply?: CommunityReply | null;
  reporter?: { id: string; name: string | null; email: string } | null;
  content_author?: { id: string; name: string | null; email: string } | null;
}

export interface CommunityUserAction {
  id: string;
  user_id: string;
  admin_id: string;
  action_type: 'warn' | 'freeze' | 'unfreeze';
  reason: string;
  created_at: string;
}

export type ReputationLevel =
  | 'Beginner Writer'
  | 'Emerging Writer'
  | 'Active Contributor'
  | 'Community Pillar'
  | 'Master Storyteller';

export interface CommunityUserStats {
  user_id: string;
  points: number;
  badges_count: number;
  topics_created: number;
  replies_count: number;
  reputation_level: ReputationLevel;
  updated_at: string;
}

export interface AdminNotification {
  id: string;
  type: 'report' | 'warning' | 'info' | 'error';
  title: string;
  body: string;
  payload: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

async function enrichWithAuthors<T extends { user_id: string }>(
  items: T[]
): Promise<(T & { author?: { id: string; name: string | null; email: string } })[]> {
  if (items.length === 0) return items;
  const userIds = [...new Set(items.map((i) => i.user_id))];
  const { data: users } = await supabase
    .from('users')
    .select('id, name, email')
    .in('id', userIds);
  const userMap = Object.fromEntries((users || []).map((u) => [u.id, u]));
  return items.map((item) => ({
    ...item,
    author: userMap[item.user_id] || { id: item.user_id, name: null, email: '' },
  }));
}

export async function getTopics(options?: {
  category?: CommunityCategory | 'all';
  search?: string;
  limit?: number;
  offset?: number;
  includeDeleted?: boolean;
}): Promise<CommunityTopic[]> {
  let query = supabase
    .from('community_topics')
    .select('*')
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false });

  if (!options?.includeDeleted) {
    query = query.is('deleted_at', null);
  }

  if (options?.category && options.category !== 'all') {
    query = query.eq('category', options.category);
  }

  if (options?.search) {
    query = query.or(`title.ilike.%${options.search}%,content.ilike.%${options.search}%`);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, (options.offset + (options.limit ?? 20)) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return enrichWithAuthors(data || []);
}

export async function getTopicById(id: string): Promise<CommunityTopic | null> {
  const { data, error } = await supabase
    .from('community_topics')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const [enriched] = await enrichWithAuthors([data]);
  return enriched;
}

async function callModerationEdge(params: {
  content: string;
  content_type: 'reply' | 'topic';
  content_id: string;
  topic_category?: string;
  recent_user_posts?: string[];
}): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    const supabaseUrl = (supabase as unknown as { supabaseUrl: string }).supabaseUrl;
    await fetch(`${supabaseUrl}/functions/v1/moderate-content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });
  } catch {
  }
}

export async function createTopic(userId: string, payload: {
  title: string;
  content: string;
  category: CommunityCategory;
}): Promise<CommunityTopic> {
  const { data, error } = await supabase
    .from('community_topics')
    .insert({ ...payload, user_id: userId, moderation_status: 'pending_review' })
    .select()
    .single();
  if (error) throw error;
  callModerationEdge({
    content: `${payload.title}\n\n${payload.content}`,
    content_type: 'topic',
    content_id: data.id,
    topic_category: payload.category,
  });
  return data;
}

export async function updateTopic(id: string, updates: { title?: string; content?: string }): Promise<CommunityTopic> {
  const { data, error } = await supabase
    .from('community_topics')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function softDeleteTopic(id: string): Promise<void> {
  const { error } = await supabase
    .from('community_topics')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function restoreTopic(id: string): Promise<void> {
  const { error } = await supabase
    .from('community_topics')
    .update({ deleted_at: null })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteTopic(id: string): Promise<void> {
  const { error } = await supabase.from('community_topics').delete().eq('id', id);
  if (error) throw error;
}

export async function adminUpdateTopic(id: string, updates: {
  is_pinned?: boolean;
  is_locked?: boolean;
}): Promise<CommunityTopic> {
  const { data, error } = await supabase
    .from('community_topics')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getReplies(topicId: string, includeDeleted = false): Promise<CommunityReply[]> {
  let query = supabase
    .from('community_replies')
    .select('*')
    .eq('topic_id', topicId)
    .order('created_at', { ascending: true });

  if (!includeDeleted) {
    query = query.is('deleted_at', null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return enrichWithAuthors(data || []);
}

export async function createReply(
  userId: string,
  topicId: string,
  content: string,
  options?: { topicCategory?: string; recentUserPosts?: string[] }
): Promise<CommunityReply> {
  const { data, error } = await supabase
    .from('community_replies')
    .insert({ user_id: userId, topic_id: topicId, content, moderation_status: 'pending_review' })
    .select()
    .single();
  if (error) throw error;
  callModerationEdge({
    content,
    content_type: 'reply',
    content_id: data.id,
    topic_category: options?.topicCategory,
    recent_user_posts: options?.recentUserPosts,
  });
  return data;
}

export async function updateReply(id: string, content: string): Promise<CommunityReply> {
  const { data, error } = await supabase
    .from('community_replies')
    .update({ content, is_edited: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function softDeleteReply(id: string): Promise<void> {
  const { error } = await supabase
    .from('community_replies')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function restoreReply(id: string): Promise<void> {
  const { error } = await supabase
    .from('community_replies')
    .update({ deleted_at: null })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteReply(id: string): Promise<void> {
  const { error } = await supabase.from('community_replies').delete().eq('id', id);
  if (error) throw error;
}

export async function reportContent(
  reporterUserId: string,
  contentType: 'topic' | 'reply',
  contentId: string,
  reason: string
): Promise<void> {
  const { error } = await supabase.from('community_reports').insert({
    reporter_user_id: reporterUserId,
    reported_content_type: contentType,
    reported_content_id: contentId,
    reason,
  });
  if (error) throw error;
}

export async function getAllReports(options?: { resolved?: boolean }): Promise<CommunityReport[]> {
  let query = supabase
    .from('community_reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (options?.resolved !== undefined) {
    query = query.eq('resolved', options.resolved);
  }

  const { data, error } = await query;
  if (error) throw error;

  const reports: CommunityReport[] = data || [];

  const reporterIds = [...new Set(reports.map((r) => r.reporter_user_id).filter(Boolean))];
  const { data: reporters } = await supabase
    .from('users')
    .select('id, name, email')
    .in('id', reporterIds);
  const reporterMap = Object.fromEntries((reporters || []).map((u) => [u.id, u]));

  const topicIds = reports
    .filter((r) => r.reported_content_type === 'topic')
    .map((r) => r.reported_content_id);
  const replyIds = reports
    .filter((r) => r.reported_content_type === 'reply')
    .map((r) => r.reported_content_id);

  const [{ data: topicsData }, { data: repliesData }] = await Promise.all([
    topicIds.length > 0
      ? supabase.from('community_topics').select('*').in('id', topicIds)
      : Promise.resolve({ data: [] }),
    replyIds.length > 0
      ? supabase.from('community_replies').select('*').in('id', replyIds)
      : Promise.resolve({ data: [] }),
  ]);

  const topicMap = Object.fromEntries((topicsData || []).map((t) => [t.id, t]));
  const replyMap = Object.fromEntries((repliesData || []).map((r) => [r.id, r]));

  const contentAuthorIds: string[] = [];
  for (const t of topicsData || []) contentAuthorIds.push(t.user_id);
  for (const r of repliesData || []) contentAuthorIds.push(r.user_id);
  const uniqueAuthorIds = [...new Set(contentAuthorIds)];
  const { data: authorUsers } = await supabase
    .from('users')
    .select('id, name, email')
    .in('id', uniqueAuthorIds);
  const authorMap = Object.fromEntries((authorUsers || []).map((u) => [u.id, u]));

  return reports.map((report) => {
    const topic = report.reported_content_type === 'topic' ? topicMap[report.reported_content_id] || null : null;
    const reply = report.reported_content_type === 'reply' ? replyMap[report.reported_content_id] || null : null;
    const contentAuthorId = topic?.user_id || reply?.user_id;
    return {
      ...report,
      reporter: reporterMap[report.reporter_user_id] || null,
      reported_topic: topic,
      reported_reply: reply,
      content_author: contentAuthorId ? (authorMap[contentAuthorId] || null) : null,
    };
  });
}

export async function resolveReport(id: string, options?: {
  action?: string;
  note?: string;
}): Promise<void> {
  const { error } = await supabase
    .from('community_reports')
    .update({
      resolved: true,
      resolved_at: new Date().toISOString(),
      admin_action: options?.action || 'resolved',
      admin_note: options?.note || null,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function warnUser(adminId: string, userId: string, reason: string): Promise<void> {
  const { error: actionError } = await supabase.from('community_user_actions').insert({
    user_id: userId,
    admin_id: adminId,
    action_type: 'warn',
    reason,
  });
  if (actionError) throw actionError;

  const { error: updateError } = await supabase.rpc('increment_community_warnings', { target_user_id: userId });
  if (updateError) {
    await supabase
      .from('users')
      .update({ community_warnings_count: supabase.rpc('increment_community_warnings', { target_user_id: userId }) })
      .eq('id', userId);
  }
}

export async function freezeUser(adminId: string, userId: string, reason: string): Promise<void> {
  const { error: actionError } = await supabase.from('community_user_actions').insert({
    user_id: userId,
    admin_id: adminId,
    action_type: 'freeze',
    reason,
  });
  if (actionError) throw actionError;

  const { error: updateError } = await supabase
    .from('users')
    .update({ community_frozen_at: new Date().toISOString() })
    .eq('id', userId);
  if (updateError) throw updateError;
}

export async function unfreezeUser(adminId: string, userId: string): Promise<void> {
  const { error: actionError } = await supabase.from('community_user_actions').insert({
    user_id: userId,
    admin_id: adminId,
    action_type: 'unfreeze',
    reason: 'Account unfrozen by admin',
  });
  if (actionError) throw actionError;

  const { error: updateError } = await supabase
    .from('users')
    .update({ community_frozen_at: null })
    .eq('id', userId);
  if (updateError) throw updateError;
}

export async function getUserModerationHistory(userId: string): Promise<CommunityUserAction[]> {
  const { data, error } = await supabase
    .from('community_user_actions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getAdminNotifications(limit = 50): Promise<AdminNotification[]> {
  const { data, error } = await supabase
    .from('admin_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('admin_notifications')
    .update({ read: true })
    .eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from('admin_notifications')
    .update({ read: true })
    .eq('read', false);
  if (error) throw error;
}

export async function getUserStats(userId: string): Promise<CommunityUserStats | null> {
  const { data, error } = await supabase
    .from('community_user_stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getMultipleUserStats(userIds: string[]): Promise<Record<string, CommunityUserStats>> {
  if (userIds.length === 0) return {};
  const { data, error } = await supabase
    .from('community_user_stats')
    .select('*')
    .in('user_id', userIds);
  if (error) throw error;
  return Object.fromEntries((data || []).map((s) => [s.user_id, s]));
}

export async function getLeaderboard(limit = 20): Promise<CommunityUserStats[]> {
  const { data, error } = await supabase
    .from('community_user_stats')
    .select('*')
    .order('points', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getPendingContent(): Promise<{
  topics: CommunityTopic[];
  replies: (CommunityReply & { topic_title?: string })[];
}> {
  const [topicsRes, repliesRes] = await Promise.all([
    supabase
      .from('community_topics')
      .select('*')
      .eq('moderation_status', 'pending_review')
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('community_replies')
      .select('*, community_topics(title)')
      .eq('moderation_status', 'pending_review')
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
  ]);
  if (topicsRes.error) throw topicsRes.error;
  if (repliesRes.error) throw repliesRes.error;

  const topics = await enrichWithAuthors(topicsRes.data || []);
  const rawReplies = (repliesRes.data || []).map((r: CommunityReply & { community_topics?: { title: string } | null }) => ({
    ...r,
    topic_title: r.community_topics?.title || '',
  }));
  const replies = await enrichWithAuthors(rawReplies);
  return { topics, replies };
}

export async function setModerationStatus(
  table: 'community_topics' | 'community_replies',
  id: string,
  status: ModerationStatus
): Promise<void> {
  const { error } = await supabase
    .from(table)
    .update({ moderation_status: status })
    .eq('id', id);
  if (error) throw error;
}

export async function getTopicsCount(category?: CommunityCategory | 'all'): Promise<number> {
  let query = supabase
    .from('community_topics')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);
  if (category && category !== 'all') query = query.eq('category', category);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export interface CommunityRating {
  id: string;
  topic_id: string;
  user_id: string;
  score: number;
  created_at: string;
}

export interface CommunityFeedbackReply {
  id: string;
  reply_id: string | null;
  topic_id: string;
  user_id: string;
  structure_feedback: string;
  character_feedback: string;
  dialogue_feedback: string;
  overall_rating: number | null;
  created_at: string;
  author?: { id: string; name: string | null; email: string };
}

export async function getTopicRatings(topicId: string): Promise<CommunityRating[]> {
  const { data, error } = await supabase
    .from('community_ratings')
    .select('*')
    .eq('topic_id', topicId);
  if (error) throw error;
  return data || [];
}

export async function upsertRating(topicId: string, userId: string, score: number): Promise<CommunityRating> {
  const { data, error } = await supabase
    .from('community_ratings')
    .upsert({ topic_id: topicId, user_id: userId, score }, { onConflict: 'topic_id,user_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRating(topicId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('community_ratings')
    .delete()
    .eq('topic_id', topicId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function getTopicFeedbackReplies(topicId: string): Promise<CommunityFeedbackReply[]> {
  const { data, error } = await supabase
    .from('community_feedback_replies')
    .select('*')
    .eq('topic_id', topicId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  const items = data || [];
  return enrichWithAuthors(items);
}

export async function upsertFeedbackReply(
  topicId: string,
  userId: string,
  payload: {
    reply_id?: string;
    structure_feedback: string;
    character_feedback: string;
    dialogue_feedback: string;
    overall_rating: number | null;
  }
): Promise<CommunityFeedbackReply> {
  const { data, error } = await supabase
    .from('community_feedback_replies')
    .upsert(
      { topic_id: topicId, user_id: userId, ...payload },
      { onConflict: 'topic_id,user_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Likes ────────────────────────────────────────────────────────────────────

export async function toggleLike(
  userId: string,
  contentType: 'topic' | 'reply',
  contentId: string
): Promise<{ liked: boolean }> {
  const { data: existing } = await supabase
    .from('community_likes')
    .select('id')
    .eq('user_id', userId)
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .maybeSingle();

  if (existing) {
    await supabase.from('community_likes').delete().eq('id', existing.id);
    return { liked: false };
  } else {
    await supabase.from('community_likes').insert({ user_id: userId, content_type: contentType, content_id: contentId });
    return { liked: true };
  }
}

export async function getUserLikes(
  userId: string,
  contentType: 'topic' | 'reply',
  contentIds: string[]
): Promise<Set<string>> {
  if (contentIds.length === 0) return new Set();
  const { data } = await supabase
    .from('community_likes')
    .select('content_id')
    .eq('user_id', userId)
    .eq('content_type', contentType)
    .in('content_id', contentIds);
  return new Set((data || []).map((r) => r.content_id as string));
}

// ─── Hot topics ───────────────────────────────────────────────────────────────

export async function getHotTopics(limit = 5): Promise<CommunityTopic[]> {
  const { data, error } = await supabase
    .from('community_topics')
    .select('*')
    .is('deleted_at', null)
    .eq('moderation_status', 'published')
    .order('hot_score', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return enrichWithAuthors(data || []);
}

// ─── Most active writers ──────────────────────────────────────────────────────

export interface ActiveWriter {
  user_id: string;
  display_name: string;
  email: string;
  points: number;
  topics_created: number;
  replies_count: number;
  badges_count: number;
  reputation_level: ReputationLevel;
}

export async function getActiveWriters(): Promise<ActiveWriter[]> {
  const { data, error } = await supabase
    .from('community_active_writers')
    .select('*');
  if (error) throw error;
  return (data || []) as ActiveWriter[];
}

// ─── Nested reply ─────────────────────────────────────────────────────────────

export async function createNestedReply(
  userId: string,
  topicId: string,
  content: string,
  parentReplyId: string,
  options?: { topicCategory?: string; recentUserPosts?: string[] }
): Promise<CommunityReply> {
  const { data, error } = await supabase
    .from('community_replies')
    .insert({
      user_id: userId,
      topic_id: topicId,
      content,
      parent_reply_id: parentReplyId,
      moderation_status: 'pending_review',
    })
    .select()
    .single();
  if (error) throw error;
  callModerationEdge({
    content,
    content_type: 'reply',
    content_id: data.id,
    topic_category: options?.topicCategory,
    recent_user_posts: options?.recentUserPosts,
  });
  return data;
}
