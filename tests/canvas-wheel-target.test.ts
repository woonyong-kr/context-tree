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
	assert.equal(surface.isOverEditor, true);
	assert.equal(surface.isOverSearch, false);
	assert.ok(surface.editorScroller);
});

test("keeps background and search wheel ownership distinct", () => {
	assert.deepEqual(canvasWheelSurface(null), {
		isOverEditor: false,
		isOverSearch: false,
		editorScroller: undefined,
	});
	const search = canvasWheelSurface(pointerTarget(".context-tree-search-panel"));
	assert.equal(search.isOverEditor, false);
	assert.equal(search.isOverSearch, true);
});
