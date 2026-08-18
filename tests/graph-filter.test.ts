import assert from "node:assert/strict";
import test from "node:test";
import { graphHoverNodeIds, graphSearchVisibility, isGraphEdgeVisible } from "../src/domain/graph-filter";
import { GraphEdge } from "../src/graph/model";
import { ContextTreeNode } from "../src/types";

function node(id: string, title: string, body = ""): ContextTreeNode {
	return { id, path: `${id}.md`, title, summary: "", body, links: [], children: [] };
}

const threadEdge: GraphEdge = { id: "pintos\u0000threads", nodeA: "pintos", nodeB: "threads", types: ["prerequisite"], storedLinks: [] };

test("search keeps matched cards and their direct context, not every unrelated card", () => {
	const visibility = graphSearchVisibility("인터럽트", [
		node("pintos", "PintOS"),
		node("threads", "스레드", "타이머 인터럽트와 선점"),
		node("kyro", "Kyro"),
	], [threadEdge]);

	assert.deepEqual([...visibility.matches], ["threads"]);
	assert.deepEqual([...visibility.context], ["pintos"]);
	assert.deepEqual([...visibility.visible].sort(), ["pintos", "threads"]);
});

test("relation filter hides an edge when none of its types are enabled", () => {
	assert.equal(isGraphEdgeVisible(threadEdge, new Set(["related"])), false);
	assert.equal(isGraphEdgeVisible(threadEdge, new Set(["prerequisite"])), true);
});

test("hover keeps only the visible one-hop neighbourhood active", () => {
	const kyroEdge: GraphEdge = { id: "kyro\u0000pintos", nodeA: "kyro", nodeB: "pintos", types: ["related"], storedLinks: [] };
	assert.deepEqual([...graphHoverNodeIds("pintos", [threadEdge, kyroEdge], new Set(["prerequisite"]))].sort(), ["pintos", "threads"]);
	assert.deepEqual([...graphHoverNodeIds("pintos", [threadEdge, kyroEdge], new Set(["related", "prerequisite"]))].sort(), ["kyro", "pintos", "threads"]);
});
