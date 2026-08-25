export type LinkResolver = (linkPath: string, sourcePath: string) => string | null;

export interface LinkedNote {
	kind: "link";
	key: string;
	label: string;
	linkText: string;
	path: string;
	subpath: string;
}

export interface LinkGroup {
	kind: "group";
	key: string;
	label: string;
	children: GraphEntry[];
}

export type GraphEntry = LinkedNote | LinkGroup;

export interface DocumentLinkGraph {
	sourcePath: string;
	title: string;
	entries: GraphEntry[];
	linkCount: number;
}

interface GroupDraft extends LinkGroup {
	indent: number;
}

const WIKILINK = /(?<!!)\[\[([^\]]+)\]\]/g;

function visibleMarkdown(markdown: string): string[] {
	const lines = markdown.split(/\r?\n/);
	const visible: string[] = [];
	let inFrontmatter = lines[0]?.trim() === "---";
	let inFence = false;
	let inComment = false;

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index] ?? "";
		if (inFrontmatter) {
			if (index > 0 && line.trim() === "---") inFrontmatter = false;
			continue;
		}
		if (/^\s*(```|~~~)/.test(line)) {
			inFence = !inFence;
			continue;
		}
		if (inFence) continue;

		let remainder = line;
		if (inComment) {
			const end = remainder.indexOf("-->");
			if (end < 0) continue;
			remainder = remainder.slice(end + 3);
			inComment = false;
		}
		while (remainder.includes("<!--")) {
			const start = remainder.indexOf("<!--");
			const end = remainder.indexOf("-->", start + 4);
			if (end < 0) {
				remainder = remainder.slice(0, start);
				inComment = true;
				break;
			}
			remainder = remainder.slice(0, start) + remainder.slice(end + 3);
		}
		visible.push(remainder);
	}

	return visible;
}

function indentation(raw: string): number {
	return raw.replace(/\t/g, "    ").length;
}

function plainLabel(value: string): string {
	return value
		.replace(/\[\[[^\]]+\]\]/g, "")
		.replace(/[*_`~]/g, "")
		.replace(/\s+/g, " ")
		.trim()
		.replace(/[：:]$/, "")
		.trim();
}

function splitLink(raw: string): { linkPath: string; subpath: string; label: string; linkText: string } | null {
	const [targetPart = "", aliasPart] = raw.split("|", 2);
	const target = targetPart.trim();
	if (!target) return null;
	const subpathIndex = target.search(/[#^]/);
	const linkPath = (subpathIndex >= 0 ? target.slice(0, subpathIndex) : target).trim();
	if (!linkPath) return null;
	const subpath = subpathIndex >= 0 ? target.slice(subpathIndex) : "";
	const fallback = linkPath.split("/").pop()?.replace(/\.md$/i, "") ?? linkPath;
	return {
		linkPath,
		subpath,
		label: aliasPart?.trim() || fallback,
		linkText: target,
	};
}

function linksOnLine(line: string, sourcePath: string, resolve: LinkResolver, seen: Set<string>): LinkedNote[] {
	const links: LinkedNote[] = [];
	for (const match of line.matchAll(WIKILINK)) {
		const parsed = splitLink(match[1] ?? "");
		if (!parsed) continue;
		const path = resolve(parsed.linkPath, sourcePath);
		if (!path) continue;
		const key = `${path}${parsed.subpath}`;
		if (seen.has(key)) continue;
		seen.add(key);
		links.push({ kind: "link", key, label: parsed.label, linkText: parsed.linkText, path, subpath: parsed.subpath });
	}
	return links;
}

function prune(entries: GraphEntry[]): GraphEntry[] {
	const pruned: GraphEntry[] = [];
	for (const entry of entries) {
		if (entry.kind === "link") {
			pruned.push(entry);
			continue;
		}
		const children = prune(entry.children);
		if (children.length > 0) pruned.push({ ...entry, children });
	}
	return pruned;
}

export function countLinks(entries: readonly GraphEntry[]): number {
	return entries.reduce((total, entry) => total + (entry.kind === "link" ? 1 : countLinks(entry.children)), 0);
}

export function graphMatches(entry: GraphEntry, query: string): boolean {
	const normalized = query.trim().toLocaleLowerCase();
	if (!normalized) return true;
	if (entry.label.toLocaleLowerCase().includes(normalized)) return true;
	return entry.kind === "group" && entry.children.some((child) => graphMatches(child, normalized));
}

export function parseDocumentLinks(
	markdown: string,
	sourcePath: string,
	title: string,
	resolve: LinkResolver,
): DocumentLinkGraph {
	const root: GraphEntry[] = [];
	const groups: GroupDraft[] = [];
	const seen = new Set<string>();
	let groupSequence = 0;

	for (const line of visibleMarkdown(markdown)) {
		const list = line.match(/^(\s*)[-*+]\s+(?:\[[ xX-]\]\s+)?(.+)$/);
		const indent = list ? indentation(list[1] ?? "") : -1;
		while (groups.length > 0 && groups[groups.length - 1]!.indent >= indent && indent >= 0) groups.pop();

		const links = linksOnLine(line, sourcePath, resolve, seen);
		if (list && links.length === 0) {
			const label = plainLabel(list[2] ?? "");
			if (!label) continue;
			const group: GroupDraft = {
				kind: "group",
				key: `group:${groupSequence += 1}:${label}`,
				label,
				children: [],
				indent,
			};
			const parent = groups[groups.length - 1];
			(parent?.children ?? root).push(group);
			groups.push(group);
			continue;
		}

		if (links.length === 0) continue;
		const parent = indent >= 0 ? groups[groups.length - 1] : undefined;
		(parent?.children ?? root).push(...links);
	}

	const entries = prune(root);
	return { sourcePath, title, entries, linkCount: countLinks(entries) };
}
