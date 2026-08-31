import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import test from "node:test";
import { parseDocumentLinks } from "../src/model";

test("parses a 5,000-route document within the published large-note budget", () => {
	const markdown = Array.from({ length: 5_000 }, (_, index) => {
		const section = index % 100 === 0 ? `## Section ${String(index / 100 + 1)}\n` : "";
		return `${section}- [[Route ${String(index + 1)}]]`;
	}).join("\n");
	const started = performance.now();
	const graph = parseDocumentLinks(markdown, "Dense.md", "Dense", (link) => `${link}.md`);
	const elapsed = performance.now() - started;

	assert.equal(graph.linkCount, 5_000);
	assert.ok(elapsed < 1_500, `expected parse under 1500ms, received ${elapsed.toFixed(1)}ms`);
});
