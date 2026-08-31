# Linked Graph Navigator UX contract

## Job

Keep the canonical Markdown note visible while providing the shortest readable route to its authored links.

## Invariants

1. Markdown is the only knowledge source of truth.
2. The panel follows the most recently active Markdown editor.
3. Only resolved, non-embedded outgoing wikilinks are shown.
4. Link order and plain-text bullet grouping follow the source in Outline view; Graph view contains resolved links only.
5. The graph is the default: current note plus its direct authored links and one real edge per authored link.
6. The current-note node and direct-link nodes share the force simulation and can all be dragged. Clicking the current-note node opens its resolved canonical `parent` when one exists.
7. Hovering or focusing a direct-link node temporarily previews only that note's resolved outgoing links. Preview nodes and edges are translucent, non-interactive, and removed when hover or focus ends.
8. Node colour follows existing `node_kind`, `entity_kind`, and `facets` metadata. Titles never determine type, and colour is not the only navigation signal.
9. Force position, hover preview, pan, zoom, and drag are ephemeral; plain bullet text never creates a graph node, caption, or cluster anchor.
10. Outline view projects exactly the default direct-link set in authored order.
11. Clicking a title or direct graph node navigates the main editor to the canonical note.
12. Search, group collapse, view mode, pan, zoom, hover preview, and node positions are ephemeral.
13. No plugin action writes Markdown, Canvas, sidecars, maps, relationships, settings, or layout state.

## Right sidebar anatomy

- Header: current note title, resolved route count, search icon, and view switch.
- Outline: deterministic vertical order with hairline separators and blue navigation titles.
- Plain-text bullet groups: collapsible labels plus descendant link count.
- Graph: movable current note, force-positioned direct authored links, parent navigation, hover-only outgoing preview, metadata colours, drag, pan, zoom, and no saved positions.
- Graph spacing: the leaf is a viewport over an unbounded ephemeral world. Compact sidebars keep a readable minimum radius; wider panes and denser link sets expand force distance beyond the viewport when necessary. Pan and zoom, not viewport-edge clamping, reveal the rest of the graph.
- Graph motion: node drag reheats one shared simulation; link, charge, collision, and gentle centering forces settle continuously instead of snapping nodes to a fixed ring or panel edge. Fit computes the current node bounds and never rewrites positions.
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
