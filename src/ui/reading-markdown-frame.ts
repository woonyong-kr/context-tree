/**
 * Reproduces the public Reading View class boundary that Obsidian themes,
 * snippets, and Markdown extensions target. MarkdownRenderer still owns the
 * rendered contents and post-processor lifecycle; this function owns only the
 * host structure inside a graph card.
 */
export function createReadingMarkdownFrame(parent: HTMLElement): HTMLElement {
	const readingView = parent.createDiv({ cls: "markdown-reading-view" });
	const preview = readingView.createDiv({ cls: "markdown-preview-view markdown-rendered" });
	return preview.createDiv({ cls: "markdown-preview-sizer markdown-preview-section context-tree-markdown-render-target" });
}
