import { DEFAULT_GRAPH_PHYSICS, GraphPhysics } from "../graph/simulation";

/**
 * A graph is a saved lens over Markdown notes, never a second copy of them.
 * Scope determines which eligible notes participate in that lens.
 */
export type GraphScope =
	| { kind: "all"; folders: string[]; includePaths: string[]; excludePaths: string[] }
	| { kind: "folders"; folders: string[]; includePaths: string[]; excludePaths: string[] }
	| { kind: "curated"; folders: string[]; includePaths: string[]; excludePaths: string[] }
	| { kind: "hybrid"; folders: string[]; includePaths: string[]; excludePaths: string[] };

export interface GraphWorkspace {
	id: string;
	name: string;
	scope: GraphScope;
	physics: GraphPhysics;
}

/** Local-only camera and deliberate card placement. Markdown is never stored here. */
export interface GraphViewState {
	pan: { x: number; y: number };
	zoom: number;
	focusedNodeId?: string;
	/** Deliberately open reader/source cards for this local graph workspace. */
	pinnedOpenNodeIds?: string[];
	positions: Record<string, { x: number; y: number; pinned: boolean }>;
}

export type GraphScopeInput = Partial<GraphScope> & Pick<GraphScope, "kind">;

function normalizedPath(path: string): string {
	return path.trim().replace(/^\/+|\/+$/g, "");
}

function uniquePaths(paths: readonly string[]): string[] {
	return [...new Set(paths.map(normalizedPath).filter(Boolean))];
}

function scopeFrom(input: GraphScopeInput): GraphScope {
	return {
		kind: input.kind,
		folders: uniquePaths(input.folders ?? []),
		includePaths: uniquePaths(input.includePaths ?? []),
		excludePaths: uniquePaths(input.excludePaths ?? []),
	};
}

function slug(text: string): string {
	// Keep Unicode letters so independently named Korean workspaces do not all
	// collapse into `graph`, while still excluding path separators and filename
	// characters that are unsafe in a vault folder.
	const safe = text
		.trim()
		.toLocaleLowerCase()
		.replace(/[\\/:*?"<>|]+/g, "-")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-+|-+$/g, "");
	// `.` and `..` are legal-looking after separator removal but are directory
	// traversal segments on every supported filesystem.
	return safe === "." || safe === ".." || !safe ? "graph" : safe;
}

function nextId(name: string, existingIds: readonly string[]): string {
	const used = new Set(existingIds);
	const base = slug(name);
	if (!used.has(base)) return base;
	let index = 2;
	while (used.has(`${base}-${index}`)) index += 1;
	return `${base}-${index}`;
}

export function createGraphWorkspace(
	name: string,
	existingIds: readonly string[],
	scope: GraphScopeInput = { kind: "curated" },
	physics: GraphPhysics = DEFAULT_GRAPH_PHYSICS,
): GraphWorkspace {
	const normalizedName = name.trim() || "새 지식 그래프";
	const id = nextId(normalizedName, existingIds);
	const normalizedScope = scopeFrom(scope);
	// The graph picker defaults to folder scope. Giving that workspace a stable
	// default folder prevents a newly created graph from starting as a confusing
	// range that can never discover its own new cards.
	if (normalizedScope.kind === "folders" && normalizedScope.folders.length === 0) {
		normalizedScope.folders = [`maps/context-graph/${id}`];
	}
	return {
		id,
		name: normalizedName,
		scope: normalizedScope,
		physics: { ...DEFAULT_GRAPH_PHYSICS, ...physics },
	};
}

/**
 * New cards need a durable vault location even when a workspace is curated or
 * global. Folder-scoped graphs preserve the author's chosen folder; all other
 * graphs receive a predictable, private-to-the-workspace default.
 */
export function graphNoteFolder(graph: Pick<GraphWorkspace, "id" | "scope">): string {
	return graph.scope.folders[0] ?? `maps/context-graph/${graph.id}`;
}

function isInFolder(path: string, folder: string): boolean {
	return path === folder || path.startsWith(`${folder}/`);
}

/** Exclusions always win, so a shared note can be intentionally hidden in one graph only. */
export function graphScopeIncludesPath(scope: GraphScope, path: string): boolean {
	const normalized = normalizedPath(path);
	if (!normalized || scope.excludePaths.includes(normalized)) return false;
	const inFolder = scope.folders.some((folder) => isInFolder(normalized, folder));
	const explicitlyIncluded = scope.includePaths.includes(normalized);
	switch (scope.kind) {
		case "all": return true;
		case "folders": return inFolder;
		case "curated": return explicitlyIncluded;
		case "hybrid": return inFolder || explicitlyIncluded;
	}
}

/**
 * Adds one opted-in note without broadening a graph's existing folder rule.
 * A folder graph becomes hybrid only when the selected note lives outside it.
 */
export function includePathInScope(scope: GraphScope, path: string): GraphScope {
	const normalized = normalizedPath(path);
	if (!normalized || graphScopeIncludesPath(scope, normalized)) return scope;
	return {
		kind: scope.kind === "folders" ? "hybrid" : scope.kind,
		folders: scope.folders,
		includePaths: uniquePaths([...scope.includePaths, normalized]),
		excludePaths: scope.excludePaths.filter((item) => item !== normalized),
	};
}

function isGraphWorkspace(value: unknown): value is GraphWorkspace {
	if (!value || typeof value !== "object") return false;
	const candidate = value as Partial<GraphWorkspace>;
	return typeof candidate.id === "string" && typeof candidate.name === "string"
		&& !!candidate.scope && typeof candidate.scope === "object"
		&& ["all", "folders", "curated", "hybrid"].includes((candidate.scope as Partial<GraphScope>).kind ?? "")
		&& !!candidate.physics && typeof candidate.physics === "object";
}

/**
 * Migrates the original plugin's one-folder preference to one graph workspace.
 * No legacy vault is widened during this conversion.
 */
export function migrateGraphWorkspaces(
	stored: unknown,
	legacySourceFolder: string | undefined,
	legacyPhysics: GraphPhysics | undefined,
): GraphWorkspace[] {
	if (Array.isArray(stored) && stored.every(isGraphWorkspace) && stored.length > 0) {
		return stored.map((graph, index) => ({
			id: graph.id.trim() || `graph-${index + 1}`,
			name: graph.name.trim() || "지식 그래프",
			scope: scopeFrom(graph.scope),
			physics: { ...DEFAULT_GRAPH_PHYSICS, ...graph.physics },
		}));
	}
	const folder = normalizedPath(legacySourceFolder ?? "");
	return [createGraphWorkspace(
		"지식 그래프",
		[],
		folder ? { kind: "folders", folders: [folder] } : { kind: "all" },
		legacyPhysics,
	)];
}
