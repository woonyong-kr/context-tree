const CANVAS_CONTROL_SELECTOR = [
	".context-tree-card",
	".context-tree-graph-controls",
	".context-tree-graph-header",
	".context-tree-search-panel",
].join(", ");

/** Interactive graph chrome owns its pointer gesture; only canvas space pans. */
export function isCanvasControlTarget(target: Element | null): boolean {
	return !!target?.closest(CANVAS_CONTROL_SELECTOR);
}
