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
	assert.equal(manifest.name, "Linked Graph Navigator");
	assert.equal(manifest.isDesktopOnly, false);
});

test("view defaults to the current-note graph and keeps mode state session-only", async () => {
	const [view, main] = await Promise.all([
		readFile(new URL("src/view.ts", repository), "utf8"),
		readFile(new URL("src/main.ts", repository), "utf8"),
	]);
	assert.match(view, /private mode: ViewMode = "graph"/);
	assert.match(view, /showGraph/);
	assert.match(view, /showOutline/);
	assert.doesNotMatch(view, /branchGraphs|expandedLinks/);
	assert.match(view, /event\.key === "ArrowDown"/);
	assert.match(view, /event\.key !== "Escape"/);
	assert.match(view, /focusSearch\(\)/);
	assert.match(main, /private readonly sessionHistory = new SessionNavigationHistory\(\)/);
	assert.match(main, /navigateHistory\(delta: -1 \| 1\)/);
	assert.doesNotMatch(main, /saveData\(|loadData\(/);
});

test("authored section context is shown without creating relationship data", async () => {
	const [model, view, graph] = await Promise.all([
		readFile(new URL("src/model.ts", repository), "utf8"),
		readFile(new URL("src/view.ts", repository), "utf8"),
		readFile(new URL("src/one-hop-graph.ts", repository), "utf8"),
	]);
	assert.match(model, /sectionPath: string\[\]/);
	assert.match(view, /linked-graph-link-context/);
	assert.match(graph, /linked-graph-network-node-context/);
	assert.doesNotMatch(`${model}\n${view}\n${graph}`, /sectionDatabase|relationshipStore/);
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
	assert.match(graph, /graphLayoutMetrics/);
	assert.match(graph, /updateResponsiveLayout/);
	assert.match(graph, /nodeAnchorOffset/);
	assert.match(graph, /private fitGraph\(markViewportTouched = true\)/);
	assert.match(graph, /this\.stage\.clientWidth \/ graphWidth/);
	assert.doesNotMatch(graph, /const maxX = Math\.max/);
	assert.doesNotMatch(graph, /const maxY = Math\.max/);
	assert.match(graph, /const sourceAnchor = this\.nodeAnchor\(link\.source\)/);
	assert.match(graph, /registerDrag\(rootElement, this\.root\)/);
	assert.match(graph, /options\.parent[\s\S]*createEl\("button"[\s\S]*createDiv\(/);
	assert.doesNotMatch(graph, /"aria-disabled"/);
	assert.match(graph, /if \(!options\.parent\) rootElement\.tabIndex = -1/);
	assert.match(graph, /onOpenParent/);
	assert.match(graph, /pointerenter/);
	assert.match(graph, /onPreview/);
	assert.match(graph, /element\.addEventListener\("focus", \(\) => void this\.showPreview\(node\)\)/);
	assert.doesNotMatch(graph, /linked-graph-preview-toggle|previewToggle|togglePreview/);
	assert.match(graph, /MAX_PREVIEW_GRAPH_NODES/);
	assert.match(graph, /node\.fx = node\.x/);
	assert.match(graph, /offsetWidth/);
	assert.match(graph, /ringSize = 8/);
	assert.match(graph, /force\("center-x"/);
	assert.match(graph, /force\("center-y"/);
	assert.doesNotMatch(graph, /network-group-label|groupAnchors|groupTarget/);
	assert.doesNotMatch(graph, /root-parent-icon|corner-up-left/);
	assert.doesNotMatch(graph, /title: item\.path/);
	assert.match(view, /toggleClass\("is-graph", this\.mode === "graph"\)/);
	assert.match(view, /MAX_DIRECT_GRAPH_NODES/);
	assert.match(view, /showAllInOutline/);
	assert.doesNotMatch(view, /group:|group,/);
	assert.match(main, /frontmatter\?\.parent/);
	assert.match(navigation, /node_kind/);
	assert.match(navigation, /entity_kind/);
	assert.match(navigation, /facets/);
	assert.doesNotMatch(graph, /localStorage|saveData|vault\.modify/);
});

test("navigation coalesces duplicate workspace events into one graph refresh", async () => {
	const main = await readFile(new URL("src/main.ts", repository), "utf8");
	assert.match(main, /const sourceChanged = file\.path !== this\.currentFile\?\.path/);
	assert.match(main, /if \(sourceChanged\) this\.scheduleViewRefresh\(0\)/);
	assert.match(main, /private scheduleViewRefresh\(delay: number\)/);
	assert.doesNotMatch(main, /revealLeaf\(leaf\);\s*this\.refreshViews\(\)/);
});

test("graph edges stay readable while preview edges remain visually secondary", async () => {
	const styles = await readFile(new URL("styles.css", repository), "utf8");
	assert.match(styles, /--lg-graph-line: var\(--graph-line/);
	assert.match(styles, /--lg-graph-text: var\(--graph-text/);
	assert.match(styles, /\.linked-graph-network-edge \{[\s\S]*stroke: var\(--lg-graph-line\)[\s\S]*stroke-width: 1/);
	assert.match(styles, /\.linked-graph-network-edge\.is-preview \{[\s\S]*var\(--lg-graph-line\) 68%[\s\S]*stroke-dasharray: 4 5[\s\S]*stroke-width: 1/);
	assert.match(styles, /stroke-linecap: round/);
});

test("graph uses an edge-to-edge canvas and node-only hover affordances", async () => {
	const styles = await readFile(new URL("styles.css", repository), "utf8");
	const graph = await readFile(new URL("src/one-hop-graph.ts", repository), "utf8");
	assert.match(styles, /\.linked-graph-body\.is-graph \{[\s\S]*padding: 0;[\s\S]*overflow: hidden/);
	assert.match(styles, /\.linked-graph-network \{[\s\S]*min-height: 420px/);
	assert.doesNotMatch(styles, /\.linked-graph-network-group-label/);
	assert.match(styles, /\.linked-graph-network-node-shell\.is-preview-source[\s\S]*background: transparent/);
	assert.match(styles, /\.linked-graph-network-node-shell\.is-preview-source \.linked-graph-network-node-dot \{[\s\S]*transform: scale\(1\.18\)/);
	assert.doesNotMatch(styles, /\.linked-graph-preview-toggle/);
	assert.match(styles, /\.linked-graph-network-overflow/);
	assert.match(styles, /\.linked-graph-view \.linked-graph-network-root:focus-visible,[\s\S]*outline: none;[\s\S]*box-shadow: none/);
	assert.match(styles, /\.linked-graph-network-root \{[\s\S]*flex-direction: column/);
	assert.match(styles, /button\.linked-graph-network-node \{[\s\S]*flex-direction: column[\s\S]*text-align: center/);
	assert.match(styles, /\.linked-graph-network-preview-node \{[\s\S]*flex-direction: column[\s\S]*text-align: center/);
	assert.match(styles, /\.linked-graph-network-root-label,[\s\S]*\.linked-graph-network-node-label \{[\s\S]*overflow-wrap: anywhere;[\s\S]*white-space: normal/);
	assert.match(styles, /\.linked-graph-network-node-context \{[\s\S]*overflow-wrap: anywhere;[\s\S]*white-space: normal/);
	assert.doesNotMatch(styles, /\.linked-graph-network-root-label,[\s\S]*\.linked-graph-network-node-label \{[^}]*text-overflow: ellipsis/);
	assert.match(graph, /\.on\("end", \(\) => \{[\s\S]*if \(!this\.viewportTouched\) this\.fitGraph\(false\)/);
	assert.match(graph, /window\.requestAnimationFrame\(\(\) => \{[\s\S]*this\.fitGraph\(false\)/);
	assert.match(graph, /Math\.hypot\(width, height\) \/ 2/);
});
