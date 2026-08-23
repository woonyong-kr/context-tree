import assert from "node:assert/strict";
import test from "node:test";
import { graphPhysicsSettingName } from "../src/ui/copy";
import { COPY_EN } from "../src/ui/copy-en";
import { COPY_KO } from "../src/ui/copy-ko";

test("searchable physics settings retain the graph that each control changes", () => {
	assert.equal(graphPhysicsSettingName("인터뷰", "연결 강도"), "인터뷰 · 연결 강도");
});

test("describes the native source destination instead of an ambiguous new tab", () => {
	assert.equal(COPY_KO.actions.openSourceBesideGraph, "원본을 오른쪽 편집기로 열기");
	assert.equal(COPY_EN.actions.openSourceBesideGraph, "Open source in the right editor");
});

test("describes the reading-map entry point and neighbourhood size before acting", () => {
	assert.equal(COPY_KO.view.openCommand, "연결된 노트 읽기 지도 열기");
	assert.equal(COPY_EN.view.openCommand, "Open linked-note reading map");
	assert.equal(COPY_KO.actions.expandNeighboursCount(3), "주변 노트 3개 펼치기");
	assert.equal(COPY_EN.actions.collapseNeighboursCount(2), "Collapse 2 neighbouring notes");
	assert.equal(COPY_EN.actions.collapseNeighboursCount(0), "Reset branch expansion (no notes hidden)");
	assert.equal(COPY_EN.labels.noVisibleLinks, "No linked notes are visible yet. Add a wikilink or backlink to grow this map.");
});

test("ships complete Korean and English relation labels", () => {
	assert.equal(COPY_KO.relations.prerequisite, "선수 지식");
	assert.equal(COPY_EN.relations.prerequisite, "Prerequisite");
});
