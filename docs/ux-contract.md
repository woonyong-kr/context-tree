# Linked Graph UX contract

## Job

Keep the canonical Markdown note visible while providing the shortest readable route to its authored links.

## Invariants

1. Markdown is the only knowledge source of truth.
2. The panel follows the most recently active Markdown editor.
3. Only resolved, non-embedded outgoing wikilinks are shown.
4. Link order and plain-text bullet grouping follow the source.
5. The outline is the default and shows all current-note routes in one scan.
6. Graph view projects exactly the same current-note links as one-hop branches.
7. Clicking a title navigates the main editor to the canonical note.
8. Search, group collapse, and view mode are ephemeral.
9. No plugin action writes Markdown, Canvas, sidecars, maps, relationships, or layout state.

## Right sidebar anatomy

- Header: current note title, resolved route count, search icon, and view switch.
- Outline: deterministic vertical order with hairline separators and blue navigation titles.
- Plain-text bullet groups: collapsible labels plus descendant link count.
- Graph: current note root plus one-hop authored branches; no force layout or saved positions.
- Empty and error states: short action-oriented text, no decorative cards.

## Fold boundary

Obsidian's public plugin API does not expose the live fold ranges of the active Markdown editor. Linked Graph therefore does not inspect internal editor DOM or pretend to mirror folds. Its own group disclosure state is explicit and session-only; a collapsed group remains visible in the outline and is omitted from graph branches.

## Out of scope

- Vault-wide force graph
- Backlink discovery
- Relationship authoring
- Markdown editing
- Canvas creation or synchronization
- Saved maps, card positions, filters, or layout
- Daily-note or history aggregation
