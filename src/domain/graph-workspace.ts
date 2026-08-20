import { DEFAULT_GRAPH_PHYSICS, GRAPH_PHYSICS_LIMITS, GraphPhysics } from "../graph/simulation";

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

function recordFrom(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value)
		? value as Record<string, unknown>
		: undefined;
}

function finiteNumber(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizedPath(path: string): string {
	return path.trim().replace(/^\/+|\/+$/g, "");
}

function uniquePaths(paths: unknown): string[] {
	if (!Array.isArray(paths)) return [];
	return [...new Set(paths
		.filter((path): path is string => typeof path === "string")
		.map(normalizedPath)
		.filter(Boolean))];
}

function scopeFrom(input: GraphScopeInput): GraphScope {
	return {
		kind: input.kind,
		folders: uniquePaths(input.folders ?? []),
		includePaths: uniquePaths(input.includePaths ?? []),
		excludePaths: uniquePaths(input.excludePaths ?? []),
	};
}

function graphPhysicsFrom(input: unknown): GraphPhysics {
	const candidate = recordFrom(input);
	const bounded = (value: unknown, key: keyof GraphPhysics): number => {
		const number = finiteNumber(value);
		const limits = GRAPH_PHYSICS_LIMITS[key];
		if (number === undefined) return DEFAULT_GRAPH_PHYSICS[key];
		return Math.min(limits.max, Math.max(limits.min, number));
	};
	return {
		linkStrength: bounded(candidate?.linkStrength, "linkStrength"),
		repulsion: bounded(candidate?.repulsion, "repulsion"),
		linkGap: bounded(candidate?.linkGap, "linkGap"),
	};
}

/** Normalises a graph identifier before it can become a settings or Vault key. */
export function graphWorkspaceId(text: string): string {
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
	// traversal segments on every supported filesystem. These object prototype
	// keys are equally unsafe because graph ids index persisted plain objects.
	return safe === "." || safe === ".." || safe === "__proto__"
		|| safe === "constructor" || safe === "prototype" || !safe
		? "graph"
		: safe;
}

function nextId(name: string, existingIds: readonly string[]): string {
	const used = new Set(existingIds);
	const base = graphWorkspaceId(name);
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
		physics: graphPhysicsFrom(physics),
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

/**
 * Local view state is an optimisation, not source data. Reject partial or
 * malformed persisted state so an old/corrupt settings file cannot create NaN
 * transforms or accidentally restore another graph's camera.
 */
export function migrateGraphViewStates(stored: unknown, graphIds: readonly string[]): Record<string, GraphViewState> {
	const candidates = recordFrom(stored);
	if (!candidates) return {};
	const migrated: Record<string, GraphViewState> = {};
	for (const graphId of new Set(graphIds)) {
		const candidate = recordFrom(candidates[graphId]);
		const pan = recordFrom(candidate?.pan);
		const zoom = finiteNumber(candidate?.zoom);
		const positions = recordFrom(candidate?.positions);
		const panX = finiteNumber(pan?.x);
		const panY = finiteNumber(pan?.y);
		if (panX === undefined || panY === undefined || zoom === undefined || zoom <= 0 || !positions) continue;
		const validPositions: GraphViewState["positions"] = {};
		for (const [nodeId, value] of Object.entries(positions)) {
			const position = recordFrom(value);
			const x = finiteNumber(position?.x);
			const y = finiteNumber(position?.y);
			if (x === undefined || y === undefined) continue;
			validPositions[nodeId] = { x, y, pinned: position?.pinned === true };
		}
		const focusedNodeId = typeof candidate?.focusedNodeId === "string" ? candidate.focusedNodeId : undefined;
		const pinnedOpenNodeIds = Array.isArray(candidate?.pinnedOpenNodeIds)
			? [...new Set(candidate.pinnedOpenNodeIds.filter((nodeId): nodeId is string => typeof nodeId === "string"))]
			: undefined;
		migrated[graphId] = {
			pan: { x: panX, y: panY },
			zoom,
			...(focusedNodeId ? { focusedNodeId } : {}),
			...(pinnedOpenNodeIds ? { pinnedOpenNodeIds } : {}),
			positions: validPositions,
		};
	}
	return migrated;
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
		const ids: string[] = [];
		return stored.map((graph, index) => {
			const id = nextId(graph.id.trim() || `graph-${index + 1}`, ids);
			ids.push(id);
			return {
				id,
				name: graph.name.trim() || "지식 그래프",
				scope: scopeFrom(graph.scope),
				physics: graphPhysicsFrom(graph.physics),
			};
		});
	}
	const folder = normalizedPath(legacySourceFolder ?? "");
	return [createGraphWorkspace(
		"지식 그래프",
		[],
		folder ? { kind: "folders", folders: [folder] } : { kind: "all" },
		legacyPhysics,
	)];
}
