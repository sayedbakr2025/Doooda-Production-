# Idea Bank — Architecture & Design Document

**Status:** DESIGN ONLY — No implementation until approved.
**Date:** 2026-05-24
**Author:** Architecture phase per user request

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Literary Type System — Hierarchy Abstraction](#2-literary-type-system--hierarchy-abstraction)
3. [Database Schema](#3-database-schema)
4. [API Contract Design](#4-api-contract-design)
5. [Voting System](#5-voting-system)
6. [Permissions & Sharing](#6-permissions--sharing)
7. [Import Engine Strategy](#7-import-engine-strategy)
8. [Comment & Mention Integration](#8-comment--mention-integration)
9. [Realtime Strategy](#9-realtime-strategy)
10. [Performance Strategy](#10-performance-strategy)
11. [Migration Strategy](#11-migration-strategy)
12. [Phased Execution Plan](#12-phased-execution-plan)
13. [Risk Analysis](#13-risk-analysis)
14. [Rollback Strategy](#14-rollback-strategy)
15. [Rendering Strategy](#15-rendering-strategy)

---

## 1. Architecture Overview

The Idea Bank is a **pre-plot collaborative ideation system** that sits as the first section in ProjectWorkspace, before Plot. It allows teams to propose, compare, vote on, and finalize narrative ideas before importing the finalized structure into the Plot Editor.

### Key Principles

- **Non-destructive by default**: Idea Bank is isolated from Plot. Import is explicit and destructive (with confirmation).
- **Hierarchy-driven**: Structure mirrors the project's literary type (Novel → Chapter → Scene, Film Script → Scene, etc.)
- **Horizontal competition**: Multiple ideas compete per narrative slot, displayed side-by-side.
- **Existing systems untouched**: Comments, mentions, notifications, and navigation systems are reused, not rebuilt.

### Section Order in ProjectWorkspace

```
Current:  Plot → Chapters → Characters/References → Notes → Collaborators → Activity

Proposed: Idea Bank → Plot → Chapters → Characters/References → Notes → Collaborators → Activity
              ^NEW
```

---

## 2. Literary Type System — Hierarchy Abstraction

### Current State

The existing `projectTypeConfig.ts` already defines hierarchy metadata per `ProjectType`:

```typescript
containerLabelEn: 'Chapter'  // Level 1 (container)
unitLabelEn: 'Scene'          // Level 2 (unit)
hasLevel2: true               // Whether there's a 2-level hierarchy
```

This is UI-only labeling. The **database** hardcodes `chapters` + `scenes` for all types.

### Proposed: Hierarchy Definition Schema

A new `literary_type_configs` table that drives both UI labels AND structural depth:

```sql
CREATE TABLE literary_type_configs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_type  TEXT NOT NULL UNIQUE,  -- 'novel', 'film_script', etc.
  
  -- Level 0 (always exists): The project itself
  -- Level 1 definition
  level_1_singular_en  TEXT NOT NULL,  -- 'Chapter', 'Scene', 'Page', 'Episode'
  level_1_singular_ar  TEXT NOT NULL,
  level_1_plural_en    TEXT NOT NULL,  -- 'Chapters', 'Scenes', etc.
  level_1_plural_ar    TEXT NOT NULL,
  level_1_icon         TEXT NOT NULL,  -- Emoji or icon key
  
  -- Level 2 definition (NULL if has_level_2 is false)
  level_2_singular_en  TEXT,
  level_2_singular_ar  TEXT,
  level_2_plural_en    TEXT,
  level_2_plural_ar    TEXT,
  level_2_icon         TEXT,
  
  has_level_2          BOOLEAN NOT NULL DEFAULT true,
  has_script_fields    BOOLEAN NOT NULL DEFAULT false,
  has_sound_fields     BOOLEAN NOT NULL DEFAULT false,
  has_children_fields  BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Seeded Data

| project_type | level_1_singular_en | has_level_2 | level_2_singular_en |
|---|---|---|---|
| novel | Chapter | true | Scene |
| short_story | Chapter | true | Scene |
| long_story | Chapter | true | Scene |
| book | Chapter | true | Subheading |
| film_script | Scene | false | — |
| tv_series | Episode | true | Scene |
| theatre_play | Act | true | Scene |
| radio_series | Episode | true | Scene |
| children_story | Page | false | — |

### Frontend Access Pattern

```typescript
// New hook: useLiteraryTypeConfig(projectType)
// Returns: { levels: [{ key, singular, plural, icon }], hasScriptFields, ... }
// Idea Bank uses this to build its hierarchy dynamically
```

### Impact on Existing Code

- `projectTypeConfig.ts` continues to work. Idea Bank reads from the same `PROJECT_TYPE_CONFIGS` initially.
- Phase 1 adds the DB table. Frontend migration to DB-driven config is optional/future.
- **No existing code is changed in Phase 1.** The config table is additive.

---

## 3. Database Schema

### 3.1 Idea Bank Core Tables

```sql
-- ============================================================
-- IDEA BANK: Core Tables
-- ============================================================

-- Top-level container for a project's Idea Bank
CREATE TABLE idea_banks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(project_id)  -- One Idea Bank per project
);

-- Narrative slots represent structural positions in the story hierarchy
-- For Novel: Level 1 = Chapter slot, Level 2 = Scene slot
-- For Film Script: Level 1 = Scene slot (no Level 2)
-- level_1 slots contain level_2 slots (if has_level_2)
CREATE TABLE idea_slots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_bank_id  UUID NOT NULL REFERENCES idea_banks(id) ON DELETE CASCADE,
  parent_slot_id UUID REFERENCES idea_slots(id) ON DELETE CASCADE,  -- NULL for level-1 slots
  level         SMALLINT NOT NULL DEFAULT 1,  -- 1 = container, 2 = unit
  position      INTEGER NOT NULL DEFAULT 0,   -- Order among siblings
  title         TEXT,
  summary       TEXT,
  
  -- Metadata
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Each competing idea in a slot
CREATE TABLE idea_cards (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id       UUID NOT NULL REFERENCES idea_slots(id) ON DELETE CASCADE,
  
  -- Content
  title         TEXT NOT NULL,
  summary       TEXT,
  content       TEXT,            -- Rich text / markdown body
  
  -- State machine
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'finalized', 'dimmed', 'archived')),
  
  -- Ordering within the slot (horizontal position)
  position      INTEGER NOT NULL DEFAULT 0,
  
  -- Authorship
  created_by    UUID REFERENCES users(id),
  
  -- Timestamps
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  deleted_at    TIMESTAMPTZ  -- Soft delete
);

-- Indexes
CREATE INDEX idx_idea_slots_bank ON idea_slots(idea_bank_id);
CREATE INDEX idx_idea_slots_parent ON idea_slots(parent_slot_id);
CREATE INDEX idx_idea_cards_slot ON idea_cards(slot_id);
CREATE INDEX idx_idea_cards_status ON idea_cards(status);
CREATE INDEX idx_idea_cards_created_by ON idea_cards(created_by);
```

### 3.2 Voting System Tables

```sql
-- ============================================================
-- VOTING SYSTEM
-- ============================================================

-- Poll attached to a slot (optional)
CREATE TABLE idea_polls (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id       UUID NOT NULL UNIQUE REFERENCES idea_slots(id) ON DELETE CASCADE,
  created_by    UUID REFERENCES users(id),
  is_open       BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  closed_at     TIMESTAMPTZ
);

-- Individual vote: one per user per slot
CREATE TABLE idea_votes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id       UUID NOT NULL REFERENCES idea_polls(id) ON DELETE CASCADE,
  idea_card_id  UUID NOT NULL REFERENCES idea_cards(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id),
  
  created_at    TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(poll_id, user_id)  -- One vote per user per poll/slot
);

CREATE INDEX idx_idea_votes_poll ON idea_votes(poll_id);
CREATE INDEX idx_idea_votes_idea_card ON idea_votes(idea_card_id);
CREATE INDEX idx_idea_votes_user ON idea_votes(user_id);
```

### 3.3 Idea Bank Permissions Extension

```sql
-- ============================================================
-- IDEA BANK: Sharing / Permissions
-- ============================================================

-- Extend existing project_collaborators with Idea Bank scope
-- Reuse project_collaborators table, add scope_type = 'idea_bank'

-- New Idea Bank specific role enum:
-- ALTER TYPE collaborator_role ADD VALUE 'voter';  -- not needed, use separate table

-- Dedicated Idea Bank sharing (for standalone Idea Bank access without project access)
CREATE TABLE idea_bank_collaborators (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_bank_id    UUID NOT NULL REFERENCES idea_banks(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  role            TEXT NOT NULL CHECK (role IN ('viewer', 'voter', 'editor'))
                  DEFAULT 'viewer',
  status          TEXT NOT NULL CHECK (status IN ('pending', 'active', 'frozen', 'rejected'))
                  DEFAULT 'pending',
  invited_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_idea_bank_collabs_bank ON idea_bank_collaborators(idea_bank_id);
CREATE INDEX idx_idea_bank_collabs_user ON idea_bank_collaborators(user_id);

-- Permission resolution:
-- 1. Project collaborators with 'project' scope_type get automatic Idea Bank access
--    (inherited role: viewer → viewer, editor → editor, manager → editor)
-- 2. idea_bank_collaborators provides standalone access for non-project-members
-- 3. Effective role = MAX(project_collab_role, idea_bank_collab_role)
--    where voter < viewer < editor
```

### 3.4 Comments Integration (Reuse Existing)

```sql
-- ============================================================
-- COMMENTS: Reuse existing tables with polymorphic association
-- ============================================================

-- Approach: Add comment scope to existing comments table
-- OR: Create a lightweight junction table

-- Option A (RECOMMENDED): Extend existing comments with entity_type
CREATE TABLE idea_comments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_bank_id  UUID NOT NULL REFERENCES idea_banks(id) ON DELETE CASCADE,
  idea_card_id  UUID NOT NULL REFERENCES idea_cards(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id),
  content      TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  
  -- For threaded replies
  parent_id     UUID REFERENCES idea_comments(id) ON DELETE CASCADE,
  
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_idea_comments_card ON idea_comments(idea_card_id);
CREATE INDEX idx_idea_comments_bank ON idea_comments(idea_bank_id);
CREATE INDEX idx_idea_comments_parent ON idea_comments(parent_id);
```

### 3.5 Activity Logging Extension

```sql
-- Reuse existing project_activity table, add new action types:
-- 'idea_created', 'idea_finalized', 'idea_voted', 'idea_imported', 'poll_opened', 'poll_closed'
-- No schema change needed — the action column is TEXT.
```

### 3.6 TypeScript Types

```typescript
// New types to add to src/types/index.ts

export type IdeaCardStatus = 'active' | 'finalized' | 'dimmed' | 'archived';
export type IdeaBankRole = 'viewer' | 'voter' | 'editor';

export interface IdeaBank {
  id: string;
  project_id: string;
  created_at: string;
  updated_at: string;
}

export interface IdeaSlot {
  id: string;
  idea_bank_id: string;
  parent_slot_id: string | null;
  level: 1 | 2;
  position: number;
  title: string | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined (fetched separately)
  ideas?: IdeaCard[];
  child_slots?: IdeaSlot[];
  poll?: IdeaPoll | null;
}

export interface IdeaCard {
  id: string;
  slot_id: string;
  title: string;
  summary: string | null;
  content: string | null;
  status: IdeaCardStatus;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  
  // Joined (fetched separately)
  vote_count?: number;
  user_vote?: boolean;
  comment_count?: number;
  created_by_name?: string;
}

export interface IdeaPoll {
  id: string;
  slot_id: string;
  created_by: string | null;
  is_open: boolean;
  created_at: string;
  closed_at: string | null;
}

export interface IdeaVote {
  id: string;
  poll_id: string;
  idea_card_id: string;
  user_id: string;
  created_at: string;
}

export interface IdeaComment {
  id: string;
  idea_bank_id: string;
  idea_card_id: string;
  user_id: string;
  content: string;
  status: 'open' | 'resolved';
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  
  // Joined
  user_display_name?: string;
  replies?: IdeaComment[];
}

export interface IdeaBankCollaborator {
  id: string;
  idea_bank_id: string;
  user_id: string;
  role: IdeaBankRole;
  status: 'pending' | 'active' | 'frozen' | 'rejected';
  invited_by: string | null;
  created_at: string;
  display_name?: string;
  pen_name?: string;
  email?: string;
}
```

---

## 4. API Contract Design

### 4.1 Idea Bank CRUD

```typescript
// --- Idea Bank ---
GET    /api/idea-banks/:projectId              → IdeaBank
POST   /api/idea-banks                          → IdeaBank (auto-creates if not exists)

// --- Idea Slots ---
GET    /api/idea-banks/:bankId/slots           → IdeaSlot[] (tree structure)
POST   /api/idea-banks/:bankId/slots           → IdeaSlot
PATCH  /api/idea-slots/:slotId                 → IdeaSlot
DELETE /api/idea-slots/:slotId                 → void
POST   /api/idea-banks/:bankId/slots/reorder   → void
  // Body: { slots: [{ id, position, parent_slot_id? }] }

// --- Idea Cards ---
GET    /api/idea-slots/:slotId/ideas           → IdeaCard[]
POST   /api/idea-slots/:slotId/ideas           → IdeaCard
PATCH  /api/idea-cards/:ideaId                 → IdeaCard
DELETE /api/idea-cards/:ideaId                 → void (soft delete)
POST   /api/idea-slots/:slotId/ideas/reorder    → void
  // Body: { ideas: [{ id, position }] }

// --- Idea Card Finalization ---
PATCH  /api/idea-cards/:ideaId/finalize         → IdeaCard
  // Sets this card to 'finalized', all other cards in the same slot to 'dimmed'
  // Only one finalized card per slot allowed
  // Fails if slot has unresolved poll (optional check)

PATCH  /api/idea-cards/:ideaId/unfinalize       → IdeaCard
  // Reverts to 'active', restores all 'dimmed' cards to 'active'
```

### 4.2 Voting

```typescript
// --- Polls ---
POST   /api/idea-slots/:slotId/poll            → IdeaPoll (create/open)
PATCH  /api/idea-polls/:pollId/close            → IdeaPoll (close voting)
PATCH  /api/idea-polls/:pollId/reopen           → IdeaPoll (reopen voting)
GET    /api/idea-polls/:pollId/results          → { idea_card_id: vote_count }[]

// --- Votes ---
POST   /api/idea-polls/:pollId/vote             → IdeaVote
  // Body: { idea_card_id: string }
  // One vote per user per poll. Changes existing vote if already voted.
DELETE /api/idea-polls/:pollId/vote              → void (remove own vote)

GET    /api/idea-polls/:pollId/votes             → IdeaVote[] (visible to all)
```

### 4.3 Comments on Ideas

```typescript
GET    /api/idea-cards/:ideaCardId/comments      → IdeaComment[]
POST   /api/idea-cards/:ideaCardId/comments      → IdeaComment
  // Body: { content: string, parent_id?: string }
PATCH  /api/idea-cards/:ideaCardId/comments/:commentId → IdeaComment (resolve/reopen)
DELETE /api/idea-cards/:ideaCardId/comments/:commentId  → void
```

### 4.4 Sharing & Permissions

```typescript
GET    /api/idea-banks/:bankId/collaborators     → IdeaBankCollaborator[]
POST   /api/idea-banks/:bankId/collaborators     → IdeaBankCollaborator
  // Body: { email, role }
PATCH  /api/idea-banks/:bankId/collaborators/:id  → IdeaBankCollaborator (change role/status)
DELETE /api/idea-banks/:bankId/collaborators/:id  → void
GET    /api/idea-banks/:bankId/my-role            → IdeaBankRole | null
```

### 4.5 Import

```typescript
POST   /api/idea-banks/:bankId/import-to-plot    → ImportResult
  // Validates: all level-2 slots must have a finalized idea
  // Destructive: deletes existing plot structure, creates new from finalized ideas
  // Transactional: rolls back on failure
  
  // Response:
  // { success: boolean, chapters_created: number, scenes_created: number, error?: string }
```

### 4.6 Supabase Client-Side Functions (api.ts additions)

```typescript
// All functions follow existing api.ts patterns (Supabase client, RLS-protected)

export async function getIdeaBank(projectId: string): Promise<IdeaBank>
export async function createIdeaBank(projectId: string): Promise<IdeaBank>

export async function getIdeaSlots(bankId: string): Promise<IdeaSlot[]>
export async function createIdeaSlot(bankId: string, data: { title?, summary?, parent_slot_id?, level, position }): Promise<IdeaSlot>
export async function updateIdeaSlot(slotId: string, updates: Partial<IdeaSlot>): Promise<IdeaSlot>
export async function deleteIdeaSlot(slotId: string): Promise<void>
export async function reorderIdeaSlots(bankId: string, slots: Array<{ id: string; position: number; parent_slot_id?: string | null }>): Promise<void>

export async function getIdeaCards(slotId: string): Promise<IdeaCard[]>
export async function createIdeaCard(slotId: string, data: { title: string; summary?; content? }): Promise<IdeaCard>
export async function updateIdeaCard(ideaId: string, updates: Partial<IdeaCard>): Promise<IdeaCard>
export async function deleteIdeaCard(ideaId: string): Promise<void>  // soft delete
export async function finalizeIdeaCard(ideaId: string): Promise<IdeaCard>
export async function unfinalizeIdeaCard(ideaId: string): Promise<IdeaCard>
export async function reorderIdeaCards(slotId: string, ideas: Array<{ id: string; position: number }>): Promise<void>

export async function createPoll(slotId: string): Promise<IdeaPoll>
export async function closePoll(pollId: string): Promise<IdeaPoll>
export async function reopenPoll(pollId: string): Promise<IdeaPoll>
export async function getPollResults(pollId: string): Promise<Record<string, number>>
export async function voteOnIdea(pollId: string, ideaCardId: string): Promise<IdeaVote>
export async function removeVote(pollId: string): Promise<void>
export async function getPollVotes(pollId: string): Promise<IdeaVote[]>

export async function getIdeaComments(ideaCardId: string): Promise<IdeaComment[]>
export async function addIdeaComment(ideaCardId: string, content: string, parentId?: string): Promise<IdeaComment>
export async function resolveIdeaComment(commentId: string): Promise<void>
export async function deleteIdeaComment(commentId: string): Promise<void>

export async function getIdeaBankCollaborators(bankId: string): Promise<IdeaBankCollaborator[]>
export async function addIdeaBankCollaborator(bankId: string, userId: string, role: IdeaBankRole): Promise<IdeaBankCollaborator>
export async function updateIdeaBankCollaborator(collaboratorId: string, updates: { role?; status? }): Promise<void>
export async function removeIdeaBankCollaborator(collaboratorId: string): Promise<void>
export async function getMyIdeaBankRole(bankId: string): Promise<IdeaBankRole | null>

export async function importIdeaBankToPlot(bankId: string): Promise<ImportResult>
```

---

## 5. Voting System

### 5.1 Data Model

- A **poll** is attached to a slot (1:1). Optional — not every slot needs a poll.
- A **vote** connects a user to an idea card within a poll.
- **One vote per user per poll** (enforced by `UNIQUE(poll_id, user_id)`).
- Changing a vote = DELETE old + INSERT new (or UPDATE via `ON CONFLICT`).

### 5.2 Vote Lifecycle

```
1. Editor/Owner creates poll on a slot → idea_polls row (is_open = true)
2. Voters cast votes → idea_votes rows (one per user per poll)
3. Voters can change vote → UPDATE idea_cards SET idea_card_id = new_card_id WHERE user_id = me
4. Owner closes poll → idea_polls SET is_open = false, closed_at = now()
5. Closed polls: votes are frozen, vote counts visible
6. Finalizing an idea is INDEPENDENT of poll results
```

### 5.3 Vote Counting

```sql
-- View for live vote counts
CREATE VIEW idea_vote_counts AS
SELECT 
  ic.id AS idea_card_id,
  ic.slot_id,
  COUNT(iv.id) AS vote_count
FROM idea_cards ic
LEFT JOIN idea_votes iv ON iv.idea_card_id = ic.id
GROUP BY ic.id, ic.slot_id;
```

### 5.4 UI Behavior

- Active poll: each idea card shows vote percentage bar
- Voter identities visible (click to see who voted for what)
- Owner can close/reopen polls
- `voter` role can vote but not create/edit ideas
- Finalization is manual — doesn't auto-select the winner

---

## 6. Permissions & Sharing

### 6.1 Role Hierarchy

```
Owner (project.user_id) → Full control + Idea Bank management
Editor → Create/edit/delete ideas, create polls, finalize ideas
Voter → View + vote on polls only (cannot create/edit/delete ideas)
Viewer → Read-only access
```

### 6.2 Permission Matrix

| Action | Owner | Editor | Voter | Viewer |
|---|---|---|---|---|
| View ideas | ✅ | ✅ | ✅ | ✅ |
| Create ideas | ✅ | ✅ | ❌ | ❌ |
| Edit own ideas | ✅ | ✅ | ❌ | ❌ |
| Edit others' ideas | ✅ | ❌ | ❌ | ❌ |
| Delete ideas | ✅ | ✅ (own) | ❌ | ❌ |
| Create polls | ✅ | ✅ | ❌ | ❌ |
| Vote on polls | ✅ | ✅ | ✅ | ❌ |
| Close polls | ✅ | ❌ | ❌ | ❌ |
| Finalize ideas | ✅ | ✅ | ❌ | ❌ |
| Import to Plot | ✅ | ❌ | ❌ | ❌ |
| Manage collaborators | ✅ | ❌ | ❌ | ❌ |

### 6.3 Inheritance from Project

- Project `owner` → Idea Bank `owner` (implicit)
- Project `manager` → Idea Bank `editor` (implicit)
- Project `editor` → Idea Bank `editor` (implicit)
- Project `viewer` → Idea Bank `viewer` (implicit)

Standalone Idea Bank collaborators get roles from `idea_bank_collaborators`.

**Effective permission = max(inherited_project_role, idea_bank_collaborator_role)**

### 6.4 RLS Policies

```sql
-- Idea Bank: visible to project owner + collaborators
CREATE POLICY "idea_banks_visible" ON idea_banks
  FOR SELECT USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    OR project_id IN (
      SELECT pc.project_id FROM project_collaborators pc
      WHERE pc.user_id = auth.uid() AND pc.status = 'active'
    )
    OR id IN (
      SELECT ibc.idea_bank_id FROM idea_bank_collaborators ibc
      WHERE ibc.user_id = auth.uid() AND ibc.status = 'active'
    )
  );

-- Idea Cards: editors can insert/update, viewers/voters read-only
CREATE POLICY "idea_cards_select" ON idea_cards FOR SELECT USING (
  slot_id IN (SELECT is2.id FROM idea_slots is2 
    JOIN idea_banks ib ON is2.idea_bank_id = ib.id
    WHERE ib.project_id IN (SELECT p.id FROM projects p WHERE p.user_id = auth.uid())
    OR ib.id IN (SELECT ibc.idea_bank_id FROM idea_bank_collaborators ibc WHERE ibc.user_id = auth.uid() AND ibc.status = 'active'))
);

-- Similar RLS for polls, votes, comments...
```

---

## 7. Import Engine Strategy

### 7.1 Import Flow

```
1. User clicks "Import from Idea Bank" in Plot section
2. Frontend calls GET /api/idea-banks/:bankId/import-validate
   → Returns { can_import: boolean, unresolved_slots: SlotSummary[] }
3. If unresolved slots exist → UI blocks import, shows which slots need finalization
4. If all resolved → UI shows destructive overwrite confirmation dialog
5. User confirms → Frontend calls POST /api/idea-banks/:bankId/import-to-plot
6. Backend executes transactionally:
   a. BEGIN TRANSACTION
   b. Delete existing plot_chapters + plot_scenes for this project
   c. Delete existing chapters + scenes for this project
   d. For each level-1 slot with a finalized idea:
      - INSERT INTO chapters (project_id, title, summary, position)
      - For each level-2 slot with a finalized idea (if has_level_2):
        - INSERT INTO scenes (chapter_id, title, summary, position)
   e. COMMIT
   f. On failure → ROLLBACK, return error
7. Frontend navigates to Plot section with fresh data
```

### 7.2 Import Validation (Multi-Layer)

**Layer 1 — API Validation:**
```sql
-- Check for unresolved slots (no finalized idea)
SELECT is2.id, is2.title, is2.level
FROM idea_slots is2
LEFT JOIN idea_cards ic ON ic.slot_id = is2.id AND ic.status = 'finalized' AND ic.deleted_at IS NULL
WHERE is2.idea_bank_id = :bankId
  AND ic.id IS NULL
  AND is2.level <= (SELECT CASE WHEN ltc.has_level_2 THEN 2 ELSE 1 END 
                    FROM projects p JOIN literary_type_configs ltc ON p.project_type = ltc.project_type
                    WHERE p.id = (SELECT project_id FROM idea_banks WHERE id = :bankId));
```

**Layer 2 — UI Validation:**
- Show a checklist: "3/5 Chapter slots finalized, 12/15 Scene slots finalized"
- Highlight unresolved slots visually
- Disable "Import" button until all slots resolved
- Show a red warning: "Import requires all narrative slots to have a finalized idea"

**Layer 3 — Import Execution Validation:**
- Re-run validation inside the transaction before any mutations
- Return meaningful error if validation fails

### 7.3 Import Is One-Way

- Idea Bank → Plot is a **destructive import**
- No live sync. No reverse synchronization.
- After import, Idea Bank remains intact for reference.
- Subsequent Idea Bank changes do NOT propagate to Plot.

### 7.4 Hierarchy Mapping

| Literary Type | Idea Bank Structure | Import Mapping |
|---|---|---|
| Novel | Level 1 → Chapter slots, Level 2 → Scene slots | Level 1 → `chapters`, Level 2 → `scenes` |
| Film Script | Level 1 → Scene slots | Level 1 → `scenes` (flat, no chapters) |
| TV Series | Level 1 → Episode slots, Level 2 → Scene slots | Level 1 → `chapters` (episodes), Level 2 → `scenes` |
| Children Story | Level 1 → Page slots | Level 1 → `scenes` (pages) with `page_type` field |
| Book | Level 1 → Chapter slots, Level 2 → Subheading slots | Level 1 → `chapters`, Level 2 → `scenes` |

---

## 8. Comment & Mention Integration

### 8.1 Strategy: Dedicated Idea Comments Table

Rather than overloading the existing `comments` table (which is scene-scoped), we create a **parallel** `idea_comments` table with the same structure but scoped to idea cards.

**Why not reuse `comments` table?**
- Existing comments require `scene_id` (FK constraint)
- Idea comments are not scene-scoped; they're idea-card-scoped
- Different RLS policies (viewer/voter/editor vs. project_collaborator)
- Cleaner separation of concerns

### 8.2 Mention Processing

Reuse the existing mention pattern:
- Parse `@[username]` in idea comment content
- Create notifications via the existing `notifications` table
- Use `notification.type = 'idea_comment_mention'` (new type)
- CTA link: `/projects/:pid/idea-bank?slot=:slotId&idea=:ideaId&comment=:commentId`

### 8.3 Comment Navigation Integration

Extend the existing comment navigation orchestrator:

```typescript
// New URL format for idea comments:
// /projects/:pid/idea-bank?slot=:slotId&idea=:ideaId&comment=:commentId&type=idea&reply=:replyId&open=true

// Extend NavigationTarget:
interface NavigationTarget {
  // ...existing fields
  ideaId?: string;      // For Idea Bank navigation
  slotId?: string;      // For Idea Bank navigation
}
```

Register idea comment cards in the `CommentTargetRegistry` when Idea Bank tab is active.

---

## 9. Realtime Strategy

### 9.1 Lightweight Realtime Only

**What gets realtime updates:**
- New idea cards (created by collaborators)
- Vote changes (when someone votes)
- Idea status changes (finalized/dimmed)
- New comments on ideas
- New mentions

**What does NOT get realtime:**
- No collaborative text editing
- No cursors
- No live typing indicators

### 9.2 Implementation: Supabase Realtime Channels

```typescript
// Subscribe to idea bank changes
const channel = supabase
  .channel(`idea-bank:${bankId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'idea_cards',
    filter: `slot_id=in.(${slotIds.join(',')})`
  }, (payload) => {
    // Update local state
  })
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'idea_votes',
    filter: `poll_id=in.(${pollIds.join(',')})`
  }, (payload) => {
    // Update vote counts
  })
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'idea_comments',
  }, (payload) => {
    // Update comment counts
  })
  .subscribe();
```

### 9.3 Presence

Reuse the existing `usePresence` hook pattern to show who's currently in the Idea Bank.

---

## 10. Performance Strategy

### 10.1 Virtualization

- Idea cards within slots should use a **horizontal virtualizer** for competing ideas (only render visible cards in the horizontal scroll).
- Use `react-virtuoso` or custom intersection observer for the vertical slot list.
- Lazy-load idea card content (summary only by default, expand on click).

### 10.2 Data Loading Strategy

```typescript
// Initial load: slots tree + idea counts (no content)
GET /api/idea-banks/:bankId/slots → IdeaSlot[] with idea_count

// On slot expand: load idea cards for that slot
GET /api/idea-slots/:slotId/ideas → IdeaCard[]

// On idea card click: load full content + comments
GET /api/idea-cards/:ideaId?include=comments,votes → IdeaCardDetail
```

### 10.3 Optimization Techniques

- **Cursor-based pagination** for idea cards within slots (limited horizontal space anyway)
- **Debounced position updates** for drag-and-drop reordering (300ms)
- **Optimistic updates** for voting (update local state immediately, rollback on error)
- **Memoization** of slot components and idea cards
- **React.memo** for idea cards with shallow comparison
- **Intersection Observer** for lazy rendering of off-screen slots
- **Canvas rendering** only if >50 ideas per slot (unlikely, but ready)
- **Web Worker** for vote count aggregation if >100 votes per poll

---

## 11. Migration Strategy

### 11.1 Database Migrations (Ordered)

```
Phase 1:
  001_create_literary_type_configs.sql
  002_seed_literary_type_configs.sql
  003_create_idea_banks.sql
  004_create_idea_slots.sql
  005_create_idea_cards.sql
  006_create_idea_polls.sql
  007_create_idea_votes.sql
  008_create_idea_comments.sql
  009_create_idea_bank_collaborators.sql
  010_create_idea_bank_rls_policies.sql
  011_create_idea_vote_counts_view.sql
  012_create_idea_bank_indexes.sql

Phase 4:
  013_add_idea_bank_collaborator_rls.sql

Phase 7:
  014_add_idea_comment_navigation_hooks.sql
```

### 11.2 Existing Data Impact

**ZERO impact on existing tables.** All Idea Bank tables are new. No ALTER TABLE on existing tables.

### 11.3 Frontend Migration

- Phase 1: Add types, no UI changes
- Phase 2: Add Idea Bank tab to ProjectWorkspace (behind feature flag if desired)
- Phases 3-9: Incremental additions

Each phase is independently deployable and reversible.

---

## 12. Phased Execution Plan

### Phase 1 — Literary Structure Foundation (2-3 days)

**Goal:** Create the dynamic hierarchy configuration system.

| Task | Details |
|---|---|
| Create `literary_type_configs` table | Migration + seed data |
| TypeScript types for hierarchy | `HierarchyLevel`, `LiteraryTypeConfig` types |
| `useLiteraryTypeConfig` hook | Returns hierarchy structure from config |
| Update `projectTypeConfig.ts` | No changes yet — additive only |
| Unit tests for hierarchy | Config lookup, level resolution |

**Risk:** Low. Additive only, no existing code touched.

### Phase 2 — Idea Bank Core (3-4 days)

**Goal:** CRUD for Idea Banks, Slots, and Cards.

| Task | Details |
|---|---|
| Create Idea Bank tables | `idea_banks`, `idea_slots`, `idea_cards` |
| API functions | All CRUD + reorder + slot tree fetching |
| `IdeaBankTab` component | New tab in ProjectWorkspace |
| `IdeaSlotList` component | Vertical slot rendering |
| `IdeaSlotCard` component | Slot with horizontal idea cards |
| `IdeaCard` component | Title, summary, status badge |
| Horizontal scroll for ideas | CSS overflow-x with snap |
| Add Scene / Add Alternative Idea | Buttons per slot |
| API tests | CRUD, reorder, finalize, unfinalize |

**Risk:** Medium. New UI section, but isolated from existing features.

### Phase 3 — Voting & Finalization (2-3 days)

**Goal:** Poll creation, voting, finalization flow.

| Task | Details |
|---|---|
| Create poll & vote tables | `idea_polls`, `idea_votes` |
| API functions | Poll CRUD, vote/change/remove, results |
| Poll UI per slot | Toggle poll open/closed (owner only) |
| Vote UI on idea cards | Vote button + percentage bar |
| Finalize/Unfinalize UI | Glow on finalized, dim on non-selected |
| Unresolved detection engine | Check all slots have finalized idea |
| Visual states | Active → Finalized → Dimmed → Archived |

**Risk:** Low. Self-contained feature.

### Phase 4 — Sharing & Permissions (2 days)

**Goal:** Idea Bank standalone sharing.

| Task | Details |
|---|---|
| Create `idea_bank_collaborators` table | With RLS |
| API functions | CRUD, role management, invitation |
| Permission resolution | Inherited project role + Idea Bank role |
| Role-based UI controls | Hide/show actions based on role |
| `IdeaBankShareModal` component | Reuse `ScopedShareModal` pattern |

**Risk:** Medium. RLS policies must be correct. Test thoroughly.

### Phase 5 — Realtime Layer (1-2 days)

**Goal:** Live updates for votes, ideas, comments.

| Task | Details |
|---|---|
| Supabase Realtime subscriptions | Channel per Idea Bank |
| State updates on changes | Optimistic local updates + server confirmation |
| Presence integration | Show active users in Idea Bank |

**Risk:** Low. Purely additive, no data mutation.

### Phase 6 — Plot Importer (2-3 days)

**Goal:** Import from Idea Bank → Plot.

| Task | Details |
|---|---|
| Import validation endpoint | Check all slots finalized |
| Import execution endpoint | Transactional, destructive overwrite |
| Confirmation dialog UI | Warn about overwrite |
| Unresolved slots blocking | Show which slots need finalization |
| Hierarchy mapping | Literary type → chapters/scenes mapping |
| Rollback on failure | TRANSACTION with proper error handling |

**Risk:** HIGH. Destructive operation. Must have bulletproof validation and confirmation.

### Phase 7 — Comments & Mentions (2 days)

**Goal:** Comment on idea cards with @mentions.

| Task | Details |
|---|---|
| Create `idea_comments` table | With RLS |
| API functions | CRUD, resolve, replies |
| Comment UI on idea cards | Thread collapse/expand |
| @mention integration | Parse `@[username]`, create notifications |
| Navigation integration | `?comment=X&type=idea` URL support |

**Risk:** Medium. Reuses comment navigation infrastructure but extends it.

### Phase 8 — Drag & Drop (2-3 days)

**Goal:** Reorder slots and ideas.

| Task | Details |
|---|---|
| Vertical slot reorder | Drag-to-reorder level-1 and level-2 slots |
| Horizontal idea reorder | Drag ideas within a slot |
| Optimistic updates | Update local state immediately |
| Persistence | Debounced position updates |
| Move ideas between slots | Future-ready (backend support, limited UI) |

**Risk:** Low. `react-beautiful-dnd` or similar library handles most complexity.

### Phase 9 — Performance & UX Polish (2-3 days)

**Goal:** Virtualization, animations, responsiveness.

| Task | Details |
|---|---|
| Virtualization | Horizontal virtualizer for idea cards |
| Rerender optimization | React.memo, useMemo, useCallback |
| Mobile responsiveness | Touch-friendly drag, swipe for ideas |
| Keyboard navigation | Tab through ideas, Enter to expand |
| Animations | Smooth transitions for finalize/dim |
| Accessibility | ARIA labels, screen reader support |
| Zoom behavior | Pinch-to-zoom on canvas |

**Risk:** Low. Polish phase.

---

## 13. Risk Analysis

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| Import destroys plot data | **Critical** | Medium | Triple validation (API, UI, transaction), confirmation dialog, rollback on failure |
| RLS policy misconfiguration | **High** | Medium | Test matrix for all role combinations, audit queries |
| Performance with large ideas | Medium | Low | Virtualization, lazy loading, pagination |
| Breaking existing comment system | **High** | Low | Separate `idea_comments` table, isolated from `comments` |
| Hierarchy mapping errors during import | **High** | Medium | Unit tests per literary type, dry-run mode |
| Drag-and-drop state corruption | Medium | Medium | Optimistic updates with rollback, debounced persistence |
| Realtime subscription leaks | Medium | Low | Channel cleanup on unmount, subscription limits |
| Concurrent voting race conditions | Medium | Low | `UNIQUE(poll_id, user_id)` constraint + `ON CONFLICT UPDATE` |
| Breaking ProjectWorkspace tab order | Medium | Low | Additive tab insertion, feature flag for gradual rollout |

---

## 14. Rollback Strategy

### Per-Phase Rollback

- **Phase 1 (Hierarchy):** Drop `literary_type_configs` table. No frontend code was changed.
- **Phase 2 (Core):** Drop `idea_banks`, `idea_slots`, `idea_cards`. Remove `IdeaBankTab` from ProjectWorkspace.
- **Phase 3 (Voting):** Drop `idea_polls`, `idea_votes`. Remove poll UI components.
- **Phase 4 (Permissions):** Drop `idea_bank_collaborators`. Remove sharing UI.
- **Phase 5 (Realtime):** Remove subscriptions. Feature stops updating live, data still works.
- **Phase 6 (Import):** Remove import button. No schema changes to existing tables.
- **Phase 7 (Comments):** Drop `idea_comments`. Remove comment UI from cards.
- **Phase 8 (Drag & Drop):** Remove drag handlers, keep position updates via manual input.
- **Phase 9 (Polish):** No rollback needed — pure refinement.

### Full Rollback

All Idea Bank tables can be dropped without affecting any existing data. The only persistent change is adding `Idea Bank` as a tab in ProjectWorkspace, which is conditional rendering.

---

## 15. Rendering Strategy

### 15.1 Component Architecture

```
ProjectWorkspace
└── IdeaBankTab (new tab)
    ├── IdeaBankHeader (title, share button, import button)
    ├── IdeaSlotList (vertical scroll)
    │   └── IdeaSlot (level-1 or level-2)
    │       ├── SlotHeader (title, position, add idea button, poll toggle)
    │       ├── IdeaCardList (horizontal scroll)
    │       │   └── IdeaCard
    │       │       ├── IdeaCardContent (title, summary, content)
    │       │       ├── IdeaCardStatus (active/finalized/dimmed/archived badge)
    │       │       ├── IdeaCardVoting (vote button, percentage, voter list)
    │       │       └── IdeaCardComments (comment count, expandable thread)
    │       └── AddIdeaButton (dashed card)
    └── IdeaBankEmptyState (prompt to create first slot)
```

### 15.2 Zoomable Canvas Strategy

Not a full canvas library. Use CSS transforms for zoom:

```css
.idea-bank-canvas {
  transform-origin: 0 0;
  transform: scale(var(--zoom-level));
}
```

Pan via overflow scroll on a container. Zoom controls (buttons + mouse wheel + pinch gesture).

### 15.3 Horizontal Competition Layout

```
┌──────────────────────────────────────┐
│ 📖 Chapter 1: The Beginning         │
│ ┌────────┐ ┌────────┐ ┌────────┐   │
│ │ Idea A │ │ Idea B │ │ Idea C │   │
│ │ (final) │ │ (dim)  │ │ (dim)  │   │
│ └────────┘ └────────┘ └────────┘   │
│ ┌──────────────────────────┐        │
│ │ 📖 Scene 1.1             │        │
│ │ ┌─────┐ ┌─────┐         │        │
│ │ │Idea1│ │Idea2│         │        │
│ │ └─────┘ └─────┘         │        │
│ └──────────────────────────┘        │
│ ┌──────────────────────────┐        │
│ │ 📖 Scene 1.2             │        │
│ │ ┌─────┐                  │        │
│ │ │Idea1│ ⚠️ No final     │        │
│ │ └─────┘                  │        │
│ └──────────────────────────┘        │
└──────────────────────────────────────┘
```

Nested bordered containers provide visual hierarchy. Horizontal scroll within each slot for competing ideas.

### 15.4 Finalized Idea Visual Treatment

```css
.idea-card.finalized {
  border: 2px solid var(--color-accent);
  box-shadow: 0 0 12px rgba(var(--color-accent-rgb), 0.3);
}

.idea-card.dimmed {
  opacity: 0.5;
  filter: grayscale(30%);
}

.idea-card.archived {
  display: none; /* or opacity: 0.3 with "Show archived" toggle */
}
```

---

## Approval Checklist

Before implementation begins, confirm:

- [ ] DB schema approved (tables, indexes, RLS)
- [ ] API contract approved (endpoints, parameters, responses)
- [ ] Import validation logic approved (triple-layer)
- [ ] Permission model approved (role matrix)
- [ ] Literary type hierarchy approved (seeds + mapping)
- [ ] Phased plan approved (order, estimates)
- [ ] Comment integration approach approved (separate table vs. extend existing)
- [ ] Rollback strategy approved
- [ ] Feature flag strategy for gradual rollout confirmed