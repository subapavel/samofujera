# Section-Based Page Editor — Design

**Date:** 2026-02-19
**Status:** Approved design, pending implementation plan

## Overview

Redesign the page editor to use a Webnode-inspired two-level hierarchy:
Sections (full-width layout bands) contain Elements (text, image, button, separator).
The editor renders the page at full width with a WordPress-style admin toolbar pinned at the top.

## Data Model

No DB migration needed. The page `content` JSONB column changes shape:

```json
{
  "version": 1,
  "sections": [
    {
      "id": "uuid-string",
      "content": { "root": { "...Lexical EditorState..." } }
    }
  ]
}
```

**Backward compatibility:** Pages stored in the old format (single Lexical state)
are auto-wrapped in one section on load.

## New Page Flow

1. User clicks "Nová stránka" in `/admin/pages` → **Template picker modal**
2. Only option for v1: "Prázdná stránka" (blank page)
3. After selecting → **Title modal** (page name input, slug auto-generated)
4. Page created via API → redirect to `/admin/pages/[id]/edit`
5. Default content: one section with a heading + "Vložte svůj text..." placeholder

## Editor Route: `/admin/pages/[id]/edit`

Full-width layout — no admin sidebar, no constrained container. The page renders
exactly as it would look publicly, with an admin toolbar pinned at the top.

### Admin Toolbar

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ← Zpět  │  Název stránky  │  [Publikovat ▾]  │  ↶  ↷  │  ⚙  │ Uložit │
└──────────────────────────────────────────────────────────────────────────┘
```

All buttons use **Lucide icons**:

| Element | Icon | Behavior |
|---------|------|----------|
| ← Zpět | `ArrowLeft` | Navigate to `/admin/pages` |
| Page title | — | Inline editable text input |
| Publish | `ChevronDown` | Split button with dropdown (see below) |
| Undo | `Undo2` | Undo last action |
| Redo | `Redo2` | Redo last action |
| Settings | `Settings` | Open settings drawer |
| Uložit | `Save` | Save page |

### Split Publish Button

Split button with dropdown arrow (same pattern as product type selector):

- **Publikovat** — publish immediately (sets `publishedAt = now`)
- **Naplánovat publikování** — opens a date/time picker to schedule future publication

When a page is already published:
- Button shows "Publikováno" with option to unpublish
- Schedule option still available to change publish date

When a page is scheduled:
- Button shows "Naplánováno: DD.MM.YYYY HH:MM" with options to publish now or cancel schedule

### Settings Drawer

Side panel sliding from the right (`Sheet` component from shadcn/ui):

- **Slug** (URL path) — text input
- **Meta title** — text input (with char count)
- **Meta description** — textarea (with char count)
- Close via X button or click outside

## Two-Level + Button System

### Section-Level (between sections)

- **Thick solid line** spanning full width with a **big + circle centered** on it
- Appears on hover between sections and after the last section
- Click → inserts a new blank section at that position
- Visual weight: prominent, unmissable

### Element-Level (inside section)

- **Hover over any element** → dashed border around the whole block
- **Move cursor near top or bottom edge** → that edge shows a **dashed line**
  with a **small + icon on the left side**
- **Click +** → popup picker with available element types
- Picker shows element types valid for the section (all types for blank section):
  Text, Obrázek, Dělicí čára, Tlačítko
- Visual weight: subtle, contextual — lighter than section-level

## Section Wrapper

- Subtle visual boundary on hover (light background tint or thin border)
- Delete button appears on hover (top-right corner)
- Drag handle for reorder (future — not in v1)

## Undo / Redo

- Each section's Lexical editor has its own `HistoryPlugin` (element-level undo)
- Section-level operations (add/remove/reorder) tracked in a separate undo stack
  managed by `SectionList`
- Toolbar undo/redo dispatches to the focused section's Lexical history,
  or the section-level stack if no section is focused

## Component Structure

```
/admin/pages/[id]/edit/page.tsx (new route)
├── EditorToolbar
│   ├── BackButton (ArrowLeft)
│   ├── PageTitleInput (inline editable)
│   ├── PublishSplitButton (ChevronDown dropdown)
│   │   ├── Publikovat
│   │   └── Naplánovat publikování → DateTimePicker
│   ├── UndoButton (Undo2) + RedoButton (Redo2)
│   ├── SettingsButton (Settings) → SettingsDrawer
│   └── SaveButton (Save)
├── SectionList
│   ├── SectionAddButton (thick line + big +)
│   ├── SectionWrapper (hover border, delete)
│   │   └── LexicalComposer (independent per section)
│   │       ├── ElementHoverPlugin (dashed border + edge detection + small +)
│   │       ├── DeleteBlockPlugin (existing)
│   │       ├── ToolbarPlugin (existing)
│   │       └── All existing nodes (ImageNode, ButtonNode, SeparatorNode)
│   ├── SectionAddButton
│   └── ...more SectionWrapper + SectionAddButton
├── SettingsDrawer (Sheet — slug, meta title, meta description)
└── ElementPickerPopover (shared popup for element type selection)

/admin/pages/page.tsx (updated)
└── NewPageModal (template picker → title input → create + redirect)
```

## Public Page Renderer

`PageRenderer` updated to iterate the sections array:

```tsx
function PageRenderer({ content }) {
  const parsed = JSON.parse(content);
  if (parsed.version === 1 && parsed.sections) {
    return parsed.sections.map(section => (
      <section key={section.id}>
        <LexicalRenderer content={section.content} />
      </section>
    ));
  }
  // Backward compat: old format = single Lexical state
  return <LexicalRenderer content={parsed} />;
}
```

## What Changes vs What Stays

### Stays
- All Lexical nodes (ImageNode, ButtonNode, SeparatorNode)
- BlockWrapper + DeleteBlockPlugin
- Media picker in ImageNode
- Rich text formatting toolbar
- Backend API (stores JSON, doesn't care about structure)
- All backend page endpoints

### Changes
- `InsertBlockPlugin` → **replaced** by `ElementHoverPlugin`
- `page-editor.tsx` → simplified, delegates to new edit route
- New route: `/admin/pages/[id]/edit`
- New components: EditorToolbar, SectionList, SectionWrapper, SectionAddButton,
  ElementHoverPlugin, SettingsDrawer, NewPageModal, PublishSplitButton
- PageRenderer → iterates sections array

### New (backend)
- `scheduledPublishAt` field on pages (for scheduled publishing)
- Endpoint or field update to support schedule publish
- Scheduled job to auto-publish at scheduled time

## Future Enhancements (not in v1)
- Section templates (text + image, hero, etc.)
- Section drag-to-reorder
- Section background color/image
- Element drag-to-reorder within section
- More element types (video, embed, form)
