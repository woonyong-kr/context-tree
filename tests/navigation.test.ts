import assert from "node:assert/strict";
import test from "node:test";
import { isGraphDestinationVisible, nodeVisualKind, parseParentLink } from "../src/navigation";

test("hides non-canonical graph destinations without assuming Vault-specific root folders", () => {
	assert.equal(isGraphDestinationVisible("wiki/ai/attention.md", { status: "Active" }), true);
	assert.equal(isGraphDestinationVisible("wiki/personal/study.md", { access: "local-only" }), true);
	assert.equal(isGraphDestinationVisible("brain/guide.md", {}), true);
	assert.equal(isGraphDestinationVisible("inbox/idea.md", {}), true);
	assert.equal(isGraphDestinationVisible(".local/cache.md", {}), false);
	assert.equal(isGraphDestinationVisible("wiki/private/notes.md", { status: "Active" }), false);
	assert.equal(isGraphDestinationVisible("wiki/private/_sources/raw.md", {}), false);
	assert.equal(isGraphDestinationVisible("wiki/books/archive/old.md", {}), false);
	assert.equal(isGraphDestinationVisible("wiki/books/generated/event.md", {}), false);
	assert.equal(isGraphDestinationVisible("wiki/books/current.md", { status: "Retired" }), false);
	assert.equal(isGraphDestinationVisible("wiki/books/current.md", { lifecycle: "archived" }), false);
	assert.equal(isGraphDestinationVisible("wiki/books/current.md", { lifecycle_status: "superseded" }), false);
});

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

test("keeps semantic graph colours exclusive when structural metadata overlaps", () => {
	const cases = [
		[{ type: "calendar-event", node_kind: "detail", entity_kind: "project" }, "schedule"],
		[{ entity_kind: "person", node_kind: "topic", facets: ["프로젝트"] }, "person"],
		[{ entity_kind: "project", node_kind: "detail" }, "project"],
		[{ node_kind: "detail" }, "detail"],
	] as const;

	for (const [frontmatter, expected] of cases) {
		assert.equal(nodeVisualKind(frontmatter), expected);
	}
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
