import assert from "node:assert/strict";
import test from "node:test";
import { connectionDropAction } from "../src/domain/connection-drop-action";

test("pointer cancellation never creates a relationship", () => {
	assert.equal(connectionDropAction({ cancelled: true, hasSource: true, hasTarget: true }), "cancel");
});

test("a completed card-to-card drop creates one relationship", () => {
	assert.equal(connectionDropAction({ cancelled: false, hasSource: true, hasTarget: true }), "connect");
	assert.equal(connectionDropAction({ cancelled: false, hasSource: true, hasTarget: false }), "cancel");
});
