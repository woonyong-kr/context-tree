import assert from "node:assert/strict";
import test from "node:test";
import { shouldFitInitialOverview } from "../src/domain/initial-viewport";

test("preserves a saved camera when reopening a graph", () => {
	assert.equal(shouldFitInitialOverview(false, true), false);
});

test("fits a graph only when it has no saved camera", () => {
	assert.equal(shouldFitInitialOverview(false, false), true);
});

test("preserves the active camera during refresh", () => {
	assert.equal(shouldFitInitialOverview(true, false), false);
});
