# Doooda Complete Frontend UX Guide

## Overview

This document provides comprehensive specifications for all user-facing screens and admin panel interfaces in the Doooda application. It covers the complete writer journey from authentication through project completion, as well as the full admin control panel.

## Design Principles

### Visual Identity
- **Color Palette:**
  - Primary: `#2c5f7c` (Calm professional blue)
  - Secondary: `#4a9eba` (Lighter blue for accents)
  - Accent: `#f59e0b` (Warm amber for CTAs)
  - Background: `#e8f4f8` (Very light blue)
  - White: `#ffffff` for cards and containers
  - Text: `#1f2937` for primary text, `#6b7280` for secondary

### Typography
- **Arabic:** Noto Sans Arabic (Google Fonts)
- **English:** Inter (Google Fonts)
- **Hierarchy:**
  - H1: 32px / 2rem (Page titles)
  - H2: 24px / 1.5rem (Section titles)
  - H3: 20px / 1.25rem (Subsection titles)
  - Body: 16px / 1rem (Main content)
  - Small: 14px / 0.875rem (Secondary info)

### Spacing System
- Use 8px base unit (0.5rem)
- Standard spacing: 4px, 8px, 16px, 24px, 32px, 48px, 64px
- Container padding: 24px on mobile, 32px on desktop
- Card spacing: 16px internal padding

### RTL/LTR Support
- Automatic direction based on user's preferred language
- Arabic: RTL layout, right-aligned text
- English: LTR layout, left-aligned text
- Icons and visual elements mirror appropriately
- Forms maintain natural flow direction

### Tone & Messaging
- Calm and encouraging
- Professional but approachable
- Non-technical language
- Supportive error messages
- Celebratory success messages

---

## Part 1: Authentication & Onboarding

### 1.1 Welcome / Landing Screen

**Purpose:** First screen users see before authentication

**Layout:**
```
┌─────────────────────────────────────────┐
│           Doooda Logo                    │
│                                          │
│     [Large Hero Illustration]           │
│                                          │
│   "Your Writing Companion"              │
│   Short inspiring tagline in            │
│   user's preferred language             │
│                                          │
│   [Sign Up Button - Primary]            │
│   [Log In Button - Secondary]           │
│                                          │
│   Language Switcher: AR | EN            │
└─────────────────────────────────────────┘
```

**Elements:**
- Doooda logo (top center)
- Hero illustration showing writer at desk with supportive companion
- Tagline:
  - Arabic: "رفيقك في رحلة الكتابة"
  - English: "Your companion in the writing journey"
- Sign Up button (large, primary color)
- Log In button (outline style)
- Language toggle (top right corner)

**Interactions:**
- Sign Up → Navigate to Sign Up screen
- Log In → Navigate to Login screen
- Language toggle → Reload with selected language

---

### 1.2 Sign Up Screen

**Purpose:** New user registration

**Layout:**
```
┌─────────────────────────────────────────┐
│  ← Back          Doooda Logo            │
│                                          │
│  Create Your Account                     │
│  Start your writing journey              │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ Email                              │ │
│  │ [email input]                      │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ Password                           │ │
│  │ [password input with show/hide]    │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ Confirm Password                   │ │
│  │ [password input]                   │ │
│  └────────────────────────────────────┘ │
│                                          │
│  [Create Account Button]                │
│                                          │
│  Already have an account? Log In        │
└─────────────────────────────────────────┘
```

**Form Fields:**
- Email (required, validation: valid email format)
- Password (required, minimum 8 characters, show/hide toggle)
- Confirm Password (required, must match password)

**Validation Rules:**
- Email: Must be valid format, not already registered
- Password:
  - Minimum 8 characters
  - Must contain: uppercase, lowercase, number
  - Show strength indicator below field
- Passwords must match

**Success Flow:**
- On successful signup → Navigate to Onboarding Step 1
- No email verification step (as per requirements)

**Error Handling:**
- Email already exists: "هذا البريد مسجل مسبقاً / This email is already registered"
- Weak password: Show requirements clearly
- Network error: "حدث خطأ، يرجى المحاولة مرة أخرى / An error occurred, please try again"

---

### 1.3 Login Screen

**Purpose:** Returning user authentication

**Layout:**
```
┌─────────────────────────────────────────┐
│  ← Back          Doooda Logo            │
│                                          │
│  Welcome Back                            │
│  Continue your writing journey          │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ Email                              │ │
│  │ [email input]                      │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ Password                           │ │
│  │ [password input with show/hide]    │ │
│  └────────────────────────────────────┘ │
│                                          │
│  [Remember Me] checkbox                 │
│  Forgot Password? (link)                │
│                                          │
│  [Log In Button]                        │
│                                          │
│  Don't have an account? Sign Up         │
└─────────────────────────────────────────┘
```

**Form Fields:**
- Email (required)
- Password (required)
- Remember Me (optional checkbox)

**Success Flow:**
- On successful login → Check if onboarding complete
  - If complete → Navigate to Dashboard
  - If incomplete → Navigate to relevant onboarding step

**Error Handling:**
- Invalid credentials: "البريد أو كلمة المرور غير صحيحة / Invalid email or password"
- Account locked: Show contact support message
- Network error: Standard error message

**Forgot Password Link:**
- Opens forgot password flow (modal or separate screen)
- Enter email → Receive reset link
- Click link → Reset password screen

---

### 1.4 Onboarding Step 1: Profile Setup

**Purpose:** Collect essential user information

**Layout:**
```
┌─────────────────────────────────────────┐
│  Progress: ● ○ ○ ○                      │
│                                          │
│  Tell Us About Yourself                 │
│  Help us personalize your experience    │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ Pen Name (displayed publicly)      │ │
│  │ [text input]                       │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ Gender                             │ │
│  │ ○ Male    ○ Female    ○ Other     │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ Timezone                           │ │
│  │ [dropdown selector]                │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ Preferred Language                 │ │
│  │ ○ Arabic    ○ English             │ │
│  └────────────────────────────────────┘ │
│                                          │
│  [Skip]              [Continue Button]  │
└─────────────────────────────────────────┘
```

**Form Fields:**
- Pen Name (required, 2-50 characters, unique)
- Gender (required for proper Arabic addressing)
- Timezone (required, auto-detected with manual override)
- Preferred Language (required, default to browser/system language)

**Validation:**
- Pen Name: Must be unique, no special characters except spaces and Arabic diacritics
- All fields required except can skip to set defaults

**Behavior:**
- Gender selection affects AI greeting messages
- Timezone used for daily goal resets and usage limits
- Language sets UI direction (RTL/LTR) and default content language

---

### 1.5 Onboarding Step 2: Writing Goals

**Purpose:** Understand user's writing objectives

**Layout:**
```
┌─────────────────────────────────────────┐
│  Progress: ● ● ○ ○                      │
│                                          │
│  What Are Your Writing Goals?           │
│  We'll help you achieve them            │
│                                          │
│  ☐ Complete a novel                     │
│  ☐ Write short stories                  │
│  ☐ Publish a book                       │
│  ☐ Build writing habit                  │
│  ☐ Explore creativity                   │
│  ☐ Other                                │
│                                          │
│  Daily Writing Target (optional)        │
│  ┌────────────────────────────────────┐ │
│  │ [number input] words per day       │ │
│  └────────────────────────────────────┘ │
│                                          │
│  [Skip]              [Continue Button]  │
└─────────────────────────────────────────┘
```

**Elements:**
- Multiple selection checkboxes for goals
- Optional daily word count target
- Encouraging messaging about achievability

**Behavior:**
- Goals stored for future analytics
- Daily target sets up progress tracking
- Can modify later in settings

---

### 1.6 Onboarding Step 3: Plan Selection

**Purpose:** Choose subscription plan

**Layout:**
```
┌─────────────────────────────────────────┐
│  Progress: ● ● ● ○                      │
│                                          │
│  Choose Your Plan                        │
│                                          │
│  ┌──────────┐  ┌──────────┐            │
│  │  FREE    │  │   PRO    │            │
│  │          │  │ POPULAR  │            │
│  │  $0      │  │ $10/mo   │            │
│  │          │  │          │            │
│  │ ✓ Basic  │  │ ✓ All    │            │
│  │ ✓ Cloud  │  │ ✓ Cloud  │            │
│  │ ✓ Export │  │ ✓ Export │            │
│  │ ✗ AI     │  │ ✓ AI     │            │
│  │          │  │ ✓ Goal   │            │
│  │          │  │          │            │
│  │ [Start]  │  │ [Start]  │            │
│  └──────────┘  └──────────┘            │
│                                          │
│  You can upgrade anytime                │
│                                          │
│  [Skip to Dashboard with Free]          │
└─────────────────────────────────────────┘
```

**Plans Displayed:**
- **Free Plan ($0/month):**
  - Basic writing tools
  - Cloud backup
  - Export to Word/PDF
  - No AI assistance
  - Standard support

- **Pro Plan ($10/month) - RECOMMENDED:**
  - Everything in Free
  - Ask Doooda AI (30 questions/day)
  - Daily writing goals
  - Advanced analytics
  - Priority support

**Interactions:**
- Select Free → Skip to Dashboard (no payment)
- Select Pro → Payment flow (collect payment details)
- Skip link → Start with Free, can upgrade later

**Payment Flow (Pro):**
- Collect card details
- Process payment via payment provider
- Show success confirmation
- Activate Pro features immediately

---

### 1.7 Onboarding Step 4: Welcome Message

**Purpose:** Celebrate completion and set expectations

**Layout:**
```
┌─────────────────────────────────────────┐
│  Progress: ● ● ● ●                      │
│                                          │
│  [Success Animation / Illustration]     │
│                                          │
│  Welcome to Doooda, [Pen Name]!        │
│                                          │
│  You're all set to begin your           │
│  writing journey. Let's create           │
│  your first project.                     │
│                                          │
│  [Go to Dashboard Button]               │
└─────────────────────────────────────────┘
```

**Elements:**
- Success animation or illustration
- Personalized welcome with pen name
- Encouraging message
- Clear CTA to dashboard

---

## Part 2: Writer Dashboard

### 2.1 Main Dashboard

**Purpose:** Central hub for all writing activity

**Layout (Desktop):**
```
┌─────────────────────────────────────────────────────────────┐
│  [Doooda Logo]    [Search]              [Pen Name ▼] [Notif]│
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Welcome back, [Pen Name]                               ││
│  │  [Current date and encouraging message]                 ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  Today's Progress                     Daily Goal: 500 words  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Words Written: 247                                     ││
│  │  [Progress Bar ████████░░░░░░░] 49%                    ││
│  │  Keep going! 253 words to reach your goal 💪          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  Your Projects                               [+ New Project] │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ Project 1    │ │ Project 2    │ │ Project 3    │       │
│  │              │ │              │ │              │       │
│  │ [Cover]      │ │ [Cover]      │ │ [Cover]      │       │
│  │              │ │              │ │              │       │
│  │ Title        │ │ Title        │ │ Title        │       │
│  │ 12,500 words │ │ 45,000 words │ │ 2,300 words  │       │
│  │ Updated 2h   │ │ Updated 1d   │ │ Updated 3d   │       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                               │
│  Recent Activity                                             │
│  ○ Completed Chapter 5 in "My Novel"                        │
│  ○ Added new character "Alice" to "Short Story"             │
│  ○ Reached 10,000 word milestone 🎉                         │
└─────────────────────────────────────────────────────────────┘
```

**Header Elements:**
- Doooda logo (links to dashboard)
- Search bar (search projects, characters, scenes)
- User menu dropdown:
  - Profile Settings
  - Subscription
  - Help & Support
  - Log Out
- Notifications bell (unread count badge)

**Welcome Banner:**
- Personalized greeting with pen name
- Current date in user's preferred language
- Contextual encouraging message:
  - Morning: "Good morning! Ready to write?"
  - Afternoon: "Good afternoon! Let's continue creating"
  - Evening: "Good evening! Perfect time for writing"
  - If no writing today: "Let's start writing today!"
  - If goal reached: "Amazing! You've reached your goal 🎉"

**Today's Progress Card:**
- Word count for today
- Visual progress bar toward daily goal
- Encouraging message based on progress
- Only visible if daily goal is set
- Celebrates when goal is reached

**Projects Grid:**
- Card-based layout (3-4 per row on desktop)
- Each project card shows:
  - Custom cover image or placeholder
  - Project title
  - Genre (if set)
  - Total word count
  - Last updated time
  - Progress indicator (if applicable)
- Hover effect: Slight elevation, show quick actions
- Click card: Navigate to project workspace

**New Project Button:**
- Prominent plus icon button
- Opens project creation modal

**Recent Activity Feed:**
- Timeline of recent actions across all projects
- Types of activities:
  - Chapters completed
  - Milestones reached
  - Characters added
  - Goals achieved
- Limited to last 10 activities
- Link to full activity history

**Mobile Adaptations:**
- Stack sections vertically
- Projects show 1-2 per row
- Collapsible sections for better space use
- Bottom navigation bar (Home, Projects, Profile)

---

### 2.2 Create New Project Modal

**Purpose:** Initialize a new writing project

**Layout:**
```
┌─────────────────────────────────────────┐
│  Create New Project               [X]   │
│  ─────────────────────────────────────  │
│                                          │
│  Project Title                          │
│  ┌────────────────────────────────────┐│
│  │ [text input]                       ││
│  └────────────────────────────────────┘│
│                                          │
│  Genre (optional)                       │
│  ┌────────────────────────────────────┐│
│  │ [dropdown: Novel, Short Story,     ││
│  │  Poetry, Non-fiction, Other]       ││
│  └────────────────────────────────────┘│
│                                          │
│  Language                               │
│  ┌────────────────────────────────────┐│
│  │ ○ Arabic    ○ English              ││
│  └────────────────────────────────────┘│
│                                          │
│  Description (optional)                 │
│  ┌────────────────────────────────────┐│
│  │ [textarea, 3 rows]                 ││
│  └────────────────────────────────────┘│
│                                          │
│  [Cancel]              [Create Project] │
└─────────────────────────────────────────┘
```

**Form Fields:**
- Title (required, 1-100 characters)
- Genre (optional dropdown)
- Language (required, determines text direction)
- Description (optional, max 500 characters)

**Behavior:**
- On submit: Create project in database
- Navigate to project workspace
- Show success toast: "Project created successfully!"

---

## Part 3: Project Workspace

### 3.1 Project Workspace Overview

**Purpose:** Central workspace for a specific project

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  ← Dashboard    [Project Title]           [Settings ⚙] [▼]  │
│                                                               │
│  ┌─ Tabs ────────────────────────────────────────────────┐  │
│  │ Logline│Chapters│Scenes│Characters│Tasks│Progress│   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  [Active Tab Content Area]                                   │
│                                                               │
│                                                               │
│                                                               │
│                                                               │
│                                                               │
│                                                               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Header:**
- Back to Dashboard link
- Project title (editable on click)
- Settings dropdown:
  - Edit Project Details
  - Export Project
  - Archive Project
  - Delete Project
- Right-click anywhere: "Ask Doooda" option (Pro only)

**Tab Navigation:**
- Logline
- Chapters
- Scenes
- Characters
- Tasks
- Progress

**Active Tab Content:**
- Each tab shows relevant interface (detailed below)
- Smooth transitions between tabs
- State preserved when switching tabs

---

### 3.2 Logline Tab

**Purpose:** Craft the project's core logline

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Logline                                                     │
│                                                               │
│  A logline is a one-sentence summary of your story.         │
│  It should capture the essence of your narrative.           │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                          ││
│  │  [Rich text editor for logline]                         ││
│  │  [Character count: 0/500]                               ││
│  │                                                          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  💡 Tip: A good logline includes your protagonist, their    │
│     goal, and the obstacle they face.                       │
│                                                               │
│  [Save Logline Button]                                      │
│                                                               │
│  ─────────────────────────────────────────────────────────  │
│                                                               │
│  AI Assistance (Pro) 🌱                                     │
│  Need help crafting your logline?                           │
│  [Ask Doooda for Suggestions]                               │
└─────────────────────────────────────────────────────────────┘
```

**Elements:**
- Explanation text at top
- Large text area for logline (max 500 characters)
- Character counter
- Helpful tip with example
- Save button (auto-saves on blur)
- AI assistance section (Pro only)

**AI Assistance (Pro Users):**
- Button to open Ask Doooda chat
- Can ask for logline suggestions
- Can refine existing logline
- Context automatically includes current logline text

**Auto-save:**
- Saves draft every 30 seconds
- Saves immediately on blur
- Shows "Saved" indicator

---

### 3.3 Chapters Tab

**Purpose:** Manage book chapters and structure

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Chapters                                  [+ Add Chapter]   │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ☰ Chapter 1: The Beginning                             ││
│  │   1,247 words  •  Last edited 2 hours ago              ││
│  │   [Edit] [Delete]                                       ││
│  │                                                          ││
│  │   Summary: The protagonist wakes up in an unfamiliar... ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ☰ Chapter 2: The Discovery                             ││
│  │   2,103 words  •  Last edited yesterday                ││
│  │   [Edit] [Delete]                                       ││
│  │                                                          ││
│  │   Summary: The protagonist finds a mysterious object... ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ☰ Chapter 3: Untitled                                  ││
│  │   0 words  •  Created today                            ││
│  │   [Edit] [Delete]                                       ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  Total: 3 chapters  •  3,350 words                          │
└─────────────────────────────────────────────────────────────┘
```

**Elements:**
- List of chapters in order
- Drag handle (☰) for reordering
- Each chapter card shows:
  - Chapter number and title
  - Word count
  - Last edited time
  - Summary preview (if exists)
  - Edit button (opens chapter editor)
  - Delete button (with confirmation)
- Add Chapter button (top right)
- Total statistics at bottom

**Interactions:**
- Click chapter title: Navigate to chapter editor
- Drag chapters to reorder
- Click Edit: Open chapter editor
- Click Delete: Show confirmation modal
- Add Chapter: Create new chapter at end

**Chapter Editor (Modal or Full Screen):**
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Chapters                            [Save] [···] │
│                                                               │
│  Chapter Title                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Chapter 1: The Beginning                                ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  Summary (optional)                                          │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Brief description of what happens in this chapter...    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  Chapter Position                                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ □ Beginning  □ Middle  □ End                           ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  Content                                   Words: 1,247      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                          ││
│  │  [Rich text editor for chapter content]                ││
│  │                                                          ││
│  │                                                          ││
│  │                                                          ││
│  │                                                          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  Right-click anywhere to Ask Doooda for help (Pro) 🌱      │
└─────────────────────────────────────────────────────────────┘
```

**Editor Features:**
- Title input (required)
- Summary textarea (optional)
- Position selector (beginning/middle/end)
- Rich text editor with:
  - Bold, Italic, Underline
  - Headings (H2, H3)
  - Bullet lists, Numbered lists
  - Block quotes
  - Clean, distraction-free interface
- Auto-save every 30 seconds
- Word count (live update)
- Right-click menu with "Ask Doooda" option

---

### 3.4 Scenes Tab

**Purpose:** Break chapters into manageable scenes

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Scenes                                      [+ Add Scene]   │
│                                                               │
│  Filter by Chapter: [All Chapters ▼]                        │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Scene 1 - Opening                                       ││
│  │ Chapter: Chapter 1  •  542 words                        ││
│  │ Status: ● Complete                                      ││
│  │                                                          ││
│  │ The protagonist wakes up and realizes they're not...    ││
│  │                                                          ││
│  │ [Edit] [Delete]                                         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Scene 2 - The Breakfast                                 ││
│  │ Chapter: Chapter 1  •  705 words                        ││
│  │ Status: ● Complete                                      ││
│  │                                                          ││
│  │ Family breakfast where tension becomes apparent...      ││
│  │                                                          ││
│  │ [Edit] [Delete]                                         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Scene 3 - Untitled                                      ││
│  │ Chapter: Chapter 2  •  0 words                          ││
│  │ Status: ○ Draft                                         ││
│  │ [Edit] [Delete]                                         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  Total: 8 scenes  •  5,423 words                            │
└─────────────────────────────────────────────────────────────┘
```

**Elements:**
- Chapter filter dropdown
- Scene cards showing:
  - Scene title
  - Parent chapter
  - Word count
  - Status indicator (Draft, In Progress, Complete)
  - Description preview
  - Edit and Delete buttons
- Add Scene button
- Total statistics

**Scene Editor (Similar to Chapter Editor):**
- Title input
- Chapter selection dropdown
- Status selector
- Description textarea
- Rich text content editor
- Word count
- Auto-save functionality

---

### 3.5 Characters Tab

**Purpose:** Track and develop story characters

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Characters                              [+ Add Character]   │
│                                                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ [Avatar]     │ │ [Avatar]     │ │ [Avatar]     │       │
│  │              │ │              │ │              │       │
│  │ John Smith   │ │ Sarah Chen   │ │ Dr. Hassan   │       │
│  │ Protagonist  │ │ Antagonist   │ │ Supporting   │       │
│  │              │ │              │ │              │       │
│  │ Age: 32      │ │ Age: 28      │ │ Age: 45      │       │
│  │              │ │              │ │              │       │
│  │ [View]       │ │ [View]       │ │ [View]       │       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                               │
│  ┌──────────────┐ ┌──────────────┐                         │
│  │ [Avatar]     │ │ [Avatar]     │                         │
│  │              │ │              │                         │
│  │ Emma Wilson  │ │ Alex Turner  │                         │
│  │ Supporting   │ │ Minor        │                         │
│  │              │ │              │                         │
│  │ Age: 19      │ │ Age: 52      │                         │
│  │              │ │              │                         │
│  │ [View]       │ │ [View]       │                         │
│  └──────────────┘ └──────────────┘                         │
│                                                               │
│  Total: 5 characters                                        │
└─────────────────────────────────────────────────────────────┘
```

**Elements:**
- Grid of character cards
- Each card shows:
  - Avatar/profile image or placeholder
  - Character name
  - Role (Protagonist, Antagonist, Supporting, Minor)
  - Key attributes (age, occupation, etc.)
  - View button (opens character detail)
- Add Character button

**Character Detail View:**
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Characters                      [Edit] [Delete]  │
│                                                               │
│  ┌───────────┐                                               │
│  │ [Avatar]  │  John Smith                                  │
│  │           │  Protagonist                                  │
│  │           │                                               │
│  └───────────┘                                               │
│                                                               │
│  Basic Information                                           │
│  ───────────────────────────────────────────────────────    │
│  Age: 32                    Gender: Male                     │
│  Occupation: Detective      Status: Active                   │
│                                                               │
│  Physical Description                                        │
│  ───────────────────────────────────────────────────────    │
│  Tall, athletic build with dark hair and piercing blue      │
│  eyes. Usually wears a worn leather jacket and carries      │
│  a weathered notebook.                                       │
│                                                               │
│  Personality Traits                                          │
│  ───────────────────────────────────────────────────────    │
│  • Analytical and observant                                  │
│  • Struggles with trust                                      │
│  • Dry sense of humor                                        │
│  • Protective of those he cares about                        │
│                                                               │
│  Background/History                                          │
│  ───────────────────────────────────────────────────────    │
│  Former military officer turned detective after personal    │
│  tragedy. Haunted by unsolved case from his past...         │
│                                                               │
│  Motivations & Goals                                         │
│  ───────────────────────────────────────────────────────    │
│  Primary: Solve the central mystery                          │
│  Secondary: Find redemption for past failures                │
│                                                               │
│  Relationships                                               │
│  ───────────────────────────────────────────────────────    │
│  → Sarah Chen (Antagonist): Complex adversarial relationship │
│  → Dr. Hassan (Mentor): Trusted confidant and advisor       │
│                                                               │
│  Notes                                                       │
│  ───────────────────────────────────────────────────────    │
│  [Free-form notes area]                                      │
└─────────────────────────────────────────────────────────────┘
```

**Character Edit Mode:**
- All fields become editable
- Avatar upload functionality
- Rich text for descriptions
- Dynamic trait addition/removal
- Relationship linking to other characters

---

### 3.6 Tasks Tab

**Purpose:** Track writing-related tasks and to-dos

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Tasks                                        [+ Add Task]   │
│                                                               │
│  Filter: [All ▼] [Today ▼] [This Week ▼]                   │
│                                                               │
│  Today                                                       │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ☐ Write Chapter 5 opening scene              ⭐ High   ││
│  │   Due: Today, 5:00 PM                                   ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  │ ☐ Research historical setting for Scene 3    • Medium  ││
│  │   Due: Today, 11:59 PM                                  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  Tomorrow                                                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ☐ Revise character description for Sarah     • Low     ││
│  │   Due: Tomorrow, 11:59 PM                               ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  Completed (3)                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ☑ Outline Chapter 4                          ✓          ││
│  │   Completed: 2 hours ago                                ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  Total: 6 active tasks  •  3 completed                      │
└─────────────────────────────────────────────────────────────┘
```

**Elements:**
- Filter options (All, Today, This Week, etc.)
- Tasks grouped by due date
- Each task shows:
  - Checkbox (click to toggle complete)
  - Task title
  - Priority indicator (High, Medium, Low)
  - Due date/time
  - Optional description (expandable)
- Completed tasks section (collapsible)
- Add Task button

**Add/Edit Task Modal:**
```
┌─────────────────────────────────────────┐
│  Add Task                         [X]   │
│  ─────────────────────────────────────  │
│                                          │
│  Task Title                             │
│  ┌────────────────────────────────────┐│
│  │ [text input]                       ││
│  └────────────────────────────────────┘│
│                                          │
│  Description (optional)                 │
│  ┌────────────────────────────────────┐│
│  │ [textarea]                         ││
│  └────────────────────────────────────┘│
│                                          │
│  Priority                               │
│  ○ Low    ● Medium    ○ High           │
│                                          │
│  Due Date                               │
│  [Date Picker]   [Time Picker]         │
│                                          │
│  [Cancel]                   [Add Task]  │
└─────────────────────────────────────────┘
```

---

### 3.7 Progress Tab

**Purpose:** Visualize writing progress and statistics

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Progress                                                    │
│                                                               │
│  Overview                                                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Total Words: 12,547                                    ││
│  │  Chapters: 5                                            ││
│  │  Scenes: 18                                             ││
│  │  Characters: 7                                          ││
│  │  Days Writing: 23                                       ││
│  │  Current Streak: 7 days 🔥                             ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  Writing Activity (Last 30 Days)                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  [Bar chart showing daily word count]                  ││
│  │  500│     ▄                                            ││
│  │  400│   ▄ █ ▄                                          ││
│  │  300│ ▄ █ █ █   ▄                                      ││
│  │  200│ █ █ █ █ ▄ █ ▄                                    ││
│  │  100│ █ █ █ █ █ █ █   ▄   ▄                           ││
│  │    0│ 1 2 3 4 5 6 7 8 9 10...                          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  Milestones                                                  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ✓ 1,000 words     ✓ 5,000 words    ✓ 10,000 words     ││
│  │ ○ 25,000 words    ○ 50,000 words   ○ 100,000 words    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  Goals (Pro Feature) 🌱                                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Daily Goal: 500 words                                   ││
│  │ Progress: ████████░░░░░ 247/500 (49%)                  ││
│  │                                                          ││
│  │ Weekly Goal: 3,500 words                                ││
│  │ Progress: ███████████░░ 2,134/3,500 (61%)              ││
│  │                                                          ││
│  │ [Edit Goals]                                            ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  Recent Achievements                                         │
│  🏆 Reached 10,000 words milestone                          │
│  🔥 7-day writing streak                                     │
│  ✍️  Most productive day: 1,247 words                        │
└─────────────────────────────────────────────────────────────┘
```

**Elements:**
- Overview statistics card
- Writing activity chart (bar/line chart)
- Milestone progress indicators
- Goals section (Pro only) with progress bars
- Recent achievements list
- Celebratory animations when milestones reached

---

## Part 4: Ask Doooda Interface

### 4.1 Activation & Chat Window

**Activation Methods:**
1. Right-click anywhere in writing area → "اسأل دووودة / Ask Doooda"
2. Right-click on selected text → Same option, includes text as context

**Chat Window Appearance:**

```
┌───────────────────────────────────────┐
│  دووودة / Doooda               [X]  │
│  ──────────────────────────────────  │
│                                       │
│  [Doooda Avatar]                     │
│  دووودة في خدمتك يا سيدي أحمد،      │
│  كيف أساعدك؟                         │
│                                       │
│  [If text selected:]                 │
│  💭 جاري الآن قراءة إبداعاتك...     │
│  ✓ انتهيت من القراءة،               │
│    وجاهز لأسئلتك في هذا الشأن       │
│                                       │
│  ┌───────────────────────────────┐   │
│  │ User: كيف أحسن هذا الحوار؟    │   │
│  │ [2:15 PM]                     │   │
│  └───────────────────────────────┘   │
│                                       │
│  ┌───────────────────────────────┐   │
│  │ [Doooda Avatar]               │   │
│  │ أقترح أن تجعل الحوار أكثر     │   │
│  │ طبيعية بإضافة بعض التوقفات... │   │
│  │ [2:15 PM]                     │   │
│  └───────────────────────────────┘   │
│                                       │
│  ─ Type your question ────────────   │
│  ┌───────────────────────────────┐   │
│  │ [Message input]              📎│   │
│  └───────────────────────────────┘   │
│                    [Send Button 📤]  │
│                                       │
│  Daily limit: 23/30 questions used   │
└───────────────────────────────────────┘
```

**Window Characteristics:**
- Position: Bottom-left of screen
- Size: 400px × 600px (adjustable)
- Draggable by header
- Stays on top of other content
- Semi-transparent background overlay

**Animation Sequence:**
1. User activates Ask Doooda
2. Doooda animated GIF appears bottom-left
3. Animation plays ONCE (no loop)
4. Stops at last frame
5. Chat window fades in over animation
6. Greeting message appears

**Greeting Message (Gender-Aware):**
- Arabic Male: "دووودة في خدمتك يا سيدي {pen_name}، كيف أساعدك؟"
- Arabic Female: "دووودة في خدمتك يا سيدتي {pen_name}، كيف أساعدكِ؟"
- English: "Doooda at your service, {pen_name}. How can I help?"

**Context Loading (If Text Selected):**
1. Show loading message: "جاري الآن قراءة إبداعاتك..." (Arabic) or "Reading your work now..." (English)
2. Brief loading animation (1-2 seconds)
3. Show ready message: "انتهيت من القراءة، وجاهز لأسئلتك في هذا الشأن"

**Chat Messages:**
- User messages: Right-aligned bubble (or left for RTL Arabic)
- Doooda messages: Left-aligned bubble with avatar
- Timestamps on each message
- Typing indicator while AI is responding
- Smooth scroll to latest message

**Input Area:**
- Text input field
- Optional attachment button (future: attach scene/chapter)
- Send button with icon
- Enter to send, Shift+Enter for new line

**Usage Indicator:**
- Bottom of window
- Shows: "Daily limit: X/30 questions used"
- Color changes as limit approaches:
  - Green: 0-20 used
  - Amber: 21-27 used
  - Red: 28-30 used

**Close Behavior:**
- Click X button
- Chat window shrinks smoothly
- Doooda closing GIF plays
- All chat history cleared (privacy)
- Context destroyed

**Error States:**
- Daily limit reached: Show friendly limit message in chat
- Network error: "حدث خطأ في الاتصال، يرجى المحاولة مرة أخرى"
- AI error: "عذراً، حدث خطأ. يرجى المحاولة لاحقاً"

**Free Plan Users:**
- Can see Ask Doooda option (discoverable)
- On click: Show upgrade modal
- Message: "Ask Doooda is available for Pro plan subscribers. Upgrade to access AI assistance!"
- Upgrade button links to subscription page

---

## Part 5: User Settings

### 5.1 Profile Settings

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Settings                                                    │
│                                                               │
│  ┌─ Sidebar ─────────┐ ┌─ Content ─────────────────────────┐│
│  │ Profile           │ │ Profile Information                ││
│  │ Account           │ │                                    ││
│  │ Subscription      │ │ ┌────────────────────────────────┐││
│  │ Preferences       │ │ │ Avatar                         │││
│  │ Privacy           │ │ │ [Upload Image]                 │││
│  │ Help & Support    │ │ └────────────────────────────────┘││
│  └───────────────────┘ │                                    ││
│                         │ Pen Name                          ││
│                         │ ┌────────────────────────────────┐││
│                         │ │ [text input]                   │││
│                         │ └────────────────────────────────┘││
│                         │                                    ││
│                         │ Gender                            ││
│                         │ ○ Male  ● Female  ○ Other        ││
│                         │                                    ││
│                         │ Bio (optional)                    ││
│                         │ ┌────────────────────────────────┐││
│                         │ │ [textarea, 500 chars max]      │││
│                         │ └────────────────────────────────┘││
│                         │                                    ││
│                         │ [Save Changes]                    ││
│                         └────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Sections:**
1. Profile
2. Account
3. Subscription
4. Preferences
5. Privacy
6. Help & Support

### 5.2 Account Settings

```
│ Account                                                      │
│                                                               │
│ Email Address                                                │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ user@example.com                                       │  │
│ └────────────────────────────────────────────────────────┘  │
│ [Change Email]                                               │
│                                                               │
│ Password                                                     │
│ ••••••••••••                                                 │
│ [Change Password]                                            │
│                                                               │
│ Timezone                                                     │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ [Dropdown selector]                                    │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                               │
│ Danger Zone                                                  │
│ ────────────────────────────────────────────────────────    │
│ [Delete Account] - This action cannot be undone             │
```

### 5.3 Subscription Settings

```
│ Subscription                                                 │
│                                                               │
│ Current Plan: Pro                                            │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ 🌱 Pro Plan - $10/month                                 │  │
│ │                                                          │  │
│ │ ✓ Ask Doooda AI assistance (30/day)                    │  │
│ │ ✓ Daily writing goals                                   │  │
│ │ ✓ Advanced analytics                                    │  │
│ │ ✓ Priority support                                      │  │
│ │                                                          │  │
│ │ Next billing date: January 15, 2026                    │  │
│ │ Amount: $10.00 USD                                      │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                               │
│ Payment Method                                               │
│ Visa •••• 4242                                               │
│ [Update Payment Method]                                      │
│                                                               │
│ Billing History                                              │
│ [View Invoices]                                              │
│                                                               │
│ [Upgrade to Annual] (Save 20%)                              │
│ [Cancel Subscription]                                        │
```

### 5.4 Preferences

```
│ Preferences                                                  │
│                                                               │
│ Language                                                     │
│ ○ العربية (Arabic)    ● English                            │
│                                                               │
│ Default Project Language                                     │
│ ○ Arabic    ● English                                       │
│                                                               │
│ Daily Writing Goal                                           │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ [500] words per day                                    │  │
│ └────────────────────────────────────────────────────────┘  │
│ □ Enable daily goal reminders                              │
│                                                               │
│ Notifications                                                │
│ ☑ Goal reminders                                            │
│ ☑ Milestone celebrations                                     │
│ ☑ Weekly progress reports                                    │
│ □ Feature updates                                           │
│                                                               │
│ Editor Preferences                                           │
│ Font Size: ○ Small  ● Medium  ○ Large                      │
│ Theme: ● Light  ○ Dark                                      │
│                                                               │
│ [Save Preferences]                                           │
```

---

## Part 6: Admin Panel

### 6.1 Admin Login

**Layout:**
```
┌─────────────────────────────────────────┐
│                                          │
│          Doooda Admin                   │
│          [Admin Shield Icon]            │
│                                          │
│  Admin Login                            │
│                                          │
│  ┌────────────────────────────────────┐│
│  │ Email                              ││
│  │ [email input]                      ││
│  └────────────────────────────────────┘│
│                                          │
│  ┌────────────────────────────────────┐│
│  │ Password                           ││
│  │ [password input]                   ││
│  └────────────────────────────────────┘│
│                                          │
│  [Log In to Admin Panel]                │
│                                          │
│  ← Back to Main Site                    │
└─────────────────────────────────────────┘
```

**Security:**
- Separate admin route `/admin`
- Role check on login (must be admin role)
- Session timeout after 30 minutes of inactivity
- All admin actions logged

---

### 6.2 Admin Dashboard

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Doooda Admin                                    [Logout]   │
│  ─────────────────────────────────────────────────────────  │
│                                                               │
│  ┌─ Sidebar ────────────┐ ┌─ Content ─────────────────────┐│
│  │ Dashboard            │ │ Overview                       ││
│  │ Users                │ │                                ││
│  │ Subscriptions        │ │ ┌──────┐ ┌──────┐ ┌──────┐  ││
│  │ Plans & Pricing      │ │ │ 1,247│ │  856 │ │  391 │  ││
│  │ AI Providers         │ │ │ Users│ │ Free │ │  Pro │  ││
│  │ AI Usage Limits      │ │ └──────┘ └──────┘ └──────┘  ││
│  │ Message Templates    │ │                                ││
│  │ SMTP Settings        │ │ ┌───────────────────────────┐││
│  │ Payment Settings     │ │ │ Recent Activity            │││
│  │ Tracking Settings    │ │ │                            │││
│  │ Audit Logs           │ │ │ • User xyz upgraded to Pro │││
│  │ System Settings      │ │ │ • 45 AI requests today     │││
│  └──────────────────────┘ │ │ • 12 new signups today     │││
│                             │ └───────────────────────────┘││
│                             │                                ││
│                             │ System Health                 ││
│                             │ ✓ Database: Healthy           ││
│                             │ ✓ AI Providers: 3/4 Active   ││
│                             │ ✓ Storage: 45% Used           ││
│                             └────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Sidebar Navigation:**
- Dashboard (overview)
- Users
- Subscriptions
- Plans & Pricing
- AI Providers
- AI Usage Limits
- Message Templates
- SMTP Settings
- Payment Settings
- Tracking Settings
- Audit Logs
- System Settings

---

### 6.3 User Management

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Users                                                        │
│                                                               │
│ [Search users...] [Filter: All ▼] [Export CSV]              │
│                                                               │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Email              │ Pen Name  │ Plan │ Status │ Actions ││
│ ├──────────────────────────────────────────────────────────┤│
│ │ john@email.com    │ John Smith│ Pro  │ Active │ [View]  ││
│ │ sarah@email.com   │ Sarah Chen│ Free │ Active │ [View]  ││
│ │ alex@email.com    │ Alex T.   │ Pro  │ Active │ [View]  ││
│ │ emma@email.com    │ Emma W.   │ Free │ Locked │ [View]  ││
│ └──────────────────────────────────────────────────────────┘│
│                                                               │
│ [Pagination: < 1 2 3 ... 25 >]                              │
│                                                               │
│ Total Users: 1,247                                           │
└─────────────────────────────────────────────────────────────┘
```

**User Detail Modal:**
```
┌─────────────────────────────────────────┐
│ User Details                      [X]   │
│ ─────────────────────────────────────   │
│                                          │
│ Email: john@email.com                   │
│ Pen Name: John Smith                    │
│ Gender: Male                            │
│ Joined: December 1, 2025               │
│ Last Active: 2 hours ago                │
│                                          │
│ Subscription                            │
│ Plan: Pro                               │
│ Status: Active                          │
│ Since: December 15, 2025               │
│                                          │
│ Usage Statistics                        │
│ Projects: 3                             │
│ Total Words: 15,623                     │
│ AI Requests Today: 12/30               │
│ AI Requests This Month: 234/900        │
│                                          │
│ Actions                                 │
│ [Lock Account]                          │
│ [Reset Password]                        │
│ [Set AI Override]                       │
│ [View Audit Log]                        │
│ [Delete Account]                        │
└─────────────────────────────────────────┘
```

**Admin Actions:**
- View user details
- Lock/unlock account
- Reset password (send email)
- Set AI usage override
- Delete account (with confirmation)
- View user's audit log

---

### 6.4 Plans & Pricing Management

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Plans & Pricing                               [+ Add Plan]  │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Free Plan                                 [Edit] [Lock]  │ │
│ │ ────────────────────────────────────────────────────────│ │
│ │ Price: $0/month                                          │ │
│ │ Status: ● Active                                         │ │
│ │                                                           │ │
│ │ Features:                                                │ │
│ │ ✓ Basic writing tools                                   │ │
│ │ ✓ Cloud backup                                          │ │
│ │ ✓ Export (Word/PDF)                                     │ │
│ │ ✗ AI assistance                                         │ │
│ │ ✗ Advanced analytics                                    │ │
│ │                                                           │ │
│ │ Subscribers: 856                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Pro Plan                                  [Edit] [Lock]  │ │
│ │ ────────────────────────────────────────────────────────│ │
│ │ Price: $10/month                                         │ │
│ │ Annual Price: $96/year (save $24)                       │ │
│ │ Status: ● Active                                         │ │
│ │                                                           │ │
│ │ Features:                                                │ │
│ │ ✓ Everything in Free                                    │ │
│ │ ✓ Ask Doooda AI (30 questions/day)                     │ │
│ │ ✓ Daily writing goals                                   │ │
│ │ ✓ Advanced analytics                                    │ │
│ │ ✓ Priority support                                      │ │
│ │                                                           │ │
│ │ Subscribers: 391                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Edit Plan Modal:**
- Plan name
- Price (monthly/annual)
- Features list (add/remove)
- Status (active/inactive)
- Description (for marketing)
- Trial period settings
- Limits configuration

---

### 6.5 AI Providers Management

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ AI Providers                              [+ Add Provider]  │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ OpenAI                              ● Active  [Edit]     │ │
│ │ ────────────────────────────────────────────────────────│ │
│ │ Model: gpt-4                                            │ │
│ │ API Key: sk-••••••••••••••••                           │ │
│ │ Last Tested: 2 hours ago                               │ │
│ │ Status: ✓ Connected                                    │ │
│ │                                                          │ │
│ │ [Test Connection] [Make Active] [Deactivate]           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Gemini                              ○ Inactive [Edit]   │ │
│ │ ────────────────────────────────────────────────────────│ │
│ │ Model: gemini-pro                                       │ │
│ │ API Key: AIza••••••••••••••                            │ │
│ │ Last Tested: Yesterday                                  │ │
│ │ Status: ✓ Connected                                    │ │
│ │                                                          │ │
│ │ [Test Connection] [Make Active]                        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ DeepSeek                            ○ Inactive [Edit]   │ │
│ │ ────────────────────────────────────────────────────────│ │
│ │ Model: deepseek-chat                                    │ │
│ │ API Key: Not configured                                │ │
│ │ Status: ✗ Not configured                               │ │
│ │                                                          │ │
│ │ [Configure]                                            │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Provider Configuration Modal:**
```
┌─────────────────────────────────────────┐
│ Configure AI Provider           [X]     │
│ ─────────────────────────────────────   │
│                                          │
│ Provider Name                           │
│ ┌────────────────────────────────────┐ │
│ │ [Dropdown: OpenAI, Gemini, etc.]   │ │
│ └────────────────────────────────────┘ │
│                                          │
│ API Key                                 │
│ ┌────────────────────────────────────┐ │
│ │ [password input]                   │ │
│ └────────────────────────────────────┘ │
│                                          │
│ Model                                   │
│ ┌────────────────────────────────────┐ │
│ │ [text input, e.g., gpt-4]          │ │
│ └────────────────────────────────────┘ │
│                                          │
│ [Test Connection]                       │
│                                          │
│ ○ Make this the active provider        │
│                                          │
│ [Cancel]                    [Save]      │
└─────────────────────────────────────────┘
```

**Test Connection:**
- Click Test Connection button
- Shows loading state
- Sends simple test request to provider
- Shows result:
  - Success: "✓ Connection successful"
  - Failure: "✗ Connection failed: [error details]"

---

### 6.6 AI Usage Limits Management

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ AI Usage Limits                                              │
│                                                               │
│ Global Default                                   [Edit]      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Daily Limit: 30 questions                               │ │
│ │ Monthly Limit: 900 questions                            │ │
│ │ Status: ● Active                                        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ Plan-Based Limits                                [Edit]      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Pro Plan                                                │ │
│ │ Daily: 30  │  Monthly: 900  │  ● Active                │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ User Overrides                          [+ Add Override]     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ john@email.com                               [Edit]     │ │
│ │ ────────────────────────────────────────────────────────│ │
│ │ Unlimited Access: ✓ Yes                                 │ │
│ │ Reason: Beta tester                                     │ │
│ │ Set by: admin@doooda.com                               │ │
│ │ Active: ● Yes                                           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ sarah@email.com                              [Edit]     │ │
│ │ ────────────────────────────────────────────────────────│ │
│ │ Daily: 100  │  Monthly: 3000                          │ │
│ │ Reason: Premium user - increased limits                │ │
│ │ Set by: admin@doooda.com                               │ │
│ │ Active: ● Yes                                           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ Emergency Controls                                           │
│ [ Disable Ask Doooda Globally ]                             │
└─────────────────────────────────────────────────────────────┘
```

**Add User Override Modal:**
```
┌─────────────────────────────────────────┐
│ Add User Override                 [X]   │
│ ─────────────────────────────────────   │
│                                          │
│ User                                    │
│ ┌────────────────────────────────────┐ │
│ │ [Search/select user]               │ │
│ └────────────────────────────────────┘ │
│                                          │
│ ☑ Unlimited Access                      │
│                                          │
│ OR set custom limits:                   │
│                                          │
│ Daily Limit                             │
│ ┌────────────────────────────────────┐ │
│ │ [100] questions per day            │ │
│ └────────────────────────────────────┘ │
│                                          │
│ Monthly Limit                           │
│ ┌────────────────────────────────────┐ │
│ │ [3000] questions per month         │ │
│ └────────────────────────────────────┘ │
│                                          │
│ Reason                                  │
│ ┌────────────────────────────────────┐ │
│ │ [textarea]                         │ │
│ └────────────────────────────────────┘ │
│                                          │
│ [Cancel]                    [Save]      │
└─────────────────────────────────────────┘
```

---

### 6.7 Message Templates Management

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Message Templates                                            │
│                                                               │
│ Manage system messages displayed to users                   │
│                                                               │
│ Template Category: [All ▼] [+ Add Template]                 │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Daily Limit Reached                          [Edit]      │ │
│ │ ────────────────────────────────────────────────────────│ │
│ │ Type: AI_USAGE                                          │ │
│ │ Status: ● Active                                        │ │
│ │                                                          │ │
│ │ Arabic:                                                 │ │
│ │ لقد وصلت إلى الحد اليومي لدووودة 🌱                   │ │
│ │ خُد استراحة قصيرة، وإبداعك مكمل بكرة بإذن الله.        │ │
│ │                                                          │ │
│ │ English:                                                │ │
│ │ You've reached today's Doooda limit 🌱                 │ │
│ │ Take a short break — your creativity continues tomorrow.│ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Monthly Limit Reached                        [Edit]      │ │
│ │ ────────────────────────────────────────────────────────│ │
│ │ Type: AI_USAGE                                          │ │
│ │ Status: ● Active                                        │ │
│ │                                                          │ │
│ │ [Content preview...]                                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Welcome Email                                [Edit]      │ │
│ │ ────────────────────────────────────────────────────────│ │
│ │ Type: EMAIL                                             │ │
│ │ Status: ● Active                                        │ │
│ │                                                          │ │
│ │ Subject (AR): مرحباً بك في دووودة                     │ │
│ │ Subject (EN): Welcome to Doooda                        │ │
│ │                                                          │ │
│ │ [Content preview...]                                    │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Edit Template Modal:**
```
┌─────────────────────────────────────────┐
│ Edit Message Template           [X]     │
│ ─────────────────────────────────────   │
│                                          │
│ Template Name                           │
│ ┌────────────────────────────────────┐ │
│ │ Daily Limit Reached                │ │
│ └────────────────────────────────────┘ │
│                                          │
│ Type                                    │
│ ┌────────────────────────────────────┐ │
│ │ [Dropdown: AI_USAGE, EMAIL, etc.]  │ │
│ └────────────────────────────────────┘ │
│                                          │
│ Arabic Content                          │
│ ┌────────────────────────────────────┐ │
│ │ [Rich text editor]                 │ │
│ │                                    │ │
│ │                                    │ │
│ └────────────────────────────────────┘ │
│                                          │
│ English Content                         │
│ ┌────────────────────────────────────┐ │
│ │ [Rich text editor]                 │ │
│ │                                    │ │
│ │                                    │ │
│ └────────────────────────────────────┘ │
│                                          │
│ ☑ Active                                │
│                                          │
│ [Preview] [Cancel]          [Save]      │
└─────────────────────────────────────────┘
```

**Template Categories:**
- AI_USAGE (limit messages, error messages)
- EMAIL (welcome, password reset, billing)
- NOTIFICATIONS (goals, milestones, updates)
- ERRORS (system errors, validation errors)
- SUCCESS (confirmations, completions)

---

### 6.8 Audit Logs

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Audit Logs                                                   │
│                                                               │
│ [Search...] [Filter: All ▼] [Date Range: Last 30 days ▼]   │
│                                                               │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Time         │ User        │ Action         │ Details    ││
│ ├──────────────────────────────────────────────────────────┤│
│ │ 2:15 PM      │ admin@d.com│ AI Provider   │ Changed    ││
│ │ Today        │             │ Changed       │ OpenAI →   ││
│ │              │             │               │ Gemini     ││
│ ├──────────────────────────────────────────────────────────┤│
│ │ 1:45 PM      │ john@e.com │ AI Request    │ 12/30 used ││
│ │ Today        │             │ Success       │            ││
│ ├──────────────────────────────────────────────────────────┤│
│ │ 12:30 PM     │ sarah@e.com│ Subscription  │ Free →     ││
│ │ Today        │             │ Upgrade       │ Pro        ││
│ ├──────────────────────────────────────────────────────────┤│
│ │ 11:15 AM     │ admin@d.com│ User Override │ Set        ││
│ │ Today        │             │ Set           │ unlimited  ││
│ │              │             │               │ for beta   ││
│ ├──────────────────────────────────────────────────────────┤│
│ │ 9:00 AM      │ system     │ Daily Limit   │ 15 users   ││
│ │ Today        │             │ Reset         │ affected   ││
│ └──────────────────────────────────────────────────────────┘│
│                                                               │
│ [Export to CSV]               [Pagination: < 1 2 3 >]       │
└─────────────────────────────────────────────────────────────┘
```

**Logged Events:**
- User authentication (login, logout, failed attempts)
- Subscription changes (upgrades, downgrades, cancellations)
- AI provider changes
- AI usage limit changes
- User overrides
- Account modifications (lock, delete)
- Payment events
- System configuration changes
- Bulk operations

**Filter Options:**
- Event type
- User
- Date range
- Success/failure status
- Export to CSV for analysis

---

## Part 7: Export & Marketing Features

### 7.1 Export Project

**Trigger:** Project Settings → Export Project

**Modal:**
```
┌─────────────────────────────────────────┐
│ Export Project                    [X]   │
│ ─────────────────────────────────────   │
│                                          │
│ Choose export format:                   │
│                                          │
│ ○ Microsoft Word (.docx)                │
│ ● PDF (.pdf)                            │
│ ○ Plain Text (.txt)                     │
│ ○ Markdown (.md)                        │
│                                          │
│ Include:                                │
│ ☑ Logline                               │
│ ☑ All chapters                          │
│ ☑ Scene summaries                       │
│ ☑ Character profiles                    │
│ □ Tasks and notes                       │
│                                          │
│ Layout Options:                         │
│ Font: [Dropdown]                        │
│ Font Size: [12] pt                      │
│ Line Spacing: [Double ▼]               │
│                                          │
│ [Cancel]              [Export Project]  │
└─────────────────────────────────────────┘
```

**Export Process:**
- Generate document server-side
- Show progress indicator
- Download file when ready
- Success message: "Project exported successfully!"

---

### 7.2 Marketing Materials Generation (Future)

**Trigger:** Project menu → Generate Marketing Materials

**Modal:**
```
┌─────────────────────────────────────────┐
│ Marketing Materials             [X]     │
│ ─────────────────────────────────────   │
│                                          │
│ Generate marketing content for your     │
│ book using AI (Pro feature)            │
│                                          │
│ Select materials to generate:           │
│                                          │
│ ☑ Book Blurb (back cover)              │
│ ☑ Synopsis (1-2 pages)                 │
│ ☑ Author Bio                            │
│ ☑ Social Media Posts                    │
│ ☑ Email Announcement                    │
│ □ Press Release                         │
│                                          │
│ Language: ○ Arabic  ● English          │
│                                          │
│ [Cancel]              [Generate]        │
└─────────────────────────────────────────┘
```

**Result Screen:**
```
┌─────────────────────────────────────────────────────────────┐
│ Generated Marketing Materials                          [X]  │
│ ───────────────────────────────────────────────────────────│
│                                                               │
│ Book Blurb                              [Copy] [Edit] [AI]  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [Generated blurb text...]                               │ │
│ │                                                          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ Synopsis                                [Copy] [Edit] [AI]  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [Generated synopsis...]                                 │ │
│ │                                                          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ Social Media Posts                      [Copy] [Edit] [AI]  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Post 1: [Text...]                                       │ │
│ │ Post 2: [Text...]                                       │ │
│ │ Post 3: [Text...]                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ [Download All] [Export to PDF]                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 8: Mobile Responsive Design

### 8.1 Mobile Navigation

**Bottom Navigation Bar (Mobile):**
```
┌─────────────────────────────────────────┐
│                                          │
│         [Content Area]                  │
│                                          │
│                                          │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  🏠      📚       ✍️       📊      👤   │
│ Home  Projects  Write  Progress Profile│
└─────────────────────────────────────────┘
```

**Mobile Dashboard:**
- Stacked layout (no grid)
- Collapsible sections
- Swipeable project cards
- Hamburger menu for settings

**Mobile Project Workspace:**
- Tabs collapse to dropdown
- Full-screen editor mode
- Floating action buttons
- Sticky header

**Mobile Ask Doooda:**
- Full-screen overlay (not floating window)
- Slide up animation
- Bottom sheet style
- Easy dismiss (swipe down)

---

## Part 9: Notifications & Feedback

### 9.1 Toast Notifications

**Success Toast:**
```
┌────────────────────────────────────┐
│ ✓ Changes saved successfully       │
└────────────────────────────────────┘
```

**Error Toast:**
```
┌────────────────────────────────────┐
│ ✗ An error occurred. Please retry  │
└────────────────────────────────────┘
```

**Info Toast:**
```
┌────────────────────────────────────┐
│ ℹ Your project is being exported   │
└────────────────────────────────────┘
```

**Position:** Top-center or top-right
**Duration:** 3-5 seconds
**Dismissible:** Yes (click or auto-dismiss)

### 9.2 Loading States

**Page Loading:**
- Doooda logo animation
- Calm color pulse
- "Loading your workspace..."

**Button Loading:**
- Spinner icon replaces button text
- Button disabled during load
- Returns to normal on complete

**Skeleton Screens:**
- Show layout structure while loading
- Animated shimmer effect
- Replaces with actual content smoothly

---

## Part 10: Error States

### 10.1 404 Not Found

```
┌─────────────────────────────────────────┐
│                                          │
│     [Illustration: Lost Writer]         │
│                                          │
│     Page Not Found                      │
│                                          │
│     The page you're looking for         │
│     doesn't exist or has been moved.    │
│                                          │
│     [Back to Dashboard]                 │
│                                          │
└─────────────────────────────────────────┘
```

### 10.2 Network Error

```
┌─────────────────────────────────────────┐
│                                          │
│     [Illustration: Disconnected]        │
│                                          │
│     Connection Lost                     │
│                                          │
│     Please check your internet          │
│     connection and try again.           │
│                                          │
│     [Retry]                             │
│                                          │
└─────────────────────────────────────────┘
```

### 10.3 Permission Denied

```
┌─────────────────────────────────────────┐
│                                          │
│     [Illustration: Locked]              │
│                                          │
│     Access Denied                       │
│                                          │
│     You don't have permission to        │
│     access this resource.               │
│                                          │
│     [Back to Dashboard]                 │
│                                          │
└─────────────────────────────────────────┘
```

---

## Part 11: Accessibility

### 11.1 Keyboard Navigation

- Tab order follows logical flow
- Focus indicators visible
- Escape closes modals
- Enter submits forms
- Arrows navigate lists

### 11.2 Screen Reader Support

- Semantic HTML elements
- ARIA labels on interactive elements
- Alt text on images
- Announcements for dynamic content
- Landmark regions

### 11.3 Color Contrast

- WCAG AA minimum (4.5:1 for text)
- Clear visual hierarchy
- No color-only information
- High contrast mode support

---

## Part 12: Performance Optimization

### 12.1 Code Splitting

- Route-based code splitting
- Lazy load heavy components
- Dynamic imports for modals
- Separate vendor bundles

### 12.2 Image Optimization

- Lazy loading for images
- Responsive images (srcset)
- WebP format with fallback
- Compressed avatar uploads

### 12.3 Caching Strategy

- Cache static assets (CSS, JS)
- API response caching (when appropriate)
- Offline support (Service Worker)
- Optimistic UI updates

---

## Conclusion

This comprehensive UX guide provides complete specifications for all user-facing and admin interfaces in the Doooda application. The design emphasizes:

1. **Calm Professionalism** - Clean, uncluttered interfaces with generous spacing
2. **Cultural Sensitivity** - Proper RTL/LTR support and gender-aware messaging
3. **User Empowerment** - Clear information hierarchy and intuitive navigation
4. **Privacy Focus** - Transparent data handling and respectful AI assistance
5. **Accessibility** - Inclusive design for all users
6. **Mobile-First** - Responsive layouts that work on all devices

All screens should be implemented following these specifications, with attention to detail, consistent patterns, and smooth interactions. The goal is to create a delightful writing experience that supports and encourages creativity without overwhelming the writer.

**Implementation Priority:**
1. Authentication & Onboarding (critical path)
2. Dashboard & Project Workspace (core functionality)
3. Writing Interfaces (chapters, scenes)
4. Ask Doooda Integration (Pro feature)
5. Admin Panel (administrative control)
6. Advanced Features (marketing, analytics)

**Design Assets Needed:**
- Doooda logo (SVG)
- Doooda animated GIF (greeting and closing)
- Character avatar placeholders
- Illustration set (welcome, errors, empty states)
- Icon set (Lucide React recommended)

This guide serves as the single source of truth for the Doooda user experience.
