# Release process

1. Confirm the Community directory entry ID is `linked-graph`. Never submit this manifest as an update to the retired `context-graph` entry; directory identifiers cannot be renamed.
2. Run `npm run check`.
3. Run `npm audit --omit=dev --audit-level=high`.
4. Build `main.js` with `npm run build`.
5. Install the local build through the Woon Obsidian plugin adapter and keep its receipt.
6. Reload Obsidian; verify follow, single graph creation per navigation, movable current node, invisible parent affordance, hover-only second-hop preview, unbounded pan/zoom, bounds-fit, density-responsive spacing, drag-reheated settling, metadata colours, direct navigation, collapse, search, empty state, and no Vault writes.
7. Capture the tested right-sidebar runtime using public-safe sample notes.
8. Update `docs/release-media.json` with dimensions and SHA-256; rerun `npm run check:media`.
9. Verify manifest, package, tag, and release versions match.
10. Verify repository visibility before push or release.
11. Push only after the runtime and receipt gates pass; publish release assets `manifest.json`, `main.js`, and `styles.css`.
