import assert from "node:assert/strict";
import test from "node:test";
import { canvasWheelAction, canvasWheelZoomPoint } from "../src/domain/canvas-wheel-action";

test("a wheel event over a source editor scrolls the editor", () => {
	assert.equal(canvasWheelAction({ isOverCardScroller: true, isOverSearch: false }), "scroll-card");
});

test("a canvas wheel event zooms regardless of the previously focused control", () => {
	assert.equal(canvasWheelAction({ isOverCardScroller: false, isOverSearch: false }), "zoom-canvas");
});

test("wheel zoom keeps the viewport center fixed instead of following the pointer", () => {
	assert.deepEqual(
		canvasWheelZoomPoint(
			{ left: 240, top: 80, width: 800, height: 600 },
			{ x: 1010, y: 640 },
		),
		{ x: 640, y: 380 },
	);
});

test("a wheel event over the search panel keeps its native behavior", () => {
	assert.equal(canvasWheelAction({ isOverCardScroller: false, isOverSearch: true }), "ignore");
});
