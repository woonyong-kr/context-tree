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

test("describes card retention instead of implying a position lock", () => {
	assert.equal(COPY_KO.actions.pinCard, "다른 카드를 열어도 이 카드 유지");
	assert.equal(COPY_EN.actions.pinCard, "Keep this card open while exploring");
});

test("makes current-note links primary while keeping Canvas explicitly advanced", () => {
	assert.equal(COPY_KO.view.openRibbon, "현재 노트 연결 보기");
	assert.equal(COPY_EN.view.openRibbon, "View current note connections");
	assert.equal(COPY_KO.view.openCommand, "현재 노트 연결 보기");
	assert.equal(COPY_EN.view.openCommand, "View current note connections");
	assert.match(COPY_KO.view.openCanvasCommand, /^고급:/);
	assert.match(COPY_EN.view.openCanvasCommand, /^Advanced:/);
	assert.match(COPY_KO.view.createCanvasCommand, /^고급:/);
	assert.match(COPY_KO.view.enableCanvasCommand, /^고급:/);
	assert.equal(COPY_KO.actions.continueInCanvas, "Canvas에서 계속");
	assert.equal(COPY_EN.actions.continueInCanvas, "Continue in Canvas");
	assert.equal(COPY_KO.actions.expandNeighboursCount(3), "주변 노트 3개 펼치기");
	assert.equal(COPY_EN.actions.collapseNeighboursCount(2), "Collapse 2 neighbouring notes");
	assert.equal(COPY_EN.actions.collapseNeighboursCount(0), "Reset branch expansion (no notes hidden)");
	assert.equal(COPY_EN.labels.noVisibleLinks, "No linked notes are visible yet. Add a wikilink or backlink to grow this map.");
});

test("the in-app guide explains the choice and file ownership before acting", () => {
	assert.match(COPY_KO.help.canvasEyebrow, /노트에서 이동/);
	assert.match(COPY_KO.help.mapEyebrow, /연결을 한눈에 보기/);
	assert.match(COPY_KO.help.canvasDescription, /파란 링크/);
	assert.match(COPY_KO.help.mapDescription, /wikilink·embed·backlink/);
	assert.match(COPY_KO.help.ownershipItems[0]!, /유일한 정본/);
	assert.match(COPY_EN.help.canvasEyebrow, /Navigate in notes/);
	assert.match(COPY_EN.help.mapEyebrow, /at a glance/);
	assert.match(COPY_EN.help.ownershipItems[1]!, /without storing separate knowledge/);
	assert.equal(COPY_EN.view.helpCommand, "Show how to explore note connections");
	assert.match(COPY_EN.modal.canvasLauncherBlank, /blank Canvas/);
	assert.equal(
		COPY_KO.modal.canvasLauncherExisting("home Canvas", "maps/linked-canvas/home Canvas.canvas"),
		"기존 Canvas — home Canvas · maps/linked-canvas/home Canvas.canvas",
	);
});

test("explains that Canvas owns spatial connections without mutating Markdown", () => {
	assert.match(COPY_KO.help.ownershipItems[2]!, /Markdown을 변경하지 않습니다/);
	assert.match(COPY_EN.help.ownershipItems[2]!, /never changes Markdown/);
});

test("ships complete Korean and English relation labels", () => {
	assert.equal(COPY_KO.relations.prerequisite, "선수 지식");
	assert.equal(COPY_EN.relations.prerequisite, "Prerequisite");
});
