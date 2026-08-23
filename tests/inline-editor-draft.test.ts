import assert from "node:assert/strict";
import test from "node:test";
import { recoverInlineDraft } from "../src/domain/inline-editor-draft";

test("restores an unsaved draft when the source still matches its base revision", () => {
	assert.deepEqual(recoverInlineDraft("before", {
		content: "my pending edit",
		lastPersisted: "before",
		updatedAt: 10,
	}), { kind: "restore", content: "my pending edit" });
});

test("keeps a recoverable conflict when the source changed after the draft base", () => {
	assert.deepEqual(recoverInlineDraft("external edit", {
		content: "my pending edit",
		lastPersisted: "before",
		updatedAt: 10,
	}), { kind: "conflict", content: "my pending edit" });
});

test("ignores a journal entry that contains no pending edit", () => {
	assert.deepEqual(recoverInlineDraft("same", {
		content: "same",
		lastPersisted: "same",
		updatedAt: 10,
	}), { kind: "none" });
});

test("ignores a journal whose edit is already the current source", () => {
	assert.deepEqual(recoverInlineDraft("saved edit", {
		content: "saved edit",
		lastPersisted: "before",
		updatedAt: 10,
	}), { kind: "none" });
});
