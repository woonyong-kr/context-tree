import assert from "node:assert/strict";
import test from "node:test";
import { cardPointerAction } from "../src/domain/card-pointer-action";

test("a compact non-interactive card surface moves its graph node", () => {
	assert.equal(cardPointerAction({ isOpen: false, isEditing: false, isInteractiveTarget: false }), "move-node");
});

test("an expanded reading card pans the graph without closing its details", () => {
	assert.equal(cardPointerAction({ isOpen: true, isEditing: false, isInteractiveTarget: false }), "pan-graph");
});

test("Markdown controls and source editing retain their native interaction", () => {
	assert.equal(cardPointerAction({ isOpen: true, isEditing: false, isInteractiveTarget: true }), "none");
	assert.equal(cardPointerAction({ isOpen: true, isEditing: true, isInteractiveTarget: false }), "none");
});
