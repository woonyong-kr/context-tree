import assert from "node:assert/strict";
import test from "node:test";
import { DIRECT_RELATION, isContextRelationType, isSymmetricRelation, relationItems, RELATION_TYPES } from "../src/domain/relations";
import { contextRelationLabel, contextRelationNavigationLabel } from "../src/ui/relation-labels";

test("defines one relation vocabulary for parsing and presentation", () => {
	assert.equal(DIRECT_RELATION, "related");
	assert.deepEqual(RELATION_TYPES, ["related", "prerequisite", "supports", "contrasts", "follow-up"]);
	assert.equal(isContextRelationType("supports"), true);
	assert.equal(isContextRelationType("derived"), false);
	assert.equal(contextRelationLabel("follow-up"), "Follow-up");
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

test("shows direction in navigation labels without adding arrows to symmetric relations", () => {
	assert.equal(contextRelationNavigationLabel("related", "outgoing"), "Related");
	assert.equal(contextRelationNavigationLabel("contrasts", "incoming"), "Contrasts");
	assert.equal(contextRelationNavigationLabel("prerequisite", "outgoing"), "Prerequisite →");
	assert.equal(contextRelationNavigationLabel("prerequisite", "incoming"), "← Prerequisite");
});
