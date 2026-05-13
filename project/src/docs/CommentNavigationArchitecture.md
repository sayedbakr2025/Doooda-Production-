# Comment Navigation Architecture

## Overview

This document describes the unified navigation system for comments and replies in the scene editor.

## Architecture Goals

1. **Single Source of Truth** - All comment navigation flows through one orchestrator
2. **Resilient Execution** - Handles race conditions, missing targets, and timeouts gracefully
3. **Separation of Concerns** - Navigation logic is separate from visual highlight rendering
4. **Registry-Based Resolution** - Targets are registered explicitly, not discovered via DOM queries

## Core Components

### 1. Comment Target Registry (`commentNavigation.ts`)

```
┌─────────────────────────────────────────────────────────────┐
│                    commentTargetRegistry                     │
├─────────────────────────────────────────────────────────────┤
│  Map<string, HTMLElement>    comments                       │
│  Map<string, {element, parentId}>  replies                  │
│  Map<string, HTMLElement>    inlineAnchors                 │
├─────────────────────────────────────────────────────────────┤
│  registerComment(id, element)                               │
│  registerReply(id, element, parentId)                       │
│  getComment(id) -> HTMLElement | null                       │
│  getReply(id) -> { element, parentId } | null               │
└─────────────────────────────────────────────────────────────┘
```

**Why Registry?**
- DOM queries become unreliable with virtualization, lazy loading, conditional rendering
- Registry provides stable, testable target resolution
- Orchestrator can query registry first, fall back to DOM if needed

### 2. Orchestrator (`orchestrateCommentNavigation`)

```
┌─────────────────────────────────────────────────────────────┐
│                 orchestrateCommentNavigation                │
├─────────────────────────────────────────────────────────────┤
│  Input: NavigationState {                                   │
│    - sceneId, commentId, replyId, type, shouldOpenComments │
│  }                                                          │
│                                                             │
│  Config: OrchestratorConfig {                              │
│    - maxRetries, retryDelay, maxTimeoutMs                  │
│    - sceneReadyCheck, commentsReadyCheck                    │
│    - expandThread, scrollToComment, scrollToReply           │
│    - onTargetFound, onTargetNotFound, onNavigationEvent     │
│  }                                                          │
│                                                             │
│  Output: OrchestratorResult { success, stage, error }      │
└─────────────────────────────────────────────────────────────┘
```

**Flow:**
1. Check for active navigation (prevent parallel execution)
2. Check idempotency (skip already-processed targets)
3. Set active tab (inline/general)
4. Open comments panel if needed
5. Retry loop:
   - Check scene ready
   - Check comments ready
   - Expand parent thread (if reply)
   - Scroll to reply or comment via registry
   - Emit `onTargetFound` event
   - If not found, retry with delay

### 3. Navigation Hook (`useCommentNavigation.ts`)

React hook that:
- Parses URL params (supports both old and new formats)
- Initializes orchestrator with component callbacks
- Manages lifecycle (cleanup on unmount)
- Delegates visual highlights to parent component

**Separation of Concerns:**
- Navigation layer: resolves targets, orchestrates scroll
- Highlight layer: handles visual flash/animation (managed by SceneEditor)
- Event-driven: orchestrator emits `onTargetFound`, SceneEditor reacts

## URL Formats

### New Unified Format (Recommended)
```
/projects/:projectId/chapters/:chapterId/scenes/:sceneId?comment=:commentId&type=inline|general&reply=:replyId&open=true
```

### Legacy Format (Backward Compatible)
```
/project/:projectId/scene/:sceneId?comments=true&comment_id=:commentId&comment_type=inline|general&highlight_type=reply&parent_comment_id=:parentId
```

## Event Flow

```
URL Change
    │
    ▼
parseCommentParams() / parseLegacyCommentParams()
    │
    ▼
normalizeNavigationState()
    │
    ▼
orchestrateCommentNavigation()
    │
    ├─► setActiveTab(type)
    │
    ├─► onNavigationEvent({ type: 'ready' })
    │
    ├─► expandThread(commentId)
    │
    ├─► scrollToReply() or scrollToComment() via registry
    │
    ├─► onNavigationEvent({ type: 'target_found', target })
    │
    └─► onTargetFound(target) ──► SceneEditor sets highlightedCommentId
```

## Retry Lifecycle

```
Attempt 1: Check ready → Execute scroll → Success/Fail
     │
     ▼ (if fail)
Attempt 2: Check ready → Execute scroll → Success/Fail
     │
     ▼ (if fail)
...
Attempt N: Check ready → Execute scroll → Success/Fail
     │
     ▼ (if fail)
Max Retries Exceeded → Return { success: false, stage: 'max_retries' }
```

## Cancellation

- `cancelSignal.current = true` stops retry loop
- Active navigation ID prevents parallel executions
- Cleanup on component unmount

## Extension Points

1. **Custom Scroll Logic** - Override `scrollToComment`, `scrollToReply` in config
2. **Custom Events** - Provide `onNavigationEvent`, `onTargetFound`, `onTargetNotFound`
3. **Virtualized Lists** - Registry integrates with virtual scroll positioning

## Common Pitfalls to Avoid

1. **Don't** query DOM directly in orchestrator - use registry first
2. **Don't** couple navigation with visual rendering - emit events instead
3. **Don't** allow infinite retries - set maxRetries and maxTimeoutMs
4. **Don't** skip cancellation on unmount - leaks and race conditions occur
5. **Don't** mix old/new URL formats - normalize to single format early

## Testing Considerations

- Mock registry with test elements
- Simulate slow rendering with artificial delays
- Test cancellation mid-retry
- Verify idempotency with repeated navigation