# Phase 1 Checkpoint Report: Navigation Stabilization

## Finalized Changed Files

| File | Status | Purpose |
|------|--------|---------|
| `src/services/api.ts` | ✅ Complete | Unified URL generation via `resolveCommentNavigation()` |
| `src/utils/commentNavigation.ts` | ✅ Complete | Orchestrator, registry, event system |
| `src/hooks/useCommentNavigation.ts` | ✅ Complete | React hook integration |
| `src/pages/SceneEditor.tsx` | ✅ Complete | Hook integration + backward compat |
| `src/docs/CommentNavigationArchitecture.md` | ✅ Complete | Architecture docs |

## Architecture Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           URL PARAMETERS                                     │
│  New: ?comment=:id&type=inline|general&reply=:id&open=true                │
│  Legacy: ?comment_id=:id&comment_type=...&highlight_type=...              │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     useCommentNavigation Hook                               │
│  - parseCommentParams / parseLegacyCommentParams                           │
│  - normalizeNavigationState                                                  │
│  - orchestrateCommentNavigation                                             │
│  - cancelSignal for cleanup                                                 │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Orchestrator Flow                                     │
│                                                                             │
│  1. Validate navigation (active ID check, idempotency)                     │
│  2. Set active tab (inline/general)                                         │
│  3. Open comments panel if needed                                          │
│  4. Retry loop (max 5 attempts, 8s timeout):                               │
│     a. Check scene ready                                                    │
│     b. Check comments ready                                                 │
│     c. Expand thread if reply                                               │
│     d. Query registry → fallback to DOM                                    │
│     e. Emit onTargetFound / onTargetNotFound                               │
│  5. Cleanup (clear active ID)                                               │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CommentTargetRegistry                                   │
│                                                                             │
│  registerComment(id, element) ──► getComment(id) → HTMLElement            │
│  registerReply(id, element, parentId) ──► getReply(id) → {element, parentId}│
│  registerInlineAnchor(id, element)                                          │
│                                                                             │
│  Purpose: Stable target resolution independent of DOM state                │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Event Flow                                             │
│                                                                             │
│  Orchestrator emits:                                                        │
│  - onNavigationEvent({ type: 'ready' | 'cancelled' | 'timeout' | ... })   │
│  - onTargetFound(target) ──► SceneEditor sets highlightedCommentId        │
│  - onTargetNotFound({ commentId, replyId, reason })                        │
│                                                                             │
│  Separation: Navigation logic (orchestrator) vs Visual (SceneEditor)       │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Backward Compatibility

- **New format**: `?comment=:id&type=inline&reply=:id&open=true`
- **Legacy format**: `?comments=true&comment_id=:id&comment_type=general&highlight_type=reply&parent_comment_id=:id`
- Parser detects format and routes to appropriate handler
- Both notification types stored in DB continue to work

## Known Placeholders

```typescript
// useCommentNavigation.ts - expandThread callback
expandThread: (commentId: string) => {
  console.log('[Orchestrator] Expand thread:', commentId);
  // TODO: Connect to actual comment component expand
},
```

```typescript
// commentNavigation.ts - Inline anchor registry not yet integrated
// TODO: Add registerInlineAnchor calls in InlineCommentSidebar
```

## Known Technical Debt

1. **expandThread** - No actual thread expansion implementation
2. **Registry registration** - SceneComments/InlineCommentSidebar not calling registry
3. **Hover sync** - Separate from navigation, needs integration later
4. **Inline anchor stabilization** - Editor selection lifecycle not analyzed

## Integration Points

| Component | Integration Needed |
|-----------|-------------------|
| SceneComments | Register comment elements to registry |
| InlineCommentSidebar | Register reply elements on expand |
| InlineCommentSidebar | Register inline anchors on render |
| (Any) | Implement expandThread callback |

---

## Phase 2 Guidelines

### SAFE TO MODIFY in Phase 2

- Inline anchor handling (`expandThread` integration)
- Registry registration calls in components
- Hover synchronization logic
- Scroll targeting internals (fallback DOM queries)
- Visual highlight animation timing

### DO NOT MODIFY (unless absolutely necessary)

- URL format structure
- Navigation orchestrator contract
- Event interfaces (`NavigationTarget`, `NavigationEvent`)
- Notification payload structure
- Backward compatibility parser logic
- `resolveCommentNavigation` API function

---

## Rollback Notes

### Critical Infrastructure (Do NOT revert)

- `src/utils/commentNavigation.ts` - Core orchestrator
- `src/services/api.ts` - URL generation function

### Revert Path if Phase 2 Breaks Navigation

1. Keep `resolveCommentNavigation` in api.ts (used by notifications)
2. Remove `useCommentNavigation` hook from SceneEditor
3. Restore old URL param handling in SceneEditor useEffect
4. Keep commentNavigation.ts as utility (no harm)
5. Comment components continue to work without registry

### Minimal Rollback Command Sequence

```bash
# If Phase 2 breaks navigation:
# 1. Remove hook import and usage from SceneEditor.tsx
# 2. Restore old useEffect handling (lines 210-235)
# 3. Keep api.ts changes (backward compatible)
```

---

## Phase 2 Pre-requisites

Before modifying inline anchors:

⚠️ **CRITICAL**: Analyze editor selection lifecycle carefully
- How is text selection captured?
- How are anchors stored (start/end offsets)?
- How does resolved state affect anchor visibility?
- What happens when user edits text (do anchors shift)?

This requires careful analysis of:
- `InlineCommentSidebar` selection handling
- `SceneEditor` contentEditable/editor state
- Anchor offset storage in `inline_comments` table
- Text modification impact on anchor positions

**Do NOT start implementation until this analysis is complete.**