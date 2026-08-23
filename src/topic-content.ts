type MarkdownBlock = { start: number; end: number; source: string };
type MarkdownFence = { marker: "`" | "~"; length: number; canClose: boolean };

function fenceAt(line: string): MarkdownFence | undefined {
	const match = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
	const marker = match?.[1];
	if (!marker) return undefined;
	return {
		marker: marker[0] as MarkdownFence["marker"],
		length: marker.length,
		canClose: !match?.[2]?.trim(),
	};
}

function nextFence(current: MarkdownFence | undefined, line: string): MarkdownFence | undefined {
	const marker = fenceAt(line);
	if (!marker) return current;
	if (!current) return marker;
	return marker.marker === current.marker && marker.length >= current.length && marker.canClose ? undefined : current;
}

function summaryBlock(content: string): MarkdownBlock | undefined {
	const linePattern = /.*(?:\r?\n|$)/g;
	let fence: MarkdownFence | undefined;
	let match: RegExpExecArray | null;
	while ((match = linePattern.exec(content)) && match[0]) {
		const line = match[0].replace(/\r?\n$/, "");
		if (fenceAt(line)) {
			fence = nextFence(fence, line);
			continue;
		}
		if (fence || !/^>\s*\[!summary\]/i.test(line)) continue;
		const start = match.index;
		let end = linePattern.lastIndex;
		while (linePattern.lastIndex < content.length) {
			const continuation = linePattern.exec(content);
			if (!continuation?.[0]) break;
			const continuationLine = continuation[0].replace(/\r?\n$/, "");
			if (!/^>/.test(continuationLine)) {
				linePattern.lastIndex = continuation.index;
				break;
			}
			end = linePattern.lastIndex;
		}
		return { start, end, source: content.slice(start, end).replace(/\r?\n$/, "") };
	}
	return undefined;
}

function withoutFencedCode(content: string): string {
	const lines = content.split(/\r?\n/);
	let fence: MarkdownFence | undefined;
	return lines.map((line) => {
		if (fenceAt(line)) {
			fence = nextFence(fence, line);
			return "";
		}
		return fence ? "" : line;
	}).join("\n");
}

/**
 * Extracts the short card description from a normal Obsidian callout. It is
 * intentionally Markdown, rather than an invisible card-only field, so the
 * exact same text is discoverable and editable in the source note.
 */
export function markdownSummary(content: string): string {
	const block = summaryBlock(content);
	if (!block) return "";
	return block.source
		.split(/\r?\n/)
		.slice(1)
		.map((line) => line.replace(/^>\s?/, "").trim())
		.filter(Boolean)
		.join(" ");
}

/** Removes the display-only summary callout before rendering card details. */
export function removeMarkdownSummary(content: string): string {
	const block = summaryBlock(content);
	const withoutSummary = block ? `${content.slice(0, block.start)}${content.slice(block.end)}` : content;
	return withoutSummary
		.replace(/(?:\r?\n){3,}/g, "\n\n")
		.replace(/^\s*\r?\n/, "")
		.trim();
}

export function markdownWithoutFencedCode(content: string): string {
	return withoutFencedCode(content);
}

/** Build the portable Markdown source for a directly authored graph card. */
export function newTopicContent(title: string, body: string): string {
	const normalizedTitle = title.trim();
	const normalizedBody = body.trim();
	return `---\ncontext_tree: true\n---\n# ${normalizedTitle}\n${normalizedBody ? `\n${normalizedBody}\n` : ""}`;
}
