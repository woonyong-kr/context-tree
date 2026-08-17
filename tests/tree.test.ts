import assert from "node:assert/strict";
import test from "node:test";
import { buildRadialLayout } from "../src/radial-layout";
import { buildContextTree } from "../src/tree";
import { ParsedTopic } from "../src/types";

function topic(path: string, title: string, parentPath?: string): ParsedTopic {
	return { id: path, path, title, parentPath, summary: "summary", body: "body" };
}

test("builds a stable parent-child keyword tree", () => {
	const roots = buildContextTree([
		topic("threads", "Threads", "pintos"),
		topic("pintos", "PintOS"),
		topic("sleep", "Sleep list", "threads"),
		topic("vm", "Virtual memory", "pintos"),
	]);

	assert.deepEqual(roots.map((node) => node.title), ["PintOS"]);
	assert.deepEqual(roots[0]?.children.map((node) => node.title), ["Threads", "Virtual memory"]);
	assert.deepEqual(roots[0]?.children[0]?.children.map((node) => node.title), ["Sleep list"]);
});

test("keeps an unresolved parent as an independent root", () => {
	const roots = buildContextTree([
		topic("orphan", "Orphan", "missing"),
		topic("root", "Root"),
	]);

	assert.deepEqual(roots.map((node) => node.title), ["Orphan", "Root"]);
});

test("keeps a self-referencing topic visible as a root", () => {
	const roots = buildContextTree([topic("threads", "Threads", "threads")]);

	assert.deepEqual(roots.map((node) => node.title), ["Threads"]);
	assert.deepEqual(roots[0]?.children, []);
});

test("breaks a parent cycle without dropping either topic", () => {
	const roots = buildContextTree([
		topic("b", "B", "a"),
		topic("a", "A", "b"),
	]);

	assert.deepEqual(roots.map((node) => node.title), ["B"]);
	assert.deepEqual(roots[0]?.children.map((node) => node.title), ["A"]);
});

test("puts the selected keyword at the centre of a radial graph", () => {
	const roots = buildContextTree([
		topic("threads", "Threads", "pintos"),
		topic("pintos", "PintOS"),
		topic("sleep", "Sleep list", "threads"),
	]);
	const layout = buildRadialLayout(roots, "threads");

	assert.equal(layout?.focus.title, "Threads");
	assert.deepEqual(layout?.nodes.find((item) => item.node.title === "Threads"), {
		node: layout?.focus,
		x: 0,
		y: 0,
		distance: 0,
	});
	assert.equal(layout?.edges.length, 2);
	assert.deepEqual(layout?.nodes.map((item) => item.node.title).sort(), ["PintOS", "Sleep list", "Threads"]);
});

test("widens the first ring while the focused card shows details", () => {
	const roots = buildContextTree([
		topic("child", "Child", "root"),
		topic("root", "Root"),
	]);
	const layout = buildRadialLayout(roots, "root", true);
	const child = layout?.nodes.find((item) => item.node.id === "child");

	assert.ok(child);
	assert.equal(Math.abs(child?.y ?? 0), 520);
});
