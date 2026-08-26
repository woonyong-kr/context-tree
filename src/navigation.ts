export type NodeVisualKind =
	| "hub"
	| "project"
	| "person"
	| "book"
	| "resource"
	| "entity"
	| "topic"
	| "detail"
	| "unknown";

export interface ParsedParentLink {
	linkPath: string;
	linkText: string;
	label: string;
}

export interface GraphNavigationTarget extends ParsedParentLink {
	path: string;
	kind: NodeVisualKind;
}

const ENTITY_KINDS = new Map<string, NodeVisualKind>([
	["project", "project"],
	["프로젝트", "project"],
	["person", "person"],
	["인물", "person"],
	["book", "book"],
	["책", "book"],
	["resource", "resource"],
	["리소스", "resource"],
]);

const FACET_KINDS = new Map<string, NodeVisualKind>([
	["project", "project"],
	["프로젝트", "project"],
	["person", "person"],
	["인물", "person"],
	["book", "book"],
	["책", "book"],
	["resource", "resource"],
	["리소스", "resource"],
]);

function record(value: unknown): Record<string, unknown> | null {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? value as Record<string, unknown>
		: null;
}

function normalizedString(value: unknown): string {
	return typeof value === "string" ? value.trim().toLocaleLowerCase() : "";
}

function stringValues(value: unknown): string[] {
	if (typeof value === "string") return [value];
	return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function nodeVisualKind(frontmatter: unknown): NodeVisualKind {
	const metadata = record(frontmatter);
	if (!metadata) return "unknown";

	const nodeKind = normalizedString(metadata.node_kind);
	if (nodeKind === "root" || nodeKind === "hub") return "hub";
	if (nodeKind === "topic") return "topic";
	if (nodeKind === "detail") return "detail";

	const entityKind = ENTITY_KINDS.get(normalizedString(metadata.entity_kind));
	if (entityKind) return entityKind;

	for (const facet of stringValues(metadata.facets)) {
		const kind = FACET_KINDS.get(facet.trim().toLocaleLowerCase());
		if (kind) return kind;
	}

	return nodeKind === "entity" ? "entity" : "unknown";
}

export function parseParentLink(value: unknown): ParsedParentLink | null {
	const raw = stringValues(value).map((item) => item.trim()).find(Boolean);
	if (!raw) return null;
	const wikilink = raw.match(/^\[\[([^\]]+)\]\]$/)?.[1]?.trim() ?? raw;
	const [targetPart = "", aliasPart] = wikilink.split("|", 2);
	const linkText = targetPart.trim();
	if (!linkText) return null;
	const linkPath = linkText.split(/[#^]/, 1)[0]?.trim() ?? "";
	if (!linkPath) return null;
	const fallback = linkPath.split("/").pop()?.replace(/\.md$/i, "") ?? linkPath;
	return { linkPath, linkText, label: aliasPart?.trim() || fallback };
}
