export const MAX_DIRECT_GRAPH_NODES = 120;
export const MAX_PREVIEW_GRAPH_NODES = 48;

export function previewGraphNodeLimit(viewportWidth: number): number {
	if (viewportWidth <= 420) return 8;
	if (viewportWidth <= 720) return 16;
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
