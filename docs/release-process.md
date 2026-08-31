# Release process

1. Confirm the Community directory entry ID is `linked-graph`. Never submit this manifest as an update to the retired `context-graph` entry; directory identifiers cannot be renamed.
2. Run `npm run check`.
3. Run `npm audit --omit=dev --audit-level=high`.
4. Build `main.js` with `npm run build`.
5. Install the local build through the Woon Obsidian plugin adapter and keep its receipt.
6. Reload Obsidian; verify one graph creation per navigation and confirm that clicking a direct node opens its canonical note and immediately re-roots the sidebar at that note. In a dense chapter note, confirm the initial graph remains readable instead of shrinking every label into a thumbnail; pan, zoom, fit, and Outline must still reach the complete route set.
7. For a direct node, confirm a single click opens it without a second disclosure button or `빠른 이동`/`하위 노드` caption. Hover must expose outgoing keywords without translating the node or its contents. Keyboard focus must expose the same preview immediately, and Enter must open the note. Preview nodes and edges must reveal and collapse together without detached endpoints.
8. Confirm mouse and touch jitter stay a click, deliberate root and direct-node drags follow the pointer without easing, and surrounding nodes settle promptly instead of accelerating after release. A successful drop retains the session-only position, while pointer-cancel, pointer-capture loss, or app focus loss restores the pre-drag position. Then verify parent navigation, measured 12-to-120 direct-node and 48 preview-node bounds with Outline fallback, metadata colours, collapse, search, empty state, and no Vault writes.
9. Capture the tested right-sidebar runtime using public-safe sample notes.
10. Update `docs/release-media.json` with dimensions and SHA-256; rerun `npm run check:media`.
11. Verify manifest, package, tag, and release versions match.
12. Verify repository visibility before push or release.
13. Push only after the runtime and receipt gates pass; publish release assets `manifest.json`, `main.js`, and `styles.css`.
