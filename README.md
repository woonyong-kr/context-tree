# Context Graph

Context Graph turns the note you are reading into a small, explorable graph. It
shows that note, its outgoing links, and its backlinks without asking you to
configure a folder or add plugin-specific frontmatter first.

It fills the space between two built-in Obsidian tools:

- the global graph is useful for structure, but can be too broad for reading;
- Canvas is flexible, but maintaining a second set of cards takes work;
- Context Graph keeps each card backed by its original Markdown note and lets
  the local neighbourhood grow only when you ask it to.

## Start with any note

1. Open a Markdown note.
2. Run **Context Graph: Show around current note**.
3. Click a card to read it in place. Use its **Show neighbouring notes** action
   to continue beyond the first hop.
4. Choose **Save this graph** only if the exploration is worth keeping.

No card database is created. A saved graph stores its root and explored range
in a small `.context-graph` file; the Markdown notes remain the source of truth.
Camera position and deliberate card placement stay local to the device.

## Reading and editing

Reading cards use Obsidian's `MarkdownRenderer` and Reading View DOM boundary.
Headings, lists, tasks, callouts, wikilinks, embeds, math, code, tables,
footnotes, supported HTML, themes, and registered Markdown post-processors are
therefore handled by Obsidian rather than by a partial renderer in this plugin.

The pencil opens the complete source of that same note inside the card,
including frontmatter. Reading and Source keep the same outer card footprint;
long content scrolls inside it. If another editor changes the note at the same
time, Context Graph stops before overwriting it and keeps the local draft for
recovery. **Open source on the right** uses a normal Obsidian editor pane when a
full editing surface is more useful.

An optional visible summary can be placed near the top of a note:

```md
> [!summary] Card summary
> Why this note matters in the current context.
```

The first H1 becomes the card title. Both remain ordinary Markdown and Source
mode always shows the unmodified document.

## Interactions

| Gesture | Result |
| --- | --- |
| Click a card title | Open or close Reading in place. The card and camera do not move. |
| Drag a card title, summary, or frame | Move that card. A 5 px threshold keeps an ordinary click intact. |
| Drag empty graph space | Pan the canvas. |
| Wheel over Reading or Source | Scroll the card under the pointer. |
| Wheel over graph space | Smoothly zoom around the pane centre; focused editors do not steal the gesture. |
| Pin on an open card | Keep that Reading or Source card open while using another card. It does not disable dragging. |
| Show neighbouring notes on a card | Add that card's one-hop neighbourhood to this exploration. |
| More → Remove from graph | Hide the card only in this graph. The Markdown file is unchanged. |
| More → Move source note to trash | Move the Markdown file to Obsidian's configured trash after confirmation. |
| Drag a card's perimeter point to another card | Add a `related` relationship in the source card's frontmatter. |
| Search or relation filter | Narrow what is emphasized without re-laying out the graph. |

The graph toolbar appears at the lower right. New cards are created there (or
by double-clicking empty graph space), not from duplicate controls on each card.
The graph name at the upper left opens the saved graph list.

## Links and optional typed relations

Ordinary wikilinks and backlinks are the default graph edges. If a smaller
authored vocabulary is useful, Context Graph also understands this optional
frontmatter:

```yaml
context_tree_links:
  - target: "[[Virtual memory]]"
    type: prerequisite
  - target: "[[Priority inversion#Donation]]"
    type: follow-up
```

Supported types are `related`, `prerequisite`, `supports`, `contrasts`, and
`follow-up`. Unknown values are left untouched in Markdown and are not silently
relabelled. `related` and `contrasts` are symmetric; the other types retain
direction in card navigation labels.

Earlier Context Graph versions required `context_tree: true` and supported
`context_tree_parent`, `context_tree_id`, and `context_tree_summary`. These are
still read for compatibility, but new current-note graphs do not require them
and the plugin does not rewrite old notes in the background.

## Saved graphs and local data

- Saved graph definitions live in `maps/context-graph/*.context-graph` so they
  can be reviewed, synced, or versioned with the vault.
- Device-specific camera, open-card state, and card coordinates live in the
  plugin's local settings.
- Note content is never copied into either store.
- Context Graph has no network client, telemetry, remote-code loader, or
  external account integration.

See [SECURITY.md](SECURITY.md) for the data boundary and vulnerability reporting
process. The interaction rules used for implementation and release checks are
kept in one place: [docs/ux-contract.md](docs/ux-contract.md).
Third-party license terms for the bundled force-layout library are recorded in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and preserved in `main.js`.

## Installation

Until Context Graph is listed in the Obsidian Community directory, download
`main.js`, `manifest.json`, and `styles.css` from a GitHub release and place them
in:

```text
<vault>/.obsidian/plugins/context-graph/
```

Reload Obsidian, enable **Context Graph** under **Settings → Community
plugins**, open a note, and run **Context Graph: Show around current note**.

Users of the pre-0.4.0 local build should move `data.json` and the three plugin
files from `.obsidian/plugins/context-tree/` to
`.obsidian/plugins/context-graph/`, then replace `context-tree` with
`context-graph` in `.obsidian/community-plugins.json` before reloading.

## Current scope

- Desktop Obsidian is the supported target. Touch and mobile accessibility need
  a separate device test pass before mobile can be enabled honestly.
- The initial view is deliberately one hop. Expanding a few relevant cards is
  preferable to rendering a very large vault at once.
- Context Graph edits Markdown source, but it is not a replacement for
  Obsidian's full editor. Use **Open source on the right** for advanced editing.

## Development

Node.js 20 or newer is required.

```bash
npm ci
npm run check
```

`npm run check` runs ESLint, strict TypeScript checking, a production esbuild
bundle, and the unit suite. For local iteration, run `npm run dev`, then copy
the generated `main.js`, `manifest.json`, and `styles.css` to a test vault's
plugin directory and reload Obsidian. `main.js` is generated and intentionally
not committed.

Repository boundaries:

```text
src/domain/  pure interaction, scope, persistence, and migration rules
src/graph/   graph projection, force simulation, and geometry
src/ui/      card rendering, native Markdown frame, and user-facing copy
src/parser.ts        Vault Markdown to graph nodes
src/topic-store.ts   explicit note and relationship writes
src/graph-definition-store.ts   saved-graph Vault I/O and optimistic writes
src/main.ts          plugin lifecycle, migration, and settings coordination
src/view.ts          Obsidian view state and direct manipulation coordinator
tests/               focused domain and regression tests
```

Contributors should read [CONTRIBUTING.md](CONTRIBUTING.md). Maintainers use the
[release and Community directory process](docs/release-process.md).

## License

[MIT](LICENSE)
