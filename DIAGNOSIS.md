# Card Nesting Power-Up — Diagnosis

## Critical: Data Integrity & Security

### 1. XSS via unsanitized card names in `innerHTML`

Several pages inject card names directly into HTML without escaping. Card names are user-controlled, so a name like `<img src=x onerror=alert(1)>` would execute arbitrary JavaScript.

- `pages/view-children.html:34` — `childCard.name` in innerHTML
- `pages/view-parent.html:35` — `parent.name` in innerHTML
- `pages/card-section.html:47,58` — both parent and child names in innerHTML

The `add-children.html` and `set-parent.html` pages use `textContent` (safe), and `board-overview.html` uses `textContent` (safe) — so it's inconsistent, not uniformly bad.

### 2. Adding a child doesn't check if the target already has a different parent

`pages/add-children.html:41-57` — When you add card B as a child of card C, it doesn't check if B already has a parent (say, card A). The result: B's `parentId` gets overwritten to C, but **A's `childIds` still contains B**. This creates orphaned references that corrupt badge counts and show phantom children.

### 3. One-level-deep invariant is enforced in only one direction

`set-parent.html:45` correctly checks if the target is already a child before allowing it to become a parent. But:

- **`add-children.html` never checks if the target is already a parent.** You can add a parent card (which has its own children) as a child, creating two levels of nesting.
- **`set-parent.html` never checks if the *current* card is already a parent with children.** A card with children can be made a child of another card, again breaking the one-level rule.

### 4. card-back-section "Add Children" and "Set Parent" buttons are non-functional

`pages/card-section.html:81-100` — The "+ Add Children" and "Set Parent" buttons rendered inside the card-back-section iframe call `t.popup()` directly. This silently fails because `t.popup()` is not reliably supported from within a card-back-section iframe. The SDK provides a dedicated `action` property on the card-back-section return object specifically for opening popups from that context — the existence of this escape hatch strongly suggests direct `t.popup()` calls from inside the iframe are unsupported. Combined with no `.catch()`, the failure is completely silent.

The card-back-section in `client.js:204-220` does not use the `action` property at all. The `action` field only supports a single button, so it can't directly replace both buttons — the architecture needs rethinking (e.g., open a popup with a choice, or move these actions to `card-buttons`).

### 5. Deleting a child card orphans the parent's data permanently

When a child card is deleted from Trello without first unlinking it, the parent card's `childIds` array permanently holds a ghost reference. The parent's `isParent` flag stays `true` even if all children are deleted. Badge counts are wrong, view-children shows fewer cards than advertised, and there's no self-healing path — the Power-Up SDK has no event hook for card deletion that could trigger cleanup. Every read of the parent's children should validate IDs against the actual board cards and prune stale references.

### 6. No error handling on any Promise chain

Zero `.catch()` calls in the entire codebase — `client.js`, all 5 popup pages. If any Trello API call fails (network error, storage quota, deleted card), it fails silently. The user gets no feedback and the data may be left in a half-written state (e.g., parent updated but child not). This also masks issue #4 — the broken `t.popup()` calls fail with zero feedback.

---

## Significant: Logic & Maintainability

### 7. Link/unlink logic is duplicated across 6 files

`client.js` defines `linkChild()` and `unlinkChild()` helpers, but popup iframes run in separate JS contexts and **can't access them**. So every popup re-implements the same logic inline:

| Operation | Files |
|-----------|-------|
| Link | `client.js`, `add-children.html`, `set-parent.html` |
| Unlink | `client.js`, `view-children.html`, `view-parent.html`, `card-section.html` |

The implementations have subtle differences (e.g., `card-section.html:118` wipes child data to `{}` which would destroy any parent-role data if the invariant bug above occurs). Fixing a logic bug requires changing up to 6 files, and it's easy to miss one.

> **Power-Up framework caveat:** This duplication exists *because* each popup runs in its own iframe with a separate JS context — they genuinely cannot call functions defined in `client.js`. The fix is not "just call the helpers" but rather extracting a shared `js/nesting.js` that every page loads via `<script src>`. The duplication is still a real problem, but the architecture explains why it happened.

### 8. "Gather Children Here" button is a non-functional placeholder

`client.js:115-133` — The button renders on every parent card but does nothing except show an alert saying it needs REST API auth. This is confusing UX — users click it expecting an action and get told it doesn't work. Either implement it or don't show it.

### 9. Stale closure data in card-buttons

`client.js:72` — The `card-buttons` callback captures `current` when the buttons are rendered. The "Unlink from Parent" callback at line 82 uses `current.data.parentId` from that snapshot. If the relationship changes between render time and click time (e.g., another user unlinks the card), it operates on stale data and could corrupt state.

### 10. card-back-section renders on every card, even unlinked ones

`client.js:204-220` always returns an iframe section. Cards with no nesting relationships show a "No links yet." message and action buttons, which adds visual clutter to every card on the board. Consider returning the section only when the card has relationships, or at minimum skipping the iframe for unlinked cards.

> **Power-Up framework caveat:** The official docs only show returning a full object with required fields (`icon`, `content.type`, `content.url`, `content.height`). There is no documented behavior for returning `null` or `undefined`. Until tested, assume Trello expects a value back every time. The safer alternative is to keep the section but make the iframe content minimal/invisible for unlinked cards.

### 11. Badge child count includes deleted/moved cards

`client.js:145` — The "X children" badge counts `childIds.length` without verifying those cards still exist on the board. If a child card is deleted or moved to another board, the count is wrong and the view-children popup silently skips them.

---

## Minor: UX & Polish

### 12. No loading states

All popup pages show blank content while promises resolve. On slow connections, users see an empty popup for a noticeable period.

### 13. Duplicate click listeners on card-section.html

Lines 102-108 and 110-124 attach two separate `click` listeners to `#content`. They work because they check different attributes, but it's fragile and should be a single delegated handler.

### 14. board-overview.html fires N API calls for N cards

`board-overview.html:19-23` creates one `t.get()` call per card on the board. On boards with hundreds of cards, this could hit Trello's rate limits or cause significant load times.

> **Power-Up framework caveat:** There is no batch `t.get()` for arbitrary card IDs. However, `t.getAll()` retrieves all plugin data for all scopes/visibilities currently in context in a single call — this may reduce the problem depending on what scopes are "in context" for a board-level popup. The alternative of storing relationships at the board level has a 4KB limit per scope/visibility pair, which would cap the number of relationships. This is partly a framework limitation, but `t.getAll()` is worth investigating as a mitigation.

### 15. Missing viewport meta tags

None of the HTML pages include `<meta name="viewport" content="width=device-width, initial-scale=1">`, which can cause rendering issues on mobile Trello clients.

### 16. Pre-calculated iframe height may not match content

`client.js:207-209` pre-calculates the section height, but `card-section.html` calls `t.sizeTo('#content')` which overrides it. There's a brief flash of wrong height before the iframe sizes itself.

---

## Summary

The most impactful categories to fix are:

1. **Non-functional UI** (issue 4) — the primary action buttons in the card-back-section silently do nothing due to `t.popup()` not working from that iframe context.
2. **Data integrity** (issues 2, 3, 5) — linking operations don't validate enough, and deleted cards leave permanent orphaned references with no cleanup path.
3. **Silent failures** (issue 6) — zero error handling means all of the above fail invisibly.
4. **Code duplication** (issue 7) — the same logic in 6 places makes all other bugs harder to fix and easier to reintroduce.
