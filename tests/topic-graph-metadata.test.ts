import assert from "node:assert/strict";
import test from "node:test";
import { topicGraphMetadataSignature } from "../src/parser";

test("tracks graph-relevant frontmatter including a nested relationship list", () => {
	const before = `---\ncontext_tree: true\ncontext_tree_links:\n  - target: \"[[PintOS]]\"\n    type: related\ntags: [study]\n---\n# Threads`;
	const after = before.replace("type: related", "type: prerequisite");

	assert.notEqual(topicGraphMetadataSignature(before), topicGraphMetadataSignature(after));
});

test("ignores frontmatter that does not affect graph membership or display fallback", () => {
	const before = `---\ncontext_tree: true\ntags: [study]\n---\n# Threads`;
	const after = before.replace("study", "interview");

	assert.equal(topicGraphMetadataSignature(before), topicGraphMetadataSignature(after));
});
