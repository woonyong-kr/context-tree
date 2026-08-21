# Context Graph

## UX contract

Interaction behavior is specified in the single product contract: [docs/ux-contract.md](docs/ux-contract.md).

**Context Graph is an Obsidian plugin for exploring a deliberate set of Markdown notes as an expandable, editable knowledge graph.**

It is for situations where a plain outline hides cross-links and a vault-wide graph hides the actual material: interview preparation, study maps, project design notes, research questions, and any topic that needs both a high-level map and the answer behind each keyword.

Each card is one real Markdown note. Click a card to read it in place; use the pencil to toggle an in-card editor for that same source Markdown. There is no separate card database: note content and relationships remain ordinary Markdown/frontmatter.

## What it does

- Shows only notes that explicitly opt in with `context_tree: true`.
- Places cards in a pannable, zoomable force-directed graph rather than a fixed left-to-right tree.
- Keeps a selected keyword in view while neighbouring concepts settle around it; there is no fixed root or forced reading direction.
- Reveals a hovered card's existing edge endpoints without activating the rest of the graph.
- Expands Markdown in the card; the surrounding cards move through the simulation instead of remaining underneath it.
- Creates a card from empty canvas space or the graph toolbar, and creates a peer relationship by dragging the magnetic connection point that appears on a card's nearest edge to another card.
- Reads and writes ordinary Obsidian wikilinks in frontmatter, including aliases and heading links.
- Supports `related`, `prerequisite`, `supports`, `contrasts`, and `follow-up` relationships.
- Keeps the title and short card description in normal Markdown, so Live Preview, Source mode, Sync, Git, and other Markdown tools remain compatible.
- Lets one opted-in note appear in more than one independently scoped graph. Each graph keeps its own range, physics, camera, and intentional card placement.
- Searches title, visible summary, and Markdown body while retaining one-hop context; filters visible relationship types without changing the underlying notes.

## Install

Context Graph is distributed as a standard Obsidian plugin release.

1. Download `main.js`, `manifest.json`, and `styles.css` from a release.
2. Create `<vault>/.obsidian/plugins/context-graph/`.
3. Copy all three files into that directory.
4. Restart or reload Obsidian, then enable **Context Graph** in **Settings → Community plugins**.
5. Run **Context Graph: 기본 지식 그래프 열기** from the command palette or select the ribbon icon.

If you used the pre-0.4.0 local build, move its three plugin files and `data.json` from `.obsidian/plugins/context-tree/` to `.obsidian/plugins/context-graph/`, then replace `context-tree` with `context-graph` in `.obsidian/community-plugins.json` before reloading Obsidian.

For development, use the instructions in [Development](#development) instead.

## Quick start

Create two ordinary notes such as these:

```md
---
context_tree: true
---

# PintOS

> [!summary] 카드 요약
> A small operating-system project used to study threads, processes, and virtual memory.

## What should I be able to explain?

Explain the problem, the design decision, the implementation boundary, and how it was verified.
```

```md
---
context_tree: true
context_tree_links:
  - target: "[[PintOS]]"
    type: prerequisite
---

# Thread scheduling

> [!summary] 카드 요약
> State transitions, interrupts, and the scheduler's selection point.

## Why avoid busy waiting?

A blocked thread should not consume CPU time while it waits for a deadline.
```

Open the graph and both notes appear as cards joined by one relationship. Use the graph manager to create independent graphs scoped to all opted-in notes, a folder, or an intentionally curated set. The same note can be included in several graphs.

## Markdown contract

Context Graph is an intentional workspace, not a visualisation of every note or wikilink in a vault.

| Field | Purpose |
| --- | --- |
| `context_tree: true` | Opt a note into the graph. |
| `context_tree_parent: "[[Topic]]"` | Optional imported/provenance relationship. It appears as a peer `derived` edge, not as a rigid child column. |
| `context_tree_links` | Optional typed links between any two opted-in notes. |
| `> [!summary] 카드 요약` | Optional visible Markdown summary used below the card title. |

```md
---
context_tree: true
context_tree_parent: "[[Operating systems]]"
context_tree_links:
  - target: "[[Virtual memory|VM]]"
    type: prerequisite
  - target: "[[Priority inversion#Donation]]"
    type: follow-up
---

# Threads

> [!summary] 카드 요약
> Scheduling concepts and the questions that verify them.
```

Relationships are **visual peers**. A connection can be stored in either endpoint note, and Context Graph merges reciprocal records into one visible edge. `related` and `contrasts` are symmetric: their storage endpoint is not shown as a conceptual start or end. `prerequisite`, `supports`, and `follow-up` retain their direction in card details. A graph card can therefore have any number of connections; an edge's source file is only a portable Markdown storage detail.

Older notes using `context_tree_summary` in YAML are read for compatibility. Context Graph never performs a background rewrite of unrelated notes.

## Interactions

| Action | Result |
| --- | --- |
| Click a card | Open or close its Markdown details in place. Clicking empty canvas closes the current detail card. |
| Drag empty canvas | Pan the graph. |
| Drag a compact card | Move that graph node and persist its deliberate position. |
| Drag a card title/summary, frame, Reading padding, or the Source toolbar gap | Move that graph node whether or not the open card is pinned, without changing the camera. A stationary title click still opens or closes the card; Markdown text and the Source editor keep native selection, editing, and scrolling. |
| Mouse wheel or the controls | Scroll inside the Reading card or Source editor under the pointer; over empty graph space, zoom around the viewport centre without implicitly panning the canvas. Focus never overrides the surface under the pointer. The lower zoom bound follows the current overview, so a large graph can always be fitted. Keyboard `Ctrl`/`Command` + `+`/`-` also works while the graph has focus. |
| Command palette → `Context Graph: Manage knowledge graphs` | Create or switch an independent graph, then add an existing opted-in note without moving or duplicating its Markdown file. Graph management stays out of the compact canvas toolbar. |
| Search / filter controls | Search card title, summary, and body; keep direct context visible; choose which relation types are drawn. |
| New card control or double-click empty canvas | Create a blank graph note and start its in-card Markdown editing. |
| Hover a card, then drag its magnetic edge point onto another card | Add a peer `related` link, stored in the card where the drag began. Existing lines and the drag preview attach to the same precise card perimeter points. Hovering a card reveals its existing relationship endpoints; a click selects one relationship. |
| Pencil | Toggle full source Markdown editing inside the expanded card. A background click or another card finishes a non-pinned edit and returns it to Reading; a pinned Source card remains available as a reference. This is an in-card editor, not Obsidian's full native editor surface. |
| More → Open source on the right | Open the same Markdown note in a native Obsidian pane to the right of the graph. The graph position and camera stay unchanged. |
| Vertical `…` menu | Move a topic to Obsidian's configured trash after confirmation. |
| Relation chip | Centre and open the linked card. |
| Existing relationship endpoint | Click an existing endpoint to select its peer edge and reveal both precise endpoints. For a single authored relationship only, drag either selected endpoint onto empty canvas to remove that exact Markdown relationship. Multiple relations merged into one visual line are never deleted by this gesture. Dropping over a card or a graph control cancels the gesture. |

The graph preserves your overview pan/zoom before you open a card, then restores it when the card closes. The circular control fits the whole graph again.

## Editing and safety

Markdown is the source of truth.

- A card title is the note's first H1 (or the filename if no H1 exists).
- The card summary is the visible `summary` callout shown above.
- The rest of the note is rendered as the expandable details.
- Source-note changes, creates, renames, deletes, and frontmatter updates refresh an open graph automatically.
- Only a single direct, authored relationship endpoint is detachable. After selecting that endpoint, dropping it on empty canvas removes exactly that direct relationship record; it never rewrites a `context_tree_parent` provenance edge or a second relationship merged into the same line. Moving a card to trash intentionally leaves other notes' links intact, so restoring the note restores its context.

Graph definitions and view state are local plugin settings: graph name, scope, physics, camera, and pinned card positions are intentionally independent from the Markdown notes. This lets the same Markdown remain reusable across distinct views, but those graph-workspace settings do not currently travel with a copied note unless the plugin data is also copied.

The plugin has no network client, telemetry, remote-code loader, or hidden document store. It uses Obsidian's Vault and frontmatter APIs only for the files you opt in.

For the full local-data boundary and vulnerability reporting process, see [SECURITY.md](SECURITY.md).

## Scope and current limitations

- The graph is designed and manually verified on desktop Obsidian. Mobile is not a supported release target until touch and screen-reader behaviour receive a dedicated device test pass.
- It is intended for deliberately authored topic graphs, not for rendering every note in a very large vault. Use the graph manager's **폴더 아래의 노트** or **직접 추가한 노트** scope to keep a workspace focused.
- Relation type is currently stored and displayed in card chips; edge colour and directional semantics are deliberately not overloaded. Every visible edge remains peer-to-peer.

## Development

Requirements: Node.js 20 or newer and a local Obsidian vault.

```bash
npm ci
npm run check
```

`npm run check` runs ESLint, strict TypeScript type checking, a production esbuild bundle, and Node unit tests. Pull requests and releases also fail when `npm audit --omit=dev --audit-level=high` finds a production dependency vulnerability.

For iterative development:

```bash
npm run dev
```

Copy the generated `main.js`, plus `manifest.json` and `styles.css`, to:

```text
<vault>/.obsidian/plugins/context-graph/
```

Then reload Obsidian. `main.js` is a generated release artifact and is intentionally not committed to this repository.

Maintainers should follow the [release and Community directory process](docs/release-process.md) before publishing a version.

## Project structure

```text
src/
  domain/     Link and relation vocabulary shared by parsing and storage
  graph/      Directionless graph model and D3 force/geometry helpers
  ui/         Card rendering and user-facing copy
  parser.ts   Markdown/frontmatter to topic documents
  topic-store.ts  Minimal Vault writes for notes and relationships
  view.ts     Obsidian view lifecycle and direct manipulation
tests/        Node unit tests for graph, content, relation, and geometry rules
```

The boundary is intentional: parsing and graph geometry are framework-light and testable; Obsidian effects stay in the parser, store, and view.

## Contributing

Issues and pull requests are welcome. Please:

1. Keep Markdown as the sole durable data format.
2. Avoid adding network access, telemetry, or Electron-only behaviour without a documented user need.
3. Add a focused regression test for parser, graph-model, storage-format, or geometry changes where feasible.
4. Run `npm run check` and include the result in the pull request.
5. For interaction changes, include a short desktop verification note covering card opening, Markdown editing, pan/zoom, and relationship authoring.

## License

[MIT](LICENSE)
