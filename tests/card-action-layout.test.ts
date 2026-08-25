import assert from "node:assert/strict";
import test from "node:test";
import { cardActionLayout, collapsedCardWidth } from "../src/domain/card-action-layout";

test("card actions use their native size at a readable graph zoom", () => {
	assert.deepEqual(cardActionLayout(1), {
		controlScale: 1,
		detailScale: 1,
	});
});

test("overview zoom reserves the same inverse-scaled action footprint", () => {
	const layout = cardActionLayout(0.54);
	assert.equal(layout.controlScale, 0.72 / 0.54);
	assert.equal(layout.detailScale, 0.72 / 0.54);
});

test("invalid or extreme zoom cannot create an unbounded action rail", () => {
	assert.equal(cardActionLayout(Number.NaN).controlScale, 1);
	assert.equal(cardActionLayout(0.01).controlScale, 2.4);
	// The compact action rail is capped, but an already-open document keeps its
	// readable screen scale even when the surrounding overview is much smaller.
	assert.equal(cardActionLayout(0.01).detailScale, 72);
});

test("collapsed card width is derived entirely from the CSS metric contract", () => {
	const metrics = {
		baseWidth: 288,
		maximumWidth: 500,
		minimumWidth: 160,
		paneGap: 32,
		paddingInline: 18,
		compactActionReserve: 74,
		compactExpandedActionReserve: 112,
	};
	assert.deepEqual(collapsedCardWidth(130, 900, false, metrics), { width: 288, wraps: false });
	assert.deepEqual(collapsedCardWidth(420, 400, true, metrics), { width: 368, wraps: true });
});
