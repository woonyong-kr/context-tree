/**
 * Identifies the nested surface that owns a wheel gesture. The browser may
 * retain a focused textarea as `event.target` after the pointer has moved, so
 * callers must pass the element resolved at the wheel coordinates.
 */
export type CanvasWheelSurface = {
	isOverCardScroller: boolean;
	isOverSearch: boolean;
	cardScroller?: HTMLElement;
};

export function canvasWheelSurface(target: Element | null): CanvasWheelSurface {
	const cardScroller = target?.closest<HTMLElement>(".context-tree-markdown-editor-scroll")
		?? target?.closest<HTMLElement>(".context-tree-detail-wrap")
		?? undefined;
	return {
		isOverCardScroller: !!cardScroller,
		isOverSearch: !!target?.closest(".context-tree-search-panel"),
		cardScroller,
	};
}
