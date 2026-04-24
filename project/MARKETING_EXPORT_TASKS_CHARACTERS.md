# Marketing, Export, Tasks, and Characters Modules

## Overview

This document describes four interconnected modules that extend the Doooda writing platform with publishing workflow, task management, character development, and manuscript export capabilities. All modules respect user privacy, intellectual property rights, and maintain professional publishing standards.

## Core Principles

### 1. Intellectual Property Protection
- No automatic submission of manuscripts
- No hidden data collection
- No scraping or unauthorized distribution
- All exports and sharing require explicit user action

### 2. Publishing Standards
- Professional manuscript formatting
- Industry-standard file formats
- Language-aware document generation
- Clean, publishable output

### 3. Privacy First
- User data never exposed publicly
- Publishers managed by admin only
- No tracking without consent
- Secure, isolated user workspaces

### 4. Workflow Respect
- Features unlock at appropriate milestones
- Non-intrusive task management
- Contextual character development
- Seamless integration with writing flow

## Marketing Module

### Purpose

Connects completed projects with publishing opportunities while maintaining complete user control over submission process.

### Access Requirements

**Marketing features are available ONLY when:**
1. Project progress = 100% (all chapters complete)
2. User subscription is NOT on free plan

**Verification Flow:**
```javascript
// Check project completion
SELECT progress_percentage FROM projects WHERE id = ? AND deleted_at IS NULL;
// Must equal 100

// Check user plan
SELECT pv.name FROM subscriptions s
JOIN price_versions pv ON s.price_version_id = pv.id
WHERE s.user_id = ? AND s.status = 'active';
// Must NOT be 'free'
```

### UI Behavior

**Marketing Button:**
- Location: Project page
- Label: "تسويق العمل / Market Your Work"
- Visibility:
  - Hidden: If project incomplete OR user on free plan
  - Visible: If project 100% complete AND user on paid plan
  - Disabled state: Show with tooltip explaining requirements

**Marketing Page:**
- Title: "تسويق العمل / Market Your Work"
- Subtitle: "قائمة دور النشر / Publisher Directory"
- Content: List of publishers grouped by country

### Publishers Display

**Data Source:**
- Publishers added via Admin Panel only
- No user editing allowed
- Admin manages: name, country, submission email
- Soft delete preserves history

**Display Format:**
```
╔═══════════════════════════════════════╗
║ Saudi Arabia                          ║
║ ─────────────────────────────────────║
║ Publisher A                           ║
║ submissions@publishera.sa             ║
║ [Copy Email]                          ║
║                                       ║
║ Publisher B                           ║
║ contact@publisherb.com                ║
║ [Copy Email]                          ║
╠═══════════════════════════════════════╣
║ Egypt                                 ║
║ ─────────────────────────────────────║
║ Publisher C                           ║
║ manuscripts@publisherc.eg             ║
║ [Copy Email]                          ║
╚═══════════════════════════════════════╝
```

**Grouping:**
- Primary: By country
- Secondary: Alphabetically by publisher name
- Countries sorted alphabetically

**Actions:**
- Copy email button per publisher
- Click copies to clipboard
- Toast notification: "تم نسخ البريد / Email Copied"
- No automatic sending
- Writer manually emails their manuscript

### Security Measures

**Access Control:**
```javascript
// Every request verifies:
1. User owns project (user_id matches)
2. Project is complete (progress = 100%)
3. User has valid paid subscription
4. Publisher data exists and not deleted
```

**Data Protection:**
- Publishers table has RLS enabled
- Only authenticated users can read
- No write access from frontend
- Admin panel only management

**Rate Limiting:**
- Get publishers: 60 requests/hour
- Check access: 120 requests/hour
- Prevents enumeration attacks

### API Endpoints

#### GET /marketing/project/:projectId/access

Check if user can access marketing features.

**Request:**
```
GET /marketing/project/550e8400-e29b-41d4-a716-446655440000/access
Authorization: Bearer {token}
```

**Response:**
```json
{
  "canAccess": true,
  "projectComplete": true,
  "planAllows": true,
  "reason": null
}
```

**Error Response:**
```json
{
  "canAccess": false,
  "projectComplete": true,
  "planAllows": false,
  "reason": "Upgrade plan to access marketing features"
}
```

#### GET /marketing/project/:projectId/publishers

Get all publishers grouped by country.

**Request:**
```
GET /marketing/project/550e8400-e29b-41d4-a716-446655440000/publishers
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "country": "Saudi Arabia",
    "publishers": [
      {
        "id": "uuid-1",
        "name": "Publisher A",
        "submissionEmail": "submissions@publishera.sa",
        "country": "Saudi Arabia"
      },
      {
        "id": "uuid-2",
        "name": "Publisher B",
        "submissionEmail": "contact@publisherb.com",
        "country": "Saudi Arabia"
      }
    ]
  },
  {
    "country": "Egypt",
    "publishers": [
      {
        "id": "uuid-3",
        "name": "Publisher C",
        "submissionEmail": "manuscripts@publisherc.eg",
        "country": "Egypt"
      }
    ]
  }
]
```

**Error Responses:**
- 403: Project not complete or plan doesn't allow
- 404: Project not found
- 401: Not authenticated

#### GET /marketing/project/:projectId/publishers/country/:country

Get publishers for specific country.

**Request:**
```
GET /marketing/project/550e8400-e29b-41d4-a716-446655440000/publishers/country/Egypt
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": "uuid-3",
    "name": "Publisher C",
    "submissionEmail": "manuscripts@publisherc.eg",
    "country": "Egypt"
  }
]
```

### Implementation Notes

**Frontend Responsibilities:**
- Check access before showing marketing button
- Fetch publishers when page loads
- Group and sort publishers by country
- Copy email to clipboard on button click
- Show appropriate error messages

**Backend Responsibilities:**
- Verify project ownership
- Check project completion status
- Verify user subscription plan
- Fetch and group publishers
- Apply RLS policies
- Rate limit requests

### User Flow

1. Writer completes project (100%)
2. Marketing button appears on project page
3. Writer clicks "Market Your Work"
4. System checks subscription plan
5. If paid plan: Show publishers list
6. If free plan: Show upgrade prompt
7. Writer finds suitable publisher
8. Writer clicks "Copy Email"
9. Writer manually composes email
10. Writer attaches exported manuscript
11. Writer sends submission independently

## Export DOCX Module

### Purpose

Generates professional manuscript files in .docx format for submission to publishers or personal archiving.

### Access Requirements

**Export available ONLY when:**
- Project progress = 100% (all chapters complete)

**No subscription requirement** - available to all users when project is complete.

### Document Structure

**Cover Page:**
```
[Centered, larger font]
{Project Title}

[Centered, regular font]
الكاتب: {pen_name}
OR
Author: {pen_name}

[Based on project language]
```

**Chapter Format:**
- Each chapter starts on NEW PAGE
- Chapter title (if showChapterTitles = true)
  - Centered
  - Larger font
  - Bold
- Chapter content:
  - Scene/subchapter content concatenated
  - NO scene/subchapter titles
  - Continuous text flow
  - Paragraph breaks preserved

**For Books (vs Screenplays):**
- Use "Subchapters" terminology internally
- Same export logic applies
- No structural difference in output

### Language Handling

**Arabic (RTL):**
```javascript
{
  direction: 'rtl',
  alignment: 'right',
  font: 'Traditional Arabic' or 'Arial',
  titlePrefix: 'الكاتب: '
}
```

**English (LTR):**
```javascript
{
  direction: 'ltr',
  alignment: 'left',
  font: 'Times New Roman' or 'Arial',
  titlePrefix: 'Author: '
}
```

### Content Processing

**HTML Stripping:**
```javascript
function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, '')           // Remove all HTML tags
    .replace(/&nbsp;/g, ' ')            // Convert entities
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}
```

**What Gets Included:**
- Scene/subchapter main content only
- Paragraph breaks
- Text formatting (bold, italic if preserved)
- Line breaks

**What Gets Excluded:**
- Logline
- Chapter summaries
- Scene/subchapter summaries
- Scene/subchapter titles
- HTML tags
- Formatting markers
- Images (content only export)

### Document Generation

**Server-Side Processing:**
1. Verify user owns project
2. Check project completion (100%)
3. Fetch project metadata
4. Fetch all chapters (ordered by position)
5. Fetch all scenes per chapter (ordered by position)
6. Strip HTML from scene content
7. Concatenate scene content per chapter
8. Generate .docx file
9. Return file data or download link
10. Clean up temporary files

**Temporary File Handling:**
```javascript
// Generate unique filename
const filename = `${projectId}_${Date.now()}.docx`;
const filepath = `/tmp/${filename}`;

// Generate DOCX
await generateDocx(exportData, filepath);

// Send to client
res.download(filepath, `${projectTitle}.docx`);

// Delete after sending
fs.unlink(filepath, (err) => {
  if (err) console.error('Cleanup failed:', err);
});
```

### API Endpoints

#### GET /export/project/:projectId/access

Check if user can export project.

**Request:**
```
GET /export/project/550e8400-e29b-41d4-a716-446655440000/access
Authorization: Bearer {token}
```

**Response:**
```json
{
  "canExport": true,
  "reason": null
}
```

**Error Response:**
```json
{
  "canExport": false,
  "reason": "Project must be 100% complete to export"
}
```

#### GET /export/project/:projectId/data

Get structured export data for generating DOCX.

**Request:**
```
GET /export/project/550e8400-e29b-41d4-a716-446655440000/data
Authorization: Bearer {token}
```

**Response:**
```json
{
  "title": "رواية الغموض",
  "author": "اسم القلم",
  "language": "ar",
  "isRTL": true,
  "showChapterTitles": true,
  "projectType": "screenplay",
  "chapters": [
    {
      "title": "الفصل الأول",
      "content": "هذا هو محتوى المشهد الأول...\n\nوهذا محتوى المشهد الثاني..."
    },
    {
      "title": "الفصل الثاني",
      "content": "محتوى الفصل الثاني..."
    }
  ]
}
```

**Notes:**
- `content` field contains all scene content concatenated
- Scene titles NOT included in content
- HTML already stripped
- Paragraph breaks preserved as \n\n

### UI Behavior

**Export Button:**
- Location: Project page
- Label: "تحميل العمل / Download Manuscript"
- Visibility:
  - Hidden: If project incomplete
  - Visible: If project 100% complete
- Icon: Download icon

**Export Flow:**
1. User clicks "Download Manuscript"
2. Frontend calls /export/project/:id/access
3. If canExport = true:
   - Show loading indicator
   - Call /export/project/:id/data
   - Generate DOCX client-side OR
   - Redirect to download endpoint
4. If canExport = false:
   - Show error message
   - Explain completion requirement

**Progress Indicator:**
```
╔════════════════════════════╗
║ Generating manuscript...   ║
║ [████████████░░░░░] 75%    ║
╚════════════════════════════╝
```

### Security Measures

**Access Control:**
- Verify user owns project
- Check project completion
- Validate project exists and not deleted
- Apply RLS policies

**Rate Limiting:**
- Check access: 120 requests/hour
- Get export data: 30 requests/hour
- Download file: 10 requests/hour
- Prevents abuse and server overload

**File Security:**
- Generate in isolated /tmp directory
- Use unique filenames (UUID + timestamp)
- Delete immediately after download
- Never store permanently
- No public access to temp files

**Data Validation:**
- Sanitize all content before export
- Validate chapter ordering
- Check scene ownership
- Prevent data leakage across projects

### Document Formatting Specifications

**Page Setup:**
- Size: A4 (210mm × 297mm)
- Margins: 2.5cm all sides
- Header/Footer: Optional page numbers

**Typography:**
- Title: 18pt, Bold, Centered
- Author: 14pt, Regular, Centered
- Chapter Title: 16pt, Bold, Centered
- Body Text: 12pt, Regular
- Line Spacing: 1.5 or Double
- Paragraph Spacing: 6pt after

**Fonts:**
- Arabic: Traditional Arabic, Arial, or Simplified Arabic
- English: Times New Roman, Arial, or Calibri
- Fallback to system defaults if unavailable

**Page Breaks:**
- After cover page
- Before each chapter
- Not mid-chapter

## Tasks (To-Do List) Module

### Purpose

Context-aware task management integrated directly into the writing workspace. Writers can capture notes, reminders, and action items without leaving their current work area.

### Task Creation

**Context Menu Activation:**

Right-click inside these areas triggers "Add Task" option:
1. Logline editing area
2. Chapter summary editing area
3. Scene summary editing area
4. Scene main content (writing area)

**Context Menu:**
```
╔════════════════════════════╗
║ Cut                        ║
║ Copy                       ║
║ Paste                      ║
║ ───────────────────────── ║
║ ✓ إضافة ملحوظة إلى قائمة  ║
║   المهام                   ║
║   Add Task                 ║
╚════════════════════════════╝
```

**Task Creation Popup:**
```
╔═══════════════════════════════════╗
║ Add Task                          ║
║ ─────────────────────────────────║
║                                   ║
║ Task Description:                 ║
║ ┌───────────────────────────────┐║
║ │                               │║
║ │ [Multiline text area]         │║
║ │                               │║
║ └───────────────────────────────┘║
║                                   ║
║        [Cancel]  [Save Task]     ║
╚═══════════════════════════════════╝
```

**Context Capture:**

When task is created, system automatically captures:
- `project_id` - Current project
- `chapter_number` - If in chapter context
- `scene_number` - If in scene context
- `context_type` - Where created from:
  - 'logline' - From logline area
  - 'chapter_summary' - From chapter summary
  - 'scene_summary' - From scene summary
  - 'scene_content' - From scene writing area

**Example Task Data:**
```json
{
  "projectId": "uuid",
  "chapterNumber": 3,
  "sceneNumber": 2,
  "contextType": "scene_content",
  "description": "Add more tension in dialogue between protagonist and antagonist",
  "completed": false
}
```

### Task List Page

**Access:**
- Button: "قائمة المهام / Task List"
- Location: Project page toolbar
- Icon: Checklist icon

**Page Layout:**
```
╔════════════════════════════════════════╗
║ Task List - Project Name               ║
║ ════════════════════════════════════  ║
║                                        ║
║ Progress: [████████░░] 8/10 (80%)     ║
║                                        ║
║ ──────────────────────────────────── ║
║                                        ║
║ □ Fix plot hole in chapter 2          ║
║   Context: Chapter 2 Summary           ║
║                                        ║
║ ☑ Research historical details         ║
║   Context: Scene 1.3 Content           ║
║                                        ║
║ □ Develop character backstory         ║
║   Context: Logline                     ║
║                                        ║
║ □ Add weather description             ║
║   Context: Scene 3.1 Content           ║
║                                        ║
║ ──────────────────────────────────── ║
║                                        ║
║           [Save]  [Close]              ║
╚════════════════════════════════════════╝
```

**Task Display:**
- Order: Created_at ascending (oldest first)
- Show: Checkbox, description, context
- Checkbox: Interactive (check/uncheck)
- Context label: "Chapter X Summary", "Scene Y.Z Content", etc.

**Progress Bar:**
- Location: Top of task list
- Formula: (completed_tasks / total_tasks) * 100
- Updates in real-time as checkboxes change
- Color coding:
  - Red: 0-30%
  - Yellow: 31-70%
  - Green: 71-100%

**Interaction Behavior:**

**NO AUTOSAVE:**
- Checking/unchecking does NOT save immediately
- Changes kept in memory only
- Must click "Save" to persist

**Save Button:**
- Label: "حفظ / Save"
- Action: Bulk update all task completion states
- Feedback: "تم حفظ المهام / Tasks Saved"
- Progress bar recalculated server-side

**Close Button:**
- Label: "إغلاق / Close"
- Action: Discard unsaved changes
- Confirmation: "Discard unsaved changes?"
- Return to previous page

### Task Management

**Edit Task:**
- Click task description to edit
- Inline editing or modal popup
- Save/cancel per task
- Only description editable (context locked)

**Delete Task:**
- X icon or right-click → Delete
- Confirmation: "Delete this task?"
- Soft delete (deleted_at set)
- Removes from list immediately

**Filter/Sort:**
- All tasks (default)
- Completed only
- Incomplete only
- By context type
- By chapter/scene

### API Endpoints

#### POST /tasks

Create a new task.

**Request:**
```json
{
  "projectId": "uuid",
  "chapterNumber": 3,
  "sceneNumber": 2,
  "contextType": "scene_content",
  "description": "Add more tension in dialogue"
}
```

**Response:**
```json
{
  "id": "task-uuid",
  "projectId": "uuid",
  "chapterNumber": 3,
  "sceneNumber": 2,
  "contextType": "scene_content",
  "description": "Add more tension in dialogue",
  "completed": false,
  "createdAt": "2026-01-07T12:00:00Z"
}
```

#### GET /tasks/project/:projectId

Get all tasks for a project.

**Response:**
```json
[
  {
    "id": "task-uuid-1",
    "projectId": "uuid",
    "chapterNumber": null,
    "sceneNumber": null,
    "contextType": "logline",
    "description": "Refine the main conflict",
    "completed": false,
    "createdAt": "2026-01-05T10:00:00Z",
    "updatedAt": "2026-01-05T10:00:00Z"
  },
  {
    "id": "task-uuid-2",
    "projectId": "uuid",
    "chapterNumber": 2,
    "sceneNumber": null,
    "contextType": "chapter_summary",
    "description": "Fix plot hole",
    "completed": true,
    "createdAt": "2026-01-06T14:00:00Z",
    "updatedAt": "2026-01-07T09:00:00Z"
  }
]
```

#### GET /tasks/project/:projectId/progress

Get task progress for a project.

**Response:**
```json
{
  "totalTasks": 10,
  "completedTasks": 8,
  "progress": 80
}
```

#### PATCH /tasks/:taskId

Update a single task.

**Request:**
```json
{
  "description": "Updated description",
  "completed": true
}
```

**Response:**
```json
{
  "id": "task-uuid",
  "projectId": "uuid",
  "chapterNumber": 3,
  "sceneNumber": 2,
  "contextType": "scene_content",
  "description": "Updated description",
  "completed": true,
  "createdAt": "2026-01-05T10:00:00Z",
  "updatedAt": "2026-01-07T15:00:00Z"
}
```

#### POST /tasks/project/:projectId/bulk-update

Bulk update task completion states (used by Save button).

**Request:**
```json
{
  "tasks": [
    {
      "id": "task-uuid-1",
      "completed": true
    },
    {
      "id": "task-uuid-2",
      "completed": false
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "updated": 2
}
```

#### DELETE /tasks/:taskId

Soft delete a task.

**Response:**
```json
{
  "success": true
}
```

### Security Measures

**Access Control:**
- Verify user owns project
- Verify task belongs to user's project
- Check project not deleted
- Apply RLS policies

**Data Validation:**
- Description required and non-empty
- Context type must be valid enum
- Chapter/scene numbers positive integers
- Project must exist

**Rate Limiting:**
- Create task: 100/hour
- Get tasks: 200/hour
- Update task: 200/hour
- Bulk update: 50/hour
- Delete task: 100/hour

### Integration with Writing Flow

**Seamless Creation:**
1. Writer working in scene
2. Realizes need to research something
3. Right-clicks → Add Task
4. Types reminder quickly
5. Clicks Save
6. Returns to writing immediately
7. No context switch or interruption

**Context Preservation:**
- Task remembers where it was created
- Can navigate back to source later
- Chapter/scene numbers preserved
- Full context for future reference

## Characters Module

### Purpose

Comprehensive character profile management system integrated into the writing workspace. Writers can develop detailed character profiles and generate AI-ready prompts for character consistency.

### Character Creation

**Access Method:**
- Right-click context menu
- Menu item: "إضافة شخصية / Add Character"
- Available anywhere in project workspace
- Opens character creation form

**Context Menu:**
```
╔════════════════════════════╗
║ ✓ إضافة شخصية              ║
║   Add Character            ║
╚════════════════════════════╝
```

### Character Profile Form

**Form Fields (All Optional Except Name):**

1. **Name** (Required)
   - Character name
   - Text input

2. **Age**
   - Character age
   - Text input (allows ranges like "30-35")

3. **Gender**
   - Character gender
   - Text input or dropdown

4. **Clothing Style**
   - How character dresses
   - Text area

5. **Speech Style**
   - How character speaks
   - Text area
   - Example: "Formal, uses big words" or "Casual, slang"

6. **Psychological Issue**
   - Mental/emotional challenges
   - Text area
   - Example: "Anxiety, PTSD, Depression"

7. **Likes**
   - Things character enjoys
   - Text area
   - Example: "Reading, coffee, rainy days"

8. **Dislikes**
   - Things character avoids
   - Text area
   - Example: "Crowds, loud noises, dishonesty"

9. **Fears**
   - What character fears
   - Text area
   - Example: "Heights, abandonment, failure"

10. **Childhood Trauma**
    - Past traumatic events
    - Text area
    - Example: "Lost parent at young age"

11. **Trauma Impact in Adulthood**
    - How trauma affects them now
    - Text area
    - Example: "Trust issues, difficulty forming relationships"

12. **Education**
    - Educational background
    - Text area
    - Example: "PhD in Physics from MIT"

13. **Job**
    - Current occupation
    - Text input
    - Example: "Software Engineer"

14. **Work Relationships**
    - Relationships with colleagues
    - Text area
    - Example: "Respected but distant, few close friends"

15. **Residence**
    - Where character lives
    - Text area
    - Example: "Small apartment in downtown, messy"

16. **Neighbor Relationships**
    - Relationships with neighbors
    - Text area
    - Example: "Polite but keeps distance"

17. **Life Goal**
    - Character's primary life objective
    - Text area
    - Example: "Prove innocence, find true love, build company"

**Form Layout:**
```
╔═══════════════════════════════════════╗
║ Character Profile                     ║
║ ═════════════════════════════════════║
║                                       ║
║ Name: * [________________]            ║
║                                       ║
║ Age: [________________]               ║
║                                       ║
║ Gender: [________________]            ║
║                                       ║
║ Clothing Style:                       ║
║ ┌───────────────────────────────────┐║
║ │                                   │║
║ └───────────────────────────────────┘║
║                                       ║
║ Speech Style:                         ║
║ ┌───────────────────────────────────┐║
║ │                                   │║
║ └───────────────────────────────────┘║
║                                       ║
║ [... more fields ...]                 ║
║                                       ║
║ Life Goal:                            ║
║ ┌───────────────────────────────────┐║
║ │                                   │║
║ └───────────────────────────────────┘║
║                                       ║
║        [Cancel]  [Save Character]    ║
╚═══════════════════════════════════════╝
```

**Form Behavior:**

**Save Button:**
- Validates name is not empty
- Creates character in database
- Returns user to previous location
- Shows success message: "تم حفظ الشخصية / Character Saved"
- No interruption to writing flow

**Cancel Button:**
- Discards all changes
- No confirmation needed (form not submitted yet)
- Returns to previous location

### Characters File (List Page)

**Access:**
- Button: "ملف الشخصيات / Characters File"
- Location: Project page toolbar
- Icon: People/users icon

**Page Layout:**
```
╔════════════════════════════════════════╗
║ Characters - Project Name              ║
║ ════════════════════════════════════  ║
║                                        ║
║ [+ Add Character]                      ║
║                                        ║
║ ──────────────────────────────────── ║
║                                        ║
║ ┌────────────────────────────────────┐║
║ │ John Smith                         │║
║ │ Age: 35  |  Gender: Male           │║
║ │ Job: Detective                     │║
║ │                                    │║
║ │ [Edit] [برومبت / Prompt] [Delete] │║
║ └────────────────────────────────────┘║
║                                        ║
║ ┌────────────────────────────────────┐║
║ │ Sarah Johnson                      │║
║ │ Age: 28  |  Gender: Female         │║
║ │ Job: Journalist                    │║
║ │                                    │║
║ │ [Edit] [برومبت / Prompt] [Delete] │║
║ └────────────────────────────────────┘║
║                                        ║
║                         [Close]        ║
╚════════════════════════════════════════╝
```

**Character Card:**
- Shows: Name, age, gender, job
- Truncated display of basic info
- Click card or Edit button to see full profile
- Ordered by creation date

**Actions Per Character:**
1. **Edit** - Opens character form with current data
2. **Character Prompt** - Generates AI prompt (see below)
3. **Delete** - Soft deletes character

**Edit Flow:**
1. Click Edit button
2. Opens character form
3. Form pre-populated with existing data
4. User makes changes
5. Clicks Save
6. Changes overwrite existing character
7. Return to characters list

### Character Prompt Generator

**Purpose:**
Generate AI-ready character description text that writers can use with external AI tools to maintain character consistency across scenes.

**Trigger:**
- Button: "برومبت الشخصية / Character Prompt"
- Location: Character card in characters file
- Also available in character view/edit page

**Prompt Generation:**

**Arabic Format:**
```
الشخصية: {name}
العمر: {age}
الجنس: {gender}
أسلوب اللباس: {clothingStyle}
أسلوب الحديث: {speechStyle}
المشكلة النفسية: {psychologicalIssue}
الأشياء المحببة: {likes}
الأشياء المكروهة: {dislikes}
المخاوف: {fears}
صدمة الطفولة: {childhoodTrauma}
تأثير الصدمة في مرحلة البلوغ: {traumaImpactAdulthood}
التعليم: {education}
الوظيفة: {job}
العلاقات في العمل: {workRelationships}
السكن: {residence}
العلاقات مع الجيران: {neighborRelationships}
الهدف من الحياة: {lifeGoal}
```

**English Format:**
```
Character: {name}
Age: {age}
Gender: {gender}
Clothing Style: {clothingStyle}
Speech Style: {speechStyle}
Psychological Issue: {psychologicalIssue}
Likes: {likes}
Dislikes: {dislikes}
Fears: {fears}
Childhood Trauma: {childhoodTrauma}
Trauma Impact in Adulthood: {traumaImpactAdulthood}
Education: {education}
Job: {job}
Work Relationships: {workRelationships}
Residence: {residence}
Neighbor Relationships: {neighborRelationships}
Life Goal: {lifeGoal}
```

**Generation Rules:**
- Only includes fields with values
- Skips empty fields
- Preserves field order
- Language follows user's project language preference
- Both Arabic and English versions generated

**Prompt Display Popup:**
```
╔═══════════════════════════════════════╗
║ Character Prompt - John Smith         ║
║ ═════════════════════════════════════║
║                                       ║
║ ┌───────────────────────────────────┐║
║ │ Character: John Smith             │║
║ │ Age: 35                           │║
║ │ Gender: Male                      │║
║ │ Clothing Style: Casual, jeans and│║
║ │ t-shirts                          │║
║ │ Speech Style: Direct, sometimes   │║
║ │ sarcastic                         │║
║ │ Psychological Issue: PTSD from    │║
║ │ military service                  │║
║ │ ...                               │║
║ └───────────────────────────────────┘║
║                                       ║
║ [Copy to Clipboard]  [Close]          ║
╚═══════════════════════════════════════╝
```

**Popup Buttons:**

**Copy to Clipboard:**
- Copies entire prompt text
- Toast notification: "تم النسخ / Copied"
- Keeps popup open (user may want to copy again)

**Close:**
- Closes popup
- Returns to characters list

**Use Cases:**
1. Writer uses external AI tool (ChatGPT, Claude, etc.)
2. Pastes character prompt at start of conversation
3. AI understands full character profile
4. Writer asks AI to help write scene
5. AI maintains character consistency
6. Writer copies AI suggestions back to Doooda

**Security Note:**
- No AI call made from Doooda
- Pure text generation only
- No character data sent to external services
- User manually shares with AI tools
- Doooda never sees AI responses

### API Endpoints

#### POST /characters

Create a new character.

**Request:**
```json
{
  "projectId": "uuid",
  "name": "John Smith",
  "age": "35",
  "gender": "Male",
  "clothingStyle": "Casual, jeans and t-shirts",
  "speechStyle": "Direct, sometimes sarcastic",
  "psychologicalIssue": "PTSD from military service",
  "likes": "Coffee, running, quiet mornings",
  "dislikes": "Crowds, loud noises",
  "fears": "Losing control, failing his team",
  "childhoodTrauma": "Father died in accident",
  "traumaImpactAdulthood": "Trust issues, difficulty opening up",
  "education": "Bachelor's in Criminal Justice",
  "job": "Detective",
  "workRelationships": "Respected but keeps distance",
  "residence": "Small apartment, minimalist",
  "neighborRelationships": "Polite but private",
  "lifeGoal": "Find justice for victims"
}
```

**Response:**
```json
{
  "id": "char-uuid",
  "projectId": "uuid",
  "name": "John Smith",
  "age": "35",
  "gender": "Male",
  "clothingStyle": "Casual, jeans and t-shirts",
  "speechStyle": "Direct, sometimes sarcastic",
  "psychologicalIssue": "PTSD from military service",
  "likes": "Coffee, running, quiet mornings",
  "dislikes": "Crowds, loud noises",
  "fears": "Losing control, failing his team",
  "childhoodTrauma": "Father died in accident",
  "traumaImpactAdulthood": "Trust issues, difficulty opening up",
  "education": "Bachelor's in Criminal Justice",
  "job": "Detective",
  "workRelationships": "Respected but keeps distance",
  "residence": "Small apartment, minimalist",
  "neighborRelationships": "Polite but private",
  "lifeGoal": "Find justice for victims",
  "createdAt": "2026-01-07T12:00:00Z",
  "updatedAt": "2026-01-07T12:00:00Z"
}
```

#### GET /characters/project/:projectId

Get all characters for a project.

**Response:**
```json
[
  {
    "id": "char-uuid-1",
    "projectId": "uuid",
    "name": "John Smith",
    "age": "35",
    "gender": "Male",
    "clothingStyle": "Casual, jeans and t-shirts",
    "...": "..."
  },
  {
    "id": "char-uuid-2",
    "projectId": "uuid",
    "name": "Sarah Johnson",
    "age": "28",
    "gender": "Female",
    "...": "..."
  }
]
```

#### GET /characters/:characterId

Get single character details.

**Response:**
```json
{
  "id": "char-uuid",
  "projectId": "uuid",
  "name": "John Smith",
  "age": "35",
  "gender": "Male",
  "clothingStyle": "Casual, jeans and t-shirts",
  "speechStyle": "Direct, sometimes sarcastic",
  "psychologicalIssue": "PTSD from military service",
  "likes": "Coffee, running, quiet mornings",
  "dislikes": "Crowds, loud noises",
  "fears": "Losing control, failing his team",
  "childhoodTrauma": "Father died in accident",
  "traumaImpactAdulthood": "Trust issues, difficulty opening up",
  "education": "Bachelor's in Criminal Justice",
  "job": "Detective",
  "workRelationships": "Respected but keeps distance",
  "residence": "Small apartment, minimalist",
  "neighborRelationships": "Polite but private",
  "lifeGoal": "Find justice for victims",
  "createdAt": "2026-01-07T12:00:00Z",
  "updatedAt": "2026-01-07T12:00:00Z"
}
```

#### PATCH /characters/:characterId

Update character profile.

**Request:**
```json
{
  "age": "36",
  "job": "Senior Detective"
}
```

**Response:**
```json
{
  "id": "char-uuid",
  "projectId": "uuid",
  "name": "John Smith",
  "age": "36",
  "gender": "Male",
  "job": "Senior Detective",
  "...": "...",
  "updatedAt": "2026-01-08T10:00:00Z"
}
```

#### DELETE /characters/:characterId

Soft delete a character.

**Response:**
```json
{
  "success": true
}
```

#### GET /characters/:characterId/prompt

Generate character prompt text.

**Response:**
```json
{
  "ar": "الشخصية: John Smith\nالعمر: 35\n...",
  "en": "Character: John Smith\nAge: 35\n..."
}
```

**Both Arabic and English versions returned regardless of project language.**

### Security Measures

**Access Control:**
- Verify user owns project
- Verify character belongs to user's project
- Check project not deleted
- Apply RLS policies

**Data Validation:**
- Name required and non-empty
- All other fields optional
- Text fields sanitized
- No HTML in character data

**Rate Limiting:**
- Create character: 50/hour
- Get characters: 200/hour
- Update character: 100/hour
- Delete character: 50/hour
- Generate prompt: 100/hour

### Character Prompt Best Practices

**For Writers:**
1. Fill out as much detail as possible
2. Be specific and concrete
3. Include contradictions (makes characters real)
4. Update as character develops
5. Use prompt at start of AI sessions
6. Reference prompt when character feels off

**For AI Tools:**
1. Paste prompt at conversation start
2. Ask AI: "Remember this character"
3. Write scene with AI assistance
4. AI maintains consistency automatically
5. Refine character prompt based on what works

**Example AI Conversation:**
```
Writer: [Pastes character prompt]

Writer: Remember this character profile for John Smith.

AI: Got it! I'll keep John's PTSD, trust issues, and direct speech
style in mind. What scene would you like to write?

Writer: John arrives at a crime scene. Show his professional
competence but also his discomfort with the crowd.

AI: [Generates scene maintaining character consistency]
```

## Database Schema

### Tasks Table

```sql
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  project_id uuid NOT NULL REFERENCES projects(id),
  chapter_number integer CHECK (chapter_number > 0),
  scene_number integer CHECK (scene_number > 0),
  context_type text NOT NULL CHECK (
    context_type IN ('logline', 'chapter_summary', 'scene_summary', 'scene_content')
  ),
  description text NOT NULL CHECK (length(description) > 0),
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_tasks_user_project ON tasks(user_id, project_id, deleted_at);
CREATE INDEX idx_tasks_project_created ON tasks(project_id, created_at);
CREATE INDEX idx_tasks_completed ON tasks(completed);
```

### Characters Table

```sql
CREATE TABLE characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  project_id uuid NOT NULL REFERENCES projects(id),
  name text NOT NULL CHECK (length(name) > 0),
  age text,
  gender text,
  clothing_style text,
  speech_style text,
  psychological_issue text,
  likes text,
  dislikes text,
  fears text,
  childhood_trauma text,
  trauma_impact_adulthood text,
  education text,
  job text,
  work_relationships text,
  residence text,
  neighbor_relationships text,
  life_goal text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_characters_user_project ON characters(user_id, project_id, deleted_at);
CREATE INDEX idx_characters_project_name ON characters(project_id, name);
```

### Publishers Table (Already Exists)

```sql
CREATE TABLE publishers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text NOT NULL,
  submission_email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
```

## Testing Scenarios

### Marketing Module Testing

**Scenario 1: Complete Project, Paid Plan**
1. User completes all chapters (100%)
2. User has active paid subscription
3. Marketing button appears on project page
4. User clicks "Market Your Work"
5. Publishers list loads grouped by country
6. User clicks "Copy Email" for publisher
7. Email copied to clipboard
8. User manually sends manuscript

**Scenario 2: Incomplete Project**
1. User project at 75% completion
2. Marketing button hidden
3. User cannot access marketing features
4. Direct URL access returns 403 error

**Scenario 3: Free Plan User**
1. User completes project (100%)
2. User on free plan
3. Marketing button shows upgrade prompt
4. User clicks button
5. Shown: "Upgrade to access marketing"
6. Link to subscription page

### Export Module Testing

**Scenario 1: Arabic RTL Export**
1. User completes Arabic project
2. Clicks "Download Manuscript"
3. System checks completion (100%)
4. Generates DOCX with:
   - RTL direction
   - Arabic fonts
   - "الكاتب: {pen_name}"
   - Each chapter on new page
5. File downloads successfully
6. Opens in Microsoft Word correctly

**Scenario 2: English LTR Export**
1. User completes English project
2. Clicks "Download Manuscript"
3. System generates DOCX with:
   - LTR direction
   - English fonts
   - "Author: {pen_name}"
   - Proper formatting
4. File downloads successfully

**Scenario 3: Incomplete Project**
1. User project at 90%
2. Export button hidden
3. Direct API call returns 403
4. Error: "Project must be 100% complete"

### Tasks Module Testing

**Scenario 1: Create Task from Scene**
1. User writing in scene content
2. Right-clicks in text area
3. Selects "Add Task"
4. Types: "Research historical details"
5. Clicks Save
6. Task created with:
   - projectId: current project
   - chapterNumber: current chapter
   - sceneNumber: current scene
   - contextType: 'scene_content'
7. User returned to scene
8. Writing flow uninterrupted

**Scenario 2: Task List Management**
1. User clicks "Task List"
2. Sees 10 tasks, 6 completed
3. Progress bar shows 60%
4. User checks 2 more tasks
5. Progress bar updates to 80%
6. User clicks Save
7. Changes persisted to database
8. Success message shown

**Scenario 3: Discard Changes**
1. User opens task list
2. Checks/unchecks several tasks
3. Clicks Close
4. Confirmation: "Discard changes?"
5. User confirms
6. Changes not saved
7. Returns to project page

### Characters Module Testing

**Scenario 1: Create Character**
1. User right-clicks anywhere
2. Selects "Add Character"
3. Form opens
4. User fills:
   - Name: "Sarah Johnson"
   - Age: "28"
   - Job: "Journalist"
   - (other fields)
5. Clicks Save
6. Character created
7. User returned to previous location

**Scenario 2: Generate Character Prompt**
1. User opens "Characters File"
2. Sees character card for "John Smith"
3. Clicks "Character Prompt"
4. Popup shows generated prompt
5. Both Arabic and English versions
6. User clicks "Copy to Clipboard"
7. Toast: "Copied"
8. User pastes into ChatGPT
9. Uses for scene writing

**Scenario 3: Edit Character**
1. User opens characters list
2. Clicks Edit on "Sarah Johnson"
3. Form opens with current data
4. User updates job to "Senior Journalist"
5. Clicks Save
6. Character updated
7. Changes visible in list

## Performance Considerations

### Marketing Module

**Caching:**
- Cache publishers list for 1 hour
- Invalidate on admin changes
- Per-country caching

**Optimization:**
- Index on (country, name)
- Eager load all publishers
- Group in application layer

### Export Module

**Optimization:**
- Stream chapters to reduce memory
- Generate DOCX incrementally
- Immediate file cleanup
- Limit concurrent exports per user

**Resource Limits:**
- Max export size: 10MB
- Max chapters: 1000
- Timeout: 60 seconds

### Tasks Module

**Performance:**
- Index on (project_id, created_at)
- Bulk updates in transaction
- Pagination for 100+ tasks
- Client-side progress calculation

### Characters Module

**Optimization:**
- Lazy load character details
- Prompt generation server-side
- Cache prompts for 5 minutes
- Pagination for 50+ characters

## Error Handling

### Marketing Module

**Errors:**
- Project not found: 404
- Access denied: 403 with reason
- Plan doesn't allow: 403 with upgrade link
- No publishers: Return empty array

### Export Module

**Errors:**
- Project incomplete: 403 with progress
- Generation failed: 500 with retry option
- File too large: 413 with limit info
- Timeout: 504 with retry option

### Tasks Module

**Errors:**
- Task not found: 404
- Invalid context: 400 with valid options
- Bulk update partial failure: 207 with details
- Description empty: 400 with validation message

### Characters Module

**Errors:**
- Character not found: 404
- Name required: 400 with validation
- Prompt generation failed: 500 with retry
- Too many characters: 429 with limit info

## Future Enhancements

### Marketing Module (Phase 2)
- Track which publishers contacted
- Submission status tracking
- Publisher response notes
- Submission history

### Export Module (Phase 2)
- PDF export option
- ePub format for ebooks
- Custom formatting templates
- Cover page customization
- Table of contents generation

### Tasks Module (Phase 2)
- Task due dates
- Task priorities
- Task categories/tags
- Task assignee (for collaborators)
- Task comments/notes

### Characters Module (Phase 2)
- Character relationships graph
- Character appearance timeline
- Scene-character association tracking
- Character arc visualization
- AI-assisted character development

## Security Checklist

**All Modules:**
- ✅ RLS enabled on all tables
- ✅ Ownership verification on every request
- ✅ Soft delete for data retention
- ✅ Rate limiting on all endpoints
- ✅ Input validation and sanitization
- ✅ No SQL injection vulnerabilities
- ✅ No XSS vulnerabilities
- ✅ No CSRF vulnerabilities
- ✅ Secure file handling
- ✅ No data leakage across users
- ✅ Audit logging for admin actions
- ✅ HTTPS required for all requests

## Conclusion

These four modules extend Doooda with professional publishing workflow capabilities while maintaining user privacy, data security, and writing flow. Marketing respects subscription tiers, export generates industry-standard manuscripts, tasks integrate seamlessly into writing, and characters support consistent development across the project.

All features unlock at appropriate milestones, require explicit user action, and protect intellectual property at every step. The system encourages completion, facilitates submission, and supports writers throughout the journey from draft to published work.

---

**Status:** ✅ Complete
**Database Migrations:** 26 total (2 new: tasks, characters)
**Services:** 10 total (4 new: Tasks, Characters, Marketing, Export)
**Controllers:** 10 total (4 new: Tasks, Characters, Marketing, Export)
**API Endpoints:** 26 new endpoints across 4 modules
**Build Status:** ✅ Passing
**Date:** 2026-01-07
