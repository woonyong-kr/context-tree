const SUMMARY_BLOCK = /^>\s*\[!summary\][^\r\n]*(?:\r?\n>[^\r\n]*)*/im;

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

/** Build the portable Markdown source for a directly authored graph card. */
export function newTopicContent(title: string, body: string): string {
	const normalizedTitle = title.trim();
	const normalizedBody = body.trim();
	return `---\ncontext_tree: true\n---\n# ${normalizedTitle}\n${normalizedBody ? `\n${normalizedBody}\n` : ""}`;
}
