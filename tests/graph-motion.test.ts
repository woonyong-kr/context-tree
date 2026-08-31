import assert from "node:assert/strict";
import test from "node:test";
import { GRAPH_MOTION, minimumSimulationAlpha } from "../src/graph-motion";

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
