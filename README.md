# Linked Graph

Linked Graph is a focused right-sidebar navigator for the Markdown note you are reading.

![Linked Graph following the canonical Wiki note](docs/assets/linked-graph-runtime.png)

It reads resolved `[[wikilinks]]` in authored order, preserves plain-text bullet groups, and lets you preview the next link level without leaving the note. Clicking a title opens the canonical Markdown note.

## Why use this instead of Obsidian Graph view?

Obsidian Graph answers “how is the whole vault connected?” Linked Graph answers “where can I go from this note, in the order I deliberately wrote?”

| | Linked Graph | Obsidian Graph |
|---|---|---|
| Scope | Current note | Vault or local neighbourhood |
| Direction | Authored outgoing links | Connected notes in multiple directions |
| Order | Markdown order and bullet groups | Force-directed spatial layout |
| Location | Persistent right sidebar | Separate graph view |
| Action | Open a note or preview one next level | Inspect a network |
| Knowledge writes | None | None |

## Use

1. Open a Markdown note.
2. Run **Open Linked Graph for the current note** or select its ribbon icon.
3. Click a blue title to navigate the main editor.
4. Select a chevron to preview the next authored links in the sidebar.
5. Use search to filter the current routes.

Linked Graph follows the active Markdown editor. Expansion, collapse, and search are session-only UI state. It does not create maps, Canvas files, backlinks, relationships, sidecars, or duplicated notes.

## Ownership contract

- Markdown is the only knowledge source of truth.
- A visible route exists only when the source Markdown contains a resolved wikilink.
- Plain bullet text is a display group, not a stored entity.
- Removing the plugin removes no knowledge.
- The plugin never edits Vault content.

See [UX contract](docs/ux-contract.md), [design system](docs/design-system.md), and [release process](docs/release-process.md).

## Development

```bash
npm install
npm run check
npm audit --omit=dev --audit-level=high
```

Requires Node.js 20 or later.
