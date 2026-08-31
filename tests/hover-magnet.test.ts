import assert from "node:assert/strict";
import test from "node:test";
import { HOVER_MAGNET_MAX_PX, boundedHoverMagnet } from "../src/hover-magnet";

test("adds only a subtle offset while the pointer stays near a node", () => {
	const offset = boundedHoverMagnet({ clientX: 100, clientY: 100 }, 110, 105);
	assert.ok(Math.abs(offset.x - 1.8) < 1e-12);
	assert.ok(Math.abs(offset.y - 0.9) < 1e-12);
});

test("bounds magnetic hover movement in screen pixels", () => {
	const offset = boundedHoverMagnet({ clientX: 100, clientY: 100 }, 600, 500);
	assert.ok(Math.hypot(offset.x, offset.y) <= HOVER_MAGNET_MAX_PX + Number.EPSILON);
});

test("returns to the node origin when the pointer leaves", () => {
	assert.deepEqual(boundedHoverMagnet({ clientX: 100, clientY: 100 }, 100, 100), { x: 0, y: 0 });
});
