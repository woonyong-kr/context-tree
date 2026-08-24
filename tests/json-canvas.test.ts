import assert from "node:assert/strict";
import test from "node:test";
import {
	parseJsonCanvas,
	reconcileLinkedCanvas,
	serializeJsonCanvas,
	type JsonCanvasDocument,
} from "../src/domain/json-canvas";
import {
	GENERATED_CANVAS_DESIGN,
	generatedCanvasNodeDesign,
	generatedCanvasNodePosition,
	generatedCanvasRole,
} from "../src/domain/generated-canvas-design";

test("keeps generated Canvas role visuals and placement in one design contract", () => {
	assert.equal(generatedCanvasRole("Root.md", true), "root");
	assert.equal(generatedCanvasRole("paper.pdf", false), "pdf");
	assert.equal(generatedCanvasRole("diagram.webp", false), "image");
	assert.equal(generatedCanvasRole("Note.md", false), "markdown");
	assert.deepEqual(generatedCanvasNodeDesign("paper.pdf", false), GENERATED_CANVAS_DESIGN.roles.pdf);
	assert.deepEqual(generatedCanvasNodePosition(0), {
		x: GENERATED_CANVAS_DESIGN.placement.rootX,
		y: GENERATED_CANVAS_DESIGN.placement.rootY,
	});
	assert.deepEqual(generatedCanvasNodePosition(1), {
		x: GENERATED_CANVAS_DESIGN.placement.boardX,
		y: GENERATED_CANVAS_DESIGN.placement.boardY,
	});
	assert.deepEqual(generatedCanvasNodePosition(3), {
		x: GENERATED_CANVAS_DESIGN.placement.boardX,
		y: GENERATED_CANVAS_DESIGN.placement.boardY + GENERATED_CANVAS_DESIGN.placement.rowStride,
	});
});

test("places generated Canvas cards in a compact non-overlapping board instead of a graph ring", () => {
	const positions = Array.from({ length: 9 }, (_, index) => generatedCanvasNodePosition(index));
	assert.equal(new Set(positions.map(({ x, y }) => `${x}:${y}`)).size, positions.length);
	assert.ok(positions.slice(1).every(({ x }) => x >= GENERATED_CANVAS_DESIGN.placement.boardX));
	assert.ok(GENERATED_CANVAS_DESIGN.placement.columnStride > GENERATED_CANVAS_DESIGN.roles.pdf.width);
	assert.ok(GENERATED_CANVAS_DESIGN.placement.rowStride > GENERATED_CANVAS_DESIGN.roles.pdf.height);
});

test("parses and serializes standard file, media, text, link and group cards", () => {
	const source = JSON.stringify({
		futureCanvasMetadata: { kept: true },
		nodes: [
			{ id: "note", type: "file", file: "Note.md", x: 0, y: 0, width: 380, height: 240, pluginData: { kept: true } },
			{ id: "pdf", type: "file", file: "Source.pdf", x: 400, y: 0, width: 460, height: 560 },
			{ id: "text", type: "text", text: "# Draft", x: 0, y: 300, width: 300, height: 160 },
			{ id: "url", type: "link", url: "https://example.com", x: 400, y: 600, width: 300, height: 160 },
			{ id: "group", type: "group", label: "Sources", x: -20, y: -20, width: 900, height: 900 },
		],
		edges: [{ id: "edge", fromNode: "note", toNode: "pdf", toEnd: "arrow" }],
	});
	const parsed = parseJsonCanvas(source);
	assert.ok(parsed);
	assert.deepEqual(parsed.futureCanvasMetadata, { kept: true });
	assert.deepEqual((parsed.nodes[0] as unknown as Record<string, unknown>).pluginData, { kept: true });
	assert.deepEqual(parseJsonCanvas(serializeJsonCanvas(parsed)), parsed);
});

test("rejects malformed coordinates, duplicate ids and dangling edges", () => {
	assert.equal(parseJsonCanvas('{"nodes":[{"id":"a","type":"file","file":"A.md","x":0,"y":0,"width":0,"height":100}]}'), undefined);
	assert.equal(parseJsonCanvas('{"nodes":[{"id":"a","type":"file","file":"A.md","x":0,"y":0,"width":100,"height":100},{"id":"a","type":"file","file":"B.md","x":0,"y":0,"width":100,"height":100}]}'), undefined);
	assert.equal(parseJsonCanvas('{"nodes":[],"edges":[{"id":"e","fromNode":"a","toNode":"b"}]}'), undefined);
});

test("creates file-backed notes and media with directed Markdown relations", () => {
	const result = reconcileLinkedCanvas(
		{ nodes: [], edges: [] },
		{ filesByNodeId: {}, edgeIds: [] },
		{
			rootPaths: ["Root.md"],
			filePaths: ["Root.md", "Answer.md", "diagram.png", "paper.pdf"],
			relations: [
				{ fromPath: "Root.md", toPath: "Answer.md" },
				{ fromPath: "Root.md", toPath: "diagram.png" },
				{ fromPath: "Answer.md", toPath: "paper.pdf" },
			],
		},
	);
	assert.equal(result.document.nodes.length, 4);
	assert.deepEqual(result.document.nodes.map((node) => node.type), ["file", "file", "file", "file"]);
	assert.deepEqual(result.document.nodes.map((node) => node.color), ["6", "5", "4", "3"]);
	assert.equal(result.document.edges.length, 3);
	assert.ok(result.document.edges.every((edge) => edge.toEnd === "arrow"));
	assert.equal(Object.keys(result.managed.filesByNodeId).length, 4);
	assert.equal(result.managed.edgeIds.length, 3);
});

test("preserves manual objects and card geometry while replacing only managed edges", () => {
	const existing: JsonCanvasDocument = {
		futureCanvasMetadata: { kept: true },
		nodes: [
			{ id: "managed-root", type: "file", file: "Root.md", x: 731, y: -205, width: 612, height: 418 },
			{ id: "manual-note", type: "file", file: "Manual.md", x: -900, y: 200, width: 300, height: 180 },
			{ id: "manual-text", type: "text", text: "Keep me", x: 10, y: 700, width: 200, height: 120 },
		],
		edges: [
			{ id: "managed-old", fromNode: "managed-root", toNode: "manual-note" },
			{ id: "manual-edge", fromNode: "manual-note", toNode: "managed-root", label: "visual only" },
		],
	};
	const result = reconcileLinkedCanvas(
		existing,
		{ filesByNodeId: { "managed-root": "Root.md" }, edgeIds: ["managed-old"] },
		{ rootPaths: ["Root.md"], filePaths: ["Root.md", "Next.md"], relations: [{ fromPath: "Root.md", toPath: "Next.md" }] },
	);
	const root = result.document.nodes.find((node) => node.id === "managed-root");
	assert.deepEqual(root, existing.nodes[0]);
	assert.ok(result.document.nodes.some((node) => node.id === "manual-note"));
	assert.ok(result.document.nodes.some((node) => node.id === "manual-text"));
	assert.ok(result.document.edges.some((edge) => edge.id === "manual-edge"));
	assert.ok(!result.document.edges.some((edge) => edge.id === "managed-old"));
	assert.deepEqual(result.document.futureCanvasMetadata, { kept: true });
});

test("reuses a manually dropped file card instead of duplicating it", () => {
	const existing: JsonCanvasDocument = {
		nodes: [{ id: "manual", type: "file", file: "Dropped.md", x: 44, y: 55, width: 501, height: 333 }],
		edges: [],
	};
	const result = reconcileLinkedCanvas(
		existing,
		{ filesByNodeId: {}, edgeIds: [] },
		{ rootPaths: ["Dropped.md"], filePaths: ["Dropped.md", "Neighbour.md"], relations: [{ fromPath: "Dropped.md", toPath: "Neighbour.md" }] },
	);
	assert.equal(result.document.nodes.filter((node) => node.type === "file" && node.file === "Dropped.md").length, 1);
	assert.deepEqual(result.document.nodes[0], existing.nodes[0]);
	assert.equal(result.managed.filesByNodeId.manual, "Dropped.md");
});
