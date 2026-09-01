import assert from "node:assert/strict";
import test from "node:test";
import { nodeVisualKind, parseParentLink } from "../src/navigation";

test("uses canonical metadata for graph colours without title inference", () => {
	assert.equal(nodeVisualKind({ node_kind: "hub" }), "hub");
	assert.equal(nodeVisualKind({ node_kind: "entity", entity_kind: "project" }), "project");
	assert.equal(nodeVisualKind({ node_kind: "entity", entity_kind: "person" }), "person");
	assert.equal(nodeVisualKind({ type: "calendar-event" }), "schedule");
	assert.equal(nodeVisualKind({ node_kind: "entity", entity_kind: "schedule" }), "schedule");
	assert.equal(nodeVisualKind({ node_kind: "entity", facets: ["일정"] }), "schedule");
	assert.equal(nodeVisualKind({ node_kind: "entity", facets: ["책"] }), "book");
	assert.equal(nodeVisualKind({ node_kind: "topic" }), "topic");
	assert.equal(nodeVisualKind({ node_kind: "detail" }), "detail");
	assert.equal(nodeVisualKind({ type: "calendar-event", node_kind: "topic" }), "schedule");
	assert.equal(nodeVisualKind({ node_kind: "detail", entity_kind: "person" }), "person");
	assert.equal(nodeVisualKind({ node_kind: "topic", entity_kind: "project" }), "project");
	assert.equal(nodeVisualKind({ node_kind: "hub", facets: ["일정"] }), "schedule");
	assert.equal(nodeVisualKind({ entity_kind: "person", facets: ["일정"] }), "schedule");
	assert.equal(nodeVisualKind({ title: "프로젝트처럼 보이는 제목" }), "unknown");
});

test("parses the canonical parent wikilink for upward navigation", () => {
	assert.deepEqual(parseParentLink("[[wiki/personal/people/README|인물]]"), {
		linkPath: "wiki/personal/people/README",
		linkText: "wiki/personal/people/README",
		label: "인물",
	});
	assert.deepEqual(parseParentLink(["[[wiki/README|WIKI]]"]), {
		linkPath: "wiki/README",
		linkText: "wiki/README",
		label: "WIKI",
	});
	assert.equal(parseParentLink(undefined), null);
});
