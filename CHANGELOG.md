# Changelog

## 1.6.6

- Replace low-resolution Community visuals with public-safe 16:9 PNG frames at 1600×900; a new interaction GIF is intentionally deferred.
- Keep the introduction focused on the active-note and next-step reading flow.
- Require sharp 16:9 README media in the release gate and clarify the plugin's note-first use cases.

## 1.6.5

- Replace the final `Array.at()` call with indexed access so the Community source scanner can infer the section label without unsafe-value warnings.
- Keep preview status text visually clipped through its one-pixel overflow box without the partially supported `clip-path` property.

## 1.6.4

- Move next-hop ring geometry into a focused pure module with direct narrow- and wide-panel regression tests.
- Remove the redundant node anchor field so pointer, hover, and edge positioning share one DOM owner.
- Rebuild the Community overview around quick start, exact Markdown support, interaction behavior, limits, privacy, and troubleshooting.
- Replace the public walkthrough with a private-data-free active-note → re-root → Outline sequence captured in Obsidian 1.13.7.

## 1.6.3

- Remove repeated section captions such as `하위 키워드` from graph nodes while keeping authored grouping in Outline view.
- Pin a hovered route before loading its outgoing links and render the next-hop preview without adding it to the primary force simulation, so the source cannot move away from the pointer.
- Measure drag intent in screen pixels, delay pointer capture until that threshold is crossed, and suppress navigation only after a deliberate drag, restoring reliable single-click navigation at every zoom level.
- Keep a successful drop as the node's session-only position and restore its pre-drag position when pointer input is cancelled or the app loses focus.
- Fit the complete measured title bounds when a graph first opens, so long root and route labels no longer begin cropped; zoom, pan, and Outline remain available when a dense graph starts small.
- Keep hover targets stationary, reveal next routes immediately, and route each direct node's padded hover, click, and drag area through one interaction owner while surrounding nodes settle with short, damped force motion.
- Re-root the sidebar graph immediately after a direct-node or Outline navigation instead of waiting on workspace event ordering.
- Expand the world radius progressively once a note exceeds eight direct routes, preventing chapter-sized graphs from stacking labels in a narrow sidebar.
- Bound next-route previews by the actual pane width and fan them toward the available graph interior, keeping large chapter indexes readable without adding another button or status card.
- Split compact previews across two staggered rings so long lesson titles do not collapse into a single fan.

## 1.6.2

- Keep every graph node title visible with multiline wrapping, include rendered title height in collision spacing, and fit the initial graph before user pan or zoom so labels are not clipped by the sidebar boundary.

## 1.6.1

- Remove the per-node next-route chevron that cluttered dense graphs. Direct nodes once again remain a single control: hover or keyboard focus previews the next route, and activation opens the note.

## 1.6.0

- Show the authored section heading as context on direct graph routes, next-step previews, and the complete Outline.
- Add session-only Back and Forward navigation plus a command that focuses route search.
- Let keyboard users open search, move to the first matching route with Arrow Down, open it, and return through session history.
- Add a reproducible 5,000-route parser benchmark and a public dense-note demo for the bounded graph and complete Outline fallback.
- Publish a private-data-free demo Vault, issue templates, Roadmap, and Discussions path for a five-minute first success.

## 1.5.0

- Bound Graph view to 120 direct routes and 48 next-step previews while keeping the complete authored list in Outline view.
- Report omitted routes and provide a direct switch to the complete Outline view.
- Ignore inline code and math while parsing, and preserve Markdown targets with nested parentheses.
- Add explicit touch and keyboard controls for opening and closing next-step previews.
- Pin GitHub Actions, add least-privilege dependency review, and enable Dependabot for npm and workflow updates.

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
