# Linked Graph

Linked Graph is a focused right-sidebar navigator for the Markdown note you are reading.

![Linked Graph following the canonical Wiki note](docs/assets/linked-graph-runtime.png)

It reads resolved `[[wikilinks]]` in authored order and presents the same current-note routes as a quiet outline or a one-hop graph. Clicking a title opens the canonical Markdown note; clicking the movable current-note node opens its canonical parent.

## Why use this instead of Obsidian Graph view?

Obsidian Graph answers “how is the whole vault connected?” Linked Graph answers “where can I go from this note, in the order I deliberately wrote?”

| | Linked Graph | Obsidian Graph |
|---|---|---|
| Scope | Current note | Vault or local neighbourhood |
| Direction | Authored outgoing links | Connected notes in multiple directions |
| Layout | Force layout anchored by Markdown order and bullet groups | Relationship-only force layout |
| Location | Persistent right sidebar | Separate graph view |
| Action | Open a note, move to its parent, or preview the next outgoing hop | Inspect a network |
| Knowledge writes | None | None |

## Use

1. Open a Markdown note.
2. Run **Open Linked Graph for the current note** or select its ribbon icon.
3. The default graph shows the current note and only its direct authored links. The current node and direct nodes all participate in the force layout.
4. Drag any visible primary node, click the current node to move to its canonical parent, or hover a direct node to preview its next outgoing hop.
5. Node colours use existing canonical metadata only; titles are never used to infer type.
6. Pan or zoom the graph, click a direct node to open the canonical note, or switch to **Outline view** for the same direct links in Markdown order.
7. Use search to filter both views.

Linked Graph follows the active Markdown editor. View mode, group collapse, and search are session-only UI state. It does not create maps, Canvas files, backlinks, relationships, sidecars, or duplicated notes.

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
