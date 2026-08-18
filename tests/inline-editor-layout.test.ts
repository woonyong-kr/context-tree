import assert from "node:assert/strict";
import test from "node:test";
import { inlineEditorCardHeight } from "../src/domain/inline-editor-layout";

test("gives a compact card a readable source editor height", () => {
	assert.equal(inlineEditorCardHeight(76, "---\ncontext_tree: true\n---\n# 새 주제\n"), 320);
});

test("keeps an already expanded card footprint when entering source mode", () => {
	assert.equal(inlineEditorCardHeight(520, "# 주제"), 520);
});

test("bounds very long source documents to a scrollable editor height", () => {
	assert.equal(inlineEditorCardHeight(80, Array.from({ length: 100 }, () => "line").join("\n")), 680);
});
