# Card Nesting — Trello Power-Up
**By Threeclipse Inc.**

Group cards into parent-child relationships with collapsible visual indicators.

## Features

- **Add Children**: Link cards as children of a parent card
- **Set Parent**: Make any card a child of another
- **Visual Badges**: Parent cards show "📁 X children", child cards show "↳ Child"
- **Card Back Section**: See all linked cards directly on the card back with one-click unlink
- **Board Overview**: Board button shows all card groups at a glance
- **One-click Unlink**: Remove parent-child relationships from any direction
- **One level deep**: Prevents nested hierarchies (a child can't also be a parent)

## Setup

### 1. Host the files

The Power-Up needs to be hosted at a public HTTPS URL. Free options:

**Netlify (recommended):**
1. Go to [netlify.com](https://netlify.com) and sign up
2. Drag the entire `trello-card-nesting` folder onto the Netlify dashboard
3. Copy the URL Netlify gives you (e.g., `https://your-site-name.netlify.app`)

**GitHub Pages:**
1. Push this folder to a GitHub repository
2. Go to Settings → Pages → Deploy from branch
3. Your URL will be `https://yourusername.github.io/repo-name/`

### 2. Register the Power-Up in Trello

1. Go to [trello.com/power-ups/admin](https://trello.com/power-ups/admin)
2. Click **Create new Power-Up**
3. Fill in:
   - **Name**: Card Nesting
   - **Workspace**: Select your Threeclipse workspace
   - **Iframe connector URL**: Paste your hosted URL (e.g., `https://your-site-name.netlify.app/`)
4. Click **Create**
5. Under **Capabilities**, enable:
   - ✅ Card Buttons
   - ✅ Card Badges
   - ✅ Card Detail Badges
   - ✅ Card Back Section
   - ✅ Board Buttons
6. Save

### 3. Add to your board

1. Open your Trello board
2. Click **Power-Ups** in the board menu
3. Go to **Custom** tab
4. Find "Card Nesting" and click **Add**

## Usage

- Open any card → click **Add Children** → select cards to nest
- Open any card → click **Set Parent** → select the parent card
- Child cards show an **Unlink from Parent** button
- Click the **Card Nesting** board button to see all groups
- Unlink children from the card back section (✕ button) or from buttons

## Limitations (v1)

- **No drag-to-nest**: Trello's API doesn't expose drag events. Use buttons instead.
- **No auto-follow on move**: Moving a parent doesn't auto-move children (requires REST API auth + webhooks — planned for v2).
- **No visual collapse in list view**: Trello doesn't allow Power-Ups to hide cards in lists. Children remain visible as separate cards with a "↳ Child" badge.
- **Single board**: Parent-child links are per-board.

## Planned for v2

- REST API integration for "Gather Children" (auto-move children to parent's list)
- Webhook-based auto-follow when parent card moves
- Trello API key configuration UI

## File Structure

```
trello-card-nesting/
├── index.html              # Power-Up connector (entry point)
├── css/
│   ├── styles.css          # Main styles
│   └── popup.css           # Shared popup styles
├── js/
│   └── client.js           # Power-Up initialization & capabilities
├── pages/
│   ├── add-children.html   # Popup: select children to add
│   ├── set-parent.html     # Popup: select parent card
│   ├── view-children.html  # Popup: view/manage children
│   ├── view-parent.html    # Popup: view/unlink parent
│   ├── card-section.html   # Card back embedded section
│   └── board-overview.html # Board button: all groups overview
└── README.md
```
