import assert from "node:assert/strict";
import test from "node:test";
import { buildLinkedCanvasProjection, linkedCanvasVaultLinks } from "../src/domain/linked-canvas-projection";
import { createLinkedCanvasProfile } from "../src/domain/linked-canvas-profile";

const paths = new Set(["Root.md", "Outgoing.md", "Backlink.md", "Second.md", "image.png", "Orphan.md"]);
const links = {
	"Root.md": ["Outgoing.md", "image.png"],
	"Backlink.md": ["Root.md"],
	"Outgoing.md": ["Second.md"],
	"Orphan.md": [],
};

test("a new whiteboard contains only the card the user chose", () => {
	const profile = createLinkedCanvasProfile("Board.canvas", "Root.md");
	const projection = buildLinkedCanvasProjection(profile, paths, links);
	assert.deepEqual(projection.filePaths, ["Root.md"]);
	assert.deepEqual(projection.relations, []);
});

test("explicit link-aware sync projects outgoing links, backlinks and media at one hop", () => {
	const profile = createLinkedCanvasProfile("Board.canvas", "Root.md");
	profile.depth = 1;
	const projection = buildLinkedCanvasProjection(profile, paths, links);
	assert.deepEqual(projection.filePaths, ["Root.md", "Backlink.md", "image.png", "Outgoing.md"]);
	assert.deepEqual(projection.relations, [
		{ fromPath: "Root.md", toPath: "image.png" },
		{ fromPath: "Root.md", toPath: "Outgoing.md" },
		{ fromPath: "Backlink.md", toPath: "Root.md" },
	]);
});

test("manually chosen cards keep their real relation without pulling in their neighbours", () => {
	const profile = createLinkedCanvasProfile("Board.canvas", "Root.md");
	profile.seedPaths = ["Outgoing.md"];
	const projection = buildLinkedCanvasProjection(profile, paths, links);
	assert.deepEqual(projection.filePaths, ["Root.md", "Outgoing.md"]);
	assert.deepEqual(projection.relations, [{ fromPath: "Root.md", toPath: "Outgoing.md" }]);
});

test("depth expands deliberately without including the rest of the vault", () => {
	const profile = createLinkedCanvasProfile("Board.canvas", "Root.md");
	profile.depth = 2;
	const projection = buildLinkedCanvasProjection(profile, paths, links);
	assert.ok(projection.filePaths.includes("Second.md"));
	assert.ok(!projection.filePaths.includes("Orphan.md"));
});

test("manually dropped Markdown seeds expand independently while exclusions win", () => {
	const profile = createLinkedCanvasProfile("Board.canvas", "Root.md");
	profile.seedPaths = ["Outgoing.md"];
	profile.depth = 1;
	profile.excludedPaths = ["image.png", "Backlink.md"];
	const projection = buildLinkedCanvasProjection(profile, paths, links);
	assert.deepEqual(projection.rootPaths, ["Root.md", "Outgoing.md"]);
	assert.ok(projection.filePaths.includes("Second.md"));
	assert.ok(!projection.filePaths.includes("image.png"));
	assert.ok(!projection.filePaths.includes("Backlink.md"));
});

test("missing roots fail closed instead of widening the canvas", () => {
	const profile = createLinkedCanvasProfile("Board.canvas", "Missing.md");
	const projection = buildLinkedCanvasProjection(profile, paths, links);
	assert.deepEqual(projection, { rootPaths: [], filePaths: [], relations: [] });
});

test("Canvas file-card references never become backlinks while Markdown may still link media", () => {
	assert.deepEqual(linkedCanvasVaultLinks({
		"Root.md": { "image.png": 1 },
		"Board.canvas": { "Root.md": 1, "image.png": 1 },
	}), {
		"Root.md": ["image.png"],
	});
});
