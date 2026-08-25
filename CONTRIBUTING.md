# Contributing to Linked Graph

Linked Graph is a read-only projection over canonical Markdown.

## Before opening a pull request

1. Describe the navigation problem and expected user-visible behaviour.
2. Keep Markdown parsing in `src/model.ts`, lifecycle and Obsidian integration in `src/main.ts`, and sidebar presentation in `src/view.ts`.
3. Do not add Vault writes, persistence, backlinks, saved maps, Canvas integration, relationship editing, telemetry, network access, or remote code.
4. Update the UX contract and focused regression tests with every behaviour change.
5. Run `npm run check` and `npm audit --omit=dev --audit-level=high`.
6. Verify the desktop runtime procedure in `docs/release-process.md` for interaction changes.

Generated `main.js` is a release artifact and is not committed. Release versions in `package.json`, `manifest.json`, `versions.json`, the Git tag, and release media record must match.
