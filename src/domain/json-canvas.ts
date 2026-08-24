import { generatedCanvasNodeDesign, generatedCanvasNodePosition } from "./generated-canvas-design";

export interface JsonCanvasFileNode {
	id: string;
	type: "file";
	file: string;
	subpath?: string;
	x: number;
	y: number;
	width: number;
	height: number;
	color?: string;
}

interface JsonCanvasTextNode {
	id: string;
	type: "text";
	text: string;
	x: number;
	y: number;
	width: number;
	height: number;
	color?: string;
}

interface JsonCanvasLinkNode {
	id: string;
	type: "link";
	url: string;
	x: number;
	y: number;
	width: number;
	height: number;
	color?: string;
}

interface JsonCanvasGroupNode {
	id: string;
	type: "group";
	label?: string;
	background?: string;
	backgroundStyle?: "cover" | "ratio" | "repeat";
	x: number;
	y: number;
	width: number;
	height: number;
	color?: string;
}

type JsonCanvasNode = JsonCanvasFileNode | JsonCanvasTextNode | JsonCanvasLinkNode | JsonCanvasGroupNode;

interface JsonCanvasEdge {
	id: string;
	fromNode: string;
	fromSide?: "top" | "right" | "bottom" | "left";
	fromEnd?: "none" | "arrow";
	toNode: string;
	toSide?: "top" | "right" | "bottom" | "left";
	toEnd?: "none" | "arrow";
	color?: string;
	label?: string;
}

export interface JsonCanvasDocument {
	nodes: JsonCanvasNode[];
	edges: JsonCanvasEdge[];
	[key: string]: unknown;
}

export interface LinkedCanvasRelation {
	fromPath: string;
	toPath: string;
}

export interface LinkedCanvasProjection {
	rootPaths: string[];
	filePaths: string[];
	relations: LinkedCanvasRelation[];
}

export interface LinkedCanvasManagedState {
	filesByNodeId: Record<string, string>;
	edgeIds: string[];
}

export interface ReconciledLinkedCanvas {
	document: JsonCanvasDocument;
	managed: LinkedCanvasManagedState;
}

function record(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value)
		? value as Record<string, unknown>
		: undefined;
}

function finiteInteger(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : undefined;
}

function parseNode(value: unknown): JsonCanvasNode | undefined {
	const item = record(value);
	if (!item || typeof item.id !== "string" || typeof item.type !== "string") return undefined;
	const x = finiteInteger(item.x);
	const y = finiteInteger(item.y);
	const width = finiteInteger(item.width);
	const height = finiteInteger(item.height);
	if (x === undefined || y === undefined || width === undefined || height === undefined || width <= 0 || height <= 0) return undefined;
	const common = {
		...item,
		id: item.id,
		x,
		y,
		width,
		height,
		...(typeof item.color === "string" ? { color: item.color } : {}),
	};
	switch (item.type) {
		case "file":
			return typeof item.file === "string"
				? { ...common, type: "file", file: item.file, ...(typeof item.subpath === "string" ? { subpath: item.subpath } : {}) }
				: undefined;
		case "text":
			return typeof item.text === "string" ? { ...common, type: "text", text: item.text } : undefined;
		case "link":
			return typeof item.url === "string" ? { ...common, type: "link", url: item.url } : undefined;
		case "group":
			return {
				...common,
				type: "group",
				...(typeof item.label === "string" ? { label: item.label } : {}),
				...(typeof item.background === "string" ? { background: item.background } : {}),
				...(item.backgroundStyle === "cover" || item.backgroundStyle === "ratio" || item.backgroundStyle === "repeat"
					? { backgroundStyle: item.backgroundStyle }
					: {}),
			};
		default:
			return undefined;
	}
}

function parseEdge(value: unknown): JsonCanvasEdge | undefined {
	const item = record(value);
	if (!item || typeof item.id !== "string" || typeof item.fromNode !== "string" || typeof item.toNode !== "string") return undefined;
	const sides = new Set(["top", "right", "bottom", "left"]);
	const ends = new Set(["none", "arrow"]);
	return {
		...item,
		id: item.id,
		fromNode: item.fromNode,
		toNode: item.toNode,
		...(typeof item.fromSide === "string" && sides.has(item.fromSide) ? { fromSide: item.fromSide as JsonCanvasEdge["fromSide"] } : {}),
		...(typeof item.toSide === "string" && sides.has(item.toSide) ? { toSide: item.toSide as JsonCanvasEdge["toSide"] } : {}),
		...(typeof item.fromEnd === "string" && ends.has(item.fromEnd) ? { fromEnd: item.fromEnd as JsonCanvasEdge["fromEnd"] } : {}),
		...(typeof item.toEnd === "string" && ends.has(item.toEnd) ? { toEnd: item.toEnd as JsonCanvasEdge["toEnd"] } : {}),
		...(typeof item.color === "string" ? { color: item.color } : {}),
		...(typeof item.label === "string" ? { label: item.label } : {}),
	};
}

export function parseJsonCanvas(source: string): JsonCanvasDocument | undefined {
	try {
		const value = record(JSON.parse(source));
		if (!value) return undefined;
		const rawNodes = Array.isArray(value.nodes) ? value.nodes : [];
		const rawEdges = Array.isArray(value.edges) ? value.edges : [];
		const nodes = rawNodes.map(parseNode);
		const edges = rawEdges.map(parseEdge);
		if (nodes.some((node) => node === undefined) || edges.some((edge) => edge === undefined)) return undefined;
		const nodeIds = new Set<string>();
		for (const node of nodes) {
			if (!node || nodeIds.has(node.id)) return undefined;
			nodeIds.add(node.id);
		}
		const edgeIds = new Set<string>();
		for (const edge of edges) {
			if (!edge || edgeIds.has(edge.id) || !nodeIds.has(edge.fromNode) || !nodeIds.has(edge.toNode)) return undefined;
			edgeIds.add(edge.id);
		}
		return { ...value, nodes: nodes as JsonCanvasNode[], edges: edges as JsonCanvasEdge[] };
	} catch {
		return undefined;
	}
}

export function serializeJsonCanvas(document: JsonCanvasDocument): string {
	return `${JSON.stringify(document, null, "\t")}\n`;
}

function hashText(text: string): string {
	let hash = 0x811c9dc5;
	for (let index = 0; index < text.length; index += 1) {
		hash ^= text.charCodeAt(index);
		hash = Math.imul(hash, 0x01000193);
	}
	return (hash >>> 0).toString(36);
}

function nodeId(path: string): string {
	return `linked-canvas-node-${hashText(path)}`;
}

function edgeId(relation: LinkedCanvasRelation): string {
	return `linked-canvas-edge-${hashText(`${relation.fromPath}\u0000${relation.toPath}`)}`;
}

function sameDirectedEdge(edge: JsonCanvasEdge, fromNode: string, toNode: string): boolean {
	return edge.fromNode === fromNode && edge.toNode === toNode;
}

/**
 * Projects linked Vault files into standard JSON Canvas without ever copying
 * Markdown. Existing positions, sizes and all user-owned nodes and edges are
 * preserved. Previously managed nodes that leave scope become ordinary cards;
 * only generated edges are removed automatically.
 */
export function reconcileLinkedCanvas(
	existing: JsonCanvasDocument,
	previousManaged: LinkedCanvasManagedState,
	projection: LinkedCanvasProjection,
): ReconciledLinkedCanvas {
	const rootPaths = new Set(projection.rootPaths);
	const wantedPaths = [...new Set(projection.filePaths)];
	const previousManagedEdgeIds = new Set(previousManaged.edgeIds);
	const nodes = [...existing.nodes];
	const existingFileNodeByPath = new Map<string, JsonCanvasFileNode>();
	for (const node of nodes) {
		if (node.type === "file" && !existingFileNodeByPath.has(node.file)) existingFileNodeByPath.set(node.file, node);
	}

	const filesByNodeId: Record<string, string> = {};
	for (const [index, path] of wantedPaths.entries()) {
		let node = existingFileNodeByPath.get(path);
		if (!node) {
			const position = generatedCanvasNodePosition(index);
			const isRoot = rootPaths.has(path);
			const design = generatedCanvasNodeDesign(path, isRoot);
			node = {
				id: nodeId(path),
				type: "file",
				file: path,
				...position,
				width: design.width,
				height: design.height,
				color: design.color,
			};
			if (nodes.some((candidate) => candidate.id === node!.id)) {
				node.id = `${node.id}-${nodes.length + 1}`;
			}
			nodes.push(node);
			existingFileNodeByPath.set(path, node);
		}
		// Managed means that automation follows this file card; it does not own its
		// position, size or lifetime. Tracking a manually dropped seed after its
		// first sync lets a later deletion remain an intentional exclusion.
		filesByNodeId[node.id] = path;
	}

	const baseEdges = existing.edges.filter((edge) => !previousManagedEdgeIds.has(edge.id));
	const edges = [...baseEdges];
	const edgeIds: string[] = [];
	for (const relation of projection.relations) {
		const from = existingFileNodeByPath.get(relation.fromPath);
		const to = existingFileNodeByPath.get(relation.toPath);
		if (!from || !to || from.id === to.id) continue;
		if (edges.some((edge) => sameDirectedEdge(edge, from.id, to.id))) continue;
		const id = edgeId(relation);
		const edge: JsonCanvasEdge = {
			id: edges.some((candidate) => candidate.id === id) ? `${id}-${edges.length + 1}` : id,
			fromNode: from.id,
			fromEnd: "none",
			toNode: to.id,
			toEnd: "arrow",
		};
		edges.push(edge);
		edgeIds.push(edge.id);
	}

	return {
		document: { ...existing, nodes, edges },
		managed: { filesByNodeId, edgeIds },
	};
}
