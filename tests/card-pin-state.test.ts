import assert from "node:assert/strict";
import test from "node:test";
import { normalizePinnedCardIds, openCardAlongsidePins, retainPinnedCards } from "../src/domain/card-pin-state";

test("normalizes persisted pins against the current graph", () => {
	assert.deepEqual([...normalizePinnedCardIds(["pintos", "removed", "pintos"], ["pintos", "kyro"])], ["pintos"]);
});

test("opening another card retains pinned cards but replaces a transient reader", () => {
	const pins = new Set(["pintos"]);
	assert.deepEqual([...openCardAlongsidePins(pins, "kyro")].sort(), ["kyro", "pintos"]);
	assert.deepEqual([...openCardAlongsidePins(pins, "minidb")].sort(), ["minidb", "pintos"]);
});

test("canvas dismissal retains only explicitly pinned cards", () => {
	assert.deepEqual([...retainPinnedCards(new Set(["pintos", "kyro"]), new Set(["pintos"]))], ["pintos"]);
});
