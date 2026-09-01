# Linked Graph Navigator UX contract

## Job

Keep the canonical Markdown note visible while providing the shortest readable route to its authored links.

## Invariants

1. Markdown is the only knowledge source of truth.
2. The panel follows the most recently active Markdown editor.
3. Only resolved, non-embedded outgoing wikilinks are shown.
4. Link order and plain-text bullet grouping follow the source in Outline view; Graph view contains resolved links only.
5. The graph is the default: current note plus its direct authored links and one real edge per authored link.
6. The current-note node and direct-link nodes share the primary force simulation and can all be dragged after deliberate screen-space movement. Each direct node is one padded native button that owns position, hover, activation, and keyboard focus. The graph stage delegates the single pointer start, move, release, and cancellation stream by `data-graph-node-id`, so no node-level pointer handler can compete with native button activation or preview changes. A short press remains an ordinary native button click without propagation blocking or pointer capture. Only crossing the drag threshold captures the pointer and suppresses the click produced after a completed drag. Mouse, touch, and keyboard therefore share the browser's one native activation path. Background pan excludes buttons by target. A successful drop pins the node at that session-only position; pointer cancellation or app focus loss restores the pre-drag position. Activating the current-note node opens its resolved canonical `parent` when one exists.
7. Hovering or focusing a direct-link node immediately pins that source before asynchronously reading and temporarily rendering only its resolved outgoing links. Preview nodes reveal from the source and collapse back into it, but never enter or reheat the primary force simulation. Pointer hover may move only the inner visual by at most 8 screen pixels inside a 36-pixel local intent radius; the padded native-button hit target and physics position stay fixed, and leaving or exceeding the radius restores the visual origin. The node itself is the only visible control: Enter opens the note. Graph nodes never grow a second disclosure button.
8. Node colour follows existing `type`, `node_kind`, `entity_kind`, and `facets` metadata. Titles never determine type, and colour is not the only navigation signal. The stable semantic palette is schedule=orange, person=pink, project=blue, topic/detail=green, book=purple, resource/hub=cyan, and unknown=neutral. Semantic identity wins over structural depth in the order schedule → person → project → book/resource → topic/detail → root/hub/entity, so a project detail remains blue instead of becoming a generic green detail. `type: calendar-event` wins over every other kind so generated Calendar projections remain recognisable.
9. Force position, hover preview, pan, zoom, and drag are ephemeral; plain bullet text never creates a graph node, caption, or cluster anchor.
10. Outline view projects the full direct-link set in authored order. Graph view derives a 12-to-120 direct-node limit from the measured panel area. A hover preview shows at most 4 next routes in a compact sidebar, 12 in a medium pane, and 48 in a wide pane; the accessibility status reports shown and total counts, while activating the source opens its complete graph. Direct-route omissions switch to the complete Outline view.
11. Clicking a title or direct graph node navigates the main editor to the canonical note and immediately re-roots the sidebar graph at that note, so each click advances one authored depth.
12. Search, group collapse, view mode, pan, zoom, hover preview, and node positions are ephemeral.
13. No plugin action writes Markdown, Canvas, sidecars, maps, relationships, settings, or layout state.
14. Authored section context remains visible in Outline view but is not repeated under every Graph node. Preview count announcements remain available to assistive technology without adding a visual status card.
15. Automatic fitting preserves the authored text size. Sparse graphs fit their complete measured labels; dense graphs remain readable inside an unbounded pan/zoom viewport and use Outline for the complete ordered route list instead of shrinking every title into a thumbnail. The explicit Fit control may zoom out further when the user asks to see all nodes at once.

## Right sidebar anatomy

- Header: current note title, resolved route count, search icon, and view switch.
- Outline: deterministic vertical order with hairline separators and blue navigation titles.
- Plain-text bullet groups: collapsible labels plus descendant link count.
- Graph: movable current note, force-positioned direct authored links, parent navigation, stable hover/focus outgoing preview, bounded visual nodes, omission status, metadata colours, intentional drag, pan, zoom, and no saved positions.
- Graph spacing: the leaf is a viewport over an unbounded ephemeral world. Initial automatic layout never shrinks authored text; dense graphs reveal the rest through pan, zoom, explicit fit, or the ordered Outline. After eight direct routes, density progressively expands force distance so chapter-sized labels do not stack.
- Graph motion: hover moves only the inner visual within a small bounded radius and never moves the click target or physics position. Deliberate drag follows the pointer directly, while only surrounding nodes receive a short, damped force adjustment. Drop commits the session-only position, and pointer cancellation or focus loss restores the pre-drag position. Preview nodes and edges share one short reveal duration and never pull primary nodes. Pan, wheel, zoom, fit, and drag update through one direct coordinate path. Fit computes the current visible node bounds and never rewrites positions.
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
