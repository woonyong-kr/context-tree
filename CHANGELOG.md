# Changelog

## Unreleased

- Keep wheel zoom centred on the graph viewport so zooming never doubles as an implicit pan gesture.
- Render Reading cards through Obsidian's native Reading View boundary and registered Markdown post-processors, preserving all Obsidian-supported Markdown syntax while keeping the active theme authoritative.
- Give long Reading and Source cards ownership of wheel gestures under the pointer, without displaying a permanent nested-panel scrollbar track.
- Restore a saved graph camera before the first paint and skip automatic overview fitting when reopening an existing workspace.
- Keep a newly opened reader card at its graph coordinate, cancel delayed automatic overview fitting after a card interaction, and preserve the same card footprint when switching between Reading and Source.
- Make wheel ownership follow the pointer, so the Source editor under the pointer scrolls even when focus remains in that editor after the pointer leaves its card.
- Validate persisted graph IDs, graph definitions, physics, scopes, and view state before they become Vault paths, object keys, or graph transforms.
- Label searchable physics controls with their graph name so identically named controls remain unambiguous in current Obsidian settings UI.
- Align README interaction guidance with the UX contract and replace direct Vault modification/adapter probing with Obsidian-recommended Vault APIs.

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
