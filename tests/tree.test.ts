import assert from "node:assert/strict";
import test from "node:test";
import { buildContextGraph } from "../src/radial-layout";
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

test("keeps a self-referencing topic visible as a root", () => {
	const roots = buildContextTree([topic("threads", "Threads", "threads")]);

	assert.deepEqual(roots.map((node) => node.title), ["Threads"]);
	assert.deepEqual(roots[0]?.children, []);
});

test("breaks a parent cycle without dropping either topic", () => {
	const roots = buildContextTree([
		topic("b", "B", "a"),
		topic("a", "A", "b"),
	]);

	assert.deepEqual(roots.map((node) => node.title), ["B"]);
	assert.deepEqual(roots[0]?.children.map((node) => node.title), ["A"]);
});

test("keeps every keyword and relation when building the graph", () => {
	const roots = buildContextTree([
		topic("threads", "Threads", "pintos"),
		topic("pintos", "PintOS"),
		topic("sleep", "Sleep list", "threads"),
	]);
	const graph = buildContextGraph(roots);

	assert.deepEqual(graph.nodes.map((item) => item.title).sort(), ["PintOS", "Sleep list", "Threads"]);
	assert.deepEqual(graph.edges, [
		{ from: "pintos", to: "threads" },
		{ from: "threads", to: "sleep" },
	]);
});

test("keeps disconnected roots visible as graph vertices", () => {
	const roots = buildContextTree([
		topic("child", "Child", "root"),
		topic("root", "Root"),
		topic("orphan", "Orphan"),
	]);
	const graph = buildContextGraph(roots);

	assert.deepEqual(graph.nodes.map((node) => node.id).sort(), ["child", "orphan", "root"]);
	assert.deepEqual(graph.edges, [{ from: "root", to: "child" }]);
});
