import assert from "node:assert/strict";
import test from "node:test";
import { graphPhysicsSettingName } from "../src/ui/copy";
import { COPY_EN } from "../src/ui/copy-en";
import { COPY_KO } from "../src/ui/copy-ko";

test("searchable physics settings retain the graph that each control changes", () => {
	assert.equal(graphPhysicsSettingName("인터뷰", "연결 강도"), "인터뷰 · 연결 강도");
});

test("describes the native source destination instead of an ambiguous new tab", () => {
	assert.equal(COPY_KO.actions.openSourceBesideGraph, "원본을 오른쪽에서 열기");
	assert.equal(COPY_EN.actions.openSourceBesideGraph, "Open source on the right");
});

test("ships complete Korean and English relation labels", () => {
	assert.equal(COPY_KO.relations.prerequisite, "선수 지식");
	assert.equal(COPY_EN.relations.prerequisite, "Prerequisite");
});
