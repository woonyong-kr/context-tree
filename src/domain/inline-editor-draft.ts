export interface InlineEditorDraft {
	content: string;
	lastPersisted: string;
	updatedAt: number;
}

export type InlineDraftRecovery =
	| { kind: "none" }
	| { kind: "restore"; content: string }
	| { kind: "conflict"; content: string };

export function recoverInlineDraft(currentSource: string, draft: InlineEditorDraft | undefined): InlineDraftRecovery {
	if (!draft || draft.content === draft.lastPersisted || draft.content === currentSource) return { kind: "none" };
	return currentSource === draft.lastPersisted
		? { kind: "restore", content: draft.content }
		: { kind: "conflict", content: draft.content };
}
