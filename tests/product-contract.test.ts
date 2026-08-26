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

test("one-hop graph supports movable root, parent navigation, hover preview, and ephemeral layout only", async () => {
	const [graph, main, navigation, view] = await Promise.all([
		readFile(new URL("src/one-hop-graph.ts", repository), "utf8"),
		readFile(new URL("src/main.ts", repository), "utf8"),
		readFile(new URL("src/navigation.ts", repository), "utf8"),
		readFile(new URL("src/view.ts", repository), "utf8"),
	]);
	assert.match(graph, /pointerdown/);
	assert.match(graph, /wheel/);
	assert.match(graph, /forceSimulation/);
	assert.match(graph, /forceLink/);
	assert.match(graph, /forceCollide/);
	assert.match(graph, /alphaTarget\(0\.22\)\.restart/);
	assert.match(graph, /ResizeObserver/);
	assert.match(graph, /stage\.clientWidth/);
	assert.match(graph, /registerDrag\(rootElement, this\.root\)/);
	assert.match(graph, /onOpenParent/);
	assert.match(graph, /pointerenter/);
	assert.match(graph, /onPreview/);
	assert.match(graph, /node\.fx = node\.x/);
	assert.match(graph, /offsetWidth/);
	assert.match(graph, /ringSize = 8/);
	assert.match(graph, /force\("center-x"/);
	assert.match(graph, /force\("center-y"/);
	assert.doesNotMatch(graph, /network-group-label|groupAnchors|groupTarget/);
	assert.match(view, /toggleClass\("is-graph", this\.mode === "graph"\)/);
	assert.match(main, /frontmatter\?\.parent/);
	assert.match(navigation, /node_kind/);
	assert.match(navigation, /entity_kind/);
	assert.match(navigation, /facets/);
	assert.doesNotMatch(graph, /localStorage|saveData|vault\.modify/);
});

test("graph edges stay readable while preview edges remain visually secondary", async () => {
	const styles = await readFile(new URL("styles.css", repository), "utf8");
	assert.match(styles, /\.linked-graph-network-edge \{[\s\S]*var\(--lg-muted\) 46%[\s\S]*stroke-width: 1\.25/);
	assert.match(styles, /\.linked-graph-network-edge\.is-preview \{[\s\S]*var\(--lg-muted\) 38%[\s\S]*stroke-dasharray: 4 5[\s\S]*stroke-width: 1\.1/);
	assert.match(styles, /stroke-linecap: round/);
});

test("graph uses an edge-to-edge canvas and node-only hover affordances", async () => {
	const styles = await readFile(new URL("styles.css", repository), "utf8");
	assert.match(styles, /\.linked-graph-body\.is-graph \{[\s\S]*padding: 0;[\s\S]*overflow: hidden/);
	assert.match(styles, /\.linked-graph-network \{[\s\S]*min-height: 420px/);
	assert.doesNotMatch(styles, /\.linked-graph-network-group-label/);
	assert.match(styles, /\.linked-graph-network-node\.is-preview-source \{[\s\S]*background: transparent/);
	assert.match(styles, /\.linked-graph-network-node\.is-preview-source \.linked-graph-network-node-dot \{[\s\S]*transform: scale\(1\.18\)/);
	assert.match(styles, /\.linked-graph-view button\.linked-graph-network-node:focus-visible \{[\s\S]*box-shadow: none/);
});
