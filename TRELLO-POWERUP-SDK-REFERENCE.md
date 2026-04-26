# Trello Power-Up SDK — Reference Notes

Findings gathered from official Atlassian docs (April 2026). This file exists so future conversations have SDK context without re-fetching.

Sources:
- [card-back-section](https://developer.atlassian.com/cloud/trello/power-ups/capabilities/card-back-section/)
- [Getting and Setting Plugin Data](https://developer.atlassian.com/cloud/trello/power-ups/client-library/getting-and-setting-data/)
- [Accessing Trello Data](https://developer.atlassian.com/cloud/trello/power-ups/client-library/accessing-trello-data/)
- [Power-Ups Reference](https://developer.atlassian.com/cloud/trello/power-ups/)
- [Topics](https://developer.atlassian.com/cloud/trello/guides/power-ups/topics/)
- [REST API Client](https://developer.atlassian.com/cloud/trello/power-ups/rest-api-client/)

---

## Architecture: Iframes

Every Power-Up capability (connector, popups, card-back-section, etc.) runs in its own sandboxed iframe. Iframes **cannot share JS scope** — functions defined in `client.js` (the connector) are not accessible from popup pages. To share logic, extract it into a common JS file loaded via `<script src>` in each page.

The connector page (`index.html`) initializes capabilities via `TrelloPowerUp.initialize({...})`. Popup/section iframes use `TrelloPowerUp.iframe()` to get a `t` context object.

---

## Data Storage: `t.get()` / `t.set()`

### Scopes

Valid scopes: `'board'`, `'card'`, `'member'`, `'organization'`, or **a specific card ID string**.

```javascript
// Current card
t.get('card', 'shared', 'myKey')

// Specific card by ID
t.get('542b0bd40d309dc6eba7ec91', 'shared', 'myKey')
t.set('542b0bd40d309dc6eba7ec91', 'shared', 'myKey', 'myValue')
```

Using `'card'` scope when no card is open will fail — Trello won't know which card is in context.

### Visibility

- `'shared'` — visible to all users
- `'private'` — visible only to the current user

### Storage Limits

**4,096 characters** per scope/visibility pair (stringified). For example, a card can store 4KB at `shared` and another 4KB at `private`.

### Batch Operations

```javascript
// Set multiple keys at once
t.set('card', 'shared', { myKey: 'myValue', more: 25 });

// Get all plugin data for all scopes/visibilities in context
t.getAll();

// Remove multiple keys
t.remove('card', 'shared', ['key1', 'key2']);
```

`t.getAll()` retrieves all plugin data for all scopes and visibilities currently in context in a single call. Useful for reducing API calls when you need data from multiple sources.

---

## Capabilities

### card-back-section

Renders an iframe on the back of a card, above the attachments section.

**Required return fields:**
- `icon` — must be a URL (gray icon recommended)
- `content.type` — must be `'iframe'`
- `content.url` — the page to load (use `t.signUrl()` for authentication)
- `content.height` — iframe height in pixels (max 1500px)

**Optional return fields:**
- `title` — displayed above the iframe
- `action` — object with `text` (string) and `callback` (function receiving `t`)

**Example:**
```javascript
'card-back-section': function(t, options) {
  return {
    title: 'My Section',
    icon: GRAY_ICON,
    content: {
      type: 'iframe',
      url: t.signUrl('./section.html'),
      height: 230
    },
    action: {
      text: 'My Action',
      callback: function(t) { return t.popup({...}); }
    }
  };
}
```

**Unknown behavior:** The docs do not document what happens if this callback returns `null`, `undefined`, or a falsy value. Only the full object return is shown. Conditional hiding of the section is undocumented — needs empirical testing.

### card-buttons

Returns an array of button objects for the right side of the card back.

Each button: `{ icon, text, callback }` where callback receives `t`.

### card-badges

Returns an array of badge objects for the front of cards in list view.

Each badge: `{ text, color }`. Valid colors include `'blue'`, `'sky'`, etc.

### card-detail-badges

Returns an array of badge objects shown below the card title on the card back.

Each badge: `{ title, text, color, callback }`. The callback opens a popup or performs an action when clicked.

### board-buttons

Returns an array of button objects for the board header.

Each button: `{ icon: { dark, light }, text, callback }`.

---

## UI Functions (available on `t`)

| Method | Description |
|--------|-------------|
| `t.popup({ title, url, height })` | Opens a popup iframe |
| `t.closePopup()` | Closes the current popup |
| `t.alert({ message, duration })` | Shows a temporary alert (duration in seconds) |
| `t.showCard(cardId)` | Navigates to a specific card |
| `t.sizeTo(selector)` | Resizes the iframe to match the element's height |
| `t.signUrl(url)` | Signs a URL for authenticated iframe loading |

---

## Accessing Trello Data

```javascript
// Get current card info
t.card('id')              // { id: '...' }
t.card('id', 'name')     // { id: '...', name: '...' }
t.card('id', 'idList')   // { id: '...', idList: '...' }

// Get all cards on the board
t.cards('id', 'name')    // [{ id: '...', name: '...' }, ...]
t.cards('id', 'name', 'url')

// Get board info
t.board('id', 'name')

// Get current member
t.member('id', 'fullName')

// Get all lists
t.lists('id', 'name')
```

---

## REST API Client

For operations beyond what the Power-Up client library supports (e.g., moving cards between lists), the REST API client is needed. This requires:

1. An `appKey` set during `TrelloPowerUp.initialize()`
2. User authorization via `t.authorize()`
3. Access to `window.Trello` for REST calls

This is separate from the iframe `t` object and requires additional setup.

---

## Common Gotchas

1. **Iframe isolation** — Each page is a separate iframe. No shared JS state between connector and popups.
2. **`'card'` scope without a card open** — `t.get('card', ...)` fails if no card is in context.
3. **4KB storage limit** — Per scope/visibility pair. Complex data structures can hit this on boards with many relationships.
4. **`t.signUrl()` required for card-back-section** — Without it, the iframe can't communicate with Trello.
5. **No documented conditional rendering for card-back-section** — Can't reliably return nothing to hide the section.
6. **Emoji in badge text** — Works but may render inconsistently across platforms.
