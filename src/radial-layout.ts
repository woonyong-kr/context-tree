import { ContextTreeNode } from "./types";

export interface GraphEdge {
	from: string;
	to: string;
}

export interface ContextGraph {
	nodes: ContextTreeNode[];
	edges: GraphEdge[];
}

/**
 * Parent metadata describes the initial graph, but is deliberately not
 * exposed as a "children" UI. Rendering is handled by the force simulation
 * in the view so a topic can be explored as an ego graph from any node.
 */
export function buildContextGraph(roots: ContextTreeNode[]): ContextGraph {
	const nodes = flatten(roots);
	const nodeIds = new Set(nodes.map((node) => node.id));
	const seenEdges = new Set<string>();
	const edges: GraphEdge[] = [];

	for (const node of nodes) {
		for (const child of node.children) {
			if (!nodeIds.has(child.id)) continue;
			const key = `${node.id}\u0000${child.id}`;
			if (seenEdges.has(key)) continue;
			seenEdges.add(key);
			edges.push({ from: node.id, to: child.id });
		}
	}

	return { nodes, edges };
}

function flatten(roots: ContextTreeNode[]): ContextTreeNode[] {
	return roots.flatMap((node) => [node, ...flatten(node.children)]);
}
