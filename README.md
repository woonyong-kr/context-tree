# Linked Canvas

**Follow real note links first, then use a visual workspace only when it helps.**

Open a Markdown note and select **View current note connections**. The plugin
shows that note's real wikilinks, embeds, and backlinks without creating a
second map or relationship store. Follow links into the source notes, read them
in place, or open the original editor. Standard Obsidian Canvas remains an
advanced option for deliberate spatial arrangement.

![Linked Canvas: map, in-place Reading, Source editing, and a native Obsidian Canvas](docs/assets/linked-canvas-tour.gif)

## Choose the surface by the job

| You want to… | Start here | What you get |
| --- | --- | --- |
| follow Wiki structure | **Blue wikilinks in the note** — the default | Direct navigation between canonical Markdown notes |
| inspect one note's immediate context | **View current note connections** | A temporary one-hop reader with search, Reading, and Source mode |
| arrange notes and references for later | **Advanced: open or create Canvas** | A reusable standard `.canvas` whose layout remains yours |
| deliberately grow around the cards you chose | **Enable link-aware sync** | Existing geometry stays untouched; direct linked file cards are added |

Markdown stays the content and relationship source of truth. The graph reads
links without storing knowledge. Canvas owns only space, while a small sidecar
owns bounded file-selection automation that you explicitly enable.

The ribbon and Markdown file menu open the current note's connections directly.
The Canvas launcher is available only through commands labelled **Advanced**.
It does **not** turn a prompt or current note into generated Markdown.

If the flow is unclear after installation, run **Show how to explore note connections**
from the Command palette or open **Settings → Linked Canvas → How it works**.
The guide explains note navigation, the one-hop graph, optional Canvas use, and ownership.

## Why this plugin exists

Obsidian already has a Local Graph and Canvas. Each is good at a different job:

- Local Graph shows connections, but it is not a document-reading workspace.
- Canvas is a capable whiteboard, but starting from the note you are reading
  and keeping deliberately chosen file cards related still takes manual work.

Linked Canvas adds the missing bridge without putting board management in front
of note navigation. Start from the note you are reading, inspect its direct
connections, and open the original Markdown when you need to organize it. If a
topic truly benefits from spatial arrangement, continue into an ordinary JSON
Canvas. Disable the plugin and all source files and Canvas content remain normal
Obsidian content.

It is most useful for:

- turning a research question into a board of sources, evidence, and decisions;
- reviewing notes produced by a long Q&A or coding session without opening a
  chain of tabs;
- arranging a project root and the documents it actually links to;
- building a learning map from prerequisites and follow-up notes; and
- collecting Markdown, PDF, and image references on one portable whiteboard.

## Your first useful view in three steps

1. Open the Wiki or Markdown note you want to understand.
2. Select the ribbon action **View current note connections**.
3. Open a card to read it, follow its blue links, or select **Open source in the
   right editor** to organize the canonical Markdown.

This default flow creates no Canvas, no frontmatter, and no second relationship
store. Choose **Continue in Canvas** only when the current topic deserves a
durable spatial arrangement. The advanced Canvas launcher can still create a
blank board, start from the current note, or open an existing board; duplicate
names are distinguished by their Vault-relative paths.

To deliberately add every direct neighbour of the Markdown cards already on a
board, run **Linked Canvas: Enable link-aware sync for the current Canvas**.
This opt-in is useful for a small research cluster, but the default stays
curated so a dashboard or daily-note index cannot flood the board. A note may
appear on multiple canvases; its Markdown remains one source file while each
canvas keeps its own layout.

## How files, boards, and automation fit together

The Vault replaces a proprietary Card Library: each Markdown note, PDF, image,
audio file, or other attachment remains an ordinary file. A standard `.canvas`
references those files and stores only the spatial composition. A board made
from the Linked Canvas launcher receives an adjacent, initially empty sidecar
so the plugin can distinguish user-owned cards and edges from its own link
assistance. An existing native Canvas receives no sidecar until you explicitly
enable link-aware sync. The sidecar is not a note or a second card database.

How does one Vault file become a reusable card without being copied?

```mermaid
flowchart TD
    Explorer[Obsidian File Explorer] --> Source[Original Vault file]
    Source --> Card[Canvas file card]
    Card --> Board[Standard .canvas]
    Board --> Archive[User archive folder]
    Source --> Links[Obsidian link index]
    Links --> Sidecar[Adjacent .linked-canvas.json]
    Sidecar --> Board
```

1. `Original Vault file` owns content; editing a Markdown file card edits that
   same `.md`.
2. `Standard .canvas` owns coordinates, sizes, groups, colours, text cards, and
   manual edges; the same source can appear on many boards.
3. `Adjacent .linked-canvas.json` contains paths and generated-object IDs, never
   note bodies, PDF bytes, image bytes, or AI-generated metadata.
4. Moving or renaming a Canvas in File Explorer is the archive operation; while
   the plugin is enabled, its sidecar follows the Canvas while source files
   stay where they are.

For example, a board named `Research.canvas` has this portable shape:

```text
Projects/Research.canvas
Projects/Research.linked-canvas.json   # paths, exclusions and managed IDs only
Sources/Question.md                    # content remains here
Sources/Paper.pdf
Sources/Diagram.png
Sources/Demo.gif
```

Deleting or disabling Linked Canvas does not make `Research.canvas`
unreadable. Obsidian can still open its file cards and layout; only the optional
automatic edge/card reconciliation stops.

### Files you can place

Linked Canvas preserves the file cards supported by native Obsidian Canvas.
The plugin does not transcode or embed a private copy.

| Material | Canvas behaviour | Link-aware behaviour |
| --- | --- | --- |
| Markdown `.md` | Render, move, resize, and edit the original note | Can be a seed; real wikilinks and backlinks can become edges or opt-in one-hop cards |
| PDF `.pdf` | Display the original PDF as a file card | Can be brought in by a resolved Markdown link; does not expand neighbours |
| Images `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`, `.avif` | Display the original image; animated GIF remains a media card | Can be brought in by a resolved Markdown link; does not expand neighbours |
| Audio and other Vault files | Preserve the native Canvas file card behaviour available in the installed Obsidian version | Remain material, not semantic seeds |
| Web URL | Preserve a native Canvas link card | Never copied into the Vault or sent to a plugin service |

### Native Canvas gestures

The advanced Canvas workspace uses Obsidian's gestures instead of the note-connections
gesture model:

- drag a selected card to move it and use its handles to resize it;
- drag empty space while holding `Space`, or drag with the middle mouse button,
  to pan;
- scroll to pan vertically and use `Shift` + scroll to pan horizontally;
- use `Space` or `Cmd`/`Ctrl` with the mouse wheel to zoom; and
- select a card before scrolling its document contents.

Linked Canvas does not intercept those native Canvas pointer events. The
note-connections view remains the default ribbon and Markdown file-menu action;
the Canvas launcher is available through explicitly advanced commands.

## Two surfaces, one set of files

| Surface | Use it for | Persistence | Content authority |
| --- | --- | --- | --- |
| **Note connections — primary** | Inspect, read, search, and follow the active note's real links without leaving the note-first workflow | Temporary view derived from the active note | Original Markdown |
| **Linked Canvas — advanced** | Arrange a durable whiteboard only when notes, PDFs, images, groups, and spatial connections are useful | Standard `.canvas` plus a small `.linked-canvas.json` automation profile | Original files for content; Canvas for layout |

This separation is deliberate. Reading should be immediate; spatial curation
should be durable. The plugin does not force every quick inspection to become a
board, and it does not hide a proprietary card database behind the Canvas.

## See the real desktop workflow

These captures were made in Obsidian 1.13.7 from the exact 0.5.14 production
bundle in a public-safe fixture. Their version, dimensions, and hashes are
checked during every release build. Any later source change that affects
rendering must repeat the desktop capture gate before the next release.

### 1. Build a curated native Canvas from Vault files

![A standard Obsidian Canvas with colour-coded Markdown, PDF, and image cards](docs/assets/linked-canvas-01-canvas.png)

An optional starting note is a generous anchor. Files placed by the user keep
their native Canvas or user-selected colours. A generated root, question, or
explicit entity may receive one restrained standard JSON Canvas role colour;
ordinary topics, PDFs, and images keep the host default. Automatic one-hop
expansion is opt-in rather than first-placement behaviour. After placement,
the user owns every card's position, size, group, and colour.

### 2. Inspect links before you commit to a board

![A one-hop Linked Map centred on the current Markdown note](docs/assets/linked-canvas-02-map.png)

Linked Map starts from the active note and includes resolved outgoing links and
backlinks. The dot grid, surface contrast, and focused root make the reading
range visible without turning the whole Vault into an analytics view.

### 3. Read complete Markdown without losing the map

![Obsidian Reading rendered inside a card while neighbouring notes remain visible](docs/assets/linked-canvas-03-reading.png)

The open card uses Obsidian's native Markdown renderer. Headings, lists,
callouts, links, embeds, images, PDFs, code, tables, math, supported HTML,
themes, and registered Markdown post-processors keep their normal behaviour.
Long content scrolls inside the card; the map and neighbouring notes do not
reflow.

### 4. Edit the same source file in place

![The complete source Markdown edited inside the same card footprint](docs/assets/linked-canvas-04-edit.png)

Source mode shows the complete file, including frontmatter. Returning to
Reading updates the same card element at the same graph coordinate. For editor
commands or properties UI, **Open source in the right editor** reuses one normal
Obsidian pane without changing map scope or layout.

## What Linked Canvas keeps in sync

When a Linked Canvas is active:

- manually dropped Markdown cards become deliberate seeds without importing
  their neighbours by default;
- generated file cards leave the Canvas when they leave the authored projection,
- automatic neighbour expansion adds at most 12 cards; larger relationship sets belong in Linked Map or Bases,
  while manually authored Canvas objects remain untouched;
- resolved links between Markdown cards already on the board become directed
  visual edges;
- one-hop outgoing links and backlinks become additional file cards only after
  **Enable link-aware sync** is explicitly run;
- linked PDFs and images can become independent Canvas cards;
- moving, resizing, recolouring, or grouping a card remains user-owned;
- text cards, link cards, groups, backgrounds, and manual visual edges are
  preserved byte-for-byte in meaning;
- deleting an automatically discovered card records an exclusion, so the next
  sync does not recreate it; and
- dropping that Markdown file again removes the exclusion and makes it an
  explicit seed.

Renaming a source note updates the active profiles and Canvas file-card paths.
Renaming a Canvas moves its sidecar and updates the sidecar's `canvasPath`.
Malformed Canvas or profile JSON fails closed: the plugin does not widen scope
or overwrite an unreadable file.

### Existing Canvas adoption

**Enable link-aware sync for the current Canvas** requires at least one
Markdown file card. Every Markdown card already on the Canvas becomes an
explicit root. Existing coordinates, sizes, colours, groups, text cards, media,
and manual connections remain in place; only missing linked cards and managed
edges are added.

### Canvas connections do not rewrite Markdown

Every manual Canvas connection remains a spatial note inside the standard
`.canvas` file. Linked Canvas never promotes a drawn edge into Markdown
frontmatter. Author durable relationships in the source note with ordinary
wikilinks or an existing `linked_canvas_links` property; the plugin reads those
links to assist the board without silently changing their meaning.

## Linked Map interaction contract

| Gesture or action | Result |
| --- | --- |
| Select a compact card | Open or close native Reading at the same graph coordinate. |
| Drag a title, summary, or non-interactive frame at least 5 px | Move only that card, whether compact, open, editing, or kept open. |
| Select or scroll Reading content | Preserve native text, link, embed, and scroll behaviour. |
| Wheel over an open card, including its header | Scroll the card under the pointer. |
| Wheel over graph background | Smoothly zoom around the pane centre; stale editor focus never steals the wheel. |
| Drag empty graph background | Pan the map. |
| Keep card open | Keep that card visible while one additional document is explored; it never locks position. |
| Show/Collapse neighbouring notes | Preview and change only that card's meaningful one-hop branch. Existing cards do not re-layout. |
| Open source in the right editor | Open the same Markdown file in one reusable right-hand Obsidian pane. |
| Continue in Canvas | Reopen the root note's existing Linked Canvas, creating one only when none exists. |
| Fit graph | Close open cards and fit the current range into the pane. |

Quick actions appear on hover and keyboard focus. At overview zoom they receive
a bounded inverse scale so hit targets stay usable without covering titles. The
single graph toolbar remains fixed at the lower right. **Continue in Canvas**
is labelled on a wide pane and reduces to the same icon plus tooltip in a narrow
split. There is no duplicate `+` button on every card.

Role labels are deliberately small and optional. The current-note root is
always labelled **Root**, and a title ending in `?` is labelled **Question**.
Authors who need an explicit presentation hint may set
`linked_canvas_role: topic`, `entity`, or `question`; this value changes only
the label and restrained role treatment. It does not create a relationship,
change graph scope, or become required setup.

## File and ownership contract

Linked Canvas deliberately uses three small authorities:

| Data | Owner | Portable | What the plugin may do |
| --- | --- | --- | --- |
| Markdown, PDF, image, and other source content | Original Vault files | Yes | Read; edit Markdown only through an explicit editor action |
| Positions, sizes, colours, groups, text/link cards, and visual connections | Standard `.canvas` | Yes | Preserve existing objects; add or remove only tracked projections |
| Roots, seeds, depth, exclusions, sync policy, and generated-object provenance | Adjacent `.linked-canvas.json` | Yes | Validate, update, and follow source/Canvas renames |
| Map camera, kept-open state, deliberate legacy-map positions, and recoverable drafts | Plugin `data.json` | Device-local | Persist only UI state and conflict recovery |

The sidecar never contains copied note bodies. If profile creation fails after a
Canvas is created, the standard Canvas is kept instead of being deleted.

## Safe editing and failure behaviour

In-card Source autosaves through Obsidian's Vault API with an optimistic
revision check. If another editor changes the file after Source mode opens,
Linked Canvas stops before overwriting it, keeps the draft in local plugin data,
and offers explicit recovery actions. A content-only refresh updates the same
card; it does not recreate the node or run a new layout.

Graph-only removal and source deletion are separate actions. **Remove from
graph** changes only the current scope. **Move source note to trash** uses
Obsidian's configured trash and requires distinct destructive wording and
confirmation.

## How it differs from other visual tools

These tools can coexist. Linked Canvas is intentionally narrow: it starts from
inspectable Markdown links, lets you read before arranging, and saves the useful
result as native Canvas.

| Tool | Primary strength | Linked Canvas is different because… |
| --- | --- | --- |
| **Obsidian Local Graph** | Fast neighbourhood topology | Its cards become readable/editable documents and can graduate into a durable Canvas. |
| **Obsidian Canvas** | General-purpose spatial authoring | A board can start empty or with one existing note, reuses original files across boards, and can opt into bounded link expansion without losing native Canvas ownership. |
| [Heptabase](https://heptabase.com/) | A complete card-and-whiteboard knowledge environment | Linked Canvas stays inside Obsidian, keeps existing files authoritative, and does not introduce another account or card database. |
| [Excalidraw](https://github.com/zsviczian/obsidian-excalidraw-plugin) | Drawing, sketching, and media-rich visual thinking | Linked Canvas focuses on file-backed document neighbourhoods rather than a drawing model. |
| [Juggl](https://github.com/HEmile/juggl) | Stylable graph workspaces and layouts | Linked Canvas offers a deliberately bounded reader-to-native-Canvas path. |
| [ExcaliBrain](https://github.com/zsviczian/excalibrain) | Structured inferential mind maps | Linked Canvas uses resolved authored links and optional explicit relation types; no semantic inference is required. |
| [Breadcrumbs](https://github.com/SkepticMystic/breadcrumbs) | Typed hierarchies and trail views | Ordinary wikilinks are sufficient, and the linked source can be read in place. |

Linked Canvas is not a Heptabase clone and does not copy its trade dress. It
adopts the useful product principle—spatial context should help people
understand real notes—while using Obsidian's files, renderer, Canvas format,
and interaction conventions.

The design combines two independent references: Cupertino's native, quiet
visual hierarchy and Heptabase's card/whiteboard ownership model. Linked Canvas
does not copy Cupertino's palette. Its static `--cg-*` contract aliases the
active Obsidian theme's public surface, text, separator, accent, radius, shadow,
motion, and font variables. It neither imports global theme selectors nor
requires Cupertino to be installed, so every theme remains the visual source.
The original Vault file remains the reusable card and standard Canvas remains the
spatial context. See [the design system](docs/design-system.md) and
[third-party notices](THIRD_PARTY_NOTICES.md) for the exact boundary.

## Privacy and permissions

Linked Canvas has no account, telemetry, analytics, advertisements, external
API, semantic AI, remote-code loader, or network client. It reads files through
Obsidian's Vault APIs and does not access files outside the Vault.

The ordinary current-note Map resolves its visible neighbourhood from
Obsidian's cached link index. Legacy broad graph scopes and optional authored-ID
uniqueness checks may enumerate Markdown paths, but content is read only for
notes included in the active view. Saved-map discovery is limited to the
plugin-owned map folder. Nothing is transmitted.

See [SECURITY.md](SECURITY.md) for the security boundary and reporting process.
The single interaction and persistence contract is
[docs/ux-contract.md](docs/ux-contract.md). The visual architecture and
theme-compatibility rules are documented in
[docs/design-system.md](docs/design-system.md).

## Commands

| Command | When to use it |
| --- | --- |
| **Open current note in Linked Canvas** | Reuse a Canvas containing the active note, or create its first board. |
| **Show how to use Linked Canvas** | Reopen the task-first Canvas/Map guide and ownership explanation. |
| **Advanced: explore around the current note in Linked Map** | Temporarily inspect the active Markdown note and its direct neighbourhood without making it the default workflow. |
| **Create a Linked Canvas from the current note** | Deliberately create an additional native Canvas for the same note. |
| **Enable link-aware sync for the current Canvas** | Adopt an existing Canvas that already contains Markdown cards. |
| **Sync the current Linked Canvas** | Request an immediate reconciliation; automatic sync also follows relevant Vault changes. |
| **Open saved graphs** | Open legacy `.context-graph` workspaces retained for compatibility. |
| **Refresh graph** | Refresh an open Linked Map or legacy saved map. |

The Markdown file menu provides only **Open current note in Linked Canvas** for
the selected file. Linked Map remains available as an advanced Command palette
action so it does not compete with the whiteboard workflow.

## Current scope and non-goals

- Desktop Obsidian is supported. Mobile and touch remain disabled until they
  receive their own interaction and accessibility test pass.
- Linked Canvas follows explicit resolved links. It does not infer semantic
  similarity, generate relationships, or unfold an unbounded Vault.
- The plugin enhances standard Canvas; it does not replace Canvas drawing,
  shapes, presentations, or every full-editor command.
- Canvas connections are always spatial and never rewrite Markdown or
  frontmatter. Author durable document relationships in the source note.
- In-card Source is a focused autosaving editor. Use the right-hand native pane
  when you need the complete Obsidian editing ecosystem.
- Pointer relationship authoring does not yet have a keyboard-equivalent edge
  drawing gesture. Reading, editing, search, filters, and card actions remain
  keyboard accessible.

## Compatibility with Context Graph releases

The plugin ID remains `context-graph` so existing Community installations and
local settings update in place. The visible product name is now **Linked
Canvas**. Existing `.context-graph` definitions, `context_tree_links`, and
legacy metadata remain readable; the plugin does not rewrite old notes in the
background. New durable whiteboards use standard `.canvas` files and adjacent
`.linked-canvas.json` profiles. A blank board is created beside the active file,
or at the Vault root when no file is active; starting with a note creates the
board beside that note. Linked Canvas never requires a plugin-owned content
folder.

Users of the pre-0.4.0 local build should move `data.json`, `main.js`,
`manifest.json`, and `styles.css` from `.obsidian/plugins/context-tree/` to
`.obsidian/plugins/context-graph/`, then replace `context-tree` with
`context-graph` in `.obsidian/community-plugins.json` before reloading.

## Installation

Linked Canvas is not yet listed in Obsidian's Community directory. Install the
published GitHub release without building the repository:

1. Download `main.js`, `manifest.json`, and `styles.css` from the same
   [Linked Canvas release](https://github.com/woonyong-kr/linked-canvas/releases/latest).
2. Place all three files in:

```text
<vault>/.obsidian/plugins/context-graph/
```

3. Reload Obsidian and enable **Linked Canvas** under **Settings → Community
   plugins**.
4. Select the Linked Canvas ribbon icon. Start blank, start with the active
   Markdown note, or open an existing Canvas.

## Development and verification

Node.js 20 or newer is required.

```bash
npm ci
npm run check
npm audit --omit=dev --audit-level=high
```

`npm run check` runs ESLint, strict TypeScript checking, CSS validation, release
media verification, a production esbuild bundle, and the unit suite. The 0.5.14
release additionally follows the desktop checklist in
[docs/ux-contract.md](docs/ux-contract.md): real Map and Canvas creation,
Markdown rendering/editing, pointer-owned scroll and zoom, card movement,
geometry preservation, manual seed expansion, deletion exclusion and restore,
existing Canvas adoption, spatial-edge isolation, source/Canvas rename, and
plugin-disable portability. A build alone is not treated as runtime proof.

Repository boundaries:

```text
src/domain/                  pure interaction, graph, JSON Canvas, and profile rules
src/graph/                   force simulation and map geometry
src/ui/                      card rendering, native Markdown frame, and copy
src/linked-canvas-service.ts Vault/Canvas reconciliation and rename coordination
src/parser.ts                Vault Markdown to Linked Map nodes
src/topic-store.ts           explicit Markdown and relationship writes
src/graph-definition-store.ts legacy saved-map Vault I/O
src/main.ts                  plugin lifecycle, commands, and event routing
src/view.ts                  Linked Map view and direct manipulation
tests/                       focused unit/regression tests and public-safe fixtures
```

Contributors should read [CONTRIBUTING.md](CONTRIBUTING.md). Maintainers use the
[release and Community directory process](docs/release-process.md).

## License

[MIT](LICENSE)
