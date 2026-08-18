import assert from "node:assert/strict";
import test from "node:test";
import { canvasWheelAction } from "../src/domain/canvas-wheel-action";

test("a wheel event over a source editor scrolls the editor", () => {
	assert.equal(canvasWheelAction({ isOverEditor: true, isOverSearch: false }), "scroll-editor");
});

test("a canvas wheel event zooms regardless of the previously focused control", () => {
	assert.equal(canvasWheelAction({ isOverEditor: false, isOverSearch: false }), "zoom-canvas");
});

test("a wheel event over the search panel keeps its native behavior", () => {
	assert.equal(canvasWheelAction({ isOverEditor: false, isOverSearch: true }), "ignore");
});
