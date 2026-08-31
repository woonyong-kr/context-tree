# Changelog

## 1.4.3

- Reframe the public page around following the reading paths intentionally written in the active note.
- Replace graph terminology with a three-step active-note, intended-route, and next-step-preview explanation.
- Recut the public walkthrough to enlarge the authored routes and the hover-only next-step preview.

## 1.4.2

- Add an animated public-safe walkthrough of current-note routes and next-hop preview.
- Make unused-export detection part of the standard release gate and remove four accidental public type exports.
- Pin the Obsidian development API to a reproducible compatible range.

## 1.4.1

- Use the unique public name Linked Graph Navigator for the new `linked-graph` Community Directory entry while preserving the plugin ID and behavior.

## 1.4.0

- Let dense current-note graphs expand into an unbounded world while the viewport remains an edge-to-edge navigation surface.
- Keep force motion responsive without shrinking the graph to the initial panel bounds.
- Anchor every edge to the visible node dot and keep labels below nodes in the Obsidian graph visual language.
- Preserve hover-only second-hop previews, movable root navigation, metadata colours, pan, zoom, and fit without writing layout state to the Vault.

## 1.2.0

- Make the current-note graph the default with one real edge per authored outgoing link.
- Add ephemeral force positioning, drag, pan, zoom, fit controls, and canonical node navigation.
- Use `d3-force` link, charge, collision, and reheating behaviour so nearby nodes respond naturally while dragging and settle without becoming permanently pinned.
- Keep every node title visible with content-sized native buttons instead of collapsing routes to unlabeled dots.
- Keep moving nodes inside the current sidebar viewport and reheat the layout after pane resizing.
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
