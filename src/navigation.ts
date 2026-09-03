export type NodeVisualKind =
	| "hub"
	| "project"
	| "person"
	| "schedule"
	| "book"
	| "resource"
	| "entity"
	| "topic"
	| "detail"
	| "unknown";

interface ParsedParentLink {
	linkPath: string;
	linkText: string;
	label: string;
}

export interface GraphNavigationTarget extends ParsedParentLink {
	path: string;
	kind: NodeVisualKind;
}

const HIDDEN_PATH_SEGMENTS = new Set([
	"private",
	"_sources",
	"_generated",
	"generated",
	"archive",
	"archived",
]);

const HIDDEN_LIFECYCLES = new Set(["archived", "retired", "superseded"]);

const ENTITY_KINDS = new Map<string, NodeVisualKind>([
	["project", "project"],
	["프로젝트", "project"],
	["person", "person"],
	["인물", "person"],
	["event", "schedule"],
	["schedule", "schedule"],
	["calendar-event", "schedule"],
	["일정", "schedule"],
	["캘린더", "schedule"],
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
	["event", "schedule"],
	["schedule", "schedule"],
	["calendar-event", "schedule"],
	["일정", "schedule"],
	["캘린더", "schedule"],
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

export function isGraphDestinationVisible(path: string, frontmatter: unknown): boolean {
	const segments = path
		.replace(/\\/g, "/")
		.split("/")
		.map((segment) => segment.trim().toLocaleLowerCase())
		.filter(Boolean);
	if (segments.length === 0 || segments[0]?.startsWith(".")) return false;
	if (segments.some((segment) => HIDDEN_PATH_SEGMENTS.has(segment))) return false;

	const metadata = record(frontmatter);
	if (!metadata) return true;
	return ![metadata.status, metadata.lifecycle, metadata.lifecycle_status]
		.map(normalizedString)
		.some((value) => HIDDEN_LIFECYCLES.has(value));
}

export function nodeVisualKind(frontmatter: unknown): NodeVisualKind {
	const metadata = record(frontmatter);
	if (!metadata) return "unknown";

	const type = normalizedString(metadata.type);
	if (type === "calendar-event" || type === "event" || type === "schedule") return "schedule";

	const entityKind = ENTITY_KINDS.get(normalizedString(metadata.entity_kind));
	const facetKinds = new Set<NodeVisualKind>();
	for (const facet of stringValues(metadata.facets)) {
		const kind = FACET_KINDS.get(facet.trim().toLocaleLowerCase());
		if (kind) facetKinds.add(kind);
	}
	for (const semanticKind of ["schedule", "person", "project", "book", "resource"] as const) {
		if (entityKind === semanticKind || facetKinds.has(semanticKind)) return semanticKind;
	}

	const nodeKind = normalizedString(metadata.node_kind);
	if (nodeKind === "root" || nodeKind === "hub") return "hub";
	if (nodeKind === "topic") return "topic";
	if (nodeKind === "detail") return "detail";

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
