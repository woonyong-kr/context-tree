import assert from "node:assert/strict";
import test from "node:test";
import { settledReadingCardHeight } from "../src/domain/reading-card-layout";

test("uses the fully rendered detail height instead of an in-progress expansion height", () => {
	assert.equal(settledReadingCardHeight({ cardHeight: 186, detailHeight: 36, detailContentHeight: 540 }), 690);
});

test("does not claim a stable reading footprint before Markdown rendering completes", () => {
	assert.equal(settledReadingCardHeight({ cardHeight: 186, detailHeight: 36, detailContentHeight: 540, isDetailReady: false }), undefined);
});
