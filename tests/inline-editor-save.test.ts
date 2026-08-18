import assert from "node:assert/strict";
import test from "node:test";
import { decideInlineEditorSave } from "../src/domain/inline-editor-save";

test("writes an in-card edit when the Vault still contains the last saved revision", () => {
	assert.deepEqual(decideInlineEditorSave("before", "before", "after"), { kind: "write" });
});

test("does not write when another actor changed the Markdown after editing started", () => {
	assert.deepEqual(decideInlineEditorSave("external edit", "before", "my edit"), { kind: "conflict" });
});

test("does not process an unchanged editor value", () => {
	assert.deepEqual(decideInlineEditorSave("before", "before", "before"), { kind: "noop" });
});
