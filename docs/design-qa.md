# Linked Graph design QA

## Rendered implementation

![Obsidian 1.13.7 runtime](assets/linked-graph-runtime.png)

## Compared reference

The private product reference was checked locally at 1487×1059 and was not copied into this public repository. It establishes five surfaces: a plain Wiki heading, a route count, hairline link rows, one compact `그래프 보기` action, and no card container.

The implementation was captured in Obsidian 1.13.7 at 1115×768 with `wiki/README.md` active. A local-only 2480×494 side-by-side comparison preserves the supplied reference and the runtime evidence without publishing private workspace context.

## Fidelity review

| Surface | Result | Evidence |
|---|---|---|
| Information hierarchy | passed | `Wiki` and `현재 문서 · 7개 경로` lead directly into seven authored routes. |
| Typography and density | passed | One title, one muted count, and 36px rows remain readable without descriptions or metadata cards. |
| Shape and separation | passed | Hairline separators define rows; no root card, route card, badge, shadow, or rounded panel remains. |
| Colour and state | passed | Only canonical links and the active graph node use the host accent; all other hierarchy uses theme text and divider tokens. |
| Interaction | passed | Outline is the default; `그래프 보기` projects the same seven links as a one-hop graph and `목차 보기` returns without saved layout state. |
| Canonical navigation | passed | Outline links and graph nodes open the original Markdown note in the main editor. |
| Docking boundary | passed | The selected product contract keeps the navigator in the right sidebar so the canonical editor remains visible; it does not reproduce the reference's bottom docking. |
| Narrow pane | passed | Titles truncate without overlap and the graph uses labels plus connector lines rather than resizable cards. |
| Accessibility | passed | The outline exposes list semantics, every route is a native button, and the view switch has an accessible label and pressed state. |

## Iterations

1. Rejected expandable cards and cached descendant previews because they duplicated Wiki structure.
2. Rejected the first one-hop render because native button surfaces still appeared as cards.
3. Removed button fills, rounded borders, counts, and duplicate labels; retained only dots, connectors, and canonical titles.

final result: pending runtime verification for 1.2.0
