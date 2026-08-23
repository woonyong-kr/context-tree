import assert from "node:assert/strict";
import test from "node:test";
import { migrateInlineDrafts, persistedSettings } from "../src/domain/settings-storage";

test("saved graph definitions are not duplicated into plugin settings after migration", () => {
	assert.deepEqual(persistedSettings({
		graphs: [{ id: "saved", name: "Saved", scope: { kind: "curated", folders: [], includePaths: [], excludePaths: [] }, physics: { linkStrength: 0.4, repulsion: 900, linkGap: 100 } }],
		defaultGraphId: "saved",
		viewStates: {},
		inlineDrafts: {},
		definitionsMigrated: true,
	}), {
		defaultGraphId: "saved",
		viewStates: {},
		inlineDrafts: {},
		definitionsMigrated: true,
	});
});

test("legacy graph settings remain available until definition migration completes", () => {
	const settings = {
		graphs: [{ id: "legacy", name: "Legacy", scope: { kind: "curated" as const, folders: [], includePaths: [], excludePaths: [] }, physics: { linkStrength: 0.4, repulsion: 900, linkGap: 100 } }],
		defaultGraphId: "legacy",
		viewStates: {},
		inlineDrafts: {},
		definitionsMigrated: false,
	};
	assert.deepEqual(persistedSettings(settings).graphs, settings.graphs);
});

test("keeps only complete finite inline draft records", () => {
	assert.deepEqual(migrateInlineDrafts({
		"notes/valid.md": { content: "after", lastPersisted: "before", updatedAt: 10 },
		"notes/missing.md": { content: "after" },
		"notes/non-finite.md": { content: "after", lastPersisted: "before", updatedAt: Infinity },
	}), {
		"notes/valid.md": { content: "after", lastPersisted: "before", updatedAt: 10 },
	});
});
