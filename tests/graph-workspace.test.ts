import assert from "node:assert/strict";
import test from "node:test";
import {
	createGraphWorkspace,
	graphNoteFolder,
	graphScopeIncludesPath,
	graphWorkspaceId,
	includePathInScope,
	migrateGraphViewStates,
	migrateGraphWorkspaces,
} from "../src/domain/graph-workspace";

test("a curated graph includes only explicitly added Markdown notes", () => {
	const graph = createGraphWorkspace("인터뷰 준비", [], { kind: "curated" });
	graph.scope.includePaths.push("maps/interview/PintOS.md");

	assert.equal(graphScopeIncludesPath(graph.scope, "maps/interview/PintOS.md"), true);
	assert.equal(graphScopeIncludesPath(graph.scope, "maps/interview/Kyro.md"), false);
});

test("a graph without a folder scope creates its first note in its own predictable folder", () => {
	const graph = createGraphWorkspace("학습 그래프", [], { kind: "curated" });

	assert.equal(graph.id, "학습-그래프");
	assert.equal(graphNoteFolder(graph), "maps/context-graph/학습-그래프");
});

test("a folder-scoped graph creates its first note in the author's selected folder", () => {
	const graph = createGraphWorkspace("인터뷰", [], { kind: "folders", folders: ["maps/interview"] });

	assert.equal(graphNoteFolder(graph), "maps/interview");
});

test("a new folder-scoped graph receives a usable default folder when none is supplied", () => {
	const graph = createGraphWorkspace("프로젝트", [], { kind: "folders" });

	assert.deepEqual(graph.scope.folders, ["maps/context-graph/프로젝트"]);
	assert.equal(graphNoteFolder(graph), "maps/context-graph/프로젝트");
});

test("adding an out-of-folder note upgrades only that graph to hybrid scope", () => {
	const graph = createGraphWorkspace("인터뷰", [], { kind: "folders", folders: ["maps/interview"] });
	const next = includePathInScope(graph.scope, "portfolio/Kyro.md");

	assert.equal(next.kind, "hybrid");
	assert.equal(graphScopeIncludesPath(next, "maps/interview/PintOS.md"), true);
	assert.equal(graphScopeIncludesPath(next, "portfolio/Kyro.md"), true);
	assert.equal(graphScopeIncludesPath(next, "portfolio/MiniDB.md"), false);
});

test("a hybrid graph combines folder scope and manually included notes while honoring exclusions", () => {
	const graph = createGraphWorkspace("플랫폼 학습", [], {
		kind: "hybrid",
		folders: ["maps/learning"],
		includePaths: ["portfolio/Kyro.md"],
		excludePaths: ["maps/learning/archive/old.md"],
	});

	assert.equal(graphScopeIncludesPath(graph.scope, "maps/learning/PintOS.md"), true);
	assert.equal(graphScopeIncludesPath(graph.scope, "portfolio/Kyro.md"), true);
	assert.equal(graphScopeIncludesPath(graph.scope, "maps/learning/archive/old.md"), false);
	assert.equal(graphScopeIncludesPath(graph.scope, "portfolio/MiniDB.md"), false);
});

test("legacy single-folder settings migrate to one named workspace without widening its range", () => {
	const graphs = migrateGraphWorkspaces(undefined, "maps/interview", {
		linkStrength: 0.5,
		repulsion: 700,
		linkGap: 90,
	});

	assert.equal(graphs.length, 1);
	assert.equal(graphs[0]?.scope.kind, "folders");
	assert.equal(graphScopeIncludesPath(graphs[0]!.scope, "maps/interview/PintOS.md"), true);
	assert.equal(graphScopeIncludesPath(graphs[0]!.scope, "maps/learning/PintOS.md"), false);
});

test("stored workspaces receive unique, safe IDs before those IDs become vault folders", () => {
	const graphs = migrateGraphWorkspaces([
		{
			id: "interview",
			name: "인터뷰",
			scope: { kind: "curated" },
			physics: {},
		},
		{
			id: "interview",
			name: "복제본",
			scope: { kind: "folders" },
			physics: {},
		},
		{
			id: "../private",
			name: "손상된 ID",
			scope: { kind: "all" },
			physics: {},
		},
	], undefined, undefined);

	assert.deepEqual(graphs.map((graph) => graph.id), ["interview", "interview-2", "..-private"]);
	assert.equal(graphNoteFolder(graphs[2]!), "maps/context-graph/..-private");
});

test("graph IDs cannot become special object keys used by persisted view state", () => {
	assert.equal(graphWorkspaceId("__proto__"), "graph");
	assert.equal(graphWorkspaceId("constructor"), "graph");
});

test("corrupt persisted view state is ignored without widening it to another graph", () => {
	const states = migrateGraphViewStates({
		interview: {
			pan: { x: 120, y: -80 },
			zoom: 0.8,
			focusedNodeId: "maps/interview/PintOS.md",
			pinnedOpenNodeIds: ["maps/interview/PintOS.md", 12, "maps/interview/PintOS.md"],
			positions: {
				"maps/interview/PintOS.md": { x: 12, y: 34, pinned: true },
				broken: { x: "NaN", y: 2, pinned: true },
			},
		},
		unknown: {
			pan: { x: 1, y: 2 },
			zoom: 1,
			positions: {},
		},
		broken: { pan: { x: 1 }, zoom: "bad", positions: {} },
	}, ["interview", "broken"]);

	assert.deepEqual(states, {
		interview: {
			pan: { x: 120, y: -80 },
			zoom: 0.8,
			focusedNodeId: "maps/interview/PintOS.md",
			pinnedOpenNodeIds: ["maps/interview/PintOS.md"],
			positions: {
				"maps/interview/PintOS.md": { x: 12, y: 34, pinned: true },
			},
		},
	});
});

test("malformed persisted scope and physics fall back without breaking graph startup", () => {
	const [graph] = migrateGraphWorkspaces([{
		id: "damaged",
		name: "손상된 그래프",
		scope: { kind: "folders", folders: "maps/interview" },
		physics: { linkStrength: "fast", repulsion: Infinity, linkGap: null },
	}], undefined, undefined);

	assert.deepEqual(graph?.scope, {
		kind: "folders",
		folders: [],
		includePaths: [],
		excludePaths: [],
	});
	assert.deepEqual(graph?.physics, { linkStrength: 0.42, repulsion: 980, linkGap: 100 });
});

test("persisted physics stays within the same bounds exposed by settings", () => {
	const [graph] = migrateGraphWorkspaces([{
		id: "out-of-range",
		name: "범위 밖 물리",
		scope: { kind: "curated" },
		physics: { linkStrength: -1, repulsion: 99_999, linkGap: 0 },
	}], undefined, undefined);

	assert.deepEqual(graph?.physics, { linkStrength: 0.1, repulsion: 1800, linkGap: 20 });
});
