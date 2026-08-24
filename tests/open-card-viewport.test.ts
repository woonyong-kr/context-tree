import assert from "node:assert/strict";
import test from "node:test";
import { openCardViewportWidth } from "../src/domain/open-card-viewport";

test("a centred open card keeps its normal document width", () => {
	assert.equal(openCardViewportWidth({ viewportWidth: 1116, screenCenterX: 558, screenScale: 0.72 }), 680);
});

test("an edge card gives up only the width that would be clipped", () => {
	assert.equal(openCardViewportWidth({ viewportWidth: 1116, screenCenterX: 900, screenScale: 0.72 }), 555);
});

test("an extreme edge position retains a usable minimum without an unbounded value", () => {
	assert.equal(openCardViewportWidth({ viewportWidth: 1116, screenCenterX: 1116, screenScale: 0.72 }), 180);
	assert.equal(openCardViewportWidth({ viewportWidth: Number.NaN, screenCenterX: 0, screenScale: 1 }), 680);
});
