import assert from "node:assert/strict";
import test from "node:test";
import { boundedHoverOffset, GRAPH_MOTION, minimumSimulationAlpha } from "../src/graph-motion";

test("keeps direct manipulation immediate and surrounding force motion short", () => {
	assert.ok(GRAPH_MOTION.dragAlphaTarget < 0.1);
	assert.ok(GRAPH_MOTION.dropAlpha < 0.12);
	assert.ok(GRAPH_MOTION.alphaDecay >= 0.05);
	assert.ok(GRAPH_MOTION.velocityDecay >= 0.5);
});

test("reheats only as much as the current simulation needs", () => {
	assert.equal(minimumSimulationAlpha(0.12, GRAPH_MOTION.dropAlpha), 0.12);
	assert.equal(minimumSimulationAlpha(0.01, GRAPH_MOTION.dropAlpha), GRAPH_MOTION.dropAlpha);
});

test("keeps hover response local, bounded, and reversible", () => {
	const origin = { clientX: 100, clientY: 100 };
	assert.deepEqual(boundedHoverOffset(origin, 100, 100), { x: 0, y: 0 });
	const local = boundedHoverOffset(origin, 125, 100);
	assert.ok(local.x > 0);
	assert.ok(Math.hypot(local.x, local.y) <= GRAPH_MOTION.hoverMaximumPx);
	assert.deepEqual(boundedHoverOffset(origin, 140, 100), { x: 0, y: 0 });
});
