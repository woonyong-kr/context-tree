export const HOVER_MAGNET_MAX_PX = 12;
const HOVER_MAGNET_STRENGTH = 0.18;

export interface HoverMagnetOrigin {
	clientX: number;
	clientY: number;
}

export interface HoverMagnetOffset {
	x: number;
	y: number;
}

export function boundedHoverMagnet(
	origin: HoverMagnetOrigin,
	clientX: number,
	clientY: number,
): HoverMagnetOffset {
	const desiredX = (clientX - origin.clientX) * HOVER_MAGNET_STRENGTH;
	const desiredY = (clientY - origin.clientY) * HOVER_MAGNET_STRENGTH;
	const distance = Math.hypot(desiredX, desiredY);
	if (distance <= HOVER_MAGNET_MAX_PX || distance === 0) return { x: desiredX, y: desiredY };
	const ratio = HOVER_MAGNET_MAX_PX / distance;
	return { x: desiredX * ratio, y: desiredY * ratio };
}
