# Linked Graph Navigator

**Follow the paths you wrote, not every connection in your Vault.**

Linked Graph Navigator follows the active Markdown note and shows only its resolved outgoing `[[wikilinks]]` in the order you wrote them. Keep the routes in a quiet outline or see them as a focused graph beside the note.

![Linked Graph Navigator walkthrough from an active note to its authored routes and a next-step preview](docs/assets/linked-graph-demo.gif)

Want to try it without touching your notes? Download the [public demo Vault](https://github.com/woonyong-kr/obsidian-navigator-demo-vault/releases/latest) and follow its five-minute path.

## The three-step workflow

1. **Open a linked note.** The navigator follows the active Markdown editor automatically.
2. **See the intended routes.** Direct outgoing links appear in authored order instead of becoming a vault-wide tangle.
3. **Preview the next step.** Hover a route to reveal its next outgoing links, or click it to open the original note.

There is no relationship database, generated map, or saved layout. Disable the plugin and every Markdown link remains exactly where you wrote it.

## Why use this instead of Obsidian Graph view?

Obsidian Graph answers “how is this network connected?” Linked Graph Navigator answers “where did I intend the reader to go next?”

| | Linked Graph Navigator | Obsidian Graph |
|---|---|---|
| Scope | Active note | Vault or local neighbourhood |
| Direction | Outgoing links in written order | Connections in multiple directions |
| Layout | Focused routes with optional next-step preview | Relationship network |
| Location | Persistent right-sidebar navigator | Separate graph view |
| Action | Follow the intended reading path | Inspect connections |
| Knowledge writes | None | None |

## What it looks like

![Linked Graph Navigator following the active Wiki note](docs/assets/linked-graph-runtime.png)

![Linked Graph Navigator previewing the focused route's next step](docs/assets/linked-graph-runtime-preview.png)

## Get started

1. Open a Markdown note.
2. Run **Open Linked Graph Navigator for the current note** or select its ribbon icon.
3. The default graph shows the current note and only its direct authored links. The current node and direct nodes all participate in the force layout.
4. Drag any visible primary node, click the current node to move to its configured parent, or hover/focus a direct node to preview its next outgoing links. On touch, use the disclosure beside the node.
5. Node colours use existing canonical metadata only; titles are never used to infer type.
6. Pan or zoom the graph, click a direct node to open the canonical note, or switch to **Outline view** for the same direct links in Markdown order.
7. Use search to filter both views. A route also shows the section heading where its link was authored, so similarly named links keep their reading context.
8. Use Back and Forward to retrace paths opened during the current Obsidian session. Nothing is persisted.

Keyboard-only flow: run **Focus route search**, type a route or section name, press `Arrow Down` to focus the first match, then `Enter` to open it. Use the Back command or header action to return.

Graph rendering stays responsive on unusually dense notes by showing at most 120 direct nodes and 48 next-step preview nodes. When routes are omitted, the panel reports the count and offers the complete authored list in Outline view.

The demo Vault includes a [130-route fallback example](https://github.com/woonyong-kr/obsidian-navigator-demo-vault/blob/main/Benchmarks/Dense%20Routes.md), and the parser has a [reproducible 5,000-route benchmark](docs/benchmarks.md).

Linked Graph Navigator follows the active Markdown editor. View mode, group collapse, and search are session-only UI state. It does not create maps, Canvas files, backlinks, relationships, sidecars, or duplicated notes.

## Ownership contract

- Markdown is the only knowledge source of truth.
- A visible route exists only when the source Markdown contains a resolved wikilink.
- Plain bullet text appears only in Outline view; it never becomes a graph node or caption.
- Removing the plugin removes no knowledge.
- The plugin never edits Vault content.

See [UX contract](docs/ux-contract.md), [design system](docs/design-system.md), and [release process](docs/release-process.md).

See the public [Roadmap](ROADMAP.md), report a [bug or use case](https://github.com/woonyong-kr/linked-graph/issues/new/choose), or discuss a workflow in [Discussions](https://github.com/woonyong-kr/linked-graph/discussions).

## Development

```bash
npm install
npm run check
npm audit --omit=dev --audit-level=high
```

Requires Node.js 20 or later.
