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
	assert.match(main, /openLinkedNote\(linkText: string, sourcePath: string, targetPath: string\)/);
	assert.match(main, /this\.setCurrentSource\(target, sourceLeaf\)/);
	assert.match(main, /this\.refreshViews\(\)/);
	assert.doesNotMatch(main, /saveData\(|loadData\(/);
});

test("authored section context stays in Outline and does not clutter graph nodes", async () => {
	const [model, view, graph] = await Promise.all([
		readFile(new URL("src/model.ts", repository), "utf8"),
		readFile(new URL("src/view.ts", repository), "utf8"),
		readFile(new URL("src/one-hop-graph.ts", repository), "utf8"),
	]);
	assert.match(model, /sectionPath: string\[\]/);
	assert.match(view, /linked-graph-link-context/);
	assert.doesNotMatch(graph, /linked-graph-network-node-context/);
	assert.doesNotMatch(graph, /item\.context \? `\$\{item\.context\}: \$\{item\.label\}`/);
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
	assert.match(graph, /alphaTarget\(GRAPH_MOTION\.dragAlphaTarget\)/);
	assert.match(graph, /ResizeObserver/);
	assert.match(graph, /stage\.clientWidth/);
	assert.match(graph, /graphLayoutMetrics/);
	assert.match(graph, /updateResponsiveLayout/);
	assert.match(graph, /nodeAnchorOffset/);
	assert.match(graph, /private fitGraph\(markViewportTouched = true\)/);
	assert.doesNotMatch(graph, /AUTO_FIT_MIN_SCALE/);
	assert.match(graph, /const fitScale = Math\.min\(this\.stage\.clientWidth \/ graphWidth/);
	assert.match(graph, /markViewportTouched[\s\S]*Math\.max\(MIN_SCALE, fitScale\)[\s\S]*Math\.min\(1, fitScale\)/);
	assert.match(graph, /this\.stage\.clientWidth \/ graphWidth/);
	assert.doesNotMatch(graph, /const maxX = Math\.max/);
	assert.doesNotMatch(graph, /const maxY = Math\.max/);
	assert.match(graph, /const sourceAnchor = this\.nodeAnchor\(link\.source\)/);
	assert.match(graph, /"data-graph-node-id": "__current__"/);
	assert.match(graph, /"data-graph-node-id": item\.key/);
	assert.match(graph, /this\.stage\.addEventListener\("pointerdown", \(event\) => this\.startPointerInteraction\(event\)\)/);
	assert.match(graph, /event\.target\.closest<HTMLElement>\("\[data-graph-node-id\]"\)/);
	assert.doesNotMatch(graph, /private registerDrag|element\.addEventListener\("pointerdown"/);
	assert.match(graph, /element\.addEventListener\("click", \(event\) => \{[\s\S]*this\.activateNode\(node\)/);
	assert.doesNotMatch(graph, /network-node-shell|const shell/);
	const startDrag = graph.slice(graph.indexOf("private startNodeDrag"), graph.indexOf("private moveNode"));
	assert.doesNotMatch(startDrag, /event\.stopPropagation\(\)/);
	assert.match(graph, /event\.target\.closest\("button"\)/);
	assert.match(graph, /options\.parent[\s\S]*createEl\("button"[\s\S]*createDiv\(/);
	assert.doesNotMatch(graph, /"aria-disabled"/);
	assert.match(graph, /if \(!options\.parent\) rootElement\.tabIndex = -1/);
	assert.match(graph, /onOpenParent/);
	assert.match(graph, /element\.addEventListener\("pointerenter", \(event\) => \{/);
	assert.match(graph, /boundedHoverOffset/);
	assert.match(graph, /private moveHover/);
	assert.doesNotMatch(graph, /previewIntent/);
	assert.match(graph, /onPreview/);
	assert.match(graph, /element\.addEventListener\("focus", \(\) => void this\.showPreview\(node\)\)/);
	assert.doesNotMatch(graph, /linked-graph-preview-toggle|previewToggle|togglePreview/);
	assert.match(graph, /previewGraphNodeLimit\(this\.layoutWidth\)/);
	assert.match(graph, /node\.fx = node\.x;[\s\S]*await this\.options\.onPreview/);
	assert.match(graph, /forceSimulation<PhysicsNode, PhysicsLink>\(this\.physicsNodes\(\)\)/);
	assert.doesNotMatch(graph, /simulation\.nodes\(this\.visibleNodes\(\)\)/);
	assert.match(graph, /hasNodeDragIntent/);
	assert.doesNotMatch(graph, /Math\.hypot\(deltaX, deltaY\)/);
	assert.match(graph, /private readonly pinnedNodeIds = new Set<string>\(\)/);
	assert.match(graph, /this\.pinnedNodeIds\.add\(completed\.node\.id\)/);
	const endDrag = graph.slice(graph.indexOf("private endNodeDrag"), graph.indexOf("private cancelNodeDrag"));
	assert.match(endDrag, /completed\.phase === "pressed"\) \{\s*return;/);
	assert.doesNotMatch(endDrag, /completed\.phase === "pressed"[\s\S]*this\.activateNode\(completed\.node\)/);
	assert.match(endDrag, /completed\.node\.element\?\.removeClass\("is-dragging"\)[\s\S]*this\.suppressClickFor\(completed\.node\.id\)/);
	assert.match(graph, /pointercancel"[\s\S]*this\.cancelNodeDrag\(event\.pointerId\)/);
	assert.match(graph, /lostpointercapture"[\s\S]*this\.cancelNodeDrag\(event\.pointerId\)/);
	assert.match(graph, /this\.stage\.addEventListener\("pointermove"[\s\S]*this\.moveNode\(event\)[\s\S]*this\.movePan\(event\)/);
	assert.match(graph, /this\.stage\.addEventListener\("pointerup"[\s\S]*this\.endNodeDrag\(event\)[\s\S]*this\.endPan\(event\)/);
	const pointerStart = graph.slice(graph.indexOf("private startPointerInteraction"), graph.indexOf("private consumeSuppressedClick"));
	assert.match(pointerStart, /this\.startNodeDrag\(event, node, nodeElement\)/);
	assert.match(pointerStart, /this\.startPan\(event\)/);
	assert.match(graph, /window\.addEventListener\("blur", this\.cancelPointerInteractionsOnBlur\)/);
	assert.match(graph, /cancelled\.node\.x = cancelled\.startNodeX/);
	assert.match(graph, /offsetWidth/);
	assert.match(graph, /ringSize = this\.layoutWidth <= 420 \? 2 : 8/);
	assert.match(graph, /force\("center-x"/);
	assert.match(graph, /force\("center-y"/);
	assert.doesNotMatch(graph, /network-group-label|groupAnchors|groupTarget/);
	assert.doesNotMatch(graph, /root-parent-icon|corner-up-left/);
	assert.doesNotMatch(graph, /title: item\.path/);
	assert.match(view, /toggleClass\("is-graph", this\.mode === "graph"\)/);
	assert.match(view, /directGraphNodeLimit\(this\.body\.clientWidth, this\.body\.clientHeight\)/);
	assert.match(view, /showAllInOutline/);
	assert.doesNotMatch(view, /group:|group,/);
	assert.match(main, /frontmatter\?\.parent/);
	assert.match(navigation, /node_kind/);
	assert.match(navigation, /entity_kind/);
	assert.match(navigation, /facets/);
	assert.doesNotMatch(graph, /localStorage|saveData|vault\.modify/);
	assert.doesNotMatch(graph, /빠른 이동|하위 노드|linked-graph-preview-toggle|chevron-right/);
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
	assert.match(styles, /\.linked-graph-network-edge\.is-preview\.is-visible \{[\s\S]*opacity: 1/);
	assert.match(styles, /stroke-linecap: round/);
});

test("graph uses an edge-to-edge canvas and node-only hover affordances", async () => {
	const styles = await readFile(new URL("styles.css", repository), "utf8");
	const graph = await readFile(new URL("src/one-hop-graph.ts", repository), "utf8");
	assert.match(styles, /\.linked-graph-body\.is-graph \{[\s\S]*padding: 0;[\s\S]*overflow: hidden/);
	assert.match(styles, /\.linked-graph-network \{[\s\S]*min-height: 420px/);
	assert.doesNotMatch(styles, /\.linked-graph-network-group-label/);
	assert.match(styles, /button\.linked-graph-network-node\.is-preview-source[\s\S]*background: transparent/);
	assert.match(styles, /\.linked-graph-network-node\.is-preview-source \.linked-graph-network-node-dot \{[\s\S]*transform: scale\(1\.18\)/);
	assert.doesNotMatch(styles, /\.linked-graph-preview-toggle/);
	assert.match(styles, /\.linked-graph-network-overflow/);
	assert.match(styles, /\.linked-graph-view \.linked-graph-network-root:focus-visible,[\s\S]*outline: none;[\s\S]*box-shadow: none/);
	assert.match(styles, /\.linked-graph-network-root \{[\s\S]*flex-direction: column/);
	assert.match(styles, /button\.linked-graph-network-node \{[^}]*flex-direction: column[^}]*text-align: center[^}]*translate\(-50%, -50%\)/);
	assert.doesNotMatch(styles, /network-node-shell/);
	assert.match(styles, /\.linked-graph-network-node-visual \{[^}]*--lg-hover-x[^}]*transition/);
	assert.match(styles, /\.linked-graph-network-preview-node \{[\s\S]*flex-direction: column[\s\S]*text-align: center/);
	assert.match(styles, /\.linked-graph-network-preview-node\.is-visible \{[\s\S]*scale\(1\)/);
	assert.match(styles, /\.linked-graph-network-root-label,[\s\S]*\.linked-graph-network-node-label \{[\s\S]*overflow-wrap: anywhere;[\s\S]*white-space: normal/);
	assert.doesNotMatch(styles, /\.linked-graph-network-node-context/);
	assert.match(graph, /if \(!hasNodeDragIntent[\s\S]*this\.drag\.captureTarget\.setPointerCapture\(event\.pointerId\)[\s\S]*this\.drag\.phase = "dragging"/);
	assert.doesNotMatch(graph, /phase: "pressed",\s*};\s*captureTarget\.setPointerCapture/);
	assert.match(graph, /captureTarget\.releasePointerCapture\(drag\.pointerId\)/);
	assert.doesNotMatch(graph, /node\.(?:anchor|element)\?\.setPointerCapture/);
	assert.match(styles, /\.linked-graph-preview-status \{[\s\S]*width: 1px;[\s\S]*clip-path: inset\(50%\)/);
	assert.doesNotMatch(styles, /\.linked-graph-network-root-label,[\s\S]*\.linked-graph-network-node-label \{[^}]*text-overflow: ellipsis/);
	assert.match(graph, /\.on\("end", \(\) => \{[\s\S]*if \(!this\.viewportTouched\) this\.fitGraph\(false\)/);
	assert.match(graph, /window\.requestAnimationFrame\(\(\) => \{[\s\S]*this\.fitGraph\(false\)/);
	assert.match(graph, /Math\.hypot\(width, height\) \/ 2/);
});
