import type { App, TAbstractFile, TFile } from "obsidian";
import { GraphWorkspace, graphScopeIncludesPath, rootedGraphPaths } from "./domain/graph-workspace";
import { noteLinkTarget } from "./domain/note-link";
import { DIRECT_RELATION, isContextRelationType, relationItems } from "./domain/relations";
import { markdownSummary, markdownWithoutFencedCode, removeMarkdownSummary } from "./topic-content";
import { ContextTreeLink, ContextTreeNode, ParsedTopic } from "./types";
import { buildContextTree } from "./tree";

function text(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function isMarkdownFile(file: TAbstractFile | null): file is TFile {
	return file !== null && "extension" in file && file.extension === "md";
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
	return markdownWithoutFencedCode(removeFrontmatter(content))
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
		if (rawType !== undefined && !isContextRelationType(rawType)) continue;
		const type = rawType === undefined ? DIRECT_RELATION : rawType;
		const key = `${targetPath}\u0000${type}`;
		if (seen.has(key)) continue;
		seen.add(key);
		links.push({ targetPath, type });
	}
	return links;
}

/** Makes the requested note the initial card without discarding its parent edge. */
function promoteRoot(roots: ContextTreeNode[], rootPath: string): void {
	const detach = (nodes: ContextTreeNode[]): ContextTreeNode | undefined => {
		const index = nodes.findIndex((node) => node.path === rootPath);
		if (index >= 0) return nodes.splice(index, 1)[0];
		for (const node of nodes) {
			const match = detach(node.children);
			if (match) return match;
		}
		return undefined;
	};
	const root = detach(roots);
	if (root) roots.unshift(root);
}

export async function loadContextTree(
	app: App,
	graph: GraphWorkspace,
): Promise<ContextTreeNode[]> {
	const rootedScope = graph.scope.kind === "rooted" ? graph.scope : undefined;
	const outgoingByPath = Object.fromEntries(Object.entries(app.metadataCache.resolvedLinks)
		.map(([sourcePath, targets]) => [sourcePath, Object.keys(targets)]));
	const rootedPaths = rootedScope
		? new Set(rootedGraphPaths(rootedScope.rootPath, rootedScope.expandedPaths, outgoingByPath, rootedScope.excludePaths))
		: undefined;
	const markdownFiles = app.vault.getMarkdownFiles();
	const files = rootedPaths
		? [...rootedPaths]
			.map((path) => app.vault.getAbstractFileByPath(path))
			.filter(isMarkdownFile)
		: markdownFiles.filter((file) => graphScopeIncludesPath(graph.scope, file.path));
	const declaredIdCounts = new Map<string, number>();
	// This pass reads only cached metadata needed to keep authored IDs unique;
	// note content is read later for files that belong to the active graph.
	for (const file of markdownFiles) {
		const declaredId = text(app.metadataCache.getFileCache(file)?.frontmatter?.context_tree_id);
		if (declaredId) declaredIdCounts.set(declaredId, (declaredIdCounts.get(declaredId) ?? 0) + 1);
	}
	const topics: ParsedTopic[] = [];

	for (const file of files) {
		const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
		if (!rootedPaths && frontmatter?.context_tree !== true) continue;

		const content = await app.vault.cachedRead(file);
		const parentLink = text(frontmatter?.context_tree_parent);
		const resolvedParent = parentLink
			? app.metadataCache.getFirstLinkpathDest(noteLinkTarget(parentLink), file.path)?.path
			: undefined;

		const display = topicDisplayContent(content, {
			title: text(frontmatter?.title) || file.basename,
			summary: text(frontmatter?.context_tree_summary),
		});
		const declaredId = text(frontmatter?.context_tree_id);
		topics.push({
			// A frontmatter id is useful to people, but the view state must stay
			// unambiguous even when two notes accidentally reuse one.
			id: declaredId && declaredIdCounts.get(declaredId) === 1
				? `context:${declaredId}`
				: `${file.path}::${declaredId || file.path}`,
			path: file.path,
			parentPath: resolvedParent,
			title: display.title,
			summary: display.summary,
			body: display.body,
			links: extractLinks(app, frontmatter?.context_tree_links, file.path),
			referencePaths: rootedPaths
				? (outgoingByPath[file.path] ?? []).filter((path) => rootedPaths.has(path))
				: [],
		});
	}

	const roots = buildContextTree(topics);
	if (!rootedScope) return roots;
	promoteRoot(roots, rootedScope.rootPath);
	return roots;
}
