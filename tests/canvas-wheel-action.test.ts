import assert from "node:assert/strict";
import test from "node:test";
import { canvasWheelAction } from "../src/domain/canvas-wheel-action";

test("a wheel event over a source editor scrolls the editor", () => {
	assert.equal(canvasWheelAction({ isOverEditor: true, isOverSearch: false, isEditorFocused: true }), "scroll-editor");
});

test("a focused source editor does not take wheel events from the canvas", () => {
	assert.equal(canvasWheelAction({ isOverEditor: false, isOverSearch: false, isEditorFocused: true }), "zoom-canvas");
});

test("a wheel event over the search panel keeps its native behavior", () => {
	assert.equal(canvasWheelAction({ isOverEditor: false, isOverSearch: true, isEditorFocused: false }), "ignore");
});
