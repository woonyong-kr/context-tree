import assert from "node:assert/strict";
import test from "node:test";
import { canvasWheelSurface } from "../src/domain/canvas-wheel-target";

function pointerTarget(...matchingSelectors: string[]): Element {
	return {
		closest: (selector: string) => matchingSelectors.includes(selector) ? {} : null,
	} as unknown as Element;
}

test("resolves a Source editor from the pointer target instead of stale focus", () => {
	const surface = canvasWheelSurface(pointerTarget(".context-tree-markdown-editor-scroll"));
	assert.equal(surface.isOverCardScroller, true);
	assert.equal(surface.isOverSearch, false);
	assert.ok(surface.cardScroller);
});

test("resolves a Reading card scrollport instead of zooming the canvas", () => {
	const surface = canvasWheelSurface(pointerTarget(".context-tree-detail-wrap"));
	assert.equal(surface.isOverCardScroller, true);
	assert.ok(surface.cardScroller);
});

test("keeps background and search wheel ownership distinct", () => {
	assert.deepEqual(canvasWheelSurface(null), {
		isOverCardScroller: false,
		isOverSearch: false,
		cardScroller: undefined,
	});
	const search = canvasWheelSurface(pointerTarget(".context-tree-search-panel"));
	assert.equal(search.isOverCardScroller, false);
	assert.equal(search.isOverSearch, true);
});
