# Context Tree

Context Tree is an Obsidian plugin for exploring Markdown knowledge without losing the path that led to it. It renders topic notes as connected keyword cards in a pannable, zoomable **force-directed graph**. Select a keyword to make it the centre; its connected concepts settle around it in 360 degrees. Click the card itself to open or close its Markdown details in place. Links inside expanded content keep Obsidian's normal navigation behavior.

The plugin is local-first: it reads Markdown already in the vault, makes no network request, sends no telemetry, and stores only its settings through Obsidian's plugin data API.

## Why this exists

Long notes and unstructured graph views make it easy to lose both the overall concept map and the detail needed to study one branch. Context Tree keeps both visible:

- **Keyword card:** a keyword and short summary for the overall structure.
- **Centred card:** selecting a keyword moves it to the centre. Its neighbours are arranged by a physical graph simulation, not a left-to-right outline.
- **Details:** clicking the card expands the existing Markdown content, including questions, answers, evidence, and links, inside that same card.
- **Collision-aware movement:** the card's measured size is fed back to the simulation. When details open, surrounding cards move aside instead of sitting underneath it.
- **Two reading scales:** a compact overview automatically fits the full graph; opening a card restores a comfortable reading zoom.

The graph has keyword cards, not duplicate question and answer cards. Questions and answers live in the expanded keyword card, where they retain their context.

## Canvas controls

- Drag empty canvas space to pan.
- Hold `Ctrl` (or `Command` on macOS) and use the mouse wheel to zoom.
- With the canvas focused, `Ctrl`/`Command` + `+` or `-` also zooms.
- Use the compact `−` / `+` controls when a modifier key is inconvenient.
- **Re-center** returns the selected keyword to the centre. The circular control restores the overview zoom.

## Markdown contract

Opt in per topic note with `context_tree: true`. Connect a child with a wikilink in `context_tree_parent`.

```md
---
title: Threads
context_tree: true
context_tree_id: pintos-threads
context_tree_parent: "[[PintOS]]"
context_tree_summary: Thread state transitions and scheduling.
---

# Threads

## Expected questions

### Why use a sleep list instead of busy-waiting?

Blocked threads do not consume CPU time. The timer interrupt moves only due threads back to the ready queue.

### When does a context switch happen after a timer interrupt?

The interrupt handler requests a yield; the scheduler switches after interrupt return.

## References

- [[PintOS implementation notes]]
```

Only opted-in notes are rendered. If **Source folder** is configured, the note must also live under that folder. A note whose parent is not another opted-in note becomes a root card. Invalid self-links and parent cycles are also kept visible as root cards rather than making the view fail.

## Commands

- **Context Tree: Open knowledge tree** — open the custom view.
- **Context Tree: Refresh knowledge tree** — reload opted-in Markdown notes.

## Development

```bash
npm install
npm run build
npm run lint
```

For local development, copy `main.js`, `manifest.json`, and `styles.css` into `<vault>/.obsidian/plugins/context-tree/`, reload Obsidian, and enable **Context Tree**.

## Design and dependency notes

The interaction model follows the public Graph view documentation for panning, zooming, centring, repulsion, and link distance. The implementation uses the local [`d3-force`](https://github.com/d3/d3-force) dependency (ISC) for its simulation; card rendering and Markdown integration are native to this plugin.

- [Obsidian Graph view documentation](https://help.obsidian.md/plugins/graph)
- [TheBrain tutorials](https://www.thebrain.com/support/tutorials) — selected concept as the navigation centre
- [Graph Explorer](https://github.com/dsebastien/obsidian-graph-explorer-base-view) (MIT) — public Obsidian graph integration reference

No source code from GPL-licensed graph plugins is included. They were considered only as independent behavioural references during design.

## Release and directory submission

Every release tag must exactly match `manifest.json`'s version. Attach `main.js`, `manifest.json`, and `styles.css` as release assets. After the first public release, submit the listing through the official [Obsidian Community directory](https://community.obsidian.md/) with an Obsidian account linked to GitHub. The current directory submission flow is not a pull request to `obsidianmd/obsidian-releases`.

## License

MIT
