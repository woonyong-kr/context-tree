export const NODE_DRAG_THRESHOLD_PX = 10;
export const TOUCH_NODE_DRAG_THRESHOLD_PX = 16;

export interface PointerOrigin {
	clientX: number;
	clientY: number;
}

export function hasNodeDragIntent(
	origin: PointerOrigin,
	clientX: number,
	clientY: number,
	pointerType = "mouse",
): boolean {
	const threshold = pointerType === "touch" ? TOUCH_NODE_DRAG_THRESHOLD_PX : NODE_DRAG_THRESHOLD_PX;
	return Math.hypot(clientX - origin.clientX, clientY - origin.clientY) >= threshold;
}
