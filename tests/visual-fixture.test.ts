import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const fixtureUrl = new URL("fixtures/visual/linked-map-design.html", import.meta.url);
const viewUrl = new URL("../src/view.ts", import.meta.url);
const stylesUrl = new URL("../styles.css", import.meta.url);

test("the visual fixture exercises the production theme and accessible graph states", async () => {
	const fixture = await readFile(fixtureUrl, "utf8");
	assert.match(fixture, /href="\.\.\/\.\.\/\.\.\/styles\.css"/);
	assert.match(fixture, /class="fixture-pane theme-dark"/);
	assert.match(fixture, /class="fixture-pane theme-light"/);
	for (const role of ["root", "topic", "entity", "question"]) {
		assert.match(fixture, new RegExp(`data-role="${role}"`));
	}
	assert.match(fixture, /role="status"/);
	assert.match(fixture, /role="alert"/);
	assert.match(fixture, /context-tree-empty/);
	assert.match(fixture, /context-tree-graph-controls/);
});

test("the Canvas handoff stays icon-only and compact cards suppress repeated topic chrome", async () => {
	const [view, styles] = await Promise.all([
		readFile(viewUrl, "utf8"),
		readFile(stylesUrl, "utf8"),
	]);
	assert.doesNotMatch(view, /context-tree-canvas-handoff-label/);
	assert.match(view, /aria-label": COPY\.actions\.continueInCanvas/);
	assert.match(styles, /\.context-tree-card\[data-role="topic"\] \.context-tree-role \{ display: none; \}/);
});
