import assert from "node:assert/strict";
import test from "node:test";
import { syncContentProjectionLayout } from "../src/domain/content-projection-layout";

test("opening content freezes every card at its current position", () => {
	const nodes = [
		{ id: "reader", x: 10, y: 20 },
		{ id: "context", x: 30, y: 40, fx: 30, fy: 40 },
	];
	const locks = new Map();

	assert.equal(syncContentProjectionLayout(nodes, locks, true), true);
	assert.deepEqual(nodes, [
		{ id: "reader", x: 10, y: 20, fx: 10, fy: 20 },
		{ id: "context", x: 30, y: 40, fx: 30, fy: 40 },
	]);
	assert.deepEqual([...locks], [
		["reader", { fx: undefined, fy: undefined }],
		["context", { fx: 30, fy: 40 }],
	]);
});

test("a newly revealed neighbour remains free while the existing map stays locked", () => {
	const existing = { id: "reader", x: 10, y: 20 };
	const locks = new Map();
	syncContentProjectionLayout([existing], locks, true);
	const neighbour = { id: "new", x: 50, y: 60 };

	syncContentProjectionLayout([existing, neighbour], locks, true);

	assert.deepEqual(existing, { id: "reader", x: 10, y: 20, fx: 10, fy: 20 });
	assert.deepEqual(neighbour, { id: "new", x: 50, y: 60 });
});

test("closing content restores the map's original pin semantics", () => {
	const nodes = [
		{ id: "free", x: 10, y: 20 },
		{ id: "pinned", x: 30, y: 40, fx: 30, fy: 40 },
	];
	const locks = new Map();
	syncContentProjectionLayout(nodes, locks, true);

	assert.equal(syncContentProjectionLayout(nodes, locks, false), false);
	assert.deepEqual(nodes, [
		{ id: "free", x: 10, y: 20, fx: undefined, fy: undefined },
		{ id: "pinned", x: 30, y: 40, fx: 30, fy: 40 },
	]);
	assert.equal(locks.size, 0);
});
