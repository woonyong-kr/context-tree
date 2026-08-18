import assert from "node:assert/strict";
import test from "node:test";
import {
	createGraphWorkspace,
	graphNoteFolder,
	graphScopeIncludesPath,
	includePathInScope,
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
