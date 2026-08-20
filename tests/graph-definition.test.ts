import assert from "node:assert/strict";
import test from "node:test";
import {
	availableGraphDefinitionPath,
	graphDefinitionFileName,
	graphDefinitionPath,
	parseGraphDefinition,
	serializeGraphDefinition,
} from "../src/domain/graph-definition";
import { createGraphWorkspace } from "../src/domain/graph-workspace";

test("a graph definition round-trips its portable scope and physics", () => {
	const graph = createGraphWorkspace("인터뷰 준비", [], {
		kind: "hybrid",
		folders: ["maps/interview"],
		includePaths: ["portfolio/Kyro.md"],
	});
	graph.physics.linkGap = 130;

	assert.deepEqual(parseGraphDefinition(serializeGraphDefinition(graph)), graph);
	assert.equal(graphDefinitionPath(graph), "maps/context-graph/인터뷰 준비.context-graph");
});

test("a definition file never uses a filesystem traversal name", () => {
	const graph = createGraphWorkspace("..", [], { kind: "curated" });

	assert.equal(graph.id, "graph");
	assert.equal(graphDefinitionFileName({ id: graph.id, name: ".." }), "graph.context-graph");
	assert.equal(graphDefinitionFileName({ id: "../private", name: "..." }), "..-private.context-graph");
});

test("same display names receive separate graph definition files", () => {
	const first = createGraphWorkspace("인터뷰 준비", [], { kind: "curated" });
	const second = createGraphWorkspace("인터뷰 준비", [first.id], { kind: "curated" });
	const firstPath = graphDefinitionPath(first);

	assert.equal(
		availableGraphDefinitionPath(second, [firstPath]),
		"maps/context-graph/인터뷰 준비 2.context-graph",
	);
});

test("a malformed graph definition is ignored instead of widening scope", () => {
	assert.equal(parseGraphDefinition('{"schemaVersion":1,"graph":{"id":"unsafe"}}'), undefined);
	assert.equal(parseGraphDefinition("not JSON"), undefined);
});
