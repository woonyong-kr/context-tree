import assert from "node:assert/strict";
import test from "node:test";
import { graphLayoutMetrics } from "../src/graph-layout";

test("uses more of a large graph panel without shrinking compact sidebars", () => {
	const compact = graphLayoutMetrics(400, 620, 8);
	const large = graphLayoutMetrics(722, 914, 8);

	assert.equal(compact.directDistance, 158);
	assert.ok(large.directDistance >= 200);
	assert.ok(large.directDistance > compact.directDistance);
	assert.ok(large.previewDistance > compact.previewDistance);
});

test("adds bounded spacing for dense one-hop graphs", () => {
	const sparse = graphLayoutMetrics(722, 914, 8);
	const dense = graphLayoutMetrics(722, 914, 40);

	assert.ok(dense.directDistance > sparse.directDistance);
	assert.ok(dense.directDistance <= 253);
	assert.ok(dense.chargeDistance >= dense.directDistance + dense.previewDistance);
});
