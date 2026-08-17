import assert from "node:assert/strict";
import test from "node:test";
import { buildContextTree } from "../src/tree";
import { ParsedTopic } from "../src/types";

function topic(path: string, title: string, parentPath?: string): ParsedTopic {
	return { id: path, path, title, parentPath, summary: "summary", body: "body" };
}

test("builds a stable parent-child keyword tree", () => {
	const roots = buildContextTree([
		topic("threads", "Threads", "pintos"),
		topic("pintos", "PintOS"),
		topic("sleep", "Sleep list", "threads"),
		topic("vm", "Virtual memory", "pintos"),
	]);

	assert.deepEqual(roots.map((node) => node.title), ["PintOS"]);
	assert.deepEqual(roots[0]?.children.map((node) => node.title), ["Threads", "Virtual memory"]);
	assert.deepEqual(roots[0]?.children[0]?.children.map((node) => node.title), ["Sleep list"]);
});

test("keeps an unresolved parent as an independent root", () => {
	const roots = buildContextTree([
		topic("orphan", "Orphan", "missing"),
		topic("root", "Root"),
	]);

	assert.deepEqual(roots.map((node) => node.title), ["Orphan", "Root"]);
});
