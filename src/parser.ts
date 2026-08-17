import { App, TFile } from "obsidian";
import { ContextTreeSettings } from "./settings";
import { ContextTreeNode, ParsedTopic } from "./types";
import { buildContextTree } from "./tree";

function text(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function removeFrontmatter(content: string): string {
	return content.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, "").trim();
}

function removeDocumentTitle(content: string): string {
	return removeFrontmatter(content).replace(/^#\s+.*(?:\n|$)/, "").trim();
}

function firstParagraph(content: string): string {
	return removeFrontmatter(content)
		.replace(/^#\s+.*$/m, "")
		.split(/\n\s*\n/)
		.map((paragraph) => paragraph.replace(/[#*_`]/g, " ").replace(/\s+/g, " ").trim())
		.find(Boolean) ?? "";
}

function extractLink(value: string): string {
	const match = value.match(/^\[\[([^|#\]]+)/);
	return match?.[1]?.trim() || value;
}

function belongsInFolder(file: TFile, folder: string): boolean {
	return !folder || file.path === folder || file.path.startsWith(`${folder}/`);
}

export async function loadContextTree(
	app: App,
	settings: ContextTreeSettings,
): Promise<ContextTreeNode[]> {
	const files = app.vault.getMarkdownFiles().filter((file) => belongsInFolder(file, settings.sourceFolder));
	const topics: ParsedTopic[] = [];

	for (const file of files) {
		const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
		if (frontmatter?.context_tree !== true) continue;

		const content = await app.vault.cachedRead(file);
		const parentLink = text(frontmatter.context_tree_parent);
		const resolvedParent = parentLink
			? app.metadataCache.getFirstLinkpathDest(extractLink(parentLink), file.path)?.path
			: undefined;

		topics.push({
			id: text(frontmatter.context_tree_id) || file.path,
			path: file.path,
			parentPath: resolvedParent,
			title: text(frontmatter.title) || file.basename,
			summary: text(frontmatter.context_tree_summary) || firstParagraph(content),
			body: removeDocumentTitle(content),
		});
	}

	return buildContextTree(topics);
}
