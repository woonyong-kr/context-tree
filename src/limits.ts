export const MAX_DIRECT_GRAPH_NODES = 120;
export const MAX_PREVIEW_GRAPH_NODES = 48;

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
