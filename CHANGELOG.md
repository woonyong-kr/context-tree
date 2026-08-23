# Changelog

## 0.5.0

- Open an immediate one-hop graph from any current Markdown note, using ordinary wikilinks and backlinks without requiring plugin frontmatter.
- Let a current-note exploration expand one card at a time and become durable only through **Save this graph**; saved definitions are now the single graph canon instead of being duplicated in plugin settings.
- Replace the old graph-creation form with a shallow saved-graph list and remove redundant card and toolbar controls.
- Render Reading cards through Obsidian's native Reading View boundary and registered Markdown post-processors, preserving Obsidian-supported Markdown syntax and the active theme.
- Keep Reading and Source at the same bounded card footprint, scroll the card under the pointer, preserve recoverable edit drafts, and stop before overwriting concurrent source changes.
- Keep cards draggable in compact, Reading, Source, and keep-open states; opening or editing a card preserves its graph coordinate and camera.
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
