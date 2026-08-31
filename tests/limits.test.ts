import assert from "node:assert/strict";
import test from "node:test";
import {
	MAX_DIRECT_GRAPH_NODES,
	MAX_PREVIEW_GRAPH_NODES,
	boundedItems,
	previewGraphNodeLimit,
} from "../src/limits";

test("keeps graph and preview DOM bounded for very large notes", () => {
	const thousand = Array.from({ length: 1_000 }, (_, index) => index);
	const direct = boundedItems(thousand, MAX_DIRECT_GRAPH_NODES);
	const preview = boundedItems(thousand, MAX_PREVIEW_GRAPH_NODES);
	assert.equal(direct.items.length, 120);
	assert.equal(direct.omitted, 880);
	assert.equal(preview.items.length, 48);
	assert.equal(preview.omitted, 952);
});

test("does not report omissions below the visual limit", () => {
	assert.deepEqual(boundedItems([1, 2, 3], MAX_DIRECT_GRAPH_NODES), {
		items: [1, 2, 3],
		omitted: 0,
		total: 3,
	});
});

test("keeps hover previews readable at common sidebar widths", () => {
	assert.equal(previewGraphNodeLimit(302), 8);
	assert.equal(previewGraphNodeLimit(600), 16);
	assert.equal(previewGraphNodeLimit(900), MAX_PREVIEW_GRAPH_NODES);
});
