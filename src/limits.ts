export const MAX_DIRECT_GRAPH_NODES = 120;
const MIN_DIRECT_GRAPH_NODES = 12;
export const MAX_PREVIEW_GRAPH_NODES = 48;

const DIRECT_NODE_AREA_PX = 15_000;

export function directGraphNodeLimit(viewportWidth: number, viewportHeight: number): number {
	const measuredArea = Math.max(0, viewportWidth) * Math.max(0, viewportHeight);
	if (measuredArea === 0) return MIN_DIRECT_GRAPH_NODES;
	return Math.min(
		MAX_DIRECT_GRAPH_NODES,
		Math.max(MIN_DIRECT_GRAPH_NODES, Math.floor(measuredArea / DIRECT_NODE_AREA_PX)),
	);
}

export function previewGraphNodeLimit(viewportWidth: number): number {
	if (viewportWidth <= 420) return 4;
	if (viewportWidth <= 720) return 12;
	return MAX_PREVIEW_GRAPH_NODES;
}

export interface BoundedItems<T> {
	items: readonly T[];
	omitted: number;
	total: number;
}

export function boundedItems<T>(items: readonly T[], maximum: number): BoundedItems<T> {
	const limit = Math.max(0, Math.floor(maximum));
	return {
		items: items.slice(0, limit),
		omitted: Math.max(0, items.length - limit),
		total: items.length,
	};
}
