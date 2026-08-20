import assert from "node:assert/strict";
import test from "node:test";
import { canvasPointerAction } from "../src/domain/canvas-pointer-action";

test("a background drag remains a pan while an unpinned source editor is open", () => {
	assert.equal(canvasPointerAction({ hasUnpinnedEditor: true }), "pan-or-dismiss-editor-on-click");
});

test("ordinary canvas input pans without editor dismissal behavior", () => {
	assert.equal(canvasPointerAction({ hasUnpinnedEditor: false }), "pan-canvas");
});
