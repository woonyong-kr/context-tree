import assert from "node:assert/strict";
import test from "node:test";
import { markdownSummary, migrateLegacySummaryToMarkdown, newTopicContent, removeMarkdownSummary } from "../src/topic-content";

test("creates a directly authored card without parent metadata", () => {
	const content = newTopicContent("새 주제", "");
	assert.match(content, /^---\ncontext_tree: true\n---\n# 새 주제\n$/);
	assert.doesNotMatch(content, /context_tree_parent/);
});

test("moves a legacy card summary into visible Markdown only when edited", () => {
	const legacy = `---\ncontext_tree: true\ncontext_tree_summary: A visible card summary.\n---\n# Topic\n\nBody`;
	const migrated = migrateLegacySummaryToMarkdown(legacy, "A visible card summary.");
	assert.doesNotMatch(migrated, /context_tree_summary/);
	assert.match(migrated, /> \[!summary\] 카드 요약\n> A visible card summary\./);
	assert.equal(markdownSummary(migrated), "A visible card summary.");
	assert.equal(removeMarkdownSummary(migrated), "---\ncontext_tree: true\n---\n# Topic\n\nBody");
});

test("does not rewrite a note that already has a visible Markdown summary", () => {
	const source = `# Topic\n\n> [!summary] 카드 요약\n> Existing summary.\n\nBody`;
	assert.equal(migrateLegacySummaryToMarkdown(source, "Legacy summary."), source);
});
