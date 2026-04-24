# Progress, Goals, and Gamification Engine

## Overview

The Progress Engine is a motivation system designed to encourage writers without pressure or manipulation. It tracks real writing progress (scene content only), celebrates achievements, and provides encouraging feedback while respecting the writer's pace and schedule.

## Core Principles

### 1. Respect First
- No streak pressure
- No punishment for missed days
- No red warnings for inactivity
- Encouragement only, never guilt

### 2. Precision
- Count only actual writing (scene/subchapter content)
- Ignore summaries, titles, loglines
- Server-side calculations prevent tampering
- Delta tracking for additions only

### 3. Transparency
- All metrics clearly explained
- Progress bars show real completion
- Goals are optional and customizable
- Writers control their own pace

### 4. Security
- All calculations server-side
- Client values are hints only
- Rate limiting on endpoints
- Ownership verification on every request

## Word Count Engine

### What Counts as Writing

**INCLUDED:**
- Content in Scene/Subchapter main writing area
- Both Arabic and English text
- Space-separated tokens

**EXCLUDED:**
- Logline content
- Chapter summaries
- Scene summaries
- Scene titles
- HTML tags
- Formatting markers
- Images and media

### Word Count Calculation

**Algorithm:**
```javascript
function calculateWordCount(htmlContent) {
  // Strip all HTML tags
  const plainText = htmlContent.replace(/<[^>]+>/g, '');

  // Trim whitespace
  const trimmed = plainText.trim();

  // Split by whitespace
  const words = trimmed.split(/\s+/);

  // Filter empty strings
  const validWords = words.filter(w => w.length > 0);

  return validWords.length;
}
```

**Database Trigger:**
```sql
CREATE OR REPLACE FUNCTION calculate_scene_word_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.content IS NOT NULL THEN
    NEW.word_count = array_length(
      regexp_split_to_array(
        trim(regexp_replace(NEW.content, '<[^>]+>', '', 'g')),
        '\s+'
      ),
      1
    );
    IF NEW.word_count IS NULL THEN
      NEW.word_count = 0;
    END IF;
  ELSE
    NEW.word_count = 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Storage Hierarchy

```
Scene
├── word_count (calculated from content)
│
Chapter
├── word_count (SUM of scene word_counts)
│
Project
├── current_word_count (SUM of chapter word_counts)
├── target_word_count (optional goal)
└── last_word_count (for delta calculation)
```

### Real-Time Display

**In Editor Footer:**
```
Words: 1,247
```

**Updated:**
- Live as writer types (client-side estimate)
- Accurate on save (server calculation)

## Progress Tracking

### Scene Progress

**Binary Status:**
- Completed: 100%
- Incomplete: 0%

**Visual:**
- Checkmark icon when completed
- No checkmark when incomplete

**API Response:**
```json
{
  "sceneId": "uuid",
  "sceneTitle": "Opening Scene",
  "wordCount": 750,
  "completed": true
}
```

### Chapter Progress

**Formula:**
```javascript
chapterProgress = (completedScenes / totalScenes) * 100
```

**Examples:**
- 0 of 4 scenes → 0%
- 2 of 4 scenes → 50%
- 3 of 4 scenes → 75%
- 4 of 4 scenes → 100%

**Visual:**
- Progress bar with percentage
- Color coding:
  - Red: 0-30%
  - Yellow: 31-70%
  - Green: 71-100%

**API Response:**
```json
{
  "chapterId": "uuid",
  "chapterTitle": "Chapter One",
  "completedScenes": 3,
  "totalScenes": 4,
  "progress": 75,
  "wordCount": 2500
}
```

### Project Progress

**Formula:**
```javascript
projectProgress = (chaptersAt100Percent / totalChapters) * 100
```

**Important:** Only chapters at 100% completion count toward project progress. This encourages finishing chapters completely.

**Examples:**
- Chapter 1: 100%, Chapter 2: 75% → Project: 50%
- Chapter 1: 100%, Chapter 2: 100%, Chapter 3: 50% → Project: 67%
- All chapters 100% → Project: 100%

**API Response:**
```json
{
  "projectId": "uuid",
  "projectTitle": "My Novel",
  "currentWords": 5000,
  "targetWords": 80000,
  "wordProgress": 6,
  "completedChapters": 1,
  "totalChapters": 3,
  "chapterProgress": 33,
  "overallProgress": 33
}
```

### Word Progress (Optional)

**Formula:**
```javascript
wordProgress = (currentWords / targetWords) * 100
```

**Display:**
```
5,000 / 80,000 words (6%)
```

**Notes:**
- Only shown if target_word_count is set
- Caps at 100% even if exceeded
- Separate from chapter-based progress

## Project Goals

### Target Word Count

**Setup:**
- Optional field during project creation
- Editable anytime from project settings
- Can be null (no goal set)

**API:**
```
POST /goals/project/:projectId
{
  "targetWordCount": 80000
}
```

**Display:**
```
Current: 5,247 words
Target: 80,000 words
Progress: 7%
```

**Dashboard:**
- Shows written/target ratio
- Progress bar
- Visible in web (mobile later)

## Daily Writing Goals

### Writing Schedule

**Feature Name:**
```
حدد أوقات الكتابة / Writing Schedule
```

**Fields:**
1. **Days of Week** (checkboxes)
   - Sunday (0)
   - Monday (1)
   - Tuesday (2)
   - Wednesday (3)
   - Thursday (4)
   - Friday (5)
   - Saturday (6)

2. **Daily Word Goal** (number input)
   - Minimum: 1
   - Suggested: 500, 1000, 2000
   - Custom allowed

3. **Enabled** (toggle)
   - On: Schedule active
   - Off: Schedule disabled

**Storage Format:**
```json
{
  "days": [1, 2, 3, 4, 5],
  "dailyGoal": 1000,
  "enabled": true
}
```

**API:**
```
POST /goals/project/:projectId
{
  "writingSchedule": {
    "days": [1, 2, 3, 4, 5],
    "dailyGoal": 1000,
    "enabled": true
  }
}
```

### Goal Application Rules

**When Goal Applies:**
- Schedule is enabled
- Current day is in scheduled days array
- Daily goal > 0

**When Goal Doesn't Apply:**
- Schedule disabled
- Current day not in scheduled days
- Daily goal not set

**Example:**
```javascript
// Schedule: Monday-Friday, 1000 words/day
// Tuesday: Goal applies (1000 words)
// Saturday: Goal doesn't apply (not scheduled)
```

## Daily Session Tracking

### Session Creation

**Automatic Creation:**
- First write of the day creates session
- One session per (user, project, date) combination
- Date uses user's local timezone

**Session Data:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "projectId": "uuid",
  "sessionDate": "2026-01-07",
  "wordsWritten": 1247,
  "goalReached": true,
  "goalReachedAt": "2026-01-07T14:23:15Z",
  "createdAt": "2026-01-07T10:00:00Z",
  "updatedAt": "2026-01-07T14:23:15Z"
}
```

### Word Delta Tracking

**Delta Calculation:**
```javascript
oldWordCount = project.last_word_count
newWordCount = project.current_word_count
wordDelta = Math.max(0, newWordCount - oldWordCount)
```

**Rules:**
- Only count additions (positive delta)
- Ignore deletions (negative delta)
- Update session.words_written += wordDelta
- Update project.last_word_count = newWordCount

**Why Delta Tracking:**
- Prevents counting same words multiple times
- Tracks actual new words written today
- Ignores editing/deletion
- Accurate daily progress

### Daily Reset

**Reset Logic:**
- New date = new session
- Previous days remain in history
- No automatic carryover

**Timezone Handling:**
- Session date uses user's local timezone
- Stored as date only (no time component)
- Midnight determined by user's timezone

### Tamper Prevention

**Server-Side Only:**
- All calculations happen in GoalsService
- Client cannot manipulate word counts
- Database triggers verify goal reached
- Unique constraint prevents duplicate sessions

**Validation:**
```javascript
// Before creating/updating session
1. Verify project ownership
2. Verify date is not in future
3. Calculate delta from server data only
4. Update atomically in transaction
```

## Goal Achievement & Celebration

### Celebration Trigger

**Conditions:**
1. Goal is set (dailyGoal > 0)
2. Today is a scheduled day
3. Words written >= daily goal
4. Goal not yet reached today (prevent duplicates)

**Trigger Logic:**
```sql
CREATE OR REPLACE FUNCTION check_goal_reached()
RETURNS TRIGGER AS $$
DECLARE
  daily_goal integer;
  scheduled_days integer[];
  day_of_week integer;
BEGIN
  -- Get project schedule
  SELECT
    (writing_schedule->>'dailyGoal')::integer,
    array_agg((writing_schedule->'days')::integer)
  INTO daily_goal, scheduled_days
  FROM projects
  WHERE id = NEW.project_id;

  -- Get current day of week
  day_of_week = EXTRACT(DOW FROM NEW.session_date)::integer;

  -- Check if goal reached
  IF daily_goal > 0
     AND day_of_week = ANY(scheduled_days)
     AND NEW.words_written >= daily_goal
     AND NEW.goal_reached = false THEN
    NEW.goal_reached = true;
    NEW.goal_reached_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Celebration Messages

**Gender-Aware Arabic:**
```javascript
const getCelebrationMessage = (gender) => {
  if (gender === 'female') {
    return {
      ar: 'مرحى! إنجاز رائع، لقد حققتِ الهدف اليومي، استمري في الإبداع',
      en: "Bravo! You've reached your daily goal. Keep creating."
    };
  } else {
    // male or prefer_not_to_say
    return {
      ar: 'مرحى! إنجاز رائع، لقد حققت الهدف اليومي، استمر في الإبداع',
      en: "Bravo! You've reached your daily goal. Keep creating."
    };
  }
};
```

**Gender Field:**
- Stored in users table
- Values: 'male', 'female', 'prefer_not_to_say'
- Default: 'prefer_not_to_say' (uses male form)
- Editable from user settings

**Translation Notes:**
- Arabic verbs have grammatical gender
- "حققت" (masculine) vs "حققتِ" (feminine)
- English message is gender-neutral

### Celebration Display

**Visual:**
```
╔════════════════════════════════╗
║  🎉                            ║
║  مرحى! إنجاز رائع              ║
║  لقد حققت الهدف اليومي         ║
║  استمر في الإبداع             ║
║                                ║
║  Bravo!                        ║
║  You've reached your daily     ║
║  goal. Keep creating.          ║
╚════════════════════════════════╝
```

**Behavior:**
- Modal popup (center of screen)
- Optional soft sound effect
- Auto-dismiss after 5 seconds
- Manual close button (X)
- Shows once per day per project

**UX Rules:**
- Non-intrusive
- Encouraging tone
- No guilt if missed
- No daily streak counter

### API Response

**When Goal Reached:**
```json
{
  "celebrate": true,
  "message": {
    "ar": "مرحى! إنجاز رائع، لقد حققت الهدف اليومي، استمر في الإبداع",
    "en": "Bravo! You've reached your daily goal. Keep creating."
  },
  "goalReached": true,
  "wordsWritten": 1047,
  "dailyGoal": 1000
}
```

**When Goal Not Reached:**
```json
{
  "celebrate": false,
  "message": {
    "ar": "",
    "en": ""
  },
  "goalReached": false,
  "wordsWritten": 723,
  "dailyGoal": 1000
}
```

**When Not a Scheduled Day:**
```json
{
  "celebrate": false,
  "message": {
    "ar": "",
    "en": ""
  },
  "goalReached": false,
  "wordsWritten": 500,
  "dailyGoal": 0
}
```

## API Endpoints

### Progress Endpoints

#### GET /progress/project/:projectId
Get overall project progress.

**Response:**
```json
{
  "projectId": "uuid",
  "projectTitle": "My Novel",
  "currentWords": 5247,
  "targetWords": 80000,
  "wordProgress": 7,
  "completedChapters": 1,
  "totalChapters": 3,
  "chapterProgress": 33,
  "overallProgress": 33
}
```

#### GET /progress/chapter/:chapterId
Get single chapter progress.

**Response:**
```json
{
  "chapterId": "uuid",
  "chapterTitle": "Chapter One",
  "completedScenes": 3,
  "totalScenes": 4,
  "progress": 75,
  "wordCount": 2500
}
```

#### GET /progress/project/:projectId/chapters
Get all chapters progress for a project.

**Response:**
```json
[
  {
    "chapterId": "uuid-1",
    "chapterTitle": "Chapter One",
    "completedScenes": 4,
    "totalScenes": 4,
    "progress": 100,
    "wordCount": 3200
  },
  {
    "chapterId": "uuid-2",
    "chapterTitle": "Chapter Two",
    "completedScenes": 2,
    "totalScenes": 5,
    "progress": 40,
    "wordCount": 1800
  }
]
```

#### GET /progress/scene/:sceneId
Get single scene progress.

**Response:**
```json
{
  "sceneId": "uuid",
  "sceneTitle": "Opening Scene",
  "wordCount": 750,
  "completed": true
}
```

#### GET /progress/project/:projectId/daily?date=2026-01-07
Get daily progress for specific date.

**Query Parameters:**
- `date` (optional): ISO date string, defaults to today

**Response:**
```json
{
  "date": "2026-01-07",
  "wordsWritten": 1247,
  "goalReached": true,
  "dailyGoal": 1000,
  "scheduledDay": true
}
```

#### GET /progress/project/:projectId/week
Get last 7 days of progress.

**Response:**
```json
[
  {
    "date": "2026-01-01",
    "wordsWritten": 0,
    "goalReached": false,
    "dailyGoal": null,
    "scheduledDay": false
  },
  {
    "date": "2026-01-02",
    "wordsWritten": 1200,
    "goalReached": true,
    "dailyGoal": 1000,
    "scheduledDay": true
  },
  ...
]
```

#### GET /progress/project/:projectId/month
Get last 30 days of progress.

**Response:** Same format as week, but 30 days.

#### GET /progress/user/overall
Get overall stats for all user's projects.

**Response:**
```json
{
  "totalWords": 15247,
  "totalProjects": 3,
  "completedProjects": 1,
  "todayWords": 1247,
  "projects": [
    {
      "id": "uuid",
      "title": "My Novel",
      "words": 5247,
      "target": 80000,
      "progress": 33
    }
  ]
}
```

### Goals Endpoints

#### POST /goals/project/:projectId
Set or update project goals.

**Request:**
```json
{
  "targetWordCount": 80000,
  "writingSchedule": {
    "days": [1, 2, 3, 4, 5],
    "dailyGoal": 1000,
    "enabled": true
  }
}
```

**Response:**
```json
{
  "projectId": "uuid",
  "targetWordCount": 80000,
  "writingSchedule": {
    "days": [1, 2, 3, 4, 5],
    "dailyGoal": 1000,
    "enabled": true
  }
}
```

**Notes:**
- Can update targetWordCount alone
- Can update writingSchedule alone
- Can update both together
- Can set targetWordCount to null (remove goal)

#### GET /goals/project/:projectId
Get project goals and schedule.

**Response:**
```json
{
  "projectId": "uuid",
  "targetWordCount": 80000,
  "writingSchedule": {
    "days": [1, 2, 3, 4, 5],
    "dailyGoal": 1000,
    "enabled": true
  }
}
```

#### GET /goals/project/:projectId/today
Get today's progress and goal status.

**Response:**
```json
{
  "date": "2026-01-07",
  "wordsWritten": 723,
  "goalReached": false,
  "dailyGoal": 1000,
  "isScheduledDay": true
}
```

#### POST /goals/project/:projectId/track
Track word delta and check for celebration.

**Request:**
```json
{
  "oldWordCount": 4500,
  "newWordCount": 5247
}
```

**Response:**
```json
{
  "celebrate": true,
  "message": {
    "ar": "مرحى! إنجاز رائع، لقد حققت الهدف اليومي، استمر في الإبداع",
    "en": "Bravo! You've reached your daily goal. Keep creating."
  },
  "goalReached": true,
  "wordsWritten": 1247,
  "dailyGoal": 1000
}
```

**Notes:**
- Called after scene save
- Calculates delta server-side
- Updates daily session
- Returns celebration if goal just reached

#### GET /goals/user/stats
Get streak stats for last 30 days.

**Response:**
```json
{
  "last30Days": {
    "writingDays": 18,
    "goalsReached": 14,
    "totalWords": 23500
  }
}
```

**Notes:**
- Shows activity, not streaks
- No pressure for consecutive days
- Encouraging summary only

## Integration with Writing Flow

### Scene Save Flow

**Frontend:**
1. Writer types in scene editor
2. Live word counter shows estimate
3. Writer clicks "Save"
4. Frontend sends scene content to backend

**Backend:**
1. ScenesService.updateScene() processes content
2. Database trigger calculates word_count
3. Database trigger updates chapter progress
4. Database trigger updates project progress
5. GoalsService.trackWordDelta() called
6. Calculate delta: new - old word count
7. Update or create daily session
8. Check if goal reached
9. Return celebration message if applicable

**Frontend Response:**
1. Scene saved successfully
2. Word count updated
3. If celebrate === true:
   - Show celebration modal
   - Play soft sound (optional)
   - Auto-dismiss after 5 seconds

**Flow Diagram:**
```
Writer saves scene
  ↓
Scene word_count updated (trigger)
  ↓
Chapter word_count updated (trigger)
  ↓
Chapter progress_percentage updated (trigger)
  ↓
Project current_word_count updated (trigger)
  ↓
Project progress_percentage updated (trigger)
  ↓
GoalsService.trackWordDelta()
  ↓
Calculate delta (additions only)
  ↓
Update daily_writing_session
  ↓
Check goal_reached (trigger)
  ↓
Return celebration message
  ↓
Frontend shows celebration (if applicable)
```

### Project Dashboard Flow

**On Dashboard Load:**
1. GET /progress/user/overall
2. Display total words, projects, today's words
3. Show list of all projects with progress bars

**On Project Page Load:**
1. GET /progress/project/:projectId
2. Show project progress card
3. Show word count progress (if target set)
4. GET /goals/project/:projectId/today
5. Show today's progress widget
6. Display writing schedule (if set)

**Today's Progress Widget:**
```
╔═══════════════════════════════╗
║ Today's Progress              ║
║ ───────────────────────────── ║
║ Words Written: 723 / 1,000    ║
║ [████████░░] 72%              ║
║ Keep going! 277 words to go   ║
╚═══════════════════════════════╝
```

## Security & Tamper Prevention

### Server-Side Calculations

**All Word Counts:**
- Calculated by database triggers
- Client cannot manipulate
- Verified on every save

**All Deltas:**
- Calculated in GoalsService
- Uses server-stored last_word_count
- Client values ignored

**All Progress:**
- Calculated by database triggers
- Based on scene.completed flag
- Client cannot fake completion

### Ownership Verification

**Every Request:**
```javascript
async function verifyProjectOwnership(projectId, userId) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: userId,
      deletedAt: null
    }
  });

  if (!project) {
    throw new NotFoundException('Project not found');
  }

  return project;
}
```

**Multi-Level Checks:**
- Scene → Chapter → Project → User
- Prevents cross-user access
- RLS at database level

### Rate Limiting

**Recommended Limits:**
- Scene save: 60 per hour
- Progress fetch: 120 per hour
- Goal update: 10 per hour

**Implementation:**
```javascript
@Throttle(60, 3600) // 60 requests per hour
async updateScene() { ... }
```

### Data Integrity

**Unique Constraints:**
```sql
-- One logline per project
UNIQUE (project_id) WHERE deleted_at IS NULL

-- One session per user per project per day
UNIQUE (user_id, project_id, session_date)

-- One position per chapter
UNIQUE (project_id, position) WHERE deleted_at IS NULL
```

**Check Constraints:**
```sql
-- Word counts non-negative
CHECK (word_count >= 0)

-- Progress percentage 0-100
CHECK (progress_percentage >= 0 AND progress_percentage <= 100)

-- Target word count positive
CHECK (target_word_count > 0)
```

## Gamification Limits

### What We DO NOT Do

**No Streak Pressure:**
- No consecutive day counters
- No "Don't break your streak!" messages
- No loss aversion tactics

**No Punishment:**
- No red warnings for inactivity
- No "You haven't written in X days"
- No guilt messages

**No Manipulation:**
- No forced notifications
- No daily reminders (unless user opts in)
- No artificial urgency

**No Social Pressure:**
- No public leaderboards
- No comparisons with other users
- No "User X wrote 5000 words today"

### What We DO

**Positive Reinforcement:**
- Celebrate achievements
- Show progress clearly
- Acknowledge effort

**User Control:**
- Goals are optional
- Schedule is customizable
- Can disable anytime

**Transparency:**
- Clear metrics
- Honest progress bars
- No hidden algorithms

**Respect:**
- Writer's pace is their own
- No pressure to write daily
- Encouraging, not demanding

## Edge Cases & Error Handling

### Edge Case: Time Zones

**Scenario:** User travels across time zones while writing.

**Solution:**
- Session date based on project's timezone (stored)
- Or user's current timezone setting
- Clear which date is being tracked

**API:**
```javascript
GET /goals/project/:projectId/today?timezone=America/New_York
```

### Edge Case: Deleted Content

**Scenario:** User writes 1000 words, then deletes 500.

**Solution:**
- Delta = 1000 (initial write)
- Delta = 0 (deletion ignored)
- Net words tracked = 1000
- Actual project words = 500

**Why:**
- Encourages writing, not editing
- Editing is part of the process
- Goal is to write, not to keep everything

### Edge Case: Goal Reached Multiple Times

**Scenario:** User reaches goal, continues writing, saves again.

**Solution:**
- `goal_reached` flag prevents duplicate celebrations
- Once true, stays true for that day
- New day = new session = new opportunity

**Database Trigger:**
```sql
IF NEW.goal_reached = false AND words >= goal THEN
  NEW.goal_reached = true;
  NEW.goal_reached_at = now();
END IF;
```

### Edge Case: Midnight Boundary

**Scenario:** User writing at 11:58 PM, saves at 12:02 AM.

**Solution:**
- Two separate sessions created
- Words before midnight → yesterday's session
- Words after midnight → today's session
- Frontend warns near midnight

### Edge Case: Multiple Projects

**Scenario:** User writes in 3 different projects in one day.

**Solution:**
- Separate session for each project
- Each has own goal and schedule
- Overall stats aggregate all projects

**API:**
```javascript
GET /goals/user/stats
// Returns combined stats across all projects
```

### Edge Case: No Schedule Set

**Scenario:** User hasn't set writing schedule.

**Solution:**
- Daily goal = null
- Progress still tracked
- No celebration (no goal to reach)
- Words counted toward project total

### Edge Case: Disabled Schedule

**Scenario:** User has schedule but disabled it.

**Solution:**
- Treat as if no schedule set
- No goals apply
- Progress still tracked
- Can re-enable anytime

### Error Handling

**Network Failure During Save:**
- Frontend retries automatically
- Autosave in localStorage prevents data loss
- On reconnect, sync with server

**Invalid Goal Values:**
- Negative word count → reject with 400
- Daily goal > 1,000,000 → warn but allow
- Days array empty → valid (effectively disabled)

**Database Trigger Failure:**
- Transaction rolls back
- Scene save fails
- Frontend shows error
- User can retry

**Race Condition:**
- Multiple saves in quick succession
- Use database transactions
- Last save wins
- Delta calculated correctly each time

## Mobile Compatibility Preparation

### API Readiness

All endpoints are mobile-ready:
- RESTful design
- JSON responses
- Token authentication
- Rate limiting

### Data Sync

**Recommended Strategy:**
- Mobile app polls for updates
- Or uses webhooks for real-time
- Optimistic updates with rollback
- Conflict resolution server-side

### Offline Support

**Recommendations:**
- Cache progress data locally
- Queue writes when offline
- Sync when back online
- Show "Syncing..." indicator

**Not Implemented Yet:**
- Mobile-specific endpoints can be added
- Push notifications (future)
- Native mobile UI (future)

## Testing Scenarios

### Scenario 1: First-Time Writer

1. User creates project
2. Sets target: 50,000 words
3. Sets schedule: Mon-Fri, 500 words/day
4. Writes first scene: 523 words
5. Saves scene
6. Session created, goal reached
7. Celebration shown
8. Dashboard shows 523 / 50,000 words

### Scenario 2: Multi-Day Progress

**Monday:**
- Writes 547 words
- Goal: 500 words
- Goal reached, celebration shown

**Tuesday:**
- Writes 623 words
- Goal: 500 words
- Goal reached, celebration shown

**Wednesday:**
- Writes 312 words
- Goal: 500 words
- Goal NOT reached, no celebration
- Progress bar shows 312 / 500

**Saturday (not scheduled):**
- Writes 800 words
- No goal for today
- No celebration
- Words still counted toward project

### Scenario 3: Editing vs Writing

**Initial State:**
- Project word count: 5000

**User Actions:**
1. Opens scene with 1000 words
2. Edits: Removes 200 words, adds 300 words
3. Saves scene

**Result:**
- Scene now has 1100 words (net +100)
- Delta = +100 (from 1000 to 1100)
- Daily session += 100 words
- Project word count: 5100 words

### Scenario 4: Multiple Projects

**Morning:**
- Project A: Write 600 words
- Project A goal: 500 words
- Celebration for Project A

**Afternoon:**
- Project B: Write 800 words
- Project B goal: 1000 words
- No celebration (not reached)

**Evening:**
- Project B: Write 300 more words
- Project B total today: 1100 words
- Celebration for Project B

**Result:**
- Two separate sessions
- Two celebrations (one per project)
- Overall stats: 1900 words today

### Scenario 5: Goal Adjustment

**Initial:**
- Daily goal: 500 words
- User writes 450 words
- Goal not reached

**User increases goal:**
- New daily goal: 400 words
- Saves goal update

**Result:**
- Existing session recalculated (trigger)
- 450 >= 400, so goal_reached = true
- No celebration (already past threshold)
- Next day: New session, fresh start

### Scenario 6: Time Zone Travel

**Scenario:**
- User in New York (EST)
- Writes 500 words at 11:00 PM
- Flies to Los Angeles (PST)
- Arrives at 11:00 PM PST (2:00 AM EST next day)
- Writes 300 more words

**Result:**
- If using user's current timezone:
  - 500 words → today's session (EST)
  - 300 words → today's session (PST, same day)
  - Total today: 800 words
- If using fixed timezone:
  - 500 words → day 1
  - 300 words → day 2

**Recommendation:** Use project's fixed timezone, warn user if changed.

## Performance Considerations

### Database Queries

**Optimized:**
- Index on (user_id, session_date)
- Index on (project_id, session_date)
- Cached project schedule in memory

**Batch Operations:**
- Week/month queries use single query
- Aggregate in database, not application
- Return minimal data

### Trigger Performance

**Word Count Calculation:**
- Runs on INSERT/UPDATE only
- Regex is fast for typical content
- No performance issues up to 10,000 words

**Progress Calculation:**
- Cascades automatically
- Uses efficient SUM/COUNT
- Only updates affected rows

### Caching Strategy

**Recommended:**
- Cache project progress for 5 minutes
- Cache daily session for 1 minute
- Invalidate on write
- Use Redis for distributed caching

### Rate Limiting

**Protects Against:**
- Accidental loops
- Malicious spam
- DOS attacks

**Recommended Limits:**
- Scene save: 60/hour per user
- Progress fetch: 120/hour per user
- Goal update: 10/hour per user

## Analytics & Admin View

### User Analytics (Admin Only)

**Aggregate Stats:**
- Total users with goals set
- Average daily word count across users
- Goal completion rate
- Most active writing days

**Individual User Stats:**
- Writing consistency
- Average words per session
- Projects in progress
- Completion rate

**Queries:**
```sql
-- Most active users today
SELECT user_id, SUM(words_written) as total
FROM daily_writing_sessions
WHERE session_date = CURRENT_DATE
GROUP BY user_id
ORDER BY total DESC
LIMIT 10;

-- Goal completion rate last 30 days
SELECT
  COUNT(*) FILTER (WHERE goal_reached) * 100.0 / COUNT(*) as rate
FROM daily_writing_sessions
WHERE session_date >= CURRENT_DATE - INTERVAL '30 days';
```

### Privacy

**User Data:**
- Admin can view aggregate stats
- Individual data only with user consent
- No public leaderboards
- No cross-user comparisons

## Future Enhancements (Not Implemented)

### Phase 2 Features

**Advanced Goals:**
- Weekly goals (in addition to daily)
- Monthly word count targets
- Chapter completion deadlines

**Insights:**
- Writing time patterns (peak hours)
- Productivity trends over time
- Correlation between schedule adherence and progress

**Achievements (Optional):**
- First 1,000 words
- First completed chapter
- First completed project
- Milestones (10k, 50k, 100k words)

### Phase 3 Features

**Social (Opt-In):**
- Share progress with writing group
- Accountability partners
- Writing challenges (time-boxed events)

**Notifications (Opt-In):**
- Daily writing reminder (user-scheduled)
- Weekly progress summary
- Monthly achievement report

**Integrations:**
- Export progress to calendar
- Writing stats in email digest
- API for third-party apps

## Conclusion

The Progress, Goals, and Gamification Engine motivates writers through positive reinforcement, clear metrics, and optional goals. It respects the writer's pace, prevents manipulation, and ensures data integrity through server-side calculations.

All word counts are tamper-proof, all progress is transparent, and all celebrations are earned. The system encourages without pressuring, celebrates without comparing, and tracks without judging.

Writers control their own goals and schedule. The system adapts to their needs, not the other way around.

---

**Status:** ✅ Complete
**Database Migrations:** 24 total (3 new for Progress Engine)
**Services:** 6 total (2 new)
**Controllers:** 6 total (2 new)
**API Endpoints:** 15 progress/goals endpoints
**Build Status:** ✅ Passing
**Date:** 2026-01-07
