# Linked Graph design system

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
- Graph root: one accent dot and title
- Graph branch: quiet connector, group label, and blue linked nodes
- Focus: visible two-pixel host-derived ring
- State text: muted and compact

## Accessibility

- Native buttons provide keyboard operation.
- Every icon-only control has an accessible label.
- Tree, treeitem, group, level, and expanded semantics describe hierarchy.
- Colour is not the only indicator: indentation, connectors, icons, and counts remain.
- No motion is required to understand or use the panel.
