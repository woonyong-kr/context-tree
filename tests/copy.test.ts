import assert from "node:assert/strict";
import test from "node:test";
import { COPY_EN } from "../src/ui/copy-en";
import { COPY_KO } from "../src/ui/copy-ko";

test("names one read-only current-note product in both languages", () => {
	assert.equal(COPY_KO.view.title, "Linked Graph");
	assert.equal(COPY_EN.view.title, "Linked Graph");
	assert.match(COPY_KO.view.openCommand, /현재 문서/);
	assert.match(COPY_EN.view.openCommand, /current note/i);
});

test("labels the outline and one-hop graph as views instead of editing", () => {
	assert.equal(COPY_KO.actions.showGraph, "그래프 보기");
	assert.equal(COPY_KO.actions.showOutline, "목차 보기");
	assert.match(COPY_EN.actions.showGraph, /Graph/);
	assert.doesNotMatch(JSON.stringify(COPY_KO), /Canvas|카드|편집|저장된 그래프/);
});
