import assert from "node:assert/strict";
import test from "node:test";
import { cardOpenEffects } from "../src/domain/card-open-action";

test("opening a card in place preserves its anchor without moving the camera", () => {
	assert.deepEqual(cardOpenEffects("open-in-place"), {
		movesCamera: false,
		cancelsPendingOverviewFit: true,
	});
});

test("explicit navigation moves the camera", () => {
	assert.deepEqual(cardOpenEffects("navigate-to-card"), {
		movesCamera: true,
		cancelsPendingOverviewFit: true,
	});
});
