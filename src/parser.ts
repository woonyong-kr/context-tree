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

/**
 * Returns only the frontmatter entries that change how a note participates in
 * the graph. The raw YAML is preserved so nested relationship lists do not
 * need a second, incomplete YAML parser in the editor path.
 */
export function topicGraphMetadataSignature(content: string): string {
	const frontmatter = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\s*\r?\n|$)/)?.[1] ?? "";
	const lines = frontmatter.split(/\r?\n/);
	const entry = (key: string): string => {
		const start = lines.findIndex((line) => line.startsWith(`${key}:`));
		if (start < 0) return "";
		const value = [lines[start]!];
		for (let index = start + 1; index < lines.length; index += 1) {
			const line = lines[index]!;
			if (/^\S/.test(line)) break;
			value.push(line);
		}
		return value.join("\n").trim();
	};
	return ["context_tree", "context_tree_id", "context_tree_parent", "context_tree_links", "title", "context_tree_summary"]
		.map(entry)
		.join("\n\u0000\n");
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

/**
 * Builds the card text that can change without rebuilding its graph node.
 * Frontmatter is intentionally left to the full parser because parent and
 * relationship changes can alter the graph topology.
 */
export function topicDisplayContent(
	content: string,
	fallback: Pick<ContextTreeNode, "title" | "summary">,
): Pick<ContextTreeNode, "title" | "summary" | "body"> {
	const body = removeMarkdownSummary(removeDocumentTitle(content));
	return {
		title: documentTitle(content) || fallback.title,
		summary: markdownSummary(content) || fallback.summary || firstParagraph(body),
		body,
	};
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

		const display = topicDisplayContent(content, {
			title: text(frontmatter.title) || file.basename,
			summary: text(frontmatter.context_tree_summary),
		});
		topics.push({
			// A frontmatter id is useful to people, but the view state must stay
			// unambiguous even when two notes accidentally reuse one.
			id: `${file.path}::${text(frontmatter.context_tree_id) || file.path}`,
			path: file.path,
			parentPath: resolvedParent,
			title: display.title,
			summary: display.summary,
			body: display.body,
			links: extractLinks(app, frontmatter.context_tree_links, file.path),
		});
	}

	return buildContextTree(topics);
}
