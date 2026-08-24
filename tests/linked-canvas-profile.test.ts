import assert from "node:assert/strict";
import test from "node:test";
import {
	createLinkedCanvasProfile,
	createLinkedCanvasProfileForExistingCanvas,
	linkedCanvasProfilePath,
	linkedCanvasIncludesSource,
	manualCanvasRelations,
	manualMarkdownSeeds,
	parseLinkedCanvasProfile,
	pathsRemovedFromCanvas,
	removeManagedCanvasSelfCard,
	renamePathInLinkedCanvasProfile,
	serializeLinkedCanvasProfile,
} from "../src/domain/linked-canvas-profile";
import type { JsonCanvasDocument } from "../src/domain/json-canvas";

test("a linked canvas profile round-trips portable roots and safe defaults", () => {
	const profile = createLinkedCanvasProfile("maps/linked-canvas/Project.canvas", "Project.md");
	assert.equal(profile.depth, 1);
	assert.equal(profile.relationSync, "visual-only");
	assert.equal(profile.autoExpandDroppedMarkdown, true);
	assert.deepEqual(parseLinkedCanvasProfile(serializeLinkedCanvasProfile(profile)), profile);
	assert.equal(linkedCanvasProfilePath(profile.canvasPath), "maps/linked-canvas/Project.linked-canvas.json");
});

test("the primary entry point reuses a canvas containing the same source card", () => {
	const profile = createLinkedCanvasProfile("Board.canvas", "Root.md");
	profile.seedPaths = ["Manual.md"];
	profile.managed.filesByNodeId = { linked: "Linked.md" };
	assert.equal(linkedCanvasIncludesSource(profile, "Root.md"), true);
	assert.equal(linkedCanvasIncludesSource(profile, "Manual.md"), true);
	assert.equal(linkedCanvasIncludesSource(profile, "Linked.md"), true);
	assert.equal(linkedCanvasIncludesSource(profile, "Other.md"), false);
});

test("an existing Canvas adopts every Markdown card as a root without inventing a primary card", () => {
	const profile = createLinkedCanvasProfileForExistingCanvas(
		"Boards/Research.canvas",
		["Question.md", "Evidence.md", "Question.md"],
	);
	assert.deepEqual(profile?.rootPaths, ["Question.md", "Evidence.md"]);
	assert.equal(createLinkedCanvasProfileForExistingCanvas("Boards/Empty.canvas", []), undefined);
});

test("renaming a source or Canvas keeps portable profile identity and managed provenance", () => {
	const profile = createLinkedCanvasProfile("maps/linked-canvas/Old.canvas", "Old.md");
	profile.seedPaths = ["Reference.md"];
	profile.excludedPaths = ["Hidden.md"];
	profile.managed.filesByNodeId = { root: "Old.md" };
	const renamedSource = renamePathInLinkedCanvasProfile(profile, "Old.md", "New.md");
	assert.deepEqual(renamedSource.rootPaths, ["New.md"]);
	assert.equal(renamedSource.managed.filesByNodeId.root, "New.md");
	const renamedCanvas = renamePathInLinkedCanvasProfile(
		renamedSource,
		"maps/linked-canvas/Old.canvas",
		"maps/linked-canvas/New.canvas",
	);
	assert.equal(renamedCanvas.canvasPath, "maps/linked-canvas/New.canvas");
});

test("a malformed profile cannot widen an unknown canvas", () => {
	assert.equal(parseLinkedCanvasProfile("{}"), undefined);
	assert.equal(parseLinkedCanvasProfile('{"schemaVersion":1,"canvasPath":"Board.canvas","rootPaths":[]}'), undefined);
	assert.equal(parseLinkedCanvasProfile('{"schemaVersion":1,"canvasPath":"Board.md","rootPaths":["Root.md"]}'), undefined);
});

test("removing a managed card records an exclusion instead of recreating it", () => {
	const profile = createLinkedCanvasProfile("Board.canvas", "Root.md");
	profile.managed.filesByNodeId = { root: "Root.md", neighbour: "Neighbour.md" };
	const canvas: JsonCanvasDocument = {
		nodes: [{ id: "root", type: "file", file: "Root.md", x: 0, y: 0, width: 380, height: 240 }],
		edges: [],
	};
	assert.deepEqual(pathsRemovedFromCanvas(profile, canvas), ["Neighbour.md"]);
});

test("removes only a managed Canvas self-card left by the old backlink bug", () => {
	const profile = createLinkedCanvasProfile("Board.canvas", "Root.md");
	profile.managed.filesByNodeId = { self: "Board.canvas", user: "Manual.md" };
	const canvas: JsonCanvasDocument = {
		nodes: [
			{ id: "self", type: "file", file: "Board.canvas", x: 0, y: 0, width: 380, height: 240 },
			{ id: "user", type: "file", file: "Manual.md", x: 400, y: 0, width: 380, height: 240 },
		],
		edges: [{ id: "incident", fromNode: "self", toNode: "user" }],
	};
	const cleaned = removeManagedCanvasSelfCard(profile, canvas);
	assert.deepEqual(cleaned.nodes.map((node) => node.id), ["user"]);
	assert.deepEqual(cleaned.edges, []);
	assert.deepEqual(profile.managed.filesByNodeId, { user: "Manual.md" });
});

test("a manually dropped Markdown card becomes a seed while media stays a normal canvas card", () => {
	const profile = createLinkedCanvasProfile("Board.canvas", "Root.md");
	const canvas: JsonCanvasDocument = {
		nodes: [
			{ id: "root", type: "file", file: "Root.md", x: 0, y: 0, width: 380, height: 240 },
			{ id: "manual", type: "file", file: "Dropped.md", x: 400, y: 0, width: 380, height: 240 },
			{ id: "image", type: "file", file: "image.png", x: 800, y: 0, width: 400, height: 300 },
		],
		edges: [],
	};
	profile.managed.filesByNodeId = { root: "Root.md" };
	assert.deepEqual(manualMarkdownSeeds(profile, canvas), ["Dropped.md"]);
});

test("manually restoring an excluded Markdown card makes it a seed again", () => {
	const profile = createLinkedCanvasProfile("Board.canvas", "Root.md");
	profile.seedPaths = ["Restored.md"];
	profile.excludedPaths = ["Restored.md"];
	const canvas: JsonCanvasDocument = {
		nodes: [{ id: "restored", type: "file", file: "Restored.md", x: 0, y: 0, width: 380, height: 240 }],
		edges: [],
	};
	assert.deepEqual(manualMarkdownSeeds(profile, canvas), ["Restored.md"]);
});

test("only opt-in manual edges between Markdown cards become additive relations", () => {
	const profile = createLinkedCanvasProfile("Board.canvas", "Root.md");
	profile.relationSync = "frontmatter-additive";
	profile.managed.edgeIds = ["generated"];
	const canvas: JsonCanvasDocument = {
		nodes: [
			{ id: "a", type: "file", file: "A.md", x: 0, y: 0, width: 380, height: 240 },
			{ id: "b", type: "file", file: "B.md", x: 400, y: 0, width: 380, height: 240 },
			{ id: "pdf", type: "file", file: "Paper.pdf", x: 800, y: 0, width: 460, height: 560 },
		],
		edges: [
			{ id: "generated", fromNode: "a", toNode: "b" },
			{ id: "manual", fromNode: "b", toNode: "a", label: "supports" },
			{ id: "unknown", fromNode: "a", toNode: "b", label: "depends on" },
			{ id: "media", fromNode: "a", toNode: "pdf" },
		],
	};
	assert.deepEqual(manualCanvasRelations(profile, canvas), [{ fromPath: "B.md", toPath: "A.md", label: "supports" }]);
	profile.relationSync = "visual-only";
	assert.deepEqual(manualCanvasRelations(profile, canvas), []);
});
