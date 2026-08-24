# Contributing to Linked Canvas

Linked Canvas is a local-first Obsidian plugin. Every product change must keep
each note's Markdown as the only durable source of its content. A standard
Canvas owns layout; its adjacent automation profile may store scope and
provenance, but never a copy of note content.

## Before opening a pull request

1. Start from an issue or describe the problem, the affected Markdown contract,
   and the expected user-visible behaviour.
2. Keep parsing, Map geometry, JSON Canvas projection, Vault writes, and UI
   effects in their existing module boundaries. Do not add a second card
   database or a network service.
3. Add a focused regression test for parsing, graph construction, relation
   storage, or geometry when the behaviour can be tested without Obsidian.
4. Run `npm run check`.
5. For an interaction change, manually verify desktop Obsidian: opening and
   closing a Map card, editing Markdown, pan/zoom, native Canvas portability,
   and the affected gesture.
   The exact release-grade sequence is in the [UX contract's Desktop regression
   procedure](docs/ux-contract.md#desktop-릴리스-회귀-절차).

## Pull request expectations

- Explain the user problem and the trade-off, not only the implementation.
- State whether the change reads or writes vault files.
- Keep generated `main.js` out of commits; GitHub releases attach the built
  `main.js`, `manifest.json`, and `styles.css` artifacts.
- Do not introduce telemetry, network access, remote code, or Electron-only
  behaviour without an explicit proposal and updated privacy documentation.

## Release changes

Use semantic versions in `package.json` and `manifest.json`. The GitHub tag
must exactly equal `manifest.json.version` (without a leading `v`), and
`versions.json` must contain the matching minimum Obsidian version.

Follow [the release process](docs/release-process.md) for the required local
verification, release artifact, provenance, and Community directory checks.
