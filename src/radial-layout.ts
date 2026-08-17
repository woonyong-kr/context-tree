import { ContextTreeNode } from "./types";

export interface RadialNode {
	node: ContextTreeNode;
	x: number;
	y: number;
	distance: number;
}

export interface RadialEdge {
	from: string;
	to: string;
}

export interface RadialLayout {
	focus: ContextTreeNode;
	nodes: RadialNode[];
	edges: RadialEdge[];
}

/**
 * Lay out one connected topic tree as an ego graph.  The selected topic stays
 * at (0, 0); each hop is a ring around it, so moving the focus preserves the
 * same 360-degree exploration model instead of returning to a left-to-right
 * outline.
 */
export function buildRadialLayout(
	roots: ContextTreeNode[],
	focusId?: string,
	detailedFocus = false,
): RadialLayout | undefined {
	const nodes = flatten(roots);
	const focus = nodes.find((node) => node.id === focusId) ?? nodes[0];
	if (!focus) return undefined;

	const byId = new Map(nodes.map((node) => [node.id, node]));
	const neighbors = new Map(nodes.map((node) => [node.id, new Set<string>()]));
	const edges: RadialEdge[] = [];

	for (const node of nodes) {
		for (const child of node.children) {
			neighbors.get(node.id)?.add(child.id);
			neighbors.get(child.id)?.add(node.id);
			edges.push({ from: node.id, to: child.id });
		}
	}

	const layers: string[][] = [[focus.id]];
	const distances = new Map<string, number>([[focus.id, 0]]);
	for (let distance = 0; layers[distance]?.length; distance += 1) {
		const currentLayer = layers[distance];
		if (!currentLayer) break;
		const next = new Set<string>();
		for (const id of currentLayer) {
			for (const neighbor of neighbors.get(id) ?? []) {
				if (!distances.has(neighbor)) {
					distances.set(neighbor, distance + 1);
					next.add(neighbor);
				}
			}
		}
		if (next.size) {
			layers.push([...next].sort((left, right) => byId.get(left)!.title.localeCompare(byId.get(right)!.title)));
		}
	}

	const positioned: RadialNode[] = [];
	for (let distance = 0; distance < layers.length; distance += 1) {
		const layer = layers[distance];
		if (!layer) continue;
		if (distance === 0) {
			positioned.push({ node: focus, x: 0, y: 0, distance });
			continue;
		}

		// 280px cards need at least this much circumference to avoid overlap.
		const baseRadius = detailedFocus ? 520 : 340;
		const radius = Math.max(baseRadius * distance, (layer.length * 300) / (2 * Math.PI));
		const angleStep = (2 * Math.PI) / layer.length;
		const start = -Math.PI / 2;
		layer.forEach((id, index) => {
			const node = byId.get(id)!;
			const angle = start + angleStep * index;
			positioned.push({
				node,
				x: Math.cos(angle) * radius,
				y: Math.sin(angle) * radius,
				distance,
			});
		});
	}

	return { focus, nodes: positioned, edges };
}

function flatten(roots: ContextTreeNode[]): ContextTreeNode[] {
	return roots.flatMap((node) => [node, ...flatten(node.children)]);
}
