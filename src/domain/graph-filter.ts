import { GraphEdge, GraphRelationType } from "../graph/model";
import { ContextTreeNode } from "../types";

export interface GraphSearchVisibility {
	matches: Set<string>;
	context: Set<string>;
	visible: Set<string>;
}

function normalized(value: string): string {
	return value.toLocaleLowerCase();
}

/**
 * Search is intentionally semantic rather than a title-only jump: matching
 * cards stay visible together with their direct graph context.
 */
export function graphSearchVisibility(
	query: string,
	nodes: readonly ContextTreeNode[],
	edges: readonly GraphEdge[],
): GraphSearchVisibility {
	const needle = normalized(query.trim());
	if (!needle) {
		return { matches: new Set(nodes.map((node) => node.id)), context: new Set(), visible: new Set(nodes.map((node) => node.id)) };
	}
	const matches = new Set(nodes.filter((node) => normalized(`${node.title}\n${node.summary}\n${node.body}`).includes(needle)).map((node) => node.id));
	const context = new Set<string>();
	for (const edge of edges) {
		if (matches.has(edge.nodeA)) context.add(edge.nodeB);
		if (matches.has(edge.nodeB)) context.add(edge.nodeA);
	}
	for (const id of matches) context.delete(id);
	return { matches, context, visible: new Set([...matches, ...context]) };
}

export function isGraphEdgeVisible(edge: GraphEdge, enabledTypes: ReadonlySet<GraphRelationType>): boolean {
	return edge.types.some((type) => enabledTypes.has(type));
}

/** The hovered card and its visible direct neighbours form one focus lens. */
export function graphHoverNodeIds(
	nodeId: string | undefined,
	edges: readonly GraphEdge[],
	enabledTypes: ReadonlySet<GraphRelationType>,
): Set<string> {
	if (!nodeId) return new Set();
	const active = new Set([nodeId]);
	for (const edge of edges) {
		if (!isGraphEdgeVisible(edge, enabledTypes)) continue;
		if (edge.nodeA === nodeId) active.add(edge.nodeB);
		if (edge.nodeB === nodeId) active.add(edge.nodeA);
	}
	return active;
}
