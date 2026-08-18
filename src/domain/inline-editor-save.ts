/**
 * Decides whether a pending in-card edit may be written without overwriting a
 * change made by another Obsidian leaf, Sync, or a Vault-aware plugin.
 */
export type InlineEditorSaveDecision =
	| { kind: "noop" }
	| { kind: "write" }
	| { kind: "conflict" };

export function decideInlineEditorSave(
	currentVaultContent: string,
	lastPersistedContent: string,
	pendingEditorContent: string,
): InlineEditorSaveDecision {
	if (pendingEditorContent === lastPersistedContent) return { kind: "noop" };
	if (currentVaultContent !== lastPersistedContent) return { kind: "conflict" };
	return { kind: "write" };
}
