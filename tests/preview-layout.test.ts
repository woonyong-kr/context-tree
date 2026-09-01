import assert from "node:assert/strict";
import test from "node:test";
import { previewPlacement, previewRingSize } from "../src/preview-layout";

test("keeps narrow preview rings compact", () => {
	assert.equal(previewRingSize(420), 2);
	assert.equal(previewRingSize(421), 8);
});

test("places later preview nodes on the next ring", () => {
	const first = previewPlacement(0, 9, 800, 0, 100, 40);
	const ninth = previewPlacement(8, 9, 800, 0, 100, 40);
	assert.equal(first.distance, 100);
	assert.equal(ninth.distance, 140);
	assert.ok(Math.abs(Math.hypot(first.offsetX, first.offsetY) - first.distance) < 0.000_001);
	assert.ok(Math.abs(Math.hypot(ninth.offsetX, ninth.offsetY) - ninth.distance) < 0.000_001);
});
