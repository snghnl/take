# Take — Chrome Extension Implementation Plan

## Overview

A Chrome extension built with WXT + React that provides:
1. **Text Highlighting** — highlight any text on any webpage, persisted across sessions
2. **Page Archiving** — save a snapshot of any page's text content
3. **LLM Chat Sidebar** — ask questions about the current page using Anthropic API (user's own key)

---

## File Structure

```
take/
├── wxt.config.ts                    (modify)
├── entrypoints/
│   ├── background.ts                (rewrite)
│   ├── content.ts                   (create — was content.ts with google-only match)
│   ├── popup/
│   │   ├── index.html               (keep as-is)
│   │   ├── main.tsx                 (keep as-is)
│   │   ├── style.css                (keep as-is)
│   │   ├── App.tsx                  (rewrite)
│   │   └── App.css                  (rewrite)
│   └── sidepanel/                   (create entirely)
│       ├── index.html
│       ├── main.tsx
│       └── App.tsx
```

---

## 1. `wxt.config.ts`

Add manifest fields:

```ts
manifest: {
  permissions: ['storage', 'activeTab', 'sidePanel', 'scripting', 'tabs'],
  host_permissions: ['<all_urls>'],
}
```

- `storage` — read/write highlights and archives
- `activeTab` — access the current tab's URL/title
- `sidePanel` — enable Chrome side panel API
- `scripting` — run `executeScript` on active tab to extract page text
- `tabs` — query active tab info
- `host_permissions: <all_urls>` — allow content script on all pages + CORS fetch to Anthropic API

WXT auto-detects the `sidepanel` entrypoint and adds `side_panel.default_path` to manifest.

---

## 2. `entrypoints/background.ts`

Service worker. Acts as message hub between popup, sidepanel, and content scripts.

### On startup
```ts
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
```
Prevents side panel from auto-opening on icon click (we control this from the popup).

### Message handlers (`browser.runtime.onMessage`)

| `message.type`      | What it does |
|---------------------|--------------|
| `OPEN_SIDEPANEL`    | Calls `chrome.sidePanel.open({ tabId })` for the active tab |
| `ARCHIVE_PAGE`      | Upserts an archive entry in `storage.local` (keyed by URL) |
| `GET_ARCHIVES`      | Returns the full `archives[]` array from `storage.local` |
| `DELETE_ARCHIVE`    | Removes one entry from `archives[]` by `id` |
| `GET_PAGE_CONTENT`  | Runs `executeScript` on active tab → returns `{ content, title, url }` |

### Storage schema
```
storage.local:
  archives: ArchiveItem[]

interface ArchiveItem {
  id: string        // Date.now() string
  url: string
  title: string
  textContent: string   // up to 50,000 chars
  date: string          // ISO timestamp
}
```

---

## 3. `entrypoints/content.ts`

Injected into every page (`matches: ['<all_urls>']`). Pure TypeScript, no React — avoids overhead and style conflicts on host pages.

### Highlight toolbar

A `<div>` appended to `document.documentElement` (not `body`, to survive DOM resets) with `z-index: 2147483647`. Contains:
- 4 color circle buttons: yellow `#fef08a`, green `#bbf7d0`, blue `#bfdbfe`, pink `#fbcfe8`
- A divider
- A remove `✕` button

Toolbar is hidden by default (`display: none`), shown on text selection.

### Interaction flow

```
mouseup
  ├── If text is selected
  │     → save Range, show toolbar near cursor
  └── If click on existing <mark data-hl-id>
        → save Range (mark contents), show toolbar near cursor

Toolbar color button mousedown (preventDefault to preserve selection)
  → wrap Range in <mark style="background: COLOR" data-hl-id="ID">
  → save to storage
  → hide toolbar

Toolbar remove button mousedown
  → find closest <mark data-hl-id> ancestor
  → unwrap (move children out, remove mark element)
  → delete from storage
  → hide toolbar

mousedown outside toolbar → hide toolbar
Escape key → hide toolbar
```

### Highlight persistence

**Saving:** each highlight stored as:
```ts
interface HLData {
  id: string       // timestamp
  text: string     // exact selected text (used to re-find on restore)
  bg: string       // hex color
  colorName: string
}
```
Stored in `storage.local` under key `hl_<location.href>`.

**Restoring on page load:** `TreeWalker` walks all text nodes, finds the first occurrence of `h.text`, wraps it in a `<mark>` with the saved color and `data-hl-id`. Skips `SCRIPT`, `STYLE`, `NOSCRIPT`, and existing `mark[data-hl-id]` nodes.

### Message listener
Responds to `GET_PAGE_CONTENT` from the side panel (fallback path, though background handles this via `executeScript`).

---

## 4. `entrypoints/sidepanel/`

A full React app rendered in Chrome's side panel.

### `index.html`
Minimal HTML shell, loads `main.tsx`.

### `main.tsx`
Standard React 19 `createRoot` entry point.

### `App.tsx`

**State:**
```ts
tab: 'chat' | 'settings'
apiKey: string
model: string
messages: { role: 'user' | 'assistant', content: string }[]
input: string
loading: boolean
pageCtx: { content: string, title: string, url: string } | null
error: string
```

**On mount:**
- Load `apiKey` and `model` from `storage.sync`
- Send `GET_PAGE_CONTENT` to background → set `pageCtx`

**Chat tab layout:**
```
┌─────────────────────────────┐
│  [Chat] [Settings]    ↺  ✕ │  ← header with tabs + refresh/clear
├─────────────────────────────┤
│ ● Page title                │  ← green context bar (shows active page)
├─────────────────────────────┤
│                             │
│   (empty state / messages)  │  ← scrollable message list
│                             │
├─────────────────────────────┤
│ [textarea............] [↑]  │  ← input area, Enter to send
└─────────────────────────────┘
```

- User messages: right-aligned, blue background
- Assistant messages: left-aligned, white with border
- Loading: typing indicator (3 animated dots)
- Error: red banner above input

**LLM API call (direct fetch, no SDK):**
```
POST https://api.anthropic.com/v1/messages
Headers:
  x-api-key: <apiKey>
  anthropic-version: 2023-06-01
  anthropic-dangerous-direct-browser-access: true
  content-type: application/json

Body:
  model: <selected model>
  max_tokens: 1024
  system: "You are a helpful assistant. The user is viewing:\nTitle: ...\nURL: ...\nContent: ..."
  messages: [ ...conversation history ]
```

The `anthropic-dangerous-direct-browser-access: true` header is required for direct browser-to-API calls (suppresses Anthropic's CORS warning).

**Settings tab:**
- Password input for API key
- Select for model: `claude-3-5-haiku-20241022` (default), `claude-3-5-sonnet-20241022`, `claude-opus-4-5`
- Save button → writes to `storage.sync`, switches to Chat tab

---

## 5. `entrypoints/popup/App.tsx`

Replaces the WXT starter boilerplate.

**Layout (340px wide):**
```
┌──────────────────────────────────┐
│ Take                             │
│ [📥 Archive page]  [💬 Chat]    │
├──────────────────────────────────┤
│ ARCHIVES                      8 │
│ ┌────────────────────────────┐  │
│ │ Page title          Jan 5  │✕ │
│ │ Page title          Jan 4  │✕ │
│ │ ...                        │  │
│ └────────────────────────────┘  │
└──────────────────────────────────┘
```

**"Archive page" button:**
1. Query active tab
2. `browser.scripting.executeScript` → extract `{ url, title, textContent }`
3. Send `ARCHIVE_PAGE` to background
4. Button briefly shows "✓ Archived" then resets
5. Reload archive list

**"Chat" button:**
1. Send `OPEN_SIDEPANEL` to background
2. `window.close()` to close popup

**Archive list:**
- Shows last 8 archives
- Each row: clickable title (opens URL in new tab) + date + delete button
- Delete sends `DELETE_ARCHIVE` then refreshes list

---

## 6. `entrypoints/popup/App.css`

Clean, minimal styles. No external UI library. Key design tokens:
- Font: system `-apple-system, BlinkMacSystemFont, 'Segoe UI'`
- Primary: `#3b82f6` (blue)
- Border: `#e2e8f0`
- Muted text: `#94a3b8`

---

## Data Flow Diagram

```
User selects text on page
  → content.ts shows toolbar
  → user picks color
  → content.ts wraps in <mark>, saves to storage.local[hl_<url>]
  → on next page load, content.ts restores marks

User clicks "Archive page" in popup
  → popup.App → background (ARCHIVE_PAGE)
  → background saves to storage.local[archives]

User clicks "Chat" in popup
  → popup sends OPEN_SIDEPANEL → background opens side panel → popup closes

Side panel mounts
  → sends GET_PAGE_CONTENT → background runs executeScript → returns page text
  → user types question → fetch to api.anthropic.com/v1/messages
  → response rendered in chat
```

---

## Key Constraints & Notes

- **No streaming**: LLM responses are non-streaming for simplicity. The full response arrives at once.
- **Highlight restoration is best-effort**: uses first exact text match. If the page content changes or the text appears multiple times, only the first occurrence is highlighted. This is a known limitation.
- **Content size limit**: page text is capped at 50,000 characters before sending to the LLM to stay within token limits.
- **Archives cap**: max 100 archives stored (oldest dropped automatically).
- **API key security**: stored in `storage.sync` (encrypted at rest by Chrome, synced across devices if user is signed in to Chrome).
- **Chrome-only**: `chrome.sidePanel` is a Chrome-specific API. Firefox support would require a different approach (e.g., injected sidebar panel).
