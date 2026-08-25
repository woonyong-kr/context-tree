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

test("runtime contains no Canvas, backlink, force layout, or relationship editor", async () => {
	const files = ["src/main.ts", "src/model.ts", "src/view.ts", "src/ui/copy-ko.ts", "src/ui/copy-en.ts"];
	const runtime = (await Promise.all(files.map((path) => readFile(new URL(path, repository), "utf8")))).join("\n");
	for (const forbidden of [/canvas/i, /backlink/i, /d3-force/i, /relation(?:ship)? editor/i]) {
		assert.equal(forbidden.test(runtime), false, `runtime must not match ${forbidden}`);
	}
});

test("manifest exposes the renamed product and no desktop-only dependency", async () => {
	const manifest = JSON.parse(await readFile(new URL("manifest.json", repository), "utf8")) as Record<string, unknown>;
	assert.equal(manifest.id, "linked-graph");
	assert.equal(manifest.name, "Linked Graph");
	assert.equal(manifest.isDesktopOnly, false);
});
