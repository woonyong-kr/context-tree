# Linked Graph repository guide

Linked Graph is a local-first Obsidian Community Plugin. Canonical Markdown is the only knowledge source of truth; the plugin is a read-only current-note navigator.

## Working agreement

- Use Node.js 20 or newer and npm.
- Keep pure parsing and ordering in `src/model.ts`, plugin lifecycle in `src/main.ts`, and right-sidebar rendering in `src/view.ts`.
- Preserve the invariants in `docs/ux-contract.md`. A behaviour change updates the contract, implementation, focused regression test, and runtime smoke procedure together.
- Use Obsidian's public API. Do not inspect internal editor DOM, access files outside the Vault, introduce telemetry or network access, load remote code, or call Electron/Node APIs from the plugin bundle.
- Do not write Vault files or plugin knowledge state. Search, collapse, and preview remain session-only.
- Register workspace, Vault, DOM, and timer resources through Obsidian lifecycle owners.
- Keep user-facing copy in `src/ui/copy-ko.ts` and `src/ui/copy-en.ts`.

## Verification

Run `npm run check` and `npm audit --omit=dev --audit-level=high`. Interaction changes also require receipt-based local installation, Obsidian reload, and runtime verification. A build alone does not prove the loaded plugin.

## Release contract

- Keep `package.json`, `manifest.json`, and `versions.json` aligned.
- Tag the exact version without a `v` prefix.
- Release `main.js`, `manifest.json`, and `styles.css`.
- Refresh the tested runtime capture and `docs/release-media.json`.
- Do not commit generated `main.js`.
