import type { InlineEditorDraft } from "./inline-editor-draft";
import type { GraphViewState, GraphWorkspace } from "./graph-workspace";

export interface ContextGraphSettingsData {
	graphs: GraphWorkspace[];
	defaultGraphId: string;
	viewStates: Record<string, GraphViewState>;
	inlineDrafts: Record<string, InlineEditorDraft>;
	definitionsMigrated: boolean;
}

export type PersistedContextGraphSettings = Omit<ContextGraphSettingsData, "graphs"> & { graphs?: GraphWorkspace[] };

export function migrateInlineDrafts(stored: unknown): Record<string, InlineEditorDraft> {
	if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {};
	return Object.fromEntries(Object.entries(stored).flatMap(([path, value]) => {
		if (!path || !value || typeof value !== "object" || Array.isArray(value)) return [];
		const draft = value as Partial<InlineEditorDraft>;
		if (
			typeof draft.content !== "string"
			|| typeof draft.lastPersisted !== "string"
			|| typeof draft.updatedAt !== "number"
			|| !Number.isFinite(draft.updatedAt)
			|| draft.updatedAt < 0
		) return [];
		return [[path, {
			content: draft.content,
			lastPersisted: draft.lastPersisted,
			updatedAt: draft.updatedAt,
		}]];
	}));
}

/** Definition files become the only saved-graph canon after one migration. */
export function persistedSettings(settings: ContextGraphSettingsData): PersistedContextGraphSettings {
	const { graphs, ...local } = settings;
	return settings.definitionsMigrated ? local : { ...local, graphs };
}
