import assert from "node:assert/strict";
import test from "node:test";
import {
	cardPointerAction,
	hasCardDragExceededClickThreshold,
} from "../src/domain/card-pointer-action";

test("a compact non-interactive card surface moves its graph node", () => {
	assert.equal(cardPointerAction({ isCardToggleTarget: false, isInteractiveTarget: false, isTextSelectionTarget: false }), "move-node");
});

test("an expanded reading card can still be deliberately repositioned", () => {
	assert.equal(cardPointerAction({ isCardToggleTarget: false, isInteractiveTarget: false, isTextSelectionTarget: false }), "move-node");
});

test("the title and summary remain a practical drag handle on an open card", () => {
	assert.equal(cardPointerAction({ isCardToggleTarget: true, isInteractiveTarget: true, isTextSelectionTarget: false }), "move-node");
});

test("a stationary title gesture remains a click until it crosses the drag threshold", () => {
	assert.equal(hasCardDragExceededClickThreshold({ x: 10, y: 10 }, { x: 13, y: 14 }), true);
	assert.equal(hasCardDragExceededClickThreshold({ x: 10, y: 10 }, { x: 12, y: 12 }), false);
});

test("Markdown controls and selected Reading text retain native interaction", () => {
	assert.equal(cardPointerAction({ isCardToggleTarget: false, isInteractiveTarget: true, isTextSelectionTarget: false }), "none");
	assert.equal(cardPointerAction({ isCardToggleTarget: false, isInteractiveTarget: false, isTextSelectionTarget: true }), "none");
});

test("a source card frame remains draggable whether or not the card is pinned", () => {
	assert.equal(cardPointerAction({ isCardToggleTarget: false, isInteractiveTarget: false, isTextSelectionTarget: false }), "move-node");
});
