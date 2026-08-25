# Linked Graph design system

## Principles

- The Markdown editor remains visually dominant.
- The graph must work in a narrow right sidebar.
- Titles look and behave like links; controls use Obsidian/Lucide icons.
- Structure comes from indentation and a quiet connector line, not cards.
- All colours derive from the active Obsidian theme.

## Components

- Row height: `--lg-row-height` (36px)
- Spacing: 4, 8, 12, and 16px tokens
- Root: one quiet bordered row
- Group: medium label, count, disclosure chevron
- Link: blue text button, disclosure chevron
- Focus: visible two-pixel host-derived ring
- State text: muted and compact

## Accessibility

- Native buttons provide keyboard operation.
- Every icon-only control has an accessible label.
- Tree, treeitem, group, level, and expanded semantics describe hierarchy.
- Colour is not the only indicator: indentation, connectors, icons, and counts remain.
- No motion is required to understand or use the panel.
