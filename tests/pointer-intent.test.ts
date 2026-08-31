import assert from "node:assert/strict";
import test from "node:test";
import { NODE_DRAG_THRESHOLD_PX, hasNodeDragIntent } from "../src/pointer-intent";

test("keeps an ordinary click below the node drag threshold", () => {
	const origin = { clientX: 100, clientY: 100 };
	assert.equal(hasNodeDragIntent(origin, 104, 104), false);
	assert.equal(hasNodeDragIntent(origin, 107, 100), false);
});

test("starts dragging only after deliberate screen-space movement", () => {
	const origin = { clientX: 100, clientY: 100 };
	assert.equal(hasNodeDragIntent(origin, 100 + NODE_DRAG_THRESHOLD_PX, 100), true);
	assert.equal(hasNodeDragIntent(origin, 106, 106), true);
});

test("does not make drag sensitivity depend on graph zoom", () => {
	const origin = { clientX: 100, clientY: 100 };
	const pointerX = 104;
	for (const scale of [0.12, 0.5, 1, 2.4]) {
		const graphDelta = (pointerX - origin.clientX) / scale;
		assert.ok(graphDelta > 0);
		assert.equal(hasNodeDragIntent(origin, pointerX, 100), false);
	}
});
