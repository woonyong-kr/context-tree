import assert from "node:assert/strict";
import test from "node:test";
import { contextRelationLabel, DIRECT_RELATION, isContextRelationType, isSymmetricRelation, relationItems, RELATION_TYPES } from "../src/domain/relations";

test("defines one relation vocabulary for parsing and presentation", () => {
	assert.equal(DIRECT_RELATION, "related");
	assert.deepEqual(RELATION_TYPES, ["related", "prerequisite", "supports", "contrasts", "follow-up"]);
	assert.equal(isContextRelationType("supports"), true);
	assert.equal(isContextRelationType("derived"), false);
	assert.equal(contextRelationLabel("follow-up"), "후속 질문");
});

test("normalizes scalar and list frontmatter relations without changing their values", () => {
	assert.deepEqual(relationItems("[[PintOS]]"), ["[[PintOS]]"]);
	assert.deepEqual(relationItems([{ target: "[[PintOS]]", type: "prerequisite" }]), [{ target: "[[PintOS]]", type: "prerequisite" }]);
	assert.deepEqual(relationItems(undefined), []);
});

test("keeps peer relations directionless while preserving directional semantics elsewhere", () => {
	assert.equal(isSymmetricRelation("related"), true);
	assert.equal(isSymmetricRelation("contrasts"), true);
	assert.equal(isSymmetricRelation("prerequisite"), false);
	assert.equal(isSymmetricRelation("supports"), false);
	assert.equal(isSymmetricRelation("follow-up"), false);
});
