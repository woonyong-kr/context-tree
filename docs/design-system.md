# Linked Graph Navigator design system

## Principles

- The Markdown editor remains visually dominant.
- The outline and graph must work in a narrow right sidebar and a wider docked pane.
- Titles look and behave like links; controls use Obsidian/Lucide icons.
- Structure comes from hairline separators and connector lines, never cards.
- All colours derive from the active Obsidian theme.

## Components

- Row height: `--lg-row-height` (36px)
- Spacing: 4, 8, 12, and 16px tokens
- Header: current note title, route count, icon-only search, and text-labelled view switch
- Outline group: medium label, count, disclosure chevron
- Outline link: file icon, blue text, and hover-only open indicator
- Graph node: one metadata-coloured dot above a centred title, matching Obsidian Graph's node-label grammar; the root is movable and opens its canonical parent when one exists
- Graph: `d3-force` link/charge/collision movement, viewport-responsive spacing, content-sized direct-link nodes, real link edges, no plain-text group captions, and translucent hover-only second-hop previews
- Type colour: Obsidian theme colours selected only from canonical `node_kind`, `entity_kind`, or `facets`; unknown nodes remain neutral
- Focus: host-derived focus treatment on controls; graph nodes remain dot-and-label shapes without cards or outlines
- State text: muted and compact

## Accessibility

- Native buttons provide keyboard operation.
- Every icon-only control has an accessible label.
- Tree, treeitem, group, level, and expanded semantics describe hierarchy.
- Colour is not the only indicator: indentation, connectors, icons, and counts remain.
- No motion is required to understand or use the panel.
- Drag and wheel gestures have icon-button alternatives for zoom reset; current and direct linked nodes remain native buttons.
- Hover preview is also available on keyboard focus and is never required to reach a direct linked note.
