# Release and Community directory process

This runbook turns an already reviewed commit into a public Context Graph
release. It does not replace the UX contract or the code review: the release
must begin from a clean working tree and a reviewed commit on `main`.

## Preconditions

- `README.md`, `LICENSE`, `SECURITY.md`, `manifest.json`, and `versions.json`
  are committed at the repository root.
- `package.json.version` and `manifest.json.version` are identical semantic
  versions in `x.y.z` form.
- `docs/release-media.json` names that exact version and records the current
  README overview, Reading, and Source captures.
- The release version has not been used as a Git tag or GitHub release.
- Node.js 20 or later is installed.

## Verify the release candidate

Run these commands from the repository root:

```bash
npm ci
npm run check
npm audit --omit=dev
git diff --check
git status --short
```

The audit must report no production dependency vulnerabilities, and the final
two commands must produce no output. Review the generated `main.js` locally;
it is intentionally ignored and must never be committed.

### Refresh the README evidence

Every release candidate must be shown in the README as it actually renders in
Obsidian. Use one small set of synthetic, public-safe Markdown notes and capture:

1. the compact one-hop overview;
2. the same card opened in Reading; and
3. the same card in Source.

Replace the three files under `docs/assets/context-graph-0*.png`, then update
their exact SHA-256 values, dimensions, Obsidian version, capture date, and
release version in `docs/release-media.json`. Do not use a mockup, an older
release, private Vault content, or an image with unrelated panes and notices.

`npm run build` executes `npm run check:media`. It fails when the media record
does not match `package.json` and `manifest.json`, a required capture is absent,
the README does not embed it, its PNG dimensions are too small, or its recorded
hash is stale. This makes README evidence part of every local and CI release
build instead of an optional documentation step.

Complete the [Desktop release regression procedure](ux-contract.md#desktop-릴리스-회귀-절차)
in a local Obsidian vault and retain its results with the release record. The
automated suite cannot independently prove pointer coordinates, final rendered
geometry, or Obsidian's native scrolling behaviour.

## Publish a version

Use `npm version` to keep the package, manifest, and compatibility map in
sync. It runs this repository's `version` script, which updates
`manifest.json` and `versions.json` for the package version.

```bash
npm version patch
git push origin main --follow-tags
```

Do not push a tag until the release candidate has passed the verification
commands above. Pushing the tag starts `.github/workflows/release.yml`; that
workflow builds the plugin, attests `main.js`, `manifest.json`, and
`styles.css`, then publishes a GitHub release with those three individual
assets.

After the workflow succeeds, verify the exact published release before
submitting it:

```bash
gh release view <version> --repo woonyong-kr/context-tree
gh attestation verify main.js -R woonyong-kr/context-tree
```

Download the release `main.js` for the second command. The release tag must
exactly match `manifest.json.version`; Community directory installation fetches
the three assets from that matching GitHub release.

## Submit to the Obsidian Community directory

1. Sign in at `community.obsidian.md` and connect the GitHub account that owns
   `woonyong-kr/context-tree`.
2. On **Plugins**, select **New plugin** and supply the public repository URL.
3. Use **Review branch** to preview the directory scan against `main` before
   submitting.
4. Confirm the directory listing is based on the same committed manifest and
   published release verified above.
5. Address every error, publish a new incremented release when needed, and use
   **Request review** to re-run the scan.

The Community directory account connection and final submission are
maintainer-owned external actions. Keep the resulting review URL or release
URL with the release record.
