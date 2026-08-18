import { ContextRelationType, ContextTreeNode } from "../types";

export type GraphRelationType = "derived" | ContextRelationType;

export interface StoredGraphLink {
	sourcePath: string;
	targetPath: string;
	type: ContextRelationType;
}

export interface GraphEdge {
	id: string;
	nodeA: string;
	nodeB: string;
	types: GraphRelationType[];
	storedLinks: StoredGraphLink[];
}

export interface ContextGraph {
	nodes: ContextTreeNode[];
	edges: GraphEdge[];
}

/**
 * A single visual line can represent several frontmatter records. Direct
 * manipulation may remove an edge only when that mapping is unambiguous.
 */
export function isDetachableGraphEdge(edge: Pick<GraphEdge, "types" | "storedLinks">): boolean {
	return !edge.types.includes("derived") && edge.storedLinks.length === 1;
}

/**
 * Parent metadata describes the initial graph, but is deliberately not
 * exposed as a "children" UI. Rendering is handled by the force simulation
 * in the view so a topic can be explored as an ego graph from any node.
 */
export function buildContextGraph(roots: ContextTreeNode[]): ContextGraph {
	const nodes = flatten(roots);
	const nodeIds = new Set(nodes.map((node) => node.id));
	const nodesByPath = new Map(nodes.map((node) => [node.path, node]));
	const edgesByPair = new Map<string, GraphEdge>();

	const addEdge = (
		first: ContextTreeNode,
		second: ContextTreeNode,
		type: GraphRelationType,
		storedLink?: StoredGraphLink,
	): void => {
		if (first.id === second.id) return;
		const [nodeA, nodeB] = first.id < second.id ? [first.id, second.id] : [second.id, first.id];
		const id = `${nodeA}\u0000${nodeB}`;
		const edge: GraphEdge = edgesByPair.get(id) ?? { id, nodeA, nodeB, types: [], storedLinks: [] };
		if (!edge.types.includes(type)) edge.types.push(type);
		if (storedLink && !edge.storedLinks.some((link) =>
			link.sourcePath === storedLink.sourcePath && link.targetPath === storedLink.targetPath && link.type === storedLink.type,
		)) edge.storedLinks.push(storedLink);
		edgesByPair.set(id, edge);
	};

	for (const node of nodes) {
		// The hierarchy builder deliberately breaks malformed parent cycles so it
		// can still return a stable forest. The graph is allowed to preserve every
		// resolvable provenance relation, including the edge that closed a cycle.
		const parent = node.parentPath ? nodesByPath.get(node.parentPath) : undefined;
		if (parent && nodeIds.has(parent.id)) addEdge(node, parent, "derived");
		for (const link of node.links) {
			const target = nodesByPath.get(link.targetPath);
			if (!target) continue;
			addEdge(node, target, link.type, { sourcePath: node.path, targetPath: link.targetPath, type: link.type });
		}
	}

	return { nodes, edges: [...edgesByPair.values()] };
}

function flatten(roots: ContextTreeNode[]): ContextTreeNode[] {
	return roots.flatMap((node) => [node, ...flatten(node.children)]);
}
