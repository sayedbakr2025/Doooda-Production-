# Projects System Documentation

## Overview

The Projects System is the core workspace where writers create, manage, and organize their writing projects. This system implements strict plan-based limits, row-level security, and automatic progress tracking.

## Architecture

### Database Schema

#### Projects Table

```sql
projects (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  title text NOT NULL,
  project_type text CHECK (IN 'novel', 'short_story', 'long_story', 'book'),
  idea text,
  target_word_count integer,
  current_word_count integer DEFAULT 0,
  progress_percentage integer DEFAULT 0,
  last_accessed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz
)
```

**Key Features:**
- Automatic word count calculation from chapters
- Automatic progress percentage calculation
- Soft delete support for data recovery
- Last accessed tracking for "continue where you left off"
- Automatic timestamp updates on modification

#### Chapters Table

```sql
chapters (
  id uuid PRIMARY KEY,
  project_id uuid REFERENCES projects(id),
  chapter_number integer CHECK (> 0),
  title text NOT NULL,
  content text DEFAULT '',
  word_count integer DEFAULT 0,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz
)
```

**Key Features:**
- Automatic word count calculation on content update
- Unique constraint on (project_id, chapter_number) for active chapters
- Cascading updates to project word count
- Soft delete support

### Row-Level Security

#### Writers Access
- Can only view their own non-deleted projects
- Can create projects (server validates limits)
- Can update their own projects
- Can soft-delete their own projects
- Can only access chapters from their own projects

#### Admin Access
- Can view all projects including deleted ones
- Full audit trail access
- No modification of writer data without explicit action

### Plan-Based Limits

#### Free Plan
```json
{
  "maxProjects": 1,
  "maxChapters": 4,
  "hasMarketingFeatures": false
}
```

#### Paid Plans
Limits are defined in the `price_versions.features` JSON field:
```json
{
  "maxProjects": null,  // null = unlimited
  "maxChapters": null,
  "hasMarketingFeatures": true
}
```

## API Endpoints

### Projects Endpoints

#### POST /projects
Create a new project.

**Request:**
```json
{
  "title": "My Novel",
  "projectType": "novel",
  "idea": "A story about...",
  "targetWordCount": 50000
}
```

**Response (Success):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "title": "My Novel",
  "projectType": "novel",
  "idea": "A story about...",
  "targetWordCount": 50000,
  "currentWordCount": 0,
  "progressPercentage": 0,
  "createdAt": "2026-01-07T...",
  "updatedAt": "2026-01-07T...",
  "lastAccessedAt": "2026-01-07T..."
}
```

**Response (Limit Reached):**
```json
{
  "statusCode": 403,
  "message": "Project limit reached for your plan",
  "reason": "project_limit_reached",
  "currentCount": 1,
  "limit": 1
}
```

#### GET /projects
List all projects for the authenticated user.

**Query Parameters:**
- `page` (optional, default: 1)
- `limit` (optional, default: 50, max: 100)

**Response:**
```json
{
  "projects": [
    {
      "id": "uuid",
      "title": "My Novel",
      "projectType": "novel",
      "progressPercentage": 45,
      "currentWordCount": 22500,
      "targetWordCount": 50000,
      "updatedAt": "2026-01-07T..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 3,
    "totalPages": 1
  }
}
```

#### GET /projects/stats
Get dashboard statistics.

**Response:**
```json
{
  "activeProjectCount": 3,
  "totalWordCount": 75000,
  "limits": {
    "maxProjects": null,
    "maxChapters": null,
    "hasMarketingFeatures": true
  }
}
```

#### GET /projects/can-create
Check if user can create more projects.

**Response (Can Create):**
```json
{
  "allowed": true,
  "currentCount": 2,
  "limit": null
}
```

**Response (Cannot Create):**
```json
{
  "allowed": false,
  "reason": "project_limit_reached",
  "currentCount": 1,
  "limit": 1
}
```

#### GET /projects/:id
Get single project details with chapters.

**Response:**
```json
{
  "id": "uuid",
  "title": "My Novel",
  "projectType": "novel",
  "idea": "A story about...",
  "targetWordCount": 50000,
  "currentWordCount": 22500,
  "progressPercentage": 45,
  "chapters": [
    {
      "id": "uuid",
      "chapterNumber": 1,
      "title": "Chapter One",
      "wordCount": 2500,
      "createdAt": "2026-01-07T...",
      "updatedAt": "2026-01-07T..."
    }
  ],
  "createdAt": "2026-01-05T...",
  "updatedAt": "2026-01-07T...",
  "lastAccessedAt": "2026-01-07T..."
}
```

#### PATCH /projects/:id
Update project details.

**Request:**
```json
{
  "title": "My Updated Novel",
  "targetWordCount": 60000
}
```

**Response:**
```json
{
  "id": "uuid",
  "title": "My Updated Novel",
  "targetWordCount": 60000,
  "progressPercentage": 37,
  "updatedAt": "2026-01-07T..."
}
```

#### DELETE /projects/:id
Soft-delete a project.

**Response:**
```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

#### POST /projects/:id/restore
Restore a soft-deleted project.

**Response (Success):**
```json
{
  "success": true,
  "message": "Project restored successfully"
}
```

**Response (Limit Reached):**
```json
{
  "statusCode": 403,
  "message": "Cannot restore project: limit reached for your plan",
  "reason": "project_limit_reached",
  "currentCount": 1,
  "limit": 1
}
```

### Chapters Endpoints

#### POST /chapters
Create a new chapter in a project.

**Request:**
```json
{
  "projectId": "uuid",
  "title": "Chapter One",
  "content": "It was a dark and stormy night..."
}
```

**Response (Success):**
```json
{
  "id": "uuid",
  "projectId": "uuid",
  "chapterNumber": 1,
  "title": "Chapter One",
  "content": "It was a dark and stormy night...",
  "wordCount": 7,
  "createdAt": "2026-01-07T...",
  "updatedAt": "2026-01-07T..."
}
```

**Response (Limit Reached):**
```json
{
  "statusCode": 403,
  "message": "Chapter limit reached for your plan",
  "reason": "chapter_limit_reached",
  "currentCount": 4,
  "limit": 4
}
```

#### GET /chapters/project/:projectId
List all chapters in a project.

**Response:**
```json
[
  {
    "id": "uuid",
    "chapterNumber": 1,
    "title": "Chapter One",
    "content": "...",
    "wordCount": 2500,
    "createdAt": "2026-01-07T...",
    "updatedAt": "2026-01-07T..."
  }
]
```

#### GET /chapters/project/:projectId/can-create
Check if user can create more chapters in this project.

**Response:**
```json
{
  "allowed": true,
  "currentCount": 2,
  "limit": 4
}
```

#### GET /chapters/:id
Get single chapter details.

**Response:**
```json
{
  "id": "uuid",
  "projectId": "uuid",
  "chapterNumber": 1,
  "title": "Chapter One",
  "content": "It was a dark and stormy night...",
  "wordCount": 7,
  "project": {
    "id": "uuid",
    "userId": "uuid",
    "title": "My Novel"
  },
  "createdAt": "2026-01-07T...",
  "updatedAt": "2026-01-07T..."
}
```

#### PATCH /chapters/:id
Update chapter content or title.

**Request:**
```json
{
  "title": "The Beginning",
  "content": "Updated content..."
}
```

**Response:**
```json
{
  "id": "uuid",
  "title": "The Beginning",
  "content": "Updated content...",
  "wordCount": 2,
  "updatedAt": "2026-01-07T..."
}
```

#### DELETE /chapters/:id
Soft-delete a chapter.

**Response:**
```json
{
  "success": true,
  "message": "Chapter deleted successfully"
}
```

#### POST /chapters/project/:projectId/reorder
Reorder chapters within a project.

**Request:**
```json
{
  "chapterIds": ["uuid-3", "uuid-1", "uuid-2"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Chapters reordered successfully"
}
```

## Service Logic

### ProjectsService

#### Plan Limit Enforcement

```typescript
async canCreateProject(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  currentCount?: number;
  limit?: number;
}>
```

**Algorithm:**
1. Fetch user's active subscription
2. If no subscription, apply FREE plan limits (1 project, 4 chapters)
3. Extract `maxProjects` from `priceVersion.features`
4. If `maxProjects` is `null`, allow unlimited projects
5. Count user's active projects (deleted_at IS NULL)
6. If count >= limit, return `allowed: false`
7. Otherwise, return `allowed: true`

#### Progress Calculation

Progress is calculated automatically via database trigger when chapters are updated:

```sql
progress_percentage = MIN(100, (current_word_count * 100 / target_word_count))
```

If `target_word_count` is NULL, progress remains 0.

#### Last Accessed Tracking

Every time a project is opened via `GET /projects/:id`, the `last_accessed_at` field is updated to `now()`. This enables:
- "Continue where you left off" functionality
- Most recently accessed projects appear first
- Usage analytics

### ChaptersService

#### Automatic Chapter Numbering

When creating a chapter:
1. Query for max chapter_number in the project (deleted_at IS NULL)
2. Assign `nextChapterNumber = max + 1`
3. Ensures sequential numbering even after deletions

#### Word Count Calculation

Word count is calculated via database trigger on INSERT/UPDATE:

```sql
word_count = array_length(regexp_split_to_array(trim(content), '\s+'), 1)
```

This triggers a cascade:
1. Chapter word count updated
2. Project `current_word_count` recalculated from SUM of all chapter word counts
3. Project `progress_percentage` recalculated

## Security Considerations

### Data Isolation
- All queries filter by `user_id` via RLS policies
- No project data ever leaks between users
- Admins require explicit elevated queries to view all projects

### Plan Limit Bypass Prevention
- Limits are ALWAYS checked server-side
- Frontend checks are for UX only, never trusted
- Attempting to exceed limits returns 403 Forbidden
- Restore operations also check limits

### Soft Delete Safety
- Projects and chapters use `deleted_at` field
- Deleted data remains in database for recovery
- RLS policies exclude soft-deleted data from normal queries
- Admins can view deleted data for audit purposes

### Input Validation
- Title cannot be empty after trim
- Target word count must be > 0 if provided
- Project type must be one of: novel, short_story, long_story, book
- Chapter number must be > 0

### Authorization Checks
- Project ownership verified on every operation
- Chapter access requires project ownership verification
- No direct chapter access without project ownership check

## Progress Bar Color Logic

```javascript
function getProgressColor(progressPercentage) {
  if (progressPercentage < 30) return 'red';
  if (progressPercentage <= 60) return 'yellow';
  return 'green';
}
```

## Dashboard Implementation Guide

### Step 1: Fetch Dashboard Stats

```javascript
GET /projects/stats

Response:
{
  "activeProjectCount": 3,
  "totalWordCount": 75000,
  "limits": {
    "maxProjects": null,
    "maxChapters": 10,
    "hasMarketingFeatures": true
  }
}
```

### Step 2: Fetch Projects List

```javascript
GET /projects?page=1&limit=50

Response:
{
  "projects": [...],
  "pagination": {...}
}
```

### Step 3: Display Projects as Cards

Each card shows:
- Project title
- Project type badge (novel, short story, etc.)
- Progress bar (colored by percentage)
- Last updated date

### Step 4: Hover Tooltip

After hovering for 3 seconds, show tooltip with:
- Project idea/description
- Adaptive size based on content length
- Disappears immediately on mouse leave

### Step 5: Create Project Flow

1. Check if user can create: `GET /projects/can-create`
2. If allowed, show modal
3. On submit: `POST /projects`
4. On success:
   - Show celebration message (auto-dismiss after 3s)
   - Close modal
   - Refresh projects list

If limit reached:
- Show friendly message: "You've reached your plan limit. Upgrade to create more projects."
- Provide upgrade button (if applicable)

## Automatic Calculations

### Word Count Flow

```
User types in chapter content
  ↓
Frontend saves chapter: PATCH /chapters/:id
  ↓
Database trigger: calculate_chapter_word_count()
  ↓
Chapter word_count updated
  ↓
Database trigger: update_project_word_count()
  ↓
Project current_word_count = SUM(all chapter word counts)
  ↓
Project progress_percentage calculated
  ↓
Frontend refreshes project data
  ↓
Progress bar updates automatically
```

### Progress Percentage Formula

```
IF target_word_count IS NULL THEN
  progress_percentage = 0
ELSE
  progress_percentage = MIN(100, FLOOR((current_word_count * 100) / target_word_count))
END IF
```

## Error Handling

### Project Not Found
```json
{
  "statusCode": 404,
  "message": "Project not found"
}
```

### Access Denied
```json
{
  "statusCode": 403,
  "message": "Access denied"
}
```

### Validation Error
```json
{
  "statusCode": 400,
  "message": "Project title is required"
}
```

### Plan Limit Error
```json
{
  "statusCode": 403,
  "message": "Project limit reached for your plan",
  "reason": "project_limit_reached",
  "currentCount": 1,
  "limit": 1
}
```

## Performance Considerations

### Indexes
- `idx_projects_user_id` - Fast project listing per user
- `idx_projects_updated_at` - Fast ordering by last modified
- `idx_projects_user_active` - Composite index for active project queries
- `idx_chapters_project_id` - Fast chapter listing per project
- `idx_chapters_project_number` - Fast chapter ordering

### Pagination
- Default: 50 projects per page
- Maximum: 100 projects per page
- Use offset/limit pattern for large datasets

### Query Optimization
- Select only needed fields in list views
- Use `include` for related data in detail views
- Aggregate queries for stats use efficient SUM/COUNT

## Testing Scenarios

### Scenario 1: Free User Creates First Project
1. User signs up with FREE plan
2. Creates project: SUCCESS
3. Attempts to create second project: 403 FORBIDDEN
4. Message shows upgrade prompt

### Scenario 2: Paid User Creates Multiple Projects
1. User subscribes to STANDARD plan
2. Creates 5 projects: ALL SUCCESS
3. No limit enforcement (maxProjects: null)

### Scenario 3: Free User Creates Chapters
1. User has 1 project
2. Creates 4 chapters: ALL SUCCESS
3. Attempts to create 5th chapter: 403 FORBIDDEN
4. Message shows chapter limit reached

### Scenario 4: Progress Tracking
1. User creates project with target_word_count: 10000
2. Creates chapter with 1000 words
3. Progress bar shows 10% (red)
4. Creates another chapter with 4000 words
5. Progress bar shows 50% (yellow)
6. Creates another chapter with 5000 words
7. Progress bar shows 100% (green)

### Scenario 5: Soft Delete and Restore
1. User deletes project
2. Project count: 0 (limit check passes)
3. User creates new project: SUCCESS
4. User attempts to restore old project: 403 FORBIDDEN (limit reached)
5. User deletes current project
6. User restores old project: SUCCESS

## Integration Points

### With Subscription System
- Projects service queries active subscription
- Extracts plan features from `price_versions.features`
- Enforces limits based on plan

### With Admin Panel
- Admins can view all projects (RLS policy)
- Admins can see deleted projects
- Audit logs track all project operations

### With Message Templates
- Project creation success: template key `project_created`
- Limit reached: template key `project_limit_reached`
- Chapter limit reached: template key `chapter_limit_reached`

## Future Enhancements

### Phase 2 Features
- Project templates (novel structure, short story arc)
- Collaboration (multi-user projects)
- Version history (track changes)
- Export (PDF, EPUB, DOCX)

### Phase 3 Features
- AI-powered suggestions (Ask Doooda integration)
- Publishing integration (send to publishers)
- Marketing materials generation
- Analytics dashboard (writing patterns, productivity)

## Conclusion

The Projects System provides a secure, scalable, and user-friendly workspace for writers. It enforces plan limits strictly, tracks progress automatically, and maintains data integrity through row-level security and soft deletes.

All operations are optimized for performance, all data is isolated by user, and all limits are enforced server-side. The system is ready for production use and can scale to thousands of concurrent writers without performance degradation.
