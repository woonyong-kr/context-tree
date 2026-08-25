# Linked Graph UX contract

## Job

Keep the canonical Markdown note visible while providing the shortest readable route to its authored links.

## Invariants

1. Markdown is the only knowledge source of truth.
2. The panel follows the most recently active Markdown editor.
3. Only resolved, non-embedded outgoing wikilinks are shown.
4. Link order and plain-text bullet grouping follow the source.
5. Clicking a title navigates the main editor to the canonical note.
6. A chevron previews exactly the next authored link level in place.
7. Search, group collapse, and branch expansion are ephemeral.
8. No plugin action writes Markdown, Canvas, sidecars, maps, relationships, or layout state.

## Right sidebar anatomy

- Header: product name, search icon, collapse-all icon.
- Context: `Current note · title`.
- Root: current note title and resolved route count.
- Tree: deterministic vertical order with blue navigation titles.
- Plain-text bullet groups: label plus descendant link count.
- Link chevron: lazy one-level preview; cycles stop with a return icon.
- Empty and error states: short action-oriented text, no decorative cards.

## Fold boundary

Obsidian's public plugin API does not expose the live fold ranges of the active Markdown editor. Linked Graph therefore does not inspect internal editor DOM or pretend to mirror folds. Its own disclosure state is explicit, visible, and session-only; a collapsed group remains visible with its link count.

## Out of scope

- Vault-wide force graph
- Backlink discovery
- Relationship authoring
- Markdown editing
- Canvas creation or synchronization
- Saved maps, card positions, filters, or layout
- Daily-note or history aggregation
