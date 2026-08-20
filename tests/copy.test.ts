import assert from "node:assert/strict";
import test from "node:test";
import { COPY, graphPhysicsSettingName } from "../src/ui/copy";

test("searchable physics settings retain the graph that each control changes", () => {
	assert.equal(graphPhysicsSettingName("인터뷰", "연결 강도"), "인터뷰 · 연결 강도");
});

test("describes the native source destination instead of an ambiguous new tab", () => {
	assert.equal(COPY.actions.openSourceBesideGraph, "원본을 오른쪽에서 열기");
});
