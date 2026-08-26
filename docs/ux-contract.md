# Linked Graph UX contract

## Job

Keep the canonical Markdown note visible while providing the shortest readable route to its authored links.

## Invariants

1. Markdown is the only knowledge source of truth.
2. The panel follows the most recently active Markdown editor.
3. Only resolved, non-embedded outgoing wikilinks are shown.
4. Link order and plain-text bullet grouping follow the source.
5. The graph is the default: current note at the centre, direct authored links around it, and one real edge per authored link.
6. Force position, pan, zoom, and drag are ephemeral; Markdown group order provides semantic cluster anchors without creating group nodes.
7. Outline view projects exactly the same links in authored order.
8. Clicking a title or graph node navigates the main editor to the canonical note.
9. Search, group collapse, view mode, pan, zoom, and node positions are ephemeral.
10. No plugin action writes Markdown, Canvas, sidecars, maps, relationships, or layout state.

## Right sidebar anatomy

- Header: current note title, resolved route count, search icon, and view switch.
- Outline: deterministic vertical order with hairline separators and blue navigation titles.
- Plain-text bullet groups: collapsible labels plus descendant link count.
- Graph: current note root plus force-positioned direct authored links, drag, pan, zoom, and no saved positions.
- Empty and error states: short action-oriented text, no decorative cards.

## Fold boundary

Obsidian's public plugin API does not expose the live fold ranges of the active Markdown editor. Linked Graph therefore does not inspect internal editor DOM or pretend to mirror folds. Outline disclosure remains session-only and does not hide authored links from the current-note graph.

## Out of scope

- Vault-wide force graph
- Backlink discovery
- Relationship authoring
- Markdown editing
- Canvas creation or synchronization
- Saved maps, card positions, filters, or layout
- Daily-note or history aggregation
