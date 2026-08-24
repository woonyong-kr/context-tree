import assert from "node:assert/strict";
import test from "node:test";
import { graphNodeRole, parseGraphNodeRole } from "../src/domain/graph-node-role";
import type { ContextTreeNode } from "../src/types";

function node(overrides: Partial<ContextTreeNode> = {}): ContextTreeNode {
	return {
		id: "note",
		path: "Note.md",
		title: "Design notes",
		summary: "",
		body: "",
		links: [],
		children: [],
		...overrides,
	};
}

test("root ownership overrides every secondary visual role", () => {
	assert.equal(graphNodeRole(node({ path: "Root.md", visualRole: "question" }), "Root.md"), "root");
});

test("uses an authored entity or question role without mutating Markdown", () => {
	assert.equal(parseGraphNodeRole("entity"), "entity");
	assert.equal(parseGraphNodeRole("question"), "question");
	assert.equal(parseGraphNodeRole("ROOT"), undefined);
	assert.equal(graphNodeRole(node({ visualRole: "entity" })), "entity");
});

test("recognises a plainly authored question title and otherwise stays neutral", () => {
	assert.equal(graphNodeRole(node({ title: "What evidence changed?" })), "question");
	assert.equal(graphNodeRole(node({ title: "무엇이 달라졌나요？" })), "question");
	assert.equal(graphNodeRole(node()), "topic");
});
