import assert from "node:assert/strict";
import test from "node:test";
import { cardActionLayout } from "../src/domain/card-action-layout";

test("card actions use their native size at a readable graph zoom", () => {
	assert.deepEqual(cardActionLayout(1), {
		controlScale: 1,
		detailScale: 1,
		compactReserve: 74,
		compactExpandedReserve: 104,
		openReserve: 96,
		openExpandedReserve: 126,
		openPaddingTop: 32,
		editorToolbarSpacer: 62,
	});
});

test("overview zoom reserves the same inverse-scaled action footprint", () => {
	const layout = cardActionLayout(0.54);
	assert.equal(layout.controlScale, 0.72 / 0.54);
	assert.equal(layout.detailScale, 0.72 / 0.54);
	assert.equal(layout.openReserve, 96);
	assert.equal(layout.openExpandedReserve, 126);
	assert.equal(layout.openPaddingTop, 32);
	assert.equal(layout.editorToolbarSpacer, 62);
});

test("invalid or extreme zoom cannot create an unbounded action rail", () => {
	assert.equal(cardActionLayout(Number.NaN).controlScale, 1);
	assert.equal(cardActionLayout(0.01).controlScale, 2.4);
	// The compact action rail is capped, but an already-open document keeps its
	// readable screen scale even when the surrounding overview is much smaller.
	assert.equal(cardActionLayout(0.01).detailScale, 72);
});
