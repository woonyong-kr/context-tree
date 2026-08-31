type LinkResolver = (linkPath: string, sourcePath: string) => string | null;

export interface LinkedNote {
	kind: "link";
	key: string;
	label: string;
	linkText: string;
	path: string;
	subpath: string;
}

interface LinkGroup {
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
		visible.push(maskInlineCodeAndMath(remainder));
	}

	return visible;
}

function maskInlineCodeAndMath(line: string): string {
	let result = "";
	let index = 0;
	while (index < line.length) {
		if (line[index] === "\\" && index + 1 < line.length) {
			result += line.slice(index, index + 2);
			index += 2;
			continue;
		}
		if (line[index] === "`") {
			const run = delimiterRun(line, index, "`");
			const end = findUnescaped(line, "`".repeat(run), index + run);
			if (end >= 0) {
				const length = end + run - index;
				result += " ".repeat(length);
				index += length;
				continue;
			}
		}
		if (line[index] === "$") {
			const run = line[index + 1] === "$" ? 2 : 1;
			const delimiter = "$".repeat(run);
			const end = findUnescaped(line, delimiter, index + run);
			const content = end >= 0 ? line.slice(index + run, end) : "";
			if (end >= 0 && content.trim() && !/^\s|\s$/.test(content)) {
				const length = end + run - index;
				result += " ".repeat(length);
				index += length;
				continue;
			}
		}
		result += line[index];
		index += 1;
	}
	return result;
}

function delimiterRun(value: string, start: number, delimiter: string): number {
	let length = 0;
	while (value[start + length] === delimiter) length += 1;
	return length;
}

function findUnescaped(value: string, needle: string, start: number): number {
	let index = value.indexOf(needle, start);
	while (index >= 0) {
		let slashes = 0;
		for (let cursor = index - 1; cursor >= 0 && value[cursor] === "\\"; cursor -= 1) slashes += 1;
		if (slashes % 2 === 0) return index;
		index = value.indexOf(needle, index + needle.length);
	}
	return -1;
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

function splitMarkdownLink(label: string, rawTarget: string): ReturnType<typeof splitLink> {
	const withoutTitle = rawTarget.trim().replace(/\s+["'][^"']*["']\s*$/, "");
	const target = withoutTitle.startsWith("<") && withoutTitle.endsWith(">")
		? withoutTitle.slice(1, -1)
		: withoutTitle;
	if (/^(?:[a-z][a-z\d+.-]*:|#)/i.test(target)) return null;
	let decoded = target;
	try { decoded = decodeURIComponent(target); } catch { /* Keep the authored target. */ }
	const parsed = splitLink(decoded);
	return parsed ? { ...parsed, label: plainLabel(label) || parsed.label } : null;
}

function linksOnLine(line: string, sourcePath: string, resolve: LinkResolver, seen: Set<string>): LinkedNote[] {
	const links: LinkedNote[] = [];
	for (const { parsed } of linkCandidates(line)) {
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

function linkCandidates(line: string): Array<{ index: number; parsed: ReturnType<typeof splitLink> }> {
	const candidates: Array<{ index: number; parsed: ReturnType<typeof splitLink> }> = [];
	for (let index = 0; index < line.length; index += 1) {
		if (line[index] === "\\") {
			index += 1;
			continue;
		}
		if (line[index] !== "[" || line[index - 1] === "!") continue;
		if (line.startsWith("[[", index)) {
			const end = line.indexOf("]]", index + 2);
			if (end < 0) continue;
			candidates.push({ index, parsed: splitLink(line.slice(index + 2, end)) });
			index = end + 1;
			continue;
		}
		const labelEnd = matchingDelimiter(line, index, "[", "]");
		if (labelEnd < 0 || line[labelEnd + 1] !== "(") continue;
		const targetEnd = matchingDelimiter(line, labelEnd + 1, "(", ")");
		if (targetEnd < 0) continue;
		candidates.push({
			index,
			parsed: splitMarkdownLink(
				line.slice(index + 1, labelEnd),
				line.slice(labelEnd + 2, targetEnd),
			),
		});
		index = targetEnd;
	}
	return candidates;
}

function matchingDelimiter(
	value: string,
	start: number,
	opening: "[" | "(",
	closing: "]" | ")",
): number {
	let depth = 0;
	for (let index = start; index < value.length; index += 1) {
		if (value[index] === "\\") {
			index += 1;
			continue;
		}
		if (value[index] === opening) depth += 1;
		else if (value[index] === closing) {
			depth -= 1;
			if (depth === 0) return index;
		}
	}
	return -1;
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
				key: `group:${sourcePath}:${groupSequence += 1}:${label}`,
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
	const heading = visibleMarkdown(markdown)
		.map((line) => line.match(/^\s*#\s+(.+)$/)?.[1])
		.find((value): value is string => Boolean(value));
	const displayTitle = heading ? plainLabel(heading) : title;
	return { sourcePath, title: displayTitle || title, entries, linkCount: countLinks(entries) };
}
