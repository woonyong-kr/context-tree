# Linked Graph design QA

## Rendered implementation

![Obsidian 1.13.7 runtime](assets/linked-graph-runtime.png)

## Compared reference

The user-supplied 455×400 failure capture and the final 455×400 graph-stage crop were placed side by side locally. The reference exposed two blocking faults: direct-link titles collapsed to unlabeled dots, and the custom over-damped layout stopped responding like a force graph.

The final implementation was captured in Obsidian 1.13.7 at 1115×768 with `wiki/README.md` active and the Linked Graph sidebar widened to the same 455px reference width. The local-only comparison is stored outside release media.

## Fidelity and interaction review

| Surface | Result | Evidence |
|---|---|---|
| Graph grammar | passed | The current Markdown note is the fixed centre, seven resolved outgoing links are surrounding nodes, and each authored link is one visible edge. |
| Route labels | passed | Every direct route keeps a visible title; content-sized native buttons no longer collapse to bare dots. |
| Motion | passed | `d3-force` link, charge, and collision forces replace the stopped custom loop. Dragging reheats the simulation and releasing a node lets the neighbourhood settle again. |
| Viewport safety | passed | A dragged `Wiki` node remained visible after settling; moving nodes are bounded by measured node and sidebar dimensions, and resize reheats the layout. |
| Navigation | passed | Clicking the `Wiki` graph node opened `wiki/README.md`, and the sidebar immediately changed from eight home routes to seven Wiki routes. |
| Pan and zoom | passed | Background drag pans the world; icon controls zoom out, zoom in, and reset the viewport without writing layout state. |
| Information hierarchy | passed | Current note title and route count remain in the header; the graph itself contains only dots, titles, edges, and quiet controls. |
| Colour and shape | passed | Host theme text, divider, and accent tokens are used; nodes have no cards, fills, shadows, badges, or plugin-owned palette. |
| Canonical boundary | passed | Graph, outline, search, and motion are read-only projections; Markdown and Vault relationships are never modified. |
| Accessibility | passed | Route nodes and controls are native buttons with accessible names, the graph has a labelled group, and focus styling follows the host theme. |

## Iterations

1. Rejected expandable cards and cached descendant previews because they duplicated Wiki structure.
2. Rejected the first static branch layout because it only looked graph-like and did not implement force motion.
3. Replaced the over-damped custom loop with `d3-force`, drag reheating, collision, and natural settling.
4. Replaced zero-width label tracks with content-sized flex nodes and added viewport bounds for dragged and resized states.

final result: passed
