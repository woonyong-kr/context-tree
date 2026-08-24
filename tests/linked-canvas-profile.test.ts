import assert from "node:assert/strict";
import test from "node:test";
import {
	createLinkedCanvasProfile,
	createLinkedCanvasProfileForExistingCanvas,
	enableLinkedCanvasExpansion,
	linkedCanvasProfilePath,
	linkedCanvasIncludesSource,
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
	assert.equal(profile.depth, 0);
	assert.equal(profile.autoExpandDroppedMarkdown, true);
	assert.deepEqual(parseLinkedCanvasProfile(serializeLinkedCanvasProfile(profile)), profile);
	assert.equal(linkedCanvasProfilePath(profile.canvasPath), "maps/linked-canvas/Project.linked-canvas.json");
});

test("legacy Canvas-to-Markdown sync state is retired instead of being re-enabled", () => {
	const legacy = JSON.stringify({
		...createLinkedCanvasProfile("maps/Board.canvas", "Root.md"),
		relationSync: "frontmatter-additive",
	});
	const parsed = parseLinkedCanvasProfile(legacy);
	assert.ok(parsed);
	assert.equal("relationSync" in parsed, false);
	assert.doesNotMatch(serializeLinkedCanvasProfile(parsed), /relationSync|frontmatter-additive/);
});

test("the primary entry point reuses only deliberate roots and seeds", () => {
	const profile = createLinkedCanvasProfile("Board.canvas", "Root.md");
	profile.seedPaths = ["Manual.md"];
	profile.managed.filesByNodeId = { linked: "Linked.md" };
	assert.equal(linkedCanvasIncludesSource(profile, "Root.md"), true);
	assert.equal(linkedCanvasIncludesSource(profile, "Manual.md"), true);
	assert.equal(linkedCanvasIncludesSource(profile, "Linked.md"), false);
	assert.equal(linkedCanvasIncludesSource(profile, "Other.md"), false);
});

test("an existing Canvas adopts every Markdown card as a root without inventing a primary card", () => {
	const profile = createLinkedCanvasProfileForExistingCanvas(
		"Boards/Research.canvas",
		["Question.md", "Evidence.md", "Question.md"],
	);
	assert.deepEqual(profile?.rootPaths, ["Question.md", "Evidence.md"]);
	assert.equal(profile?.depth, 1);
	assert.equal(createLinkedCanvasProfileForExistingCanvas("Boards/Empty.canvas", []), undefined);
});

test("zero-depth profiles remain valid while legacy profiles without a depth keep one-hop sync", () => {
	const zeroDepth = createLinkedCanvasProfile("Board.canvas", "Root.md");
	assert.equal(parseLinkedCanvasProfile(serializeLinkedCanvasProfile(zeroDepth))?.depth, 0);
	assert.equal(parseLinkedCanvasProfile(JSON.stringify({
		schemaVersion: 1,
		canvasPath: "Legacy.canvas",
		rootPaths: ["Root.md"],
	}))?.depth, 1);
});

test("link-aware expansion is an explicit one-time transition", () => {
	const profile = createLinkedCanvasProfile("Board.canvas", "Root.md");
	assert.equal(enableLinkedCanvasExpansion(profile), true);
	assert.equal(profile.depth, 1);
	assert.equal(enableLinkedCanvasExpansion(profile), false);
	assert.equal(profile.depth, 1);
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

test("a blank-board profile is valid but a malformed target cannot be adopted", () => {
	const blank = createLinkedCanvasProfile("Board.canvas");
	assert.deepEqual(blank.rootPaths, []);
	assert.deepEqual(parseLinkedCanvasProfile(serializeLinkedCanvasProfile(blank)), blank);
	assert.equal(parseLinkedCanvasProfile("{}"), undefined);
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
