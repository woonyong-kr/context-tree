# Linked Canvas repository guide

Linked Canvas is a local-first Obsidian Community Plugin. Markdown and other
Vault files are the content source of truth; standard Canvas files own layout,
and saved Maps are temporary lenses over notes rather than a second content
store.

## Working agreement

- Use Node.js 20 or newer and npm. Install with `npm ci`.
- Keep `src/main.ts` focused on plugin lifecycle, commands, and persistence
  coordination. Put pure decisions in `src/domain/`, graph projection and
  geometry in `src/graph/`, and card rendering in `src/ui/`.
- Preserve the interaction invariants in `docs/ux-contract.md`. A behaviour
  change updates the contract, implementation, focused regression test, and
  desktop smoke procedure together.
- Use Obsidian's public API. Do not access files outside the vault, introduce
  telemetry or network access, load remote code, or call Electron/Node runtime
  APIs from the plugin bundle.
- Register workspace, vault, DOM, timer, and component resources through the
  corresponding Obsidian lifecycle owner so unloading the plugin releases them.
- Keep user-facing copy in `src/ui/copy-ko.ts` and `src/ui/copy-en.ts`.
- Preserve user changes in Markdown, Canvas, sidecar, and legacy Map files with
  optimistic conflict checks; never overwrite an externally changed source
  silently.

## Verification

Run before every pull request:

```bash
npm run check
npm audit --omit=dev --audit-level=high
```

Interaction changes also require the desktop Obsidian sequence in
`docs/ux-contract.md`. A build or unit test does not prove that Obsidian loaded
the new release assets.

## Release contract

- Keep `package.json`, `manifest.json`, and `versions.json` versions aligned.
- Tag releases with the exact version, without a `v` prefix.
- Release `main.js`, `manifest.json`, and `styles.css` as individual assets.
- Refresh the four actual Obsidian README captures and short tour GIF, plus
  `docs/release-media.json` for every release version; `npm run build` enforces
  their version, dimensions, references, and hashes.
- Do not commit generated `main.js`; CI builds and attests release artifacts.
- Follow `docs/release-process.md` for the full local, GitHub, and Community
  directory verification sequence.
