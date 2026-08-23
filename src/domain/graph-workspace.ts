import { DEFAULT_GRAPH_PHYSICS, GRAPH_PHYSICS_LIMITS, GraphPhysics } from "../graph/simulation";

/**
 * A graph is a saved lens over Markdown notes, never a second copy of them.
 * Scope determines which eligible notes participate in that lens.
 */
export type GraphScope =
	| { kind: "all"; folders: string[]; includePaths: string[]; excludePaths: string[] }
	| { kind: "folders"; folders: string[]; includePaths: string[]; excludePaths: string[] }
	| { kind: "curated"; folders: string[]; includePaths: string[]; excludePaths: string[] }
	| { kind: "hybrid"; folders: string[]; includePaths: string[]; excludePaths: string[] }
	| { kind: "rooted"; rootPath: string; expandedPaths: string[]; folders: string[]; includePaths: string[]; excludePaths: string[] };

export type RootedGraphScope = Extract<GraphScope, { kind: "rooted" }>;

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

export type GraphScopeInput = {
	kind: GraphScope["kind"];
	folders?: string[];
	includePaths?: string[];
	excludePaths?: string[];
	rootPath?: string;
	expandedPaths?: string[];
};

function recordFrom(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value)
		? value as Record<string, unknown>
		: undefined;
}

function finiteNumber(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizedPath(path: unknown): string {
	return typeof path === "string" ? path.trim().replace(/^\/+|\/+$/g, "") : "";
}

function uniquePaths(paths: unknown): string[] {
	if (!Array.isArray(paths)) return [];
	return [...new Set(paths
		.filter((path): path is string => typeof path === "string")
		.map(normalizedPath)
		.filter(Boolean))];
}

function scopeFrom(input: GraphScopeInput): GraphScope {
	const common = {
		kind: input.kind,
		folders: uniquePaths(input.folders ?? []),
		includePaths: uniquePaths(input.includePaths ?? []),
		excludePaths: uniquePaths(input.excludePaths ?? []),
	};
	if (input.kind === "rooted") {
		return {
			...common,
			kind: "rooted",
			rootPath: normalizedPath(input.rootPath ?? ""),
			expandedPaths: uniquePaths(input.expandedPaths ?? []),
		};
	}
	return {
		kind: input.kind,
		folders: common.folders,
		includePaths: common.includePaths,
		excludePaths: common.excludePaths,
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
	const normalizedName = name.trim() || "Context Graph";
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

/** Creates an in-memory current-note lens. It becomes durable only after Save. */
export function createCurrentNoteGraph(
	path: string,
	title: string,
	displayName = title.trim() || "Context Graph",
): GraphWorkspace & { scope: RootedGraphScope } {
	const rootPath = normalizedPath(path);
	return {
		id: currentNoteGraphId(rootPath),
		name: displayName.trim() || title.trim() || "Context Graph",
		scope: {
			kind: "rooted",
			rootPath,
			expandedPaths: [],
			folders: [],
			includePaths: [],
			excludePaths: [],
		},
		physics: { ...DEFAULT_GRAPH_PHYSICS },
	};
}

export function currentNoteGraphId(path: string): string {
	return `current-note:${normalizedPath(path)}`;
}

export function currentNoteGraphPath(id: string): string | undefined {
	if (!id.startsWith("current-note:")) return undefined;
	const path = normalizedPath(id.slice("current-note:".length));
	return path || undefined;
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
		case "rooted": return normalized === scope.rootPath || scope.expandedPaths.includes(normalized);
	}
}

/**
 * Adds one opted-in note without broadening a graph's existing folder rule.
 * A folder graph becomes hybrid only when the selected note lives outside it.
 */
export function includePathInScope(scope: GraphScope, path: string): GraphScope {
	const normalized = normalizedPath(path);
	if (!normalized || graphScopeIncludesPath(scope, normalized)) return scope;
	if (scope.kind === "rooted") {
		return {
			...scope,
			expandedPaths: uniquePaths([...scope.expandedPaths, normalized]),
			excludePaths: scope.excludePaths.filter((item) => item !== normalized),
		};
	}
	return {
		kind: scope.kind === "folders" ? "hybrid" : scope.kind,
		folders: scope.folders,
		includePaths: uniquePaths([...scope.includePaths, normalized]),
		excludePaths: scope.excludePaths.filter((item) => item !== normalized),
	};
}

/** Hides one note from this graph without changing the Markdown source. */
export function excludePathFromScope(scope: GraphScope, path: string): GraphScope {
	const normalized = normalizedPath(path);
	if (!normalized || (scope.kind === "rooted" && normalized === scope.rootPath)) return scope;
	if (scope.kind === "rooted") {
		return {
			...scope,
			expandedPaths: scope.expandedPaths.filter((item) => item !== normalized),
			includePaths: scope.includePaths.filter((item) => item !== normalized),
			excludePaths: uniquePaths([...scope.excludePaths, normalized]),
		};
	}
	return {
		...scope,
		includePaths: scope.includePaths.filter((item) => item !== normalized),
		excludePaths: uniquePaths([...scope.excludePaths, normalized]),
	};
}

/** Computes a root plus one-hop neighbourhood for every deliberately expanded note. */
export function rootedGraphPaths(
	rootPath: string,
	expandedPaths: readonly string[],
	outgoingByPath: Readonly<Record<string, readonly string[]>>,
	excludePaths: readonly string[] = [],
): string[] {
	const excluded = new Set(excludePaths.map(normalizedPath).filter(Boolean));
	const normalizedRoot = normalizedPath(rootPath);
	// A rooted graph cannot remove its own root. Callers also hide this action,
	// but the domain rule keeps a malformed definition usable.
	excluded.delete(normalizedRoot);
	const seeds = new Set([normalizedRoot, ...expandedPaths.map(normalizedPath)]
		.filter((path) => path && !excluded.has(path)));
	const visible = new Set(seeds);
	const incomingByTarget = new Map<string, string[]>();
	for (const [source, targets] of Object.entries(outgoingByPath)) {
		for (const target of targets) {
			const normalizedTarget = normalizedPath(target);
			if (!normalizedTarget) continue;
			const sources = incomingByTarget.get(normalizedTarget) ?? [];
			sources.push(source);
			incomingByTarget.set(normalizedTarget, sources);
		}
	}
	for (const seed of seeds) {
		for (const target of outgoingByPath[seed] ?? []) {
			const normalized = normalizedPath(target);
			if (normalized && !excluded.has(normalized)) visible.add(normalized);
		}
		for (const source of incomingByTarget.get(seed) ?? []) {
			const normalized = normalizedPath(source);
			if (normalized && !excluded.has(normalized)) visible.add(normalized);
		}
	}
	return [...visible].sort((left, right) => left.localeCompare(right));
}

export type RootedNeighbourhoodAction = "expand" | "collapse" | "none";

/**
 * Returns the reversible action for one visible card in a rooted graph.
 * A leaf that would add no new paths exposes no misleading expand control.
 */
export function rootedNeighbourhoodAction(
	scope: RootedGraphScope,
	path: string,
	outgoingByPath: Readonly<Record<string, readonly string[]>>,
): RootedNeighbourhoodAction {
	const normalized = normalizedPath(path);
	if (!normalized || normalized === scope.rootPath) return "none";
	if (scope.expandedPaths.includes(normalized)) return "collapse";
	const current = new Set(rootedGraphPaths(
		scope.rootPath,
		scope.expandedPaths,
		outgoingByPath,
		scope.excludePaths,
	));
	const expanded = rootedGraphPaths(
		scope.rootPath,
		[...scope.expandedPaths, normalized],
		outgoingByPath,
		scope.excludePaths,
	);
	return expanded.some((candidate) => !current.has(candidate)) ? "expand" : "none";
}

/** Collapses one deliberately expanded seed without removing its Markdown note. */
export function collapsePathInScope(scope: GraphScope, path: string): GraphScope {
	if (scope.kind !== "rooted") return scope;
	const normalized = normalizedPath(path);
	if (!normalized || !scope.expandedPaths.includes(normalized)) return scope;
	return {
		...scope,
		expandedPaths: scope.expandedPaths.filter((candidate) => candidate !== normalized),
	};
}

export function renamePathInScope(scope: GraphScope, previousPath: string, nextPath: string): GraphScope {
	const previous = normalizedPath(previousPath);
	const next = normalizedPath(nextPath);
	if (!previous || !next || previous === next) return scope;
	const rename = (path: string): string => path === previous ? next : path;
	const common = {
		...scope,
		includePaths: uniquePaths(scope.includePaths.map(rename)),
		excludePaths: uniquePaths(scope.excludePaths.map(rename)),
	};
	return scope.kind === "rooted"
		? {
			...common,
			kind: "rooted",
			rootPath: rename(scope.rootPath),
			expandedPaths: uniquePaths(scope.expandedPaths.map(rename)),
		}
		: common;
}

export function renamePathInViewState(
	state: GraphViewState,
	previousPath: string,
	nextPath: string,
): GraphViewState {
	const renameId = (id: string): string => {
		if (!id.startsWith(`${previousPath}::`)) return id;
		const suffix = id.slice(previousPath.length + 2);
		return `${nextPath}::${suffix === previousPath ? nextPath : suffix}`;
	};
	return {
		...state,
		focusedNodeId: state.focusedNodeId ? renameId(state.focusedNodeId) : undefined,
		pinnedOpenNodeIds: state.pinnedOpenNodeIds?.map(renameId),
		positions: Object.fromEntries(Object.entries(state.positions).map(([id, position]) => [renameId(id), position])),
	};
}

function isGraphWorkspace(value: unknown): value is GraphWorkspace {
	if (!value || typeof value !== "object") return false;
	const candidate = value as Partial<GraphWorkspace>;
	return typeof candidate.id === "string" && typeof candidate.name === "string"
		&& !!candidate.scope && typeof candidate.scope === "object"
		&& ["all", "folders", "curated", "hybrid", "rooted"].includes((candidate.scope as Partial<GraphScope>).kind ?? "")
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
				name: graph.name.trim() || "Context Graph",
				scope: scopeFrom(graph.scope),
				physics: graphPhysicsFrom(graph.physics),
			};
		});
	}
	const folder = normalizedPath(legacySourceFolder ?? "");
	return [createGraphWorkspace(
		"Context Graph",
		[],
		folder ? { kind: "folders", folders: [folder] } : { kind: "all" },
		legacyPhysics,
	)];
}
