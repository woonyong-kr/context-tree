# Linked Graph Navigator design QA

## Rendered implementation

![Obsidian 1.13.7 runtime](assets/linked-graph-runtime.png)

![Obsidian 1.13.7 next-hop preview](assets/linked-graph-runtime-preview.png)

## Compared reference

The user-supplied captures, including the latest native-Graph comparison, and the final 1115×768 Obsidian runtime were placed side by side locally. The latest comparison verified that edges inherit Obsidian's own `--graph-line` and `--graph-text` tokens, every line terminates at the visible dot centre, and the resting `Wiki` centre has no rectangular outline.

The final implementation was captured in Obsidian 1.13.7 with `wiki/README.md` active and the Linked Graph Navigator leaf widened. The first capture shows the resting responsive 1-hop graph. The second keyboard-focus capture exercises the same next-hop preview path used by pointer hover. The local-only side-by-side comparison is stored outside release media.

## Fidelity and interaction review

| Surface | Result | Evidence |
|---|---|---|
| Graph grammar | passed | The current Markdown note is the movable centre, its resolved outgoing links are surrounding nodes, and each authored link is one visible edge. Every root, direct, and preview title is centred below its dot as in Obsidian Graph. |
| Canvas use | passed | Graph mode removes body padding and renders an unbounded world through the whole remaining pane. Node coordinates are never clamped to the visible sidebar; pan, zoom, and bounds-fit reveal the rest of the graph. |
| Moving labels | passed | Every title is part of its force node; the removed group-label layer leaves no fixed captions behind the moving graph. |
| Route labels | passed | Every direct route keeps a visible title; content-sized native buttons no longer collapse to bare dots. |
| Motion | passed | `d3-force` link, charge, and collision forces apply equally to the current note and direct nodes. Drag reheats the shared simulation, slower alpha decay and lower velocity damping preserve natural movement, and duplicate source events are coalesced into one graph refresh. |
| Viewport safety | passed | The world remains larger than the sidebar without clipping node coordinates. A widened leaf immediately exposed more graph area; background pan, zoom controls, and bounds-fit recovered every route without rewriting node positions. |
| Navigation | passed | On `책`, the centre exposed `상위 문서로 이동: Wiki`; clicking it opened `wiki/README.md` and rebuilt the graph from two book links to seven Wiki routes. |
| Hover preview | passed | Focusing a direct route exposed the same measured second-level graph used by pointer hover. The source stayed pinned, preview edges remained dashed and non-interactive, and leaving hover or focus removed the entire second level. |
| Edge geometry | passed | Direct and preview SVG endpoints use the measured dot centre instead of the text-and-dot button centre. Every visible line joins dot to dot. |
| Edge contrast | passed | Direct links use Obsidian's native `--graph-line` at 1px; preview links use the same theme token as a secondary dashed path. Both remain distinct from node type colours. |
| Pan and zoom | passed | Background drag pans the unbounded world; icon controls zoom out, zoom in, and compute a bounds-fit transform without changing or persisting graph coordinates. |
| Information hierarchy | passed | Current note title and route count remain in the compact header; the graph contains only resolved-link dots, titles, edges, and quiet controls. No static category captions, native path tooltips, parent arrow, or filled hover cards remain. |
| Colour and shape | passed | Obsidian theme color tokens differentiate only node dots from canonical `node_kind`, `entity_kind`, and `facets`; every label keeps the neutral host text colour. Titles are never used to infer a type. |
| Settling stability | passed | Resize events reheat only after a meaningful panel-size change; source navigation refreshes once per distinct Markdown path. |
| Canonical boundary | passed | Graph, outline, search, and motion are read-only projections; Markdown and Vault relationships are never modified. |
| Accessibility | passed | Navigable route nodes and controls are native buttons with accessible names. A root without a canonical parent is a draggable, non-focusable graph node, so it does not expose a false action or host button outline. |

## Iterations

1. Rejected expandable cards and cached descendant previews because they duplicated Wiki structure.
2. Rejected the first static branch layout because it only looked graph-like and did not implement force motion.
3. Replaced the over-damped custom loop with `d3-force`, drag reheating, collision, and natural settling.
4. Replaced zero-width label tracks with content-sized flex nodes and measured collision geometry.
5. Made the current-note node participate in the same force and drag system, then added canonical-parent upward navigation.
6. Added pointer-hover and keyboard-focus 2-hop previews without making preview nodes persistent or clickable.
7. Compared the final panel with the 529×579 reference and widened direct-link distance from 132px to 158px to match Obsidian Local Graph density more closely.
8. Replaced the fixed 30px preview collision with measured label widths, split dense previews into eight-node rings, pinned the hover source, and increased damping.
9. Kept metadata colour on dots only and forced all direct and preview labels back to neutral `--text-normal`.
10. Replaced divider-dominant edge colours with neutral text-derived contrast: persistent direct links remain solid and preview links remain lighter dashed paths.
11. Removed static category anchors and labels, expanded graph mode edge-to-edge, and replaced the filled hover/focus card with a dot-only emphasis while retaining the 2-hop preview.
12. Increased direct and preview edge contrast, then removed false button semantics from roots without a canonical parent so the `Wiki` centre no longer receives an action outline.
13. Coalesced duplicate workspace events, removed graph-path tooltips and parent-arrow decoration, and made plain bullet groups structurally impossible in Graph view.
14. Replaced fixed link radii with density-responsive distances that preserve the compact sidebar minimum and expand beyond the previous 280px cap.
15. Moved every edge endpoint from the node container centre to the measured colour-dot centre.
16. Replaced hand-tuned edge and label colours with Obsidian's native `--graph-line` and `--graph-text` tokens.
17. Moved every root, direct, and preview title below its dot while preserving dot-centred edge geometry.
18. Removed viewport coordinate clamps, changed reset into bounds-fit, adopted a phyllotaxis seed, and retuned force decay, charge, centring, and drag reheating for an Obsidian-like unbounded canvas.

final result: passed
