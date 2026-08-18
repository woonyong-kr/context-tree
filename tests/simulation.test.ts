import assert from "node:assert/strict";
import test from "node:test";
import { CardSize, cardAnchorAtPoint, cardAnchorPoint, cardEdgeEndpoints, graphPointerDelta, graphZoomBounds, curvedEdgePath, initialGraphPosition, linkDistance } from "../src/graph/simulation";

test("keeps the focused card at the graph origin", () => {
	assert.deepEqual(initialGraphPosition(0, 4, true), { x: 0, y: 0 });
	const neighbour = initialGraphPosition(1, 4, false);
	assert.ok(Math.hypot(neighbour.x, neighbour.y) > 0);
});

test("creates a curved peer edge path from two positions", () => {
	assert.equal(curvedEdgePath({ x: 0, y: 0 }, { x: 100, y: 0 }), "M 0 0 Q 50 10 100 0");
});

test("projects a peer relationship to the natural perimeter point rather than a fixed cardinal port", () => {
	assert.deepEqual(
		cardEdgeEndpoints(
			{ x: 0, y: 0, size: { width: 200, height: 120 } },
			{ x: 500, y: 250, size: { width: 200, height: 120 } },
		),
		{
			first: { x: 100, y: 50 },
			second: { x: 400, y: 200 },
		},
	);
});

test("keeps a dragged connection on the exact perimeter point the user chose", () => {
	const anchor = cardAnchorAtPoint({ width: 200, height: 120 }, { x: 68, y: 3 });
	assert.deepEqual(anchor, { x: 0.34, y: 0 });
	assert.deepEqual(cardAnchorPoint({ x: 400, y: 300 }, { width: 200, height: 120 }, anchor), { x: 368, y: 240 });
});

test("moves a card by graph distance rather than screen distance at the current zoom", () => {
	assert.deepEqual(
		graphPointerDelta({ x: 120, y: 80 }, { x: 180, y: 20 }, 1.5),
		{ x: 40, y: -40 },
	);
});

test("lets a large graph zoom out far enough to reach its overview while keeping a practical upper bound", () => {
	const bounds = graphZoomBounds(0.02);
	assert.ok(bounds.min <= 0.02);
	assert.equal(bounds.max, 8);
});

test("applies the configured card gap when measuring a relationship", () => {
	const size: CardSize = { width: 200, height: 120 };
	const edge = {
		source: { size },
		target: { size },
	};
	// linkDistance only needs the resolved D3 source and target for this
	// calculation; the rest of SimLink is irrelevant to geometry.
	assert.equal(linkDistance(edge as Parameters<typeof linkDistance>[0], 80), 2 * Math.hypot(100, 60) + 80);
});
