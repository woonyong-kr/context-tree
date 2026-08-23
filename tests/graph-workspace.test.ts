import assert from "node:assert/strict";
import test from "node:test";
import {
	createGraphWorkspace,
	createCurrentNoteGraph,
	collapsePathInScope,
	currentNoteGraphId,
	currentNoteGraphPath,
	graphNoteFolder,
	graphScopeIncludesPath,
	graphWorkspaceId,
	includePathInScope,
	excludePathFromScope,
	migrateGraphViewStates,
	migrateGraphWorkspaces,
	rootedGraphPaths,
	rootedNeighbourhoodAction,
	renamePathInScope,
	renamePathInViewState,
} from "../src/domain/graph-workspace";

test("offers only meaningful reversible neighbourhood actions", () => {
	const graph = createCurrentNoteGraph("notes/root.md", "Root");
	const links = {
		"notes/root.md": ["notes/branch.md", "notes/leaf.md"],
		"notes/branch.md": ["notes/deeper.md"],
		"notes/leaf.md": [],
	};

	assert.equal(rootedNeighbourhoodAction(graph.scope, "notes/root.md", links), "none");
	assert.equal(rootedNeighbourhoodAction(graph.scope, "notes/leaf.md", links), "none");
	assert.equal(rootedNeighbourhoodAction(graph.scope, "notes/branch.md", links), "expand");
	graph.scope.expandedPaths.push("notes/branch.md");
	assert.equal(rootedNeighbourhoodAction(graph.scope, "notes/branch.md", links), "collapse");
	const collapsed = collapsePathInScope(graph.scope, "notes/branch.md");
	assert.equal(collapsed.kind, "rooted");
	if (collapsed.kind === "rooted") assert.deepEqual(collapsed.expandedPaths, []);
});

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

test("a current-note graph creates a new note beside its root without leaking the transient id into a path", () => {
	const nested = createCurrentNoteGraph("projects/interview/Root.md", "Root");
	const atRoot = createCurrentNoteGraph("Root.md", "Root");

	assert.equal(graphNoteFolder(nested), "projects/interview");
	assert.equal(graphNoteFolder(atRoot), "");
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

test("removing a card changes only this graph scope", () => {
	const graph = createGraphWorkspace("Research", [], {
		kind: "folders",
		folders: ["research"],
	});
	const next = excludePathFromScope(graph.scope, "research/private.md");

	assert.equal(graphScopeIncludesPath(next, "research/private.md"), false);
	assert.equal(graphScopeIncludesPath(graph.scope, "research/private.md"), true);
	assert.deepEqual(next.excludePaths, ["research/private.md"]);
});

test("a current-note graph includes the root and one-hop links in both directions", () => {
	assert.deepEqual(rootedGraphPaths(
		"notes/root.md",
		["notes/expanded.md"],
		{
			"notes/root.md": ["notes/outgoing.md"],
			"notes/incoming.md": ["notes/root.md"],
			"notes/expanded.md": ["notes/second-hop.md"],
		},
	), [
		"notes/expanded.md",
		"notes/incoming.md",
		"notes/outgoing.md",
		"notes/root.md",
		"notes/second-hop.md",
	]);
});

test("a current-note graph is transient, rooted, and requires no opt-in metadata", () => {
	const graph = createCurrentNoteGraph("notes/Root.md", "Root");

	assert.equal(graph.id, "current-note:notes/Root.md");
	assert.equal(graph.name, "Root");
	assert.deepEqual(graph.scope, {
		kind: "rooted",
		rootPath: "notes/Root.md",
		expandedPaths: [],
		folders: [],
		includePaths: [],
		excludePaths: [],
	});
	assert.equal(graphScopeIncludesPath(graph.scope, "notes/Root.md"), true);
	assert.equal(graphScopeIncludesPath(graph.scope, "notes/Other.md"), false);
});

test("a current-note graph id round-trips its root path for session restore", () => {
	assert.equal(currentNoteGraphId("notes/Root.md"), "current-note:notes/Root.md");
	assert.equal(currentNoteGraphPath("current-note:notes/Root.md"), "notes/Root.md");
	assert.equal(currentNoteGraphPath("saved-graph"), undefined);
});

test("adding a note to a rooted graph expands its one-hop neighbourhood", () => {
	const graph = createCurrentNoteGraph("notes/Root.md", "Root");
	const next = includePathInScope(graph.scope, "notes/Other.md");

	assert.equal(next.kind, "rooted");
	if (next.kind !== "rooted") throw new Error("expected rooted scope");
	assert.deepEqual(next.expandedPaths, ["notes/Other.md"]);
	assert.equal(graphScopeIncludesPath(next, "notes/Other.md"), true);
});

test("removing a derived neighbour also removes it from rooted path expansion", () => {
	const graph = createCurrentNoteGraph("notes/Root.md", "Root");
	const removed = excludePathFromScope(graph.scope, "notes/Other.md");
	assert.equal(removed.kind, "rooted");
	if (removed.kind !== "rooted") throw new Error("expected rooted scope");
	assert.deepEqual(rootedGraphPaths(
		removed.rootPath,
		removed.expandedPaths,
		{ "notes/Root.md": ["notes/Other.md"] },
		removed.excludePaths,
	), ["notes/Root.md"]);
});

test("a rooted graph cannot exclude its own root", () => {
	const graph = createCurrentNoteGraph("notes/Root.md", "Root");
	assert.equal(excludePathFromScope(graph.scope, "notes/Root.md"), graph.scope);
});

test("expanding a previously removed rooted note clears its exclusion", () => {
	const graph = createCurrentNoteGraph("notes/Root.md", "Root");
	const expanded = includePathInScope(graph.scope, "notes/Other.md");
	const removed = excludePathFromScope(expanded, "notes/Other.md");
	assert.equal(removed.kind, "rooted");
	if (removed.kind !== "rooted") throw new Error("expected rooted scope");
	assert.deepEqual(removed.expandedPaths, []);
	const restored = includePathInScope(removed, "notes/Other.md");
	assert.equal(restored.kind, "rooted");
	if (restored.kind !== "rooted") throw new Error("expected rooted scope");
	assert.deepEqual(restored.expandedPaths, ["notes/Other.md"]);
	assert.deepEqual(restored.excludePaths, []);
});

test("renaming a Markdown note preserves rooted scope and deliberate card placement", () => {
	const graph = createCurrentNoteGraph("notes/Root.md", "Root");
	graph.scope.expandedPaths.push("notes/Other.md");
	const scope = renamePathInScope(graph.scope, "notes/Root.md", "notes/Renamed.md");
	const view = renamePathInViewState({
		pan: { x: 1, y: 2 },
		zoom: 0.8,
		focusedNodeId: "notes/Root.md::notes/Root.md",
		pinnedOpenNodeIds: ["notes/Root.md::notes/Root.md"],
		positions: { "notes/Root.md::notes/Root.md": { x: 12, y: 34, pinned: true } },
	}, "notes/Root.md", "notes/Renamed.md");

	assert.equal(scope.kind, "rooted");
	if (scope.kind !== "rooted") throw new Error("expected rooted scope");
	assert.equal(scope.rootPath, "notes/Renamed.md");
	assert.equal(view.focusedNodeId, "notes/Renamed.md::notes/Renamed.md");
	assert.deepEqual(view.pinnedOpenNodeIds, ["notes/Renamed.md::notes/Renamed.md"]);
	assert.deepEqual(view.positions["notes/Renamed.md::notes/Renamed.md"], { x: 12, y: 34, pinned: true });
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
