import { App } from "obsidian";
import { GraphWorkspace, graphScopeIncludesPath } from "./domain/graph-workspace";
import { noteLinkTarget } from "./domain/note-link";
import { DIRECT_RELATION, isContextRelationType, relationItems } from "./domain/relations";
import { markdownSummary, removeMarkdownSummary } from "./topic-content";
import { ContextTreeLink, ContextTreeNode, ParsedTopic } from "./types";
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

function documentTitle(content: string): string {
	return removeFrontmatter(content).match(/^#\s+(.+?)(?:\r?\n|$)/)?.[1]?.trim() ?? "";
}

function firstParagraph(content: string): string {
	return removeFrontmatter(content)
		.replace(/^#\s+.*$/m, "")
		.split(/\n\s*\n/)
		.map((paragraph) => paragraph.replace(/[#*_`]/g, " ").replace(/\s+/g, " ").trim())
		.find(Boolean) ?? "";
}

function extractLinks(app: App, rawValue: unknown, sourcePath: string): ContextTreeLink[] {
	const seen = new Set<string>();
	const links: ContextTreeLink[] = [];

	for (const item of relationItems(rawValue)) {
		const rawTarget = typeof item === "string"
			? item
			: item && typeof item === "object"
				? text((item as Record<string, unknown>).target)
				: "";
		if (!rawTarget) continue;
		const targetPath = app.metadataCache.getFirstLinkpathDest(noteLinkTarget(rawTarget), sourcePath)?.path;
		if (!targetPath) continue;
		const rawType = item && typeof item === "object" ? (item as Record<string, unknown>).type : undefined;
		const type = isContextRelationType(rawType) ? rawType : DIRECT_RELATION;
		const key = `${targetPath}\u0000${type}`;
		if (seen.has(key)) continue;
		seen.add(key);
		links.push({ targetPath, type });
	}
	return links;
}

export async function loadContextTree(
	app: App,
	graph: GraphWorkspace,
): Promise<ContextTreeNode[]> {
	const files = app.vault.getMarkdownFiles().filter((file) => graphScopeIncludesPath(graph.scope, file.path));
	const topics: ParsedTopic[] = [];

	for (const file of files) {
		const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
		if (frontmatter?.context_tree !== true) continue;

		const content = await app.vault.cachedRead(file);
		const parentLink = text(frontmatter.context_tree_parent);
		const resolvedParent = parentLink
			? app.metadataCache.getFirstLinkpathDest(noteLinkTarget(parentLink), file.path)?.path
			: undefined;

		topics.push({
			// A frontmatter id is useful to people, but the view state must stay
			// unambiguous even when two notes accidentally reuse one.
			id: `${file.path}::${text(frontmatter.context_tree_id) || file.path}`,
			path: file.path,
			parentPath: resolvedParent,
			title: documentTitle(content) || text(frontmatter.title) || file.basename,
			summary: markdownSummary(content) || text(frontmatter.context_tree_summary) || firstParagraph(removeMarkdownSummary(content)),
			body: removeMarkdownSummary(removeDocumentTitle(content)),
			links: extractLinks(app, frontmatter.context_tree_links, file.path),
		});
	}

	return buildContextTree(topics);
}
