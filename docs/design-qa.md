# Linked Graph design QA

## Rendered implementation

![Obsidian 1.13.7 runtime](assets/linked-graph-runtime.png)

## Compared reference

The user-supplied 529×579 person-graph capture and the final 528×578 graph-stage crop were placed side by side locally. The reference established the target grammar: a movable current-note node, readable direct-link nodes, real edges, and a quiet second level that appears only on demand.

The final implementation was captured in Obsidian 1.13.7 at 1115×768 with `wiki/README.md` active and the Linked Graph sidebar widened to the same 529px reference width. The `책` node was keyboard-focused to expose the same state as pointer hover. The local-only side-by-side comparison is stored outside release media.

## Fidelity and interaction review

| Surface | Result | Evidence |
|---|---|---|
| Graph grammar | passed | The current Markdown note is the movable centre, seven resolved outgoing links are surrounding nodes, and each authored link is one visible edge. |
| Route labels | passed | Every direct route keeps a visible title; content-sized native buttons no longer collapse to bare dots. |
| Motion | passed | `d3-force` link, charge, and collision forces apply equally to the current note and direct nodes. Dragging the current `책` node moved it 54px left and 30px down; release reheated and settled the neighbourhood. |
| Viewport safety | passed | A dragged `Wiki` node remained visible after settling; moving nodes are bounded by measured node and sidebar dimensions, and resize reheats the layout. |
| Navigation | passed | On `책`, the centre exposed `상위 문서로 이동: Wiki`; clicking it opened `wiki/README.md` and rebuilt the graph from two book links to seven Wiki routes. |
| Hover preview | passed | Focusing `책` exposed only its two actual outgoing book notes as translucent, dashed, non-interactive 2-hop context; leaving focus removed them. Pointer hover uses the same session-only path. |
| Pan and zoom | passed | Background drag pans the world; icon controls zoom out, zoom in, and reset the viewport without writing layout state. |
| Information hierarchy | passed | Current note title and route count remain in the header; the graph itself contains only dots, titles, edges, and quiet controls. |
| Colour and shape | passed | Obsidian theme color tokens differentiate canonical `node_kind`, `entity_kind`, and `facets`; `Wiki` is a hub and the two book previews are books. Titles are never used to infer a type. |
| Canonical boundary | passed | Graph, outline, search, and motion are read-only projections; Markdown and Vault relationships are never modified. |
| Accessibility | passed | Route nodes and controls are native buttons with accessible names, the graph has a labelled group, and focus styling follows the host theme. |

## Iterations

1. Rejected expandable cards and cached descendant previews because they duplicated Wiki structure.
2. Rejected the first static branch layout because it only looked graph-like and did not implement force motion.
3. Replaced the over-damped custom loop with `d3-force`, drag reheating, collision, and natural settling.
4. Replaced zero-width label tracks with content-sized flex nodes and added viewport bounds for dragged and resized states.
5. Made the current-note node participate in the same force and drag system, then added canonical-parent upward navigation.
6. Added pointer-hover and keyboard-focus 2-hop previews without making preview nodes persistent or clickable.
7. Compared the final panel with the 529×579 reference and widened direct-link distance from 132px to 158px to match Obsidian Local Graph density more closely.

final result: passed
