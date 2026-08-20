import assert from "node:assert/strict";
import test from "node:test";
import { cardPointerAction } from "../src/domain/card-pointer-action";

test("a compact non-interactive card surface moves its graph node", () => {
	assert.equal(cardPointerAction({ isInteractiveTarget: false, isTextSelectionTarget: false }), "move-node");
});

test("an expanded reading card can still be deliberately repositioned", () => {
	assert.equal(cardPointerAction({ isInteractiveTarget: false, isTextSelectionTarget: false }), "move-node");
});

test("Markdown controls and selected Reading text retain native interaction", () => {
	assert.equal(cardPointerAction({ isInteractiveTarget: true, isTextSelectionTarget: false }), "none");
	assert.equal(cardPointerAction({ isInteractiveTarget: false, isTextSelectionTarget: true }), "none");
});

test("a source card frame remains draggable whether or not the card is pinned", () => {
	assert.equal(cardPointerAction({ isInteractiveTarget: false, isTextSelectionTarget: false }), "move-node");
});
