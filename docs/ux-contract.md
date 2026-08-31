# Linked Graph Navigator UX contract

## Job

Keep the canonical Markdown note visible while providing the shortest readable route to its authored links.

## Invariants

1. Markdown is the only knowledge source of truth.
2. The panel follows the most recently active Markdown editor.
3. Only resolved, non-embedded outgoing wikilinks are shown.
4. Link order and plain-text bullet grouping follow the source in Outline view; Graph view contains resolved links only.
5. The graph is the default: current note plus its direct authored links and one real edge per authored link.
6. The current-note node and direct-link nodes share the primary force simulation and can all be dragged after deliberate screen-space movement. Ordinary activation is never interpreted as a drag. A successful drop pins the node at that session-only position; pointer cancellation or app focus loss restores the pre-drag position. Clicking the current-note node opens its resolved canonical `parent` when one exists.
7. Hovering or focusing a direct-link node pins that source before asynchronously reading and temporarily rendering only its resolved outgoing links. Preview nodes spring outward from the source and collapse back into it, but never enter or reheat the primary force simulation. Pointer hover adds only a bounded magnetic offset inside a stable hit area; leaving restores the visual origin. The node itself is the only visible control: keyboard focus previews and Enter opens the note. Graph nodes never grow a second disclosure button.
8. Node colour follows existing `node_kind`, `entity_kind`, and `facets` metadata. Titles never determine type, and colour is not the only navigation signal.
9. Force position, hover preview, pan, zoom, and drag are ephemeral; plain bullet text never creates a graph node, caption, or cluster anchor.
10. Outline view projects the full direct-link set in authored order. Graph view renders at most 120 direct nodes. A hover preview shows at most 4 next routes in a compact sidebar, 12 in a medium pane, and 48 in a wide pane; the accessibility status reports shown and total counts, while activating the source opens its complete graph. Direct-route omissions switch to the complete Outline view.
11. Clicking a title or direct graph node navigates the main editor to the canonical note.
12. Search, group collapse, view mode, pan, zoom, hover preview, and node positions are ephemeral.
13. No plugin action writes Markdown, Canvas, sidecars, maps, relationships, settings, or layout state.
14. Authored section context remains visible in Outline view but is not repeated under every Graph node. Preview count announcements remain available to assistive technology without adding a visual status card.
15. Automatic fitting preserves a readable minimum interaction scale. Dense graphs may extend beyond the sidebar and use pan or explicit fit instead of shrinking every node into a hard-to-click thumbnail.

## Right sidebar anatomy

- Header: current note title, resolved route count, search icon, and view switch.
- Outline: deterministic vertical order with hairline separators and blue navigation titles.
- Plain-text bullet groups: collapsible labels plus descendant link count.
- Graph: movable current note, force-positioned direct authored links, parent navigation, stable hover/focus outgoing preview, bounded visual nodes, omission status, metadata colours, intentional drag, pan, zoom, and no saved positions.
- Graph spacing: the leaf is a viewport over an unbounded ephemeral world. Compact sidebars keep a readable minimum radius; after eight direct routes, density progressively expands force distance so chapter-sized labels do not stack. Pan and zoom, not viewport-edge clamping, reveal the rest of the graph.
- Graph motion: hover may move the visible button by at most 12 screen pixels while its hit area and physics position stay fixed. Leaving restores the visual origin. Deliberate node drag reheats the primary simulation; drop commits the session-only position, while pointer cancellation or focus loss restores the pre-drag position. Link, charge, collision, and gentle centering forces settle continuously instead of snapping nodes to a fixed ring or panel edge. Hover previews spring from and collapse into a stable local radial projection without pulling primary nodes. Fit computes the current visible node bounds and never rewrites positions.
- Empty and error states: short action-oriented text, no decorative cards.

## Fold boundary

Obsidian's public plugin API does not expose the live fold ranges of the active Markdown editor. Linked Graph Navigator therefore does not inspect internal editor DOM or pretend to mirror folds. Outline disclosure remains session-only and does not hide authored links from the current-note graph.

## Out of scope

- Vault-wide force graph
- Backlink discovery
- Relationship authoring
- Markdown editing
- Canvas creation or synchronization
- Saved maps, card positions, filters, or layout
- Persistent graph groups, colour rules, or depth settings
- Daily-note or history aggregation
