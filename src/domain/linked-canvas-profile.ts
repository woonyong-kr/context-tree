import type { JsonCanvasDocument, JsonCanvasFileNode, LinkedCanvasManagedState } from "./json-canvas";
import { isContextRelationType } from "./relations";
import type { ContextRelationType } from "../types";

const LINKED_CANVAS_SCHEMA_VERSION = 1;
const LINKED_CANVAS_PROFILE_SUFFIX = ".linked-canvas.json";

function isMarkdownPath(value: string): boolean {
	return value.toLowerCase().endsWith(".md");
}

type CanvasRelationSync = "visual-only" | "frontmatter-additive";

export interface LinkedCanvasProfile {
	schemaVersion: typeof LINKED_CANVAS_SCHEMA_VERSION;
	canvasPath: string;
	rootPaths: string[];
	seedPaths: string[];
	depth: number;
	includeOutgoing: boolean;
	includeBacklinks: boolean;
	autoExpandDroppedMarkdown: boolean;
	relationSync: CanvasRelationSync;
	excludedPaths: string[];
	managed: LinkedCanvasManagedState;
}

function record(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value)
		? value as Record<string, unknown>
		: undefined;
}

function path(value: unknown): string {
	return typeof value === "string" ? value.trim().replace(/^\/+/, "") : "";
}

function uniquePaths(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return [...new Set(value.map(path).filter(Boolean))];
}

function managedState(value: unknown): LinkedCanvasManagedState {
	const item = record(value);
	const rawFiles = record(item?.filesByNodeId);
	const filesByNodeId: Record<string, string> = {};
	for (const [id, file] of Object.entries(rawFiles ?? {})) {
		const normalized = path(file);
		if (id && normalized) filesByNodeId[id] = normalized;
	}
	return {
		filesByNodeId,
		edgeIds: Array.isArray(item?.edgeIds)
			? [...new Set(item.edgeIds.filter((id): id is string => typeof id === "string" && !!id))]
			: [],
	};
}

export function createLinkedCanvasProfile(canvasPath: string, rootPath = ""): LinkedCanvasProfile {
	return {
		schemaVersion: LINKED_CANVAS_SCHEMA_VERSION,
		canvasPath: path(canvasPath),
		rootPaths: [path(rootPath)].filter(Boolean),
		seedPaths: [],
		// A new whiteboard starts with the card the user chose. Neighbour
		// expansion is an explicit opt-in so index notes cannot flood the board.
		depth: 0,
		includeOutgoing: true,
		includeBacklinks: true,
		autoExpandDroppedMarkdown: true,
		relationSync: "visual-only",
		excludedPaths: [],
		managed: { filesByNodeId: {}, edgeIds: [] },
	};
}

export function createLinkedCanvasProfileForExistingCanvas(
	canvasPath: string,
	markdownPaths: readonly string[],
): LinkedCanvasProfile | undefined {
	const roots = uniquePaths(markdownPaths);
	if (!roots.length) return undefined;
	return {
		...createLinkedCanvasProfile(canvasPath, roots[0]),
		rootPaths: roots,
		// Enabling an existing Canvas is the deliberate automation action.
		depth: 1,
	};
}

/** Enables the one-hop automation once without changing a board that already opted in. */
export function enableLinkedCanvasExpansion(profile: LinkedCanvasProfile): boolean {
	if (profile.depth > 0) return false;
	profile.depth = 1;
	return true;
}

export function parseLinkedCanvasProfile(source: string): LinkedCanvasProfile | undefined {
	try {
		const value = record(JSON.parse(source));
		if (!value || value.schemaVersion !== LINKED_CANVAS_SCHEMA_VERSION) return undefined;
		const canvasPath = path(value.canvasPath);
		const rootPaths = uniquePaths(value.rootPaths);
		if (!canvasPath.endsWith(".canvas")) return undefined;
		const depth = typeof value.depth === "number" && Number.isInteger(value.depth)
			? Math.max(0, Math.min(3, value.depth))
			: 1;
		return {
			schemaVersion: LINKED_CANVAS_SCHEMA_VERSION,
			canvasPath,
			rootPaths,
			seedPaths: uniquePaths(value.seedPaths),
			depth,
			includeOutgoing: value.includeOutgoing !== false,
			includeBacklinks: value.includeBacklinks !== false,
			autoExpandDroppedMarkdown: value.autoExpandDroppedMarkdown !== false,
			relationSync: value.relationSync === "frontmatter-additive" ? "frontmatter-additive" : "visual-only",
			excludedPaths: uniquePaths(value.excludedPaths),
			managed: managedState(value.managed),
		};
	} catch {
		return undefined;
	}
}

export function serializeLinkedCanvasProfile(profile: LinkedCanvasProfile): string {
	return `${JSON.stringify(profile, null, "\t")}\n`;
}

/**
 * A source deliberately belongs to a Linked Canvas when it is an authored root
 * or a manually added seed. A derived one-hop card does not claim the source:
 * opening that note may start its own independent spatial context.
 */
export function linkedCanvasIncludesSource(profile: LinkedCanvasProfile, sourcePath: string): boolean {
	const normalized = path(sourcePath);
	if (!normalized) return false;
	return profile.rootPaths.includes(normalized)
		|| profile.seedPaths.includes(normalized);
}

export function linkedCanvasProfilePath(canvasPath: string): string {
	return canvasPath.replace(/\.canvas$/i, LINKED_CANVAS_PROFILE_SUFFIX);
}

export function linkedCanvasProfileFileName(profilePath: string): boolean {
	return profilePath.endsWith(LINKED_CANVAS_PROFILE_SUFFIX);
}

export function renamePathInLinkedCanvasProfile(
	profile: LinkedCanvasProfile,
	previousPath: string,
	nextPath: string,
): LinkedCanvasProfile {
	const rename = (value: string): string => value === previousPath ? nextPath : value;
	return {
		...profile,
		canvasPath: rename(profile.canvasPath),
		rootPaths: uniquePaths(profile.rootPaths.map(rename)),
		seedPaths: uniquePaths(profile.seedPaths.map(rename)),
		excludedPaths: uniquePaths(profile.excludedPaths.map(rename)),
		managed: {
			filesByNodeId: Object.fromEntries(Object.entries(profile.managed.filesByNodeId)
				.map(([nodeId, file]) => [nodeId, rename(file)])),
			edgeIds: profile.managed.edgeIds,
		},
	};
}

/** A missing generated card is an intentional canvas removal, not a request to recreate it. */
export function pathsRemovedFromCanvas(profile: LinkedCanvasProfile, canvas: JsonCanvasDocument): string[] {
	const nodeIds = new Set(canvas.nodes.map((node) => node.id));
	return [...new Set(Object.entries(profile.managed.filesByNodeId)
		.filter(([nodeId]) => !nodeIds.has(nodeId))
		.map(([, file]) => file))];
}

/** Removes only the pre-0.5.8 bug artifact where Canvas file-card backlinks
 * projected the Canvas into itself. No other out-of-scope card is deleted. */
export function removeManagedCanvasSelfCard(
	profile: LinkedCanvasProfile,
	canvas: JsonCanvasDocument,
): JsonCanvasDocument {
	const selfNodeIds = new Set(canvas.nodes
		.filter((node): node is JsonCanvasFileNode => node.type === "file"
			&& node.file === profile.canvasPath
			&& profile.managed.filesByNodeId[node.id] === profile.canvasPath)
		.map((node) => node.id));
	if (!selfNodeIds.size) return canvas;
	for (const nodeId of selfNodeIds) delete profile.managed.filesByNodeId[nodeId];
	return {
		...canvas,
		nodes: canvas.nodes.filter((node) => !selfNodeIds.has(node.id)),
		edges: canvas.edges.filter((edge) => !selfNodeIds.has(edge.fromNode) && !selfNodeIds.has(edge.toNode)),
	};
}

/** Manually dropped Markdown cards become additional one-hop seeds on this linked canvas. */
export function manualMarkdownSeeds(profile: LinkedCanvasProfile, canvas: JsonCanvasDocument): string[] {
	if (!profile.autoExpandDroppedMarkdown) return [];
	const managedIds = new Set(Object.keys(profile.managed.filesByNodeId));
	const excluded = new Set(profile.excludedPaths);
	const known = new Set([...profile.rootPaths, ...profile.seedPaths].filter((path) => !excluded.has(path)));
	return canvas.nodes
		.filter((node): node is JsonCanvasFileNode => node.type === "file" && isMarkdownPath(node.file))
		.filter((node) => !managedIds.has(node.id) && !known.has(node.file))
		.map((node) => node.file);
}

export interface ManualCanvasRelation {
	fromPath: string;
	toPath: string;
	label?: ContextRelationType;
}

/** Only user-owned directed edges between Markdown file cards can become note relations. */
export function manualCanvasRelations(profile: LinkedCanvasProfile, canvas: JsonCanvasDocument): ManualCanvasRelation[] {
	if (profile.relationSync !== "frontmatter-additive") return [];
	const managedEdgeIds = new Set(profile.managed.edgeIds);
	const markdownByNodeId = new Map(canvas.nodes
		.filter((node): node is JsonCanvasFileNode => node.type === "file" && isMarkdownPath(node.file))
		.map((node) => [node.id, node.file]));
	const seen = new Set<string>();
	const relations: ManualCanvasRelation[] = [];
	for (const edge of canvas.edges) {
		if (managedEdgeIds.has(edge.id)) continue;
		// Unsupported labels remain meaningful visual language. Do not silently
		// coerce them to `related` in a source note. An unlabeled edge maps to the
		// default relationship type at the write boundary.
		const rawLabel = edge.label;
		if (rawLabel && !isContextRelationType(rawLabel)) continue;
		const label: ContextRelationType | undefined = rawLabel && isContextRelationType(rawLabel)
			? rawLabel
			: undefined;
		const fromPath = markdownByNodeId.get(edge.fromNode);
		const toPath = markdownByNodeId.get(edge.toNode);
		if (!fromPath || !toPath || fromPath === toPath) continue;
		const key = `${fromPath}\u0000${toPath}\u0000${edge.label ?? ""}`;
		if (seen.has(key)) continue;
		seen.add(key);
		relations.push({ fromPath, toPath, ...(label ? { label } : {}) });
	}
	return relations;
}
