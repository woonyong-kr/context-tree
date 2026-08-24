# Changelog

## 0.5.12

- Add one native launcher for creating a blank Canvas, optionally starting with
  the current note, or reopening an existing board.
- Rewrite the Community listing description around the whiteboard-first job:
  arrange Vault files first, then opt into bounded Markdown link assistance.
- Treat Obsidian's File Explorer as the card library: a blank board receives
  only the Markdown, PDFs, and images the user deliberately places on it.
- List every standard Vault Canvas in the launcher, including boards that have
  not enabled a Linked Canvas sidecar yet.
- Preserve native PDF and image cards, including PNG, JPG, GIF, WebP, SVG, and
  AVIF, while keeping non-Markdown material out of relationship expansion.
- Treat Markdown cards deliberately dropped onto the board as additional seeds,
  synchronising real relations among selected cards without importing their
  neighbourhood.
- Make one-hop link expansion an explicit **Enable link-aware sync** action while
  preserving the one-hop behaviour of already enabled and legacy canvases.
- Keep automatically derived neighbour cards from claiming a source note or
  blocking that note from starting its own independent board.
- Rewrite the in-app guide, README, design system, and UX contract around the
  curated-board default and the secondary, temporary Linked Map boundary.
- Remove Linked Map from the Markdown file menu and label it as an advanced
  Command Palette reader so it no longer competes with the primary whiteboard.

## 0.5.11

- Add a task-first in-app guide that distinguishes durable Linked Canvas work,
  temporary Linked Map exploration, and adoption of an existing Canvas.
- Surface the guide in the Command palette and Settings even when no legacy
  saved graph exists, with direct Canvas and Map entry actions.
- Adapt Cupertino's MIT-licensed colour, elevation, motion, and rounded-control
  foundation into one plugin-scoped token layer without requiring or modifying
  the global theme.
- Rewrite the public introduction around a three-step first board, explicit
  surface selection, file ownership, and the exact design-license boundary.

## 0.5.10

- Replace the generated Canvas graph ring with a readable root anchor and a
  compact two-column reference board while preserving every existing Canvas
  coordinate, size, colour, group, and manual object.
- Tighten the optional Linked Map's default spacing so a one-hop neighbourhood
  remains legible without shrinking the whole view to an overview thumbnail.
- Refine the theme-native visual hierarchy with clearer workspace/card/document
  surfaces, visible but quiet dots and edges, larger unified controls, and stable
  action-rail spacing that does not cover card titles.
- Verify the release in Obsidian 1.13.7 with Cupertino active and refresh the
  native Canvas, Map, Reading, Source, and animated README evidence.

## 0.5.9

- Make standard Obsidian Canvas the primary entry: the ribbon opens an existing
  Linked Canvas containing the active Markdown note and creates one only when
  none exists.
- Keep Linked Map as an explicit secondary reading surface and replace its
  ambiguous icon-only save action with a labelled **Continue in Canvas** handoff
  that follows the same reuse rule.
- Centralize generated Canvas roles and Map design tokens, preserving Cupertino
  and other theme compatibility without detecting or copying a specific theme.
- Enforce the design boundary in CI: component selectors cannot introduce raw
  colours, dimensions, typography, or motion values, and unused design tokens
  fail the build.
- Document the Canvas/Map ownership contract, direct-manipulation runtime checks,
  and the exact public-safe release workflow.

## 0.5.8

- Rename the visible product to **Linked Canvas** while retaining the
  `context-graph` plugin ID and every legacy saved-map format for update
  compatibility.
- Create a standard JSON Canvas from the current Markdown note and its bounded
  outgoing links, backlinks, PDFs, and images without copying source content.
- Add adjacent `.linked-canvas.json` profiles for roots, manually dropped
  seeds, exclusions, sync policy, and generated-object provenance.
- Preserve native Canvas positions, sizes, colours, groups, text/link cards,
  media, and manual edges; keep a deleted generated card excluded until the
  user deliberately drops it again.
- Adopt existing Obsidian Canvas files without changing their authored layout,
  and follow both source-note and Canvas renames.
- Keep Canvas connections visual-only by default, with an explicit additive
  opt-in that writes directed relations to `linked_canvas_links`.
- Remove the old Canvas-self backlink artifact on startup and ignore Canvas
  file-card references when discovering Markdown backlinks.
- Give newly generated root, Markdown, PDF, and image cards restrained standard
  Canvas colours for readable role separation.
- Keep edge-positioned Map documents inside the pane, replace the ambiguous
  position pin with a keep-open bookmark, and retain full-width native Reading.
- Replace the public guide with an actual 0.5.8 Map-to-Canvas workflow, four
  desktop captures, an animated tour, storage contracts, and migration details.

## 0.5.7

- Restore a restrained spatial dot grid and define three theme-aware surface
  levels for the canvas, compact cards, and the open document.
- Use the active Obsidian accent only for meaningful state: the focused start
  card, an open Reading or Source card, and their direct relationship lines.
- Keep an open document at a readable screen size while the surrounding graph
  continues to zoom, without moving the card's graph centre or the camera.
- Reserve the complete inverse-scaled action footprint so low-zoom controls no
  longer cover titles or Source text, and keep open cards above compact context.
- Preserve the complete visible context while Reading or Source is open instead
  of dimming unrelated cards and edges through a stale hover state.

## 0.5.6

- Replace partially supported advanced text-decoration properties with a
  minimum-version-compatible link baseline, clearing the Community CSS scan
  warning without changing Reading hierarchy or interaction.
- Bound compact summaries to a three-line map preview so long first paragraphs
  cannot visually cover neighbouring cards during the initial overview.
- Refresh the README overview, Reading, and Source captures from the exact
  installed 0.5.6 build.

## 0.5.5

- Replace the high-contrast graph chrome with a quiet, document-first visual
  system: neutral card surfaces, subtle boundaries, restrained elevation, and
  low-contrast spatial guides that follow the active Obsidian theme.
- Group card actions into one hover surface instead of presenting every icon as
  a separate decorated button, while preserving keyboard focus and touch access.
- Apply the same radius, surface, and elevation tokens to cards, graph controls,
  search, menus, and empty states without changing graph geometry or interaction
  ownership.
- Remove the decorative dot grid and ordinary card outlines so the linked-note
  neighbourhood reads as a quiet index; reserve a paper-like boundary, larger
  title, and generous spacing for the document currently being read or edited.
- Keep a user's explicit canvas pan and zoom after Reading or Source closes
  instead of restoring a camera snapshot captured before the card opened.
- Treat Reading and Source as projections over the current map: measuring,
  editing, or closing a document no longer restarts the force layout or moves
  surrounding cards.
- Freeze the settled neighbourhood during manual card placement so dragging
  one compact, Reading, or Source card no longer nudges surrounding cards.
- Add real Obsidian overview, Reading, and Source captures to the README and
  make their version, dimensions, references, and hashes a required build gate.

## 0.5.4

- Position Context Graph as a linked-note reading map: read the original
  Markdown in place, expand one branch at a time, and save only useful
  explorations.
- Open a specific Markdown note directly from its file menu as well as the
  Command Palette, without falling back to an unrelated saved graph.
- Show the exact number of notes that a reversible neighbourhood action will
  add or remove, and explain the root-only state without adding another modal
  or persistent toolbar control.
- Align the public description, README, and UX contract with the shipped
  interaction model.

## 0.5.3

- Avoid Vault-wide Markdown enumeration for the ordinary current-note workflow;
  the list is requested only for legacy broad scopes or authored ID uniqueness.
- Document and regression-test the narrower automatic-review disclosure boundary.

## 0.5.2

- Remove every CSS `!important` override by scoping component selectors under the Context Graph view, keeping theme isolation without a Community scanner warning.
- Replace automatic clipboard writes in edit-conflict recovery with an explicit **Select my edit** action while retaining the recoverable local draft.
- Limit saved-graph discovery to the plugin-owned definition folder and document why backlink and legacy-scope construction inspects Vault Markdown paths.

## 0.5.1

- Create cards from a current-note graph beside its root note instead of deriving a Vault folder from the transient graph ID.
- Keep new current-note cards as ordinary Markdown without adding the legacy `context_tree` marker; retained saved graph scopes still receive the marker when they require it.
- Open the reusable right-hand Markdown leaf in editable Source mode instead of inheriting the user's default Reading mode.
- Consolidate graph-definition reconciliation, remove the last detected source duplicate, and replace inherited repository boilerplate with Context Graph-specific maintenance rules.
- Expand the Community-facing README with the product use case, exact graph range, interaction model, write effects, Markdown support, storage and privacy boundary, limitations, and troubleshooting.

## 0.5.0

- Open an immediate one-hop graph from any current Markdown note, using ordinary wikilinks and backlinks without requiring plugin frontmatter.
- Let a current-note exploration expand and collapse one card's neighbourhood at a time without moving the existing map, then become durable only through **Save this graph**; saved definitions are the single graph canon instead of being duplicated in plugin settings.
- Replace the old graph-creation form with a shallow saved-graph list and remove redundant card and toolbar controls.
- Render Reading cards through Obsidian's native Reading View boundary and registered Markdown post-processors, preserving Obsidian-supported Markdown syntax and the active theme.
- Keep Reading and Source at the same bounded card footprint, scroll the card under the pointer, preserve recoverable edit drafts, and stop before overwriting concurrent source changes.
- Keep cards draggable in compact, Reading, Source, and keep-open states; opening or editing a card preserves its graph coordinate and camera, while a direct action reuses one native editor pane on the right.
- Smooth mouse-wheel and trackpad zoom around the graph pane centre so zooming does not become an implicit pan gesture.
- Separate graph-only removal from the explicitly confirmed source-note trash action, and cancel connection authoring on pointer cancellation.
- Preserve graph scope, deliberate card positions, and authored IDs across Markdown renames while disambiguating duplicate IDs across the whole vault.
- Add Korean and English interface copy selected from Obsidian's document language.
- Validate persisted graph IDs, definitions, physics, scopes, view state, and settings ownership before they become Vault paths, object keys, or graph transforms.
- Rewrite the README around the current-note workflow, local data boundary, compatibility layer, and Community plugin release process.

## 0.4.0

- Rename the local plugin identity to **Context Graph** (`context-graph`) and document the installation migration from the old `context-tree` folder.
- Make dragging ordinary space inside an expanded reading card pan the canvas; compact cards still move their own graph node and source editing keeps native text interaction.
- Add independent graph workspaces with all, folder, curated, and hybrid note scopes; each retains its own graph physics and local camera/card placement.
- Add title, summary, and body search plus relationship-type filtering without reflowing the graph.
- Replace a static zoom floor with an overview-aware lower bound and an 8× detail upper bound.
- Add persistent graph-physics settings for relationship strength, card repulsion, and link gap.
- Consolidate graph controls into an icon dock and remove explanatory demo copy from the canvas.
- Make direct relationship removal an explicit endpoint gesture: hover a card, select an authored relationship endpoint, then drag it onto empty canvas to disconnect that peer edge.
- Preserve scalar `context_tree_links` values when a relation is authored or removed, and keep drag-start ownership in the source Markdown note.
- Clarify desktop-only support until mobile and assistive-technology verification is complete.

## 0.3.1

- Replace the fixed tree layout with an expandable force-directed context graph.
- Keep every card backed by one native Markdown note; summaries use visible Markdown callouts.
- Add direct graph authoring for new cards and peer relationships, plus typed relationship storage.
- Add local pane-aware sizing, zoom preservation, and card-boundary connection endpoints.
- Harden refresh, menu, and relation-link handling for repeated graph updates and ordinary Obsidian wikilink forms.

## 0.1.1

- Make the test command portable across GitHub Actions shells.

## 0.1.0

- Initial local-first keyword tree view.
- Inline Markdown card expansion and branch folding.
- Configurable source folder and initial visible depth.
