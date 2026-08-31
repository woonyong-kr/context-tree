# Linked Graph Navigator design QA

## Rendered implementation

![Obsidian 1.13.7 runtime](assets/linked-graph-runtime.png)

![Obsidian 1.13.7 next-hop preview](assets/linked-graph-runtime-preview.png)

## Public demo runtime

The 984×768 captures use the public `obsidian-navigator-demo-vault` in Obsidian 1.13.7. They contain no personal Woon notes. `00 Start Here.md` exposes seven authored routes grouped under `Calendar path`, `Knowledge path`, and `Practice and fallback`; the accessibility tree reports those section names on the corresponding route buttons.

The same runtime exposed session-only Back and Forward controls plus route search. The public Vault contains a 130-route note; the current candidate derives a 12-to-120 node ceiling from measured panel area and preserves the complete Outline fallback. In a 984×768 Obsidian window's compact right pane it rendered 12 routes, reported 118 omissions, and kept the full Outline action. The parser benchmark separately covers 5,000 authored links.

## Fidelity and interaction review

| Surface | Result | Evidence |
|---|---|---|
| Graph grammar | passed | The current Markdown note is the movable centre, its resolved outgoing links are surrounding nodes, and each authored link is one visible edge. Every root, direct, and preview title is centred below its dot as in Obsidian Graph. |
| Canvas use | passed | Graph mode removes body padding and renders an unbounded world through the whole remaining pane. Node coordinates are never clamped to the visible sidebar; pan, zoom, and bounds-fit reveal the rest of the graph. |
| Moving labels | passed | Every title is part of its force node; the removed group-label layer leaves no fixed captions behind the moving graph. |
| Route labels | passed | Every direct route keeps a visible title; content-sized native buttons no longer collapse to bare dots. |
| Label completeness | passed | Long root, direct, and preview titles wrap instead of using ellipsis. Collision bounds include both measured width and multiline height. Initial layout keeps authored text size; pan or explicit Fit reveals routes outside a compact viewport. |
| Motion | passed | Hover leaves the click target stationary. Drag owns one captured pointer, moves the selected node directly, and gives only surrounding `d3-force` nodes a short damped settle. Pan, wheel, zoom, and fit use the same immediate transform path without secondary interaction timers. |
| Viewport safety | passed | The world remains larger than the sidebar without clipping node coordinates. A widened leaf immediately exposed more graph area; background pan, zoom controls, and bounds-fit recovered every route without rewriting node positions. |
| Navigation | passed | On `책`, the centre exposed `상위 문서로 이동: Wiki`; clicking it opened `wiki/README.md` and rebuilt the graph from two book links to seven Wiki routes. |
| Section context | passed | Outline routes expose their authored section heading in visible text and accessible names, so repeated labels retain reading context without duplicating category captions in Graph. |
| Keyboard route flow | passed | Search can be focused from the command palette, `Arrow Down` moves to the first result, `Enter` opens it, and session-only Back/Forward retrace the opened path. |
| Dense-note fallback | passed | A 130-route public demo uses the measured panel area: the compact runtime rendered 12 direct nodes, reported 118 omissions, and offered the full deterministic Outline. Wider panes raise the cap up to 120. |
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
19. Removed title ellipsis, allowed multiline wrapping, measured collision height, and fitted the settled graph once so complete labels remain visible without overriding later user navigation.

final result: passed
