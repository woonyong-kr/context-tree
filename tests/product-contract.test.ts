import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const repository = new URL("../", import.meta.url);

test("runtime is a read-only projection with no second knowledge store", async () => {
	const [main, view] = await Promise.all([
		readFile(new URL("src/main.ts", repository), "utf8"),
		readFile(new URL("src/view.ts", repository), "utf8"),
	]);
	const runtime = `${main}\n${view}`;
	for (const forbidden of ["loadData(", "saveData(", "vault.create(", "vault.modify(", "vault.delete(", "vault.trash("]) {
		assert.equal(runtime.includes(forbidden), false, `runtime must not contain ${forbidden}`);
	}
});

test("runtime contains no Canvas, backlink expansion, or relationship editor", async () => {
	const files = ["src/main.ts", "src/model.ts", "src/one-hop-graph.ts", "src/view.ts", "src/ui/copy-ko.ts", "src/ui/copy-en.ts"];
	const runtime = (await Promise.all(files.map((path) => readFile(new URL(path, repository), "utf8")))).join("\n");
	for (const forbidden of [/canvas/i, /backlink/i, /relation(?:ship)? editor/i]) {
		assert.equal(forbidden.test(runtime), false, `runtime must not match ${forbidden}`);
	}
});

test("manifest exposes the renamed product and no desktop-only dependency", async () => {
	const manifest = JSON.parse(await readFile(new URL("manifest.json", repository), "utf8")) as Record<string, unknown>;
	assert.equal(manifest.id, "linked-graph");
	assert.equal(manifest.name, "Linked Graph");
	assert.equal(manifest.isDesktopOnly, false);
});

test("view defaults to the current-note graph and keeps mode state session-only", async () => {
	const view = await readFile(new URL("src/view.ts", repository), "utf8");
	assert.match(view, /private mode: ViewMode = "graph"/);
	assert.match(view, /showGraph/);
	assert.match(view, /showOutline/);
	assert.doesNotMatch(view, /branchGraphs|expandedLinks/);
});

test("one-hop graph supports direct links, drag, zoom, and ephemeral layout only", async () => {
	const graph = await readFile(new URL("src/one-hop-graph.ts", repository), "utf8");
	assert.match(graph, /pointerdown/);
	assert.match(graph, /wheel/);
	assert.match(graph, /forceSimulation/);
	assert.match(graph, /forceLink/);
	assert.match(graph, /forceCollide/);
	assert.match(graph, /alphaTarget\(0\.22\)\.restart/);
	assert.match(graph, /ResizeObserver/);
	assert.match(graph, /stage\.clientWidth/);
	assert.match(graph, /onOpen\(item\)/);
	assert.doesNotMatch(graph, /localStorage|saveData|vault\.modify/);
});
