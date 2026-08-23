import assert from "node:assert/strict";
import test from "node:test";
import { markdownSummary, newTopicContent, removeMarkdownSummary } from "../src/topic-content";

test("creates a directly authored card without parent metadata", () => {
	const content = newTopicContent("새 주제", "");
	assert.match(content, /^---\ncontext_tree: true\n---\n# 새 주제\n$/);
	assert.doesNotMatch(content, /context_tree_parent/);
});

test("creates an ordinary Markdown note for the current-note workflow", () => {
	assert.equal(newTopicContent("새 주제", "본문", false), "# 새 주제\n\n본문\n");
});

test("extracts and removes a visible Markdown summary without touching frontmatter", () => {
	const source = `---\ncontext_tree: true\ncontext_tree_summary: Legacy summary.\n---\n# Topic\n\n> [!summary] 카드 요약\n> Existing summary.\n\nBody`;
	assert.equal(markdownSummary(source), "Existing summary.");
	assert.equal(removeMarkdownSummary(source), "---\ncontext_tree: true\ncontext_tree_summary: Legacy summary.\n---\n# Topic\n\nBody");
});
