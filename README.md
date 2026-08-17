# Context Tree

Context Tree is an Obsidian plugin for exploring Markdown knowledge without losing the path that led to it. It renders topic notes as a connected tree of keyword cards. Select a card to expand its Markdown inside the map; use the small branch control to reveal or hide child keywords. Links inside expanded content keep Obsidian's normal navigation behavior.

The plugin is local-first: it reads Markdown already in the vault, makes no network request, sends no telemetry, and stores only its settings through Obsidian's plugin data API.

## Why this exists

Long notes and unstructured graph views make it easy to lose both the overall concept map and the detail needed to study one branch. Context Tree keeps both visible:

- **Collapsed card:** a keyword and short summary for the overall structure.
- **Expanded card:** the existing Markdown content, including questions, answers, evidence, and links.
- **Branch control:** progressive disclosure for child concepts.

The graph has keyword cards, not duplicate question and answer cards. Questions and answers live in the expanded keyword card, where they retain their context.

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

## Release and directory submission

Every release tag must exactly match `manifest.json`'s version. Attach `main.js`, `manifest.json`, and `styles.css` as release assets. After the first public release, submit the listing through the official [Obsidian Community directory](https://community.obsidian.md/) with an Obsidian account linked to GitHub. The current directory submission flow is not a pull request to `obsidianmd/obsidian-releases`.

## License

MIT
