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

test("makes Linked Canvas primary while keeping Linked Map as a secondary exploration", () => {
	assert.equal(COPY_KO.view.openRibbon, "Linked Canvas 열기 또는 만들기");
	assert.equal(COPY_EN.view.openRibbon, "Open or create Linked Canvas");
	assert.equal(COPY_KO.view.openCommand, "고급: 현재 노트 주변을 Linked Map으로 탐색");
	assert.equal(COPY_EN.view.openCommand, "Advanced: explore around the current note in Linked Map");
	assert.equal(COPY_KO.view.createCanvasCommand, "현재 노트로 Linked Canvas 만들기");
	assert.equal(COPY_KO.view.enableCanvasCommand, "현재 Canvas에 연결 동기화 켜기");
	assert.equal(COPY_KO.actions.continueInCanvas, "Canvas에서 계속");
	assert.equal(COPY_EN.actions.continueInCanvas, "Continue in Canvas");
	assert.equal(COPY_KO.actions.expandNeighboursCount(3), "주변 노트 3개 펼치기");
	assert.equal(COPY_EN.actions.collapseNeighboursCount(2), "Collapse 2 neighbouring notes");
	assert.equal(COPY_EN.actions.collapseNeighboursCount(0), "Reset branch expansion (no notes hidden)");
	assert.equal(COPY_EN.labels.noVisibleLinks, "No linked notes are visible yet. Add a wikilink or backlink to grow this map.");
});

test("the in-app guide explains the choice and file ownership before acting", () => {
	assert.match(COPY_KO.help.canvasEyebrow, /공간 만들기/);
	assert.match(COPY_KO.help.mapEyebrow, /자료 올리기/);
	assert.match(COPY_KO.help.canvasDescription, /새 빈 보드/);
	assert.match(COPY_KO.help.mapDescription, /Markdown·PDF·PNG·JPG·GIF/);
	assert.match(COPY_KO.help.ownershipItems[0]!, /원본 Markdown·PDF·이미지/);
	assert.match(COPY_EN.help.canvasEyebrow, /Create a space/);
	assert.match(COPY_EN.help.mapEyebrow, /Place material/);
	assert.match(COPY_EN.help.ownershipItems[1]!, /standard \.canvas/);
	assert.equal(COPY_EN.view.helpCommand, "Show how to use Linked Canvas");
	assert.match(COPY_EN.modal.canvasLauncherBlank, /blank Canvas/);
});

test("explains that Canvas connection sync writes real note relations only when enabled", () => {
	assert.match(COPY_KO.notice.canvasRelationSyncEnabled, /실제 노트 관계/);
	assert.match(COPY_EN.notice.canvasRelationSyncDisabled, /visual only/);
});

test("ships complete Korean and English relation labels", () => {
	assert.equal(COPY_KO.relations.prerequisite, "선수 지식");
	assert.equal(COPY_EN.relations.prerequisite, "Prerequisite");
});
