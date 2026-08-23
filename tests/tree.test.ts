import assert from "node:assert/strict";
import test from "node:test";
import { buildContextGraph, graphStructureSignature, isDetachableGraphEdge } from "../src/graph/model";
import { buildContextTree } from "../src/tree";
import { ContextTreeLink, ContextTreeNode, ParsedTopic } from "../src/types";

function topic(path: string, title: string, parentPath?: string, links: ContextTreeLink[] = []): ParsedTopic {
	return { id: path, path, title, parentPath, summary: "summary", body: "body", links };
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

test("preserves every resolvable parent relation in the graph even when the tree breaks a cycle", () => {
	const roots = buildContextTree([
		topic("a", "A", "b"),
		topic("b", "B", "c"),
		topic("c", "C", "a"),
	]);
	const graph = buildContextGraph(roots);

	assert.equal(graph.nodes.length, 3);
	assert.deepEqual(
		graph.edges.map((edge) => edge.id).sort(),
		["a\u0000b", "a\u0000c", "b\u0000c"],
	);
	assert.ok(graph.edges.every((edge) => edge.types.includes("derived")));
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
		{ id: "pintos\u0000threads", nodeA: "pintos", nodeB: "threads", types: ["derived"], storedLinks: [] },
		{ id: "sleep\u0000threads", nodeA: "sleep", nodeB: "threads", types: ["derived"], storedLinks: [] },
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
	assert.deepEqual(graph.edges, [{ id: "child\u0000root", nodeA: "child", nodeB: "root", types: ["derived"], storedLinks: [] }]);
});

test("adds typed cross-topic connections without removing the parent hierarchy", () => {
	const roots = buildContextTree([
		topic("pintos", "PintOS"),
		topic("threads", "Threads", "pintos", [{ targetPath: "vm", type: "prerequisite" }]),
		topic("vm", "Virtual memory"),
	]);
	const graph = buildContextGraph(roots);

	assert.deepEqual(graph.edges, [
		{ id: "pintos\u0000threads", nodeA: "pintos", nodeB: "threads", types: ["derived"], storedLinks: [] },
		{
			id: "threads\u0000vm",
			nodeA: "threads",
			nodeB: "vm",
			types: ["prerequisite"],
			storedLinks: [{ sourcePath: "threads", targetPath: "vm", type: "prerequisite" }],
		},
	]);
});

test("merges the same relationship stored from either endpoint into one undirected edge", () => {
	const roots = buildContextTree([
		topic("a", "A", undefined, [{ targetPath: "b", type: "related" }]),
		topic("b", "B", undefined, [{ targetPath: "a", type: "related" }]),
	]);
	const graph = buildContextGraph(roots);

	assert.equal(graph.edges.length, 1);
	assert.deepEqual(graph.edges[0]?.types, ["related"]);
	assert.equal(graph.edges[0]?.storedLinks.length, 2);
});

test("does not expose an ambiguous visual line as a destructive gesture", () => {
	assert.equal(isDetachableGraphEdge({ types: ["related"], storedLinks: [{ sourcePath: "A.md", targetPath: "B.md", type: "related" }] }), true);
	assert.equal(isDetachableGraphEdge({
		types: ["related", "supports"],
		storedLinks: [
			{ sourcePath: "A.md", targetPath: "B.md", type: "related" },
			{ sourcePath: "A.md", targetPath: "B.md", type: "supports" },
		],
	}), false);
	assert.equal(isDetachableGraphEdge({ types: ["derived"], storedLinks: [] }), false);
});

test("projects ordinary Markdown references as non-destructive graph context", () => {
	const root: ContextTreeNode = {
		id: "root",
		path: "Root.md",
		title: "Root",
		summary: "",
		body: "[[Neighbour]]",
		links: [],
		referencePaths: ["Neighbour.md"],
		children: [],
	};
	const neighbour: ContextTreeNode = {
		id: "neighbour",
		path: "Neighbour.md",
		title: "Neighbour",
		summary: "",
		body: "",
		links: [],
		referencePaths: [],
		children: [],
	};

	const graph = buildContextGraph([root, neighbour]);
	assert.equal(graph.edges.length, 1);
	assert.deepEqual(graph.edges[0]?.types, ["derived"]);
	assert.deepEqual(graph.edges[0]?.storedLinks, []);
	assert.equal(isDetachableGraphEdge(graph.edges[0]!), false);
});

test("distinguishes content-only refreshes from graph structure changes", () => {
	const first = buildContextGraph(buildContextTree([
		topic("A.md", "A", undefined, [{ targetPath: "B.md", type: "related" }]),
		topic("B.md", "B"),
	]));
	const contentOnly = buildContextGraph(buildContextTree([
		{ ...topic("A.md", "Changed title", undefined, [{ targetPath: "B.md", type: "related" }]), body: "Changed body" },
		topic("B.md", "B"),
	]));
	const changedEdge = buildContextGraph(buildContextTree([
		topic("A.md", "A"),
		topic("B.md", "B"),
	]));

	assert.equal(graphStructureSignature(first), graphStructureSignature(contentOnly));
	assert.notEqual(graphStructureSignature(first), graphStructureSignature(changedEdge));
});
