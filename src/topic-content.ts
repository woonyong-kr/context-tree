const SUMMARY_CALLOUT = "summary";
const SUMMARY_TITLE = "카드 요약";
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const SUMMARY_BLOCK = /^>\s*\[!summary\][^\r\n]*(?:\r?\n>[^\r\n]*)*/im;

function quotedLines(value: string): string {
	return value.trim().split(/\r?\n/).map((line) => `> ${line}`).join("\n");
}

function summaryCallout(value: string): string {
	return `> [!${SUMMARY_CALLOUT}] ${SUMMARY_TITLE}\n${quotedLines(value)}`;
}

function removeLegacySummaryFrontmatter(content: string): string {
	return content.replace(FRONTMATTER, (block, rawFrontmatter: string) => {
		const frontmatter = rawFrontmatter
			.split(/\r?\n/)
			.filter((line) => !/^context_tree_summary\s*:/.test(line))
			.join("\n");
		return `---\n${frontmatter}\n---\n`;
	});
}

/**
 * Extracts the short card description from a normal Obsidian callout. It is
 * intentionally Markdown, rather than an invisible card-only field, so the
 * exact same text is discoverable and editable in the source note.
 */
export function markdownSummary(content: string): string {
	const match = content.match(SUMMARY_BLOCK);
	if (!match) return "";
	return match[0]
		.split(/\r?\n/)
		.slice(1)
		.map((line) => line.replace(/^>\s?/, "").trim())
		.filter(Boolean)
		.join(" ");
}

/** Removes the display-only summary callout before rendering card details. */
export function removeMarkdownSummary(content: string): string {
	return content
		.replace(SUMMARY_BLOCK, "")
		.replace(/(?:\r?\n){3,}/g, "\n\n")
		.replace(/^\s*\r?\n/, "")
		.trim();
}

/**
 * Migrates the legacy YAML-only summary only when its card is explicitly
 * opened for editing. The user sees the result immediately in the normal
 * Markdown note; no background sweep mutates unrelated notes.
 */
export function migrateLegacySummaryToMarkdown(content: string, summary: string): string {
	if (!summary || markdownSummary(content) || !/^---[\s\S]*?^context_tree_summary\s*:/m.test(content)) return content;
	const withoutLegacyField = removeLegacySummaryFrontmatter(content);
	const heading = withoutLegacyField.match(/^#\s+.*(?:\r?\n|$)/m);
	if (!heading || heading.index === undefined) return withoutLegacyField;
	const insertion = heading.index + heading[0].length;
	return `${withoutLegacyField.slice(0, insertion)}\n${summaryCallout(summary)}\n${withoutLegacyField.slice(insertion)}`;
}

/** Build the portable Markdown source for a directly authored graph card. */
export function newTopicContent(title: string, body: string): string {
	const normalizedTitle = title.trim();
	const normalizedBody = body.trim();
	return `---\ncontext_tree: true\n---\n# ${normalizedTitle}\n${normalizedBody ? `\n${normalizedBody}\n` : ""}`;
}
