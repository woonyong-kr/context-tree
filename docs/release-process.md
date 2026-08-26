# Release process

1. Run `npm run check`.
2. Run `npm audit --omit=dev --audit-level=high`.
3. Build `main.js` with `npm run build`.
4. Install the local build through the Woon Obsidian plugin adapter and keep its receipt.
5. Reload Obsidian; verify follow, movable current node, parent navigation, hover-only second-hop preview, metadata colours, direct navigation, collapse, search, empty state, and no Vault writes.
6. Capture the tested right-sidebar runtime using public-safe sample notes.
7. Update `docs/release-media.json` with dimensions and SHA-256; rerun `npm run check:media`.
8. Verify manifest, package, tag, and release versions match.
9. Verify repository visibility before push or release.
10. Push only after the runtime and receipt gates pass; publish release assets `manifest.json`, `main.js`, and `styles.css`.
