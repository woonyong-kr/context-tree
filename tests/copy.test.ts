import assert from "node:assert/strict";
import test from "node:test";
import { graphPhysicsSettingName } from "../src/ui/copy";

test("searchable physics settings retain the graph that each control changes", () => {
	assert.equal(graphPhysicsSettingName("인터뷰", "연결 강도"), "인터뷰 · 연결 강도");
});
