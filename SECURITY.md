# Security policy

## Scope

Linked Graph runs locally inside Obsidian. It has no network client, telemetry, remote-code loader, external account integration, or Vault write path. It reads the active Markdown note and resolved linked Markdown notes only when the user expands them.

The primary security boundary is private Vault-content disclosure. Reports and fixtures must remove personal content before sharing.

## Reporting a vulnerability

Use GitHub private security-advisory reporting when available. Include the affected Linked Graph and Obsidian versions, a minimal sanitized fixture, expected and actual behaviour, and whether the issue can disclose or execute content.
