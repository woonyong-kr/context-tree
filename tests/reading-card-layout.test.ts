import assert from "node:assert/strict";
import test from "node:test";
import { readingCardMaximumHeight, settledReadingCardHeight } from "../src/domain/reading-card-layout";

test("uses the fully rendered detail height instead of an in-progress expansion height", () => {
	assert.equal(settledReadingCardHeight({ cardHeight: 186, detailHeight: 36, detailContentHeight: 540 }), 690);
});

test("does not claim a stable reading footprint before Markdown rendering completes", () => {
	assert.equal(settledReadingCardHeight({ cardHeight: 186, detailHeight: 36, detailContentHeight: 540, isDetailReady: false }), undefined);
});

test("bounds a long Reading card to the available graph pane", () => {
	assert.equal(settledReadingCardHeight({
		cardHeight: 560,
		detailHeight: 410,
		detailContentHeight: 1600,
		maximumHeight: 620,
	}), 620);
});

test("keeps a compact usable card bound in a short split pane", () => {
	assert.equal(readingCardMaximumHeight(420), 348);
	assert.equal(readingCardMaximumHeight(200), 180);
	assert.equal(readingCardMaximumHeight(0), undefined);
});
