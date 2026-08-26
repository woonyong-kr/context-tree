# Changelog

## 1.2.0

- Make the current-note graph the default with one real edge per authored outgoing link.
- Add ephemeral force positioning, drag, pan, zoom, fit controls, and canonical node navigation.
- Use Markdown bullet groups as semantic cluster anchors without creating group entities or saved layout state.
- Keep the deterministic outline as a secondary view over the exact same link set.

## 1.0.1

- Refined the sidebar hierarchy, spacing, icons, selection surfaces, and narrow-width behaviour.
- Prevented an expanded branch from remaining stuck in a loading state after its cached graph is refreshed.
- Replaced the compressed runtime image with a lossless native Obsidian capture.

## 1.0.0

- Renamed the product and plugin ID to Linked Graph.
- Replaced Linked Canvas, saved Maps, physics cards, relationship editing, inline editing, and Canvas synchronization with a read-only current-note sidebar.
- Preserved authored wikilink order and plain-text bullet grouping.
- Added session-only progressive link preview, current-route search, cycle protection, and direct source navigation.
- Removed `d3-force` and all plugin knowledge/layout persistence.
