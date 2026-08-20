import assert from "node:assert/strict";
import test from "node:test";
import { canDisconnectAtDrop } from "../src/domain/disconnect-drop-action";

test("disconnect requires a deliberate drop on empty canvas", () => {
	assert.equal(canDisconnectAtDrop({ movedFarEnough: true, isInsideCanvas: true, isProtectedTarget: false }), true);
});

test("disconnect is cancelled outside the canvas or on protected graph UI", () => {
	assert.equal(canDisconnectAtDrop({ movedFarEnough: true, isInsideCanvas: false, isProtectedTarget: false }), false);
	assert.equal(canDisconnectAtDrop({ movedFarEnough: true, isInsideCanvas: true, isProtectedTarget: true }), false);
	assert.equal(canDisconnectAtDrop({ movedFarEnough: false, isInsideCanvas: true, isProtectedTarget: false }), false);
});
