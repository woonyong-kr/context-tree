import assert from "node:assert/strict";
import test from "node:test";
import { isCanvasControlTarget } from "../src/domain/canvas-pointer-target";

function pointerTarget(className?: string): Element {
	return {
		closest: (selector: string) => className && selector.split(", ").includes(className) ? {} : null,
	} as unknown as Element;
}

test("graph cards, toolbars, and search retain their pointer gesture", () => {
	for (const className of [
		".context-tree-card",
		".context-tree-graph-controls",
		".context-tree-search-panel",
	]) assert.equal(isCanvasControlTarget(pointerTarget(className)), true, className);
});

test("only unclaimed canvas space starts a pan", () => {
	assert.equal(isCanvasControlTarget(pointerTarget()), false);
	assert.equal(isCanvasControlTarget(null), false);
});
