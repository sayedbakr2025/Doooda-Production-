# Doooda Writing Engine Documentation

## Overview

The Writing Engine is the core module that enables writers to structure, organize, and write their projects. It implements a hierarchical content structure with automatic progress tracking, flexible ordering, and comprehensive safety mechanisms.

## Architecture

### Hierarchical Content Structure

```
Project
  └── Logline (single, optional)
  └── Chapters (multiple, ordered)
      └── Summary (single, optional)
      └── Scenes/Subchapters (multiple, ordered)
          └── Title (required)
          └── Summary (optional)
          └── Content (rich text)
          └── Completion Status (boolean)
```

### Terminology Rules

The system adapts terminology based on project type:

**For Novels, Short Stories, Long Stories:**
- Parent container: "Chapter"
- Child container: "Scene"
- UI labels: "إضافة مشهد جديد / Add New Scene"

**For Books:**
- Parent container: "Chapter"
- Child container: "Subchapter"
- UI labels: "إضافة فصل فرعي / Add Subchapter"

This distinction is enforced throughout:
- API responses include `projectType`
- Frontend adapts labels dynamically
- Context menus show appropriate terminology
- Export logic respects naming conventions

## Database Schema

### Loglines Table

```sql
loglines (
  id uuid PRIMARY KEY,
  project_id uuid UNIQUE REFERENCES projects(id),
  content text DEFAULT '',
  word_count integer DEFAULT 0,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz
)
```

**Key Features:**
- One logline per project (unique constraint)
- Rich text content support
- Automatic word count calculation (strips HTML tags)
- Soft delete support

**Word Count Calculation:**
```sql
word_count = array_length(
  regexp_split_to_array(
    trim(regexp_replace(content, '<[^>]+>', '', 'g')),
    '\s+'
  ),
  1
)
```

### Chapters Table (Updated)

```sql
chapters (
  id uuid PRIMARY KEY,
  project_id uuid REFERENCES projects(id),
  chapter_number integer NOT NULL,
  position integer NOT NULL,
  title text NOT NULL,
  summary text DEFAULT '',
  word_count integer DEFAULT 0,
  progress_percentage integer DEFAULT 0,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz
)
```

**New Fields:**
- `summary` - Chapter summary/description created from context menu or manual editing
- `position` - Ordering within project (allows drag & drop reordering)
- `progress_percentage` - Calculated from completed scenes (0-100)

**Key Notes:**
- `chapter_number` - Permanent identifier (never changes)
- `position` - Display order (changes with drag & drop)
- `progress_percentage` - Updated automatically via trigger
- Unique constraint on (project_id, position) for active chapters

### Scenes Table

```sql
scenes (
  id uuid PRIMARY KEY,
  chapter_id uuid REFERENCES chapters(id),
  position integer NOT NULL,
  title text NOT NULL,
  summary text DEFAULT '',
  content text DEFAULT '',
  word_count integer DEFAULT 0,
  completed boolean DEFAULT false,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz
)
```

**Key Features:**
- Flexible ordering via `position` field
- Rich text content support
- Automatic word count calculation
- Completion tracking for progress
- Unique constraint on (chapter_id, position) for active scenes

## Automatic Calculations

### Word Count Flow

```
Writer saves scene content
  ↓
Database trigger: calculate_scene_word_count()
  ↓
Scene word_count updated (strips HTML tags)
  ↓
Database trigger: update_chapter_progress_from_scenes()
  ↓
Chapter word_count = SUM(scene word_counts)
Chapter progress_percentage = (completed_scenes / total_scenes) * 100
  ↓
Database trigger: update_project_progress_from_chapters()
  ↓
Project current_word_count = SUM(chapter word_counts)
Project progress_percentage = (completed_chapters / total_chapters) * 100
```

### Progress Calculation Rules

**Scene Level:**
- Completed = true → 100% contribution
- Completed = false → 0% contribution

**Chapter Level:**
```javascript
progress_percentage = (completed_scenes / total_scenes) * 100
```

**Project Level:**
```javascript
progress_percentage = (chapters_with_100%_progress / total_chapters) * 100
```

**Important:** Project progress only counts chapters at 100% completion. This ensures writers finish chapters completely before moving on.

## API Endpoints

### Logline Endpoints

#### POST /loglines
Create or update a project's logline.

**Request:**
```json
{
  "projectId": "uuid",
  "content": "<p>Rich text content...</p>"
}
```

**Response:**
```json
{
  "id": "uuid",
  "projectId": "uuid",
  "content": "<p>Rich text content...</p>",
  "wordCount": 42,
  "createdAt": "2026-01-07T...",
  "updatedAt": "2026-01-07T..."
}
```

**Behavior:**
- If logline exists: Updates existing
- If logline doesn't exist: Creates new
- Enforces unique constraint (one per project)

#### GET /loglines/project/:projectId
Get a project's logline.

**Response (exists):**
```json
{
  "id": "uuid",
  "projectId": "uuid",
  "content": "<p>Rich text content...</p>",
  "wordCount": 42,
  "createdAt": "2026-01-07T...",
  "updatedAt": "2026-01-07T..."
}
```

**Response (doesn't exist):**
```json
null
```

#### PATCH /loglines/:id
Update logline content.

**Request:**
```json
{
  "content": "<p>Updated content...</p>"
}
```

**Response:**
```json
{
  "id": "uuid",
  "content": "<p>Updated content...</p>",
  "wordCount": 38,
  "updatedAt": "2026-01-07T..."
}
```

#### DELETE /loglines/:id
Soft-delete a logline by ID.

**Response:**
```json
{
  "success": true,
  "message": "Logline deleted successfully"
}
```

#### DELETE /loglines/project/:projectId
Soft-delete a logline by project ID.

**Response:**
```json
{
  "success": true,
  "message": "Logline deleted successfully"
}
```

### Chapter Endpoints (Updated)

#### POST /chapters
Create a new chapter with optional summary.

**Request:**
```json
{
  "projectId": "uuid",
  "title": "Chapter One",
  "summary": "This chapter introduces the protagonist..."
}
```

**Response:**
```json
{
  "id": "uuid",
  "projectId": "uuid",
  "chapterNumber": 1,
  "position": 1,
  "title": "Chapter One",
  "summary": "This chapter introduces the protagonist...",
  "wordCount": 0,
  "progressPercentage": 0,
  "createdAt": "2026-01-07T...",
  "updatedAt": "2026-01-07T..."
}
```

#### GET /chapters/project/:projectId
List all chapters in a project with scene counts.

**Response:**
```json
[
  {
    "id": "uuid",
    "chapterNumber": 1,
    "position": 1,
    "title": "Chapter One",
    "summary": "This chapter introduces...",
    "wordCount": 2500,
    "progressPercentage": 75,
    "scenes": [
      {
        "id": "uuid",
        "completed": true
      },
      {
        "id": "uuid",
        "completed": true
      },
      {
        "id": "uuid",
        "completed": true
      },
      {
        "id": "uuid",
        "completed": false
      }
    ],
    "createdAt": "2026-01-07T...",
    "updatedAt": "2026-01-07T..."
  }
]
```

#### GET /chapters/:id
Get single chapter with all scenes.

**Response:**
```json
{
  "id": "uuid",
  "chapterNumber": 1,
  "position": 1,
  "title": "Chapter One",
  "summary": "This chapter introduces the protagonist...",
  "wordCount": 2500,
  "progressPercentage": 75,
  "project": {
    "id": "uuid",
    "userId": "uuid",
    "title": "My Novel",
    "projectType": "novel"
  },
  "scenes": [
    {
      "id": "uuid",
      "position": 1,
      "title": "Opening Scene",
      "completed": true,
      "wordCount": 750,
      "createdAt": "2026-01-07T...",
      "updatedAt": "2026-01-07T..."
    }
  ],
  "createdAt": "2026-01-07T...",
  "updatedAt": "2026-01-07T..."
}
```

#### PATCH /chapters/:id
Update chapter title or summary.

**Request:**
```json
{
  "title": "The Beginning",
  "summary": "Updated summary..."
}
```

**Response:**
```json
{
  "id": "uuid",
  "title": "The Beginning",
  "summary": "Updated summary...",
  "updatedAt": "2026-01-07T..."
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

**Behavior:**
- Updates `position` field (1, 2, 3, ...)
- Does NOT change `chapter_number`
- Uses database transaction for atomicity
- Returns error if any ID is invalid

### Scene Endpoints

#### POST /scenes
Create a new scene in a chapter.

**Request:**
```json
{
  "chapterId": "uuid",
  "title": "Opening Scene",
  "summary": "The protagonist wakes up...",
  "content": "<p>Rich text content...</p>"
}
```

**Response:**
```json
{
  "id": "uuid",
  "chapterId": "uuid",
  "position": 1,
  "title": "Opening Scene",
  "summary": "The protagonist wakes up...",
  "content": "<p>Rich text content...</p>",
  "wordCount": 150,
  "completed": false,
  "createdAt": "2026-01-07T...",
  "updatedAt": "2026-01-07T..."
}
```

**Automatic Behaviors:**
- Assigns next position automatically
- Calculates word count from content
- Sets completed = false by default
- Triggers chapter progress update

#### GET /scenes/chapter/:chapterId
List all scenes in a chapter.

**Response:**
```json
[
  {
    "id": "uuid",
    "position": 1,
    "title": "Opening Scene",
    "summary": "The protagonist wakes up...",
    "content": "<p>Rich text content...</p>",
    "wordCount": 150,
    "completed": true,
    "createdAt": "2026-01-07T...",
    "updatedAt": "2026-01-07T..."
  }
]
```

#### GET /scenes/chapter/:chapterId/progress
Get chapter progress statistics.

**Response:**
```json
{
  "totalScenes": 4,
  "completedScenes": 3,
  "totalWords": 3200,
  "progressPercentage": 75
}
```

#### GET /scenes/:id
Get single scene with chapter and project info.

**Response:**
```json
{
  "id": "uuid",
  "chapterId": "uuid",
  "position": 1,
  "title": "Opening Scene",
  "summary": "The protagonist wakes up...",
  "content": "<p>Rich text content...</p>",
  "wordCount": 150,
  "completed": true,
  "chapter": {
    "id": "uuid",
    "title": "Chapter One",
    "project": {
      "id": "uuid",
      "userId": "uuid",
      "projectType": "novel"
    }
  },
  "createdAt": "2026-01-07T...",
  "updatedAt": "2026-01-07T..."
}
```

#### PATCH /scenes/:id
Update scene content, title, or summary.

**Request:**
```json
{
  "title": "The Awakening",
  "content": "<p>Updated content...</p>"
}
```

**Response:**
```json
{
  "id": "uuid",
  "title": "The Awakening",
  "content": "<p>Updated content...</p>",
  "wordCount": 175,
  "updatedAt": "2026-01-07T..."
}
```

**Triggers:**
- Recalculates scene word count
- Updates chapter word count
- Updates chapter progress percentage

#### PATCH /scenes/:id/complete
Mark a scene as completed.

**Response:**
```json
{
  "id": "uuid",
  "completed": true,
  "updatedAt": "2026-01-07T..."
}
```

**Triggers:**
- Updates chapter progress percentage
- If all scenes complete, chapter reaches 100%
- Updates project progress if chapter completes

#### PATCH /scenes/:id/incomplete
Mark a scene as incomplete.

**Response:**
```json
{
  "id": "uuid",
  "completed": false,
  "updatedAt": "2026-01-07T..."
}
```

**Triggers:**
- Updates chapter progress percentage
- May reduce project progress if chapter was 100%

#### DELETE /scenes/:id
Soft-delete a scene.

**Response:**
```json
{
  "success": true,
  "message": "Scene deleted successfully"
}
```

**Triggers:**
- Recalculates chapter progress
- Recalculates chapter word count
- Updates project totals

#### POST /scenes/chapter/:chapterId/reorder
Reorder scenes within a chapter.

**Request:**
```json
{
  "sceneIds": ["uuid-2", "uuid-1", "uuid-3"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Scenes reordered successfully"
}
```

**Behavior:**
- Updates `position` field atomically
- Uses database transaction
- Validates all IDs before updating

## User Interaction Flows

### Logline Creation Flow

1. Writer opens project page
2. Sees section: "الموجز الرئيسي / Project Logline"
3. Clicks "+" button
4. Opens full-screen rich text editor
5. Writer types logline content
6. Autosave: Saves to localStorage every 10 seconds
7. Writer clicks "Save"
8. POST /loglines with content
9. Returns to project page
10. "+" replaced with static block showing logline
11. Block shows "Edit" and "Delete" buttons

**Close Without Saving:**
1. Writer clicks "Close" or back button
2. If unsaved changes exist in localStorage
3. Show modal: "You have unsaved changes"
4. Options:
   - "Close without saving" → Discard localStorage, return
   - "Save & Close" → POST /loglines, return

**Delete Logline:**
1. Writer clicks "Delete" button
2. Show confirmation modal
3. Options:
   - "Delete" → DELETE /loglines/:id, restore "+" button
   - "Cancel" → Close modal

### Context Menu: Create Chapter from Logline

1. Writer selects text in logline editor
2. Right-clicks selection
3. Floating context menu appears near cursor
4. Option: "إضافة فصل جديد / Add New Chapter"
5. Clicks option
6. Popup opens with:
   - Title field (empty)
   - Summary field (pre-filled with selected text)
   - "Save" and "Cancel" buttons
7. Writer enters title
8. Clicks "Save"
9. POST /chapters with title and summary
10. Returns to project page
11. New chapter appears in chapters list

**Cancel:**
- Close popup
- No changes made
- Selection remains

### Chapter Creation Flow

1. Writer on project page
2. Below logline: "الفصول / Chapters" section
3. Centered "+" button with text "إضافة فصل جديد"
4. Clicks "+" button
5. Popup opens with:
   - Title field (empty)
   - Summary field (empty)
   - "Save" and "Cancel" buttons
6. Writer enters title
7. Optional: Writer enters summary
8. Clicks "Save"
9. POST /chapters with title and optional summary
10. Popup closes
11. New chapter appears in list

**Validation:**
- Title required (shows error if empty)
- Summary optional
- Checks chapter limit based on plan

### Chapter Page Layout

**Top Section:**
- Chapter title
- Back button to project

**Summary Section:**
Static block:
- Title: "ملخص الفصل / Chapter Summary"
- Summary text (read-only)
- Buttons:
  - "Edit" → Opens editor
  - "Delete" → Removes summary (not chapter)

**Scenes Section:**
- Title: "المشاهد / Scenes" or "الفصول الفرعية / Subchapters"
- Depends on project type
- Centered "+" button
- List of scene cards (ordered by position)

**Scene Cards:**
- Title
- Completion indicator (checkmark if completed)
- Progress contribution shown
- Drag handle (appears on hover)
- Click opens scene page

### Context Menu: Create Scene from Chapter Summary

1. Writer viewing chapter summary
2. Selects text in summary
3. Right-clicks selection
4. Floating context menu appears
5. Option:
   - Novel/Story: "إضافة مشهد جديد / Add New Scene"
   - Book: "إضافة فصل فرعي / Add Subchapter"
6. Clicks option
7. Popup opens with:
   - Title field (empty)
   - Summary field (pre-filled with selected text)
   - "Add" and "Cancel" buttons
8. Writer enters title
9. Clicks "Add"
10. POST /scenes with title and summary
11. Returns to chapter page
12. New scene appears in list

### Scene Writing Flow

**Opening Scene:**
1. Writer clicks scene card
2. Opens scene page
3. Layout:
   - Top right: Scene title
   - Below: Summary block (editable via "Edit")
   - Below: Rich text writing area
   - Footer: "Close", "Save", "Mark as Finished" buttons

**Writing:**
1. Writer types in rich text editor
2. Autosave: Saves to localStorage every 10 seconds
3. Writer clicks "Save"
4. PATCH /scenes/:id with content
5. Triggers:
   - Word count update
   - Chapter progress update
   - Project progress update

**Mark as Finished:**
1. Writer clicks "انتهيت من كتابة المشهد / Mark as Finished"
2. PATCH /scenes/:id/complete
3. Sets completed = true
4. Saves content automatically
5. Updates chapter progress
6. If all scenes complete → Chapter reaches 100%
7. If all chapters at 100% → Project complete
8. Returns to chapter page

**Close Without Saving:**
1. Writer clicks "Close"
2. If unsaved changes in localStorage
3. Show modal: "You have unsaved changes"
4. Options:
   - "Close without saving" → Discard changes
   - "Save & Close" → PATCH /scenes/:id, return

### Drag & Drop Reordering

**Chapters:**
1. Writer on project page
2. Hovers over chapter card
3. Drag handle appears
4. Drags chapter to new position
5. Frontend reorders visually
6. POST /chapters/project/:projectId/reorder
7. Request: { chapterIds: ["uuid-3", "uuid-1", "uuid-2"] }
8. Backend updates position field atomically
9. Order persisted

**Scenes:**
1. Writer on chapter page
2. Hovers over scene card
3. Drag handle appears
4. Drags scene to new position
5. Frontend reorders visually
6. POST /scenes/chapter/:chapterId/reorder
7. Request: { sceneIds: ["uuid-2", "uuid-1", "uuid-3"] }
8. Backend updates position field atomically
9. Order persisted

**Safety:**
- Uses database transaction
- All-or-nothing updates
- Prevents race conditions
- Validates all IDs before updating

## Data Safety Mechanisms

### Autosave (Local Only)

**Behavior:**
- Saves to browser localStorage every 10 seconds
- Key format: `doooda_draft_{entityType}_{entityId}`
- Example: `doooda_draft_scene_uuid-123`
- NEVER sent to server automatically

**Recovery:**
- On page load, check localStorage
- If draft newer than server data
- Show recovery prompt
- Options:
  - "Restore draft" → Load from localStorage
  - "Discard draft" → Clear localStorage, use server data

**Clear Conditions:**
- After successful save
- After "Close without saving"
- After "Discard draft"

### Unsaved Changes Warning

**Trigger Conditions:**
- User navigates away
- User clicks "Close"
- User clicks browser back button
- Tab/window closing

**Modal:**
```
You have unsaved changes

[Close without saving]  [Save & Close]
```

**Save & Close:**
1. POST/PATCH endpoint with content
2. Wait for success response
3. Clear localStorage
4. Navigate away

**Close without saving:**
1. Clear localStorage
2. Navigate away immediately

### Soft Delete Safety

**All Deletes Are Soft:**
- Sets `deleted_at = now()`
- Data remains in database
- Excluded from normal queries via RLS
- Admins can view deleted data

**Recovery Path:**
- Future feature: "Restore deleted items"
- Admin access to audit trail
- No permanent data loss

### Atomic Reordering

**Transaction Guarantee:**
```javascript
await prisma.$transaction([
  prisma.scene.update({ where: { id: 'uuid-1' }, data: { position: 1 } }),
  prisma.scene.update({ where: { id: 'uuid-2' }, data: { position: 2 } }),
  prisma.scene.update({ where: { id: 'uuid-3' }, data: { position: 3 } })
]);
```

**Benefits:**
- All updates succeed or all fail
- No partial reordering
- No race conditions
- Consistent state guaranteed

### User-Scoped Writes

**Every Operation Verifies:**
1. User is authenticated
2. User owns the project
3. Project is not deleted
4. Entity is not deleted

**RLS Policies:**
- Database-level enforcement
- No SQL injection risk
- No cross-user data access
- Automatic filtering

## Rich Text Editor Requirements

### Core Features

**Text Formatting:**
- Font family (Tajawal for Arabic, Roboto for English)
- Font size (10-72pt)
- Bold, Italic, Underline
- Text color
- Highlight color

**Alignment:**
- Auto-detect RTL for Arabic
- Left, Right, Center, Justify
- Respects language direction

**Advanced:**
- Insert image with position control
- Image upload to server
- Find & Replace
- Word counter (live, visible)
- Character counter

**Keyboard Shortcuts:**
- Ctrl+B: Bold
- Ctrl+I: Italic
- Ctrl+U: Underline
- Ctrl+F: Find & Replace
- Ctrl+S: Save
- Ctrl+Z: Undo
- Ctrl+Y: Redo

### Storage Format

**Content Stored As:**
- HTML format
- Sanitized on server
- XSS protection applied
- Image URLs validated

**Word Count Calculation:**
- Strips all HTML tags
- Counts words by whitespace splitting
- Handles Arabic and English correctly

### Autosave Behavior

**Local Autosave:**
- Every 10 seconds
- Saves to localStorage
- Key: `doooda_draft_{type}_{id}`
- Includes timestamp

**Server Save:**
- Manual only (Save button)
- Or "Save & Close"
- Or "Mark as Finished"
- Never automatic to server

**Visual Indicator:**
- "Last saved: X seconds ago" (server)
- "Draft saved: X seconds ago" (local)
- "Saving..." during POST/PATCH
- "Saved" on success
- "Error saving" on failure

## Progress Tracking

### Scene Progress

**Individual Scene:**
- Completed = true → 100%
- Completed = false → 0%

**No Partial Progress:**
- Scene is either finished or not
- No word count threshold
- Writer explicitly marks completion

### Chapter Progress

**Formula:**
```javascript
chapter_progress = (completed_scenes / total_scenes) * 100
```

**Examples:**
- 0 of 4 scenes → 0%
- 1 of 4 scenes → 25%
- 3 of 4 scenes → 75%
- 4 of 4 scenes → 100%

**Visual Display:**
- Progress bar on chapter card
- Color coding:
  - Red: 0-30%
  - Yellow: 31-70%
  - Green: 71-100%

### Project Progress

**Formula:**
```javascript
project_progress = (chapters_at_100% / total_chapters) * 100
```

**Important:**
- Only counts chapters at 100% completion
- Partial chapter progress doesn't count
- Encourages finishing chapters completely

**Examples:**
- Chapter 1: 100%, Chapter 2: 75%, Chapter 3: 0% → Project: 33%
- Chapter 1: 100%, Chapter 2: 100%, Chapter 3: 50% → Project: 67%
- All chapters 100% → Project: 100%

**Visual Display:**
- Progress bar on project card
- Same color coding as chapters
- Dashboard shows overall progress

### Real-Time Updates

**Triggers:**
1. Scene content saved → Recalculates scene word count
2. Scene marked complete → Updates chapter progress
3. Chapter progress updated → Updates project progress
4. All automatic via database triggers

**No Manual Refresh:**
- Frontend refetches after mutations
- Progress updates immediately
- Live feedback to writer

## Security Considerations

### Row-Level Security (RLS)

**All Tables Protected:**
- Loglines: Only owner can access
- Chapters: Only owner can access
- Scenes: Only owner can access via chapter ownership

**Multi-Level Verification:**
```
Scene → belongs to → Chapter → belongs to → Project → belongs to → User
```

**Every Request:**
1. Verify user authenticated
2. Verify project ownership
3. Verify entity ownership
4. Apply RLS filters

### Input Validation

**Server-Side:**
- Title cannot be empty
- Content sanitized (XSS protection)
- Position must be positive integer
- IDs validated as UUIDs

**Client-Side:**
- Same validation for UX
- Never trusted by server
- Server re-validates everything

### Content Sanitization

**HTML Content:**
- Strip dangerous tags (script, iframe, etc.)
- Allow safe formatting tags (p, strong, em, etc.)
- Validate image URLs
- Prevent XSS attacks

**Allowed Tags:**
```
p, br, strong, em, u, h1, h2, h3, h4, h5, h6,
ul, ol, li, blockquote, a, img
```

**Stripped Tags:**
```
script, iframe, object, embed, style, link, meta
```

### Authorization Checks

**Every Operation:**
```javascript
// 1. Authenticate
const userId = req.user.id;

// 2. Verify ownership
const project = await verifyProjectOwnership(projectId, userId);

// 3. Verify entity exists and not deleted
const entity = await prisma.entity.findFirst({
  where: { id, deletedAt: null }
});

// 4. Verify access via RLS
// RLS policies enforce at database level
```

## Performance Optimizations

### Database Indexes

**Loglines:**
- Unique index on project_id (fast lookup)

**Chapters:**
- Index on (project_id, position) - Fast ordering
- Unique constraint on (project_id, position)

**Scenes:**
- Index on (chapter_id, position) - Fast ordering
- Unique constraint on (chapter_id, position)

### Query Optimization

**List Queries:**
- Select only needed fields
- Use `include` for related data
- Order by position (indexed)

**Aggregate Queries:**
- Use database SUM and COUNT
- Leverage triggers for calculations
- Avoid N+1 queries

### Trigger Performance

**Word Count Calculation:**
- Runs on INSERT/UPDATE only
- Uses regex (fast for short content)
- Strips HTML once

**Progress Calculation:**
- Cascades automatically
- Uses efficient SUM queries
- Updates only affected records

## Frontend Implementation Guide

### State Management

**Recommended Structure:**
```javascript
{
  project: {
    id, title, projectType, logline, chapters: [...]
  },
  currentChapter: {
    id, title, summary, scenes: [...]
  },
  currentScene: {
    id, title, summary, content, completed
  },
  drafts: {
    'scene_uuid': { content, timestamp },
    'logline_uuid': { content, timestamp }
  }
}
```

### Draft Management

**Save to LocalStorage:**
```javascript
const saveDraft = (type, id, content) => {
  const key = `doooda_draft_${type}_${id}`;
  const draft = { content, timestamp: Date.now() };
  localStorage.setItem(key, JSON.stringify(draft));
};

// Call every 10 seconds
setInterval(() => {
  saveDraft('scene', sceneId, editorContent);
}, 10000);
```

**Load Draft:**
```javascript
const loadDraft = (type, id) => {
  const key = `doooda_draft_${type}_${id}`;
  const draft = localStorage.getItem(key);
  return draft ? JSON.parse(draft) : null;
};

// On page load
const draft = loadDraft('scene', sceneId);
if (draft && draft.timestamp > serverTimestamp) {
  showRecoveryPrompt(draft.content);
}
```

**Clear Draft:**
```javascript
const clearDraft = (type, id) => {
  const key = `doooda_draft_${type}_${id}`;
  localStorage.removeItem(key);
};

// After successful save
clearDraft('scene', sceneId);
```

### Unsaved Changes Detection

**Track Changes:**
```javascript
let hasUnsavedChanges = false;
let lastSavedContent = serverContent;

editor.on('change', (content) => {
  hasUnsavedChanges = (content !== lastSavedContent);
});

const save = async () => {
  await api.updateScene(sceneId, { content });
  lastSavedContent = content;
  hasUnsavedChanges = false;
  clearDraft('scene', sceneId);
};
```

**Prevent Navigation:**
```javascript
window.addEventListener('beforeunload', (e) => {
  if (hasUnsavedChanges) {
    e.preventDefault();
    e.returnValue = ''; // Chrome requires returnValue
  }
});
```

**Custom Close Handler:**
```javascript
const handleClose = () => {
  if (hasUnsavedChanges) {
    showModal({
      title: 'You have unsaved changes',
      actions: [
        { label: 'Close without saving', onClick: () => navigate('/project') },
        { label: 'Save & Close', onClick: async () => {
          await save();
          navigate('/project');
        }}
      ]
    });
  } else {
    navigate('/project');
  }
};
```

### Drag & Drop Implementation

**Using React DnD or similar:**
```javascript
const handleChapterReorder = async (newOrder) => {
  // Update UI immediately (optimistic)
  setChapters(newOrder);

  // Send to server
  const chapterIds = newOrder.map(ch => ch.id);
  try {
    await api.reorderChapters(projectId, chapterIds);
  } catch (error) {
    // Revert on error
    setChapters(originalOrder);
    showError('Failed to reorder chapters');
  }
};
```

### Context Menu Implementation

**Selection Detection:**
```javascript
const handleContextMenu = (e) => {
  e.preventDefault();

  const selection = window.getSelection();
  const selectedText = selection.toString().trim();

  if (selectedText.length === 0) return;

  showContextMenu({
    x: e.clientX,
    y: e.clientY,
    options: [
      {
        label: projectType === 'book'
          ? 'إضافة فصل فرعي / Add Subchapter'
          : 'إضافة مشهد جديد / Add New Scene',
        onClick: () => openCreateModal(selectedText)
      }
    ]
  });
};
```

**Modal with Pre-filled Summary:**
```javascript
const openCreateModal = (selectedText) => {
  showModal({
    title: 'إضافة مشهد جديد',
    fields: {
      title: { value: '', required: true },
      summary: { value: selectedText, required: false }
    },
    onSubmit: async (data) => {
      await api.createScene({
        chapterId,
        title: data.title,
        summary: data.summary
      });
      refreshScenes();
    }
  });
};
```

### Progress Display

**Chapter Card:**
```javascript
const ChapterCard = ({ chapter }) => {
  const progress = chapter.progressPercentage;
  const color = progress < 30 ? 'red'
              : progress <= 70 ? 'yellow'
              : 'green';

  return (
    <div>
      <h3>{chapter.title}</h3>
      <ProgressBar value={progress} color={color} />
      <span>{progress}% complete</span>
    </div>
  );
};
```

**Scene Completion Indicator:**
```javascript
const SceneCard = ({ scene }) => {
  return (
    <div className={scene.completed ? 'scene-completed' : 'scene-incomplete'}>
      <h4>{scene.title}</h4>
      {scene.completed && <CheckIcon />}
    </div>
  );
};
```

## Testing Scenarios

### Scenario 1: Complete Writing Flow

1. Writer creates project
2. Creates logline with rich text
3. Selects text from logline
4. Right-click → Create chapter with pre-filled summary
5. Opens chapter
6. Edits chapter summary
7. Creates 3 scenes
8. Writes content in each scene
9. Marks first scene as complete → Chapter: 33%
10. Marks second scene as complete → Chapter: 67%
11. Marks third scene as complete → Chapter: 100%
12. Project progress updates automatically

### Scenario 2: Autosave Recovery

1. Writer opens scene
2. Types 500 words
3. Autosave kicks in (10 seconds)
4. Browser crashes
5. Writer reopens scene
6. Sees recovery prompt: "Restore draft from 2 minutes ago?"
7. Clicks "Restore draft"
8. Content restored from localStorage
9. Writer continues writing
10. Clicks "Save"
11. Draft cleared, content persisted

### Scenario 3: Unsaved Changes Warning

1. Writer opens scene
2. Types content
3. Clicks browser back button
4. Modal appears: "You have unsaved changes"
5. Clicks "Save & Close"
6. Content saved to server
7. Returns to chapter page
8. Scene updated with new content

### Scenario 4: Drag & Drop Reordering

1. Writer has 5 chapters in order: A, B, C, D, E
2. Drags chapter C to position 1
3. New order: C, A, B, D, E
4. Frontend updates immediately
5. Backend receives: chapterIds = [id-C, id-A, id-B, id-D, id-E]
6. Database updates position field atomically
7. Writer refreshes page → Order persisted

### Scenario 5: Context Menu from Logline

1. Writer has logline: "A story about a young wizard discovering magic..."
2. Selects: "young wizard discovering magic"
3. Right-clicks selection
4. Context menu appears
5. Clicks "Add New Chapter"
6. Modal opens with:
   - Title: (empty)
   - Summary: "young wizard discovering magic"
7. Enters title: "Discovery"
8. Clicks "Save"
9. Chapter created with pre-filled summary
10. Appears in chapters list

### Scenario 6: Progress Tracking

**Initial State:**
- Chapter 1: 3 scenes (0 complete) → 0%
- Chapter 2: 2 scenes (0 complete) → 0%
- Project: 0%

**After completing 2 scenes in Chapter 1:**
- Chapter 1: 3 scenes (2 complete) → 67%
- Chapter 2: 2 scenes (0 complete) → 0%
- Project: 0% (no chapters at 100%)

**After completing all scenes in Chapter 1:**
- Chapter 1: 3 scenes (3 complete) → 100%
- Chapter 2: 2 scenes (0 complete) → 0%
- Project: 50% (1 of 2 chapters at 100%)

**After completing all scenes in Chapter 2:**
- Chapter 1: 3 scenes (3 complete) → 100%
- Chapter 2: 2 scenes (2 complete) → 100%
- Project: 100% (2 of 2 chapters at 100%)

## Integration Points

### With Projects System

**Project Creation:**
- Creates project
- No logline initially
- No chapters initially
- Writer builds structure incrementally

**Project Deletion:**
- Cascades to logline (ON DELETE CASCADE)
- Cascades to chapters
- Cascades to scenes
- All soft-deletes respected

### With Admin Panel

**Analytics:**
- Total scenes written across platform
- Average scene word count
- Completion rates by project type
- Most active chapters

**Content Moderation:**
- Admins can view all content
- Flag inappropriate content
- Export for review

### With Language Review Module

**Scope:**
- Available ONLY in scene editor
- NOT in logline or chapter summary
- Linguistic corrections only
- No creative rewriting

**Trigger:**
- Manual button: "مراجعة لغوية"
- Sends scene content to review service
- Returns corrected text
- Writer accepts or rejects changes

## Terminology Adaptation

### Project Type Detection

**Backend provides:**
```json
{
  "chapter": {
    "id": "uuid",
    "title": "Chapter One",
    "project": {
      "projectType": "novel"
    }
  }
}
```

**Frontend adapts:**
```javascript
const getSceneLabel = (projectType) => {
  if (projectType === 'book') {
    return {
      ar: 'فصل فرعي',
      en: 'Subchapter',
      plural_ar: 'الفصول الفرعية',
      plural_en: 'Subchapters',
      add_ar: 'إضافة فصل فرعي',
      add_en: 'Add Subchapter'
    };
  }

  return {
    ar: 'مشهد',
    en: 'Scene',
    plural_ar: 'المشاهد',
    plural_en: 'Scenes',
    add_ar: 'إضافة مشهد جديد',
    add_en: 'Add New Scene'
  };
};
```

### Context-Aware UI

**Chapter Page:**
```javascript
<h2>
  {projectType === 'book'
    ? 'الفصول الفرعية / Subchapters'
    : 'المشاهد / Scenes'}
</h2>

<button onClick={createScene}>
  {projectType === 'book'
    ? 'إضافة فصل فرعي / Add Subchapter'
    : 'إضافة مشهد جديد / Add New Scene'}
</button>
```

**Context Menu:**
```javascript
{
  label: projectType === 'book'
    ? 'إضافة فصل فرعي'
    : 'إضافة مشهد جديد',
  onClick: openCreateModal
}
```

## Future Enhancements

### Phase 2 Features

**Collaborative Writing:**
- Multi-user scenes
- Real-time editing
- Conflict resolution
- Comment threads

**Version History:**
- Track all changes
- Restore previous versions
- Compare versions side-by-side
- Branch and merge

**Advanced Organization:**
- Tags for scenes
- Color coding
- Filters and search
- Scene templates

### Phase 3 Features

**AI Integration:**
- Writing suggestions (Ask Doooda)
- Character consistency checks
- Plot hole detection
- Style analysis

**Export Options:**
- PDF with formatting
- EPUB for e-readers
- DOCX for editing
- Custom templates

**Publishing Integration:**
- Send to publishers
- Generate marketing materials
- Track submission status
- Contract management

## Conclusion

The Writing Engine provides a comprehensive, safe, and intuitive system for writers to structure and create their projects. It combines automatic progress tracking, flexible organization, and robust data safety to create a distraction-free writing environment.

All operations are user-scoped, all data is soft-deleted for recovery, and all progress is calculated automatically. The system adapts terminology based on project type and provides real-time feedback on writing progress.

The architecture is ready for production, scales efficiently, and integrates seamlessly with the existing authentication, subscription, and projects systems.
