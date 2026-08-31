export const NODE_DRAG_THRESHOLD_PX = 8;

export interface PointerOrigin {
	clientX: number;
	clientY: number;
}

export function hasNodeDragIntent(origin: PointerOrigin, clientX: number, clientY: number): boolean {
	return Math.hypot(clientX - origin.clientX, clientY - origin.clientY) >= NODE_DRAG_THRESHOLD_PX;
}
