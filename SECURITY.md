# Security policy

## Scope

Context Graph is designed to operate locally inside an Obsidian vault. It has no
network client, analytics service, remote-code loader, or external account
integration. Its relevant security boundary is therefore vault-file integrity:
the plugin reads the current note and its linked Markdown neighbourhood. It
writes only when a reader creates or edits a note, authors or removes a typed
relationship, changes a saved graph definition, or explicitly moves a source
note to trash.

## Reporting a vulnerability

Please do not publish an issue containing private vault content, a proof that
could destroy data, or a reproducible exploit before a fix is available. Use
the repository's private GitHub security-advisory reporting flow when it is
enabled; otherwise contact the repository owner through GitHub and include:

- affected Context Graph version and Obsidian version;
- the minimum vault fixture that reproduces the issue, with sensitive text
  removed;
- expected and actual file or UI behaviour; and
- whether the issue can overwrite, delete, disclose, or execute content.

We will acknowledge a report, assess reproducibility, and publish a fix and
release note when appropriate.
