import assert from "node:assert/strict";
import test from "node:test";
import { cardPointerAction } from "../src/domain/card-pointer-action";

test("a compact non-interactive card surface moves its graph node", () => {
	assert.equal(cardPointerAction({ isEditing: false, isInteractiveTarget: false, isTextSelectionTarget: false }), "move-node");
});

test("an expanded reading card can still be deliberately repositioned", () => {
	assert.equal(cardPointerAction({ isEditing: false, isInteractiveTarget: false, isTextSelectionTarget: false }), "move-node");
});

test("Markdown controls, selected Reading text, and source editing retain native interaction", () => {
	assert.equal(cardPointerAction({ isEditing: false, isInteractiveTarget: true, isTextSelectionTarget: false }), "none");
	assert.equal(cardPointerAction({ isEditing: false, isInteractiveTarget: false, isTextSelectionTarget: true }), "none");
	assert.equal(cardPointerAction({ isEditing: true, isInteractiveTarget: false, isTextSelectionTarget: false }), "none");
});
