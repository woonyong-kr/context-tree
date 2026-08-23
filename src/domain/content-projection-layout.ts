export type PositionLock = { fx?: number | null; fy?: number | null };

export type LayoutNode = PositionLock & {
	id: string;
	x?: number;
	y?: number;
};

/**
 * Reading and Source project content over an existing spatial arrangement.
 * Acquire locks once for the map that was visible when reading began; nodes
 * revealed later remain free to settle without moving that existing context.
 */
export function syncContentProjectionLayout(
	nodes: readonly LayoutNode[],
	locks: Map<string, PositionLock>,
	hasOpenContent: boolean,
): boolean {
	const nodesById = new Map(nodes.map((node) => [node.id, node]));
	for (const nodeId of locks.keys()) {
		if (!nodesById.has(nodeId)) locks.delete(nodeId);
	}
	if (!hasOpenContent) {
		for (const [nodeId, position] of locks) {
			const node = nodesById.get(nodeId);
			if (!node) continue;
			node.fx = position.fx;
			node.fy = position.fy;
		}
		locks.clear();
		return false;
	}
	const acquireCurrentMap = locks.size === 0;
	for (const node of nodes) {
		if (acquireCurrentMap) locks.set(node.id, { fx: node.fx, fy: node.fy });
		if (!locks.has(node.id)) continue;
		node.fx = node.x ?? node.fx ?? 0;
		node.fy = node.y ?? node.fy ?? 0;
	}
	return true;
}
