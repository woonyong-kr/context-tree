export interface GraphLayoutMetrics {
	directDistance: number;
	leafRadius: number;
	previewDistance: number;
	previewRingGap: number;
	chargeDistance: number;
}

export function graphLayoutMetrics(width: number, height: number, itemCount: number): GraphLayoutMetrics {
	const safeWidth = width > 0 ? width : 640;
	const safeHeight = height > 0 ? height : 640;
	const shortSide = Math.min(safeWidth, safeHeight);
	const densityAllowance = Math.min(30, Math.max(0, itemCount - 8) * 1.5);
	const horizontalLimit = Math.max(158, safeWidth / 2 - 108);
	const verticalLimit = Math.max(158, safeHeight / 2 - 64);
	const directLimit = Math.min(280, horizontalLimit, verticalLimit);
	const directDistance = Math.round(clamp(shortSide * 0.28 + densityAllowance, 158, directLimit));
	const previewDistance = Math.round(clamp(shortSide * 0.19, 116, 164));
	const previewRingGap = Math.round(clamp(shortSide * 0.1, 72, 92));

	return {
		directDistance,
		leafRadius: directDistance,
		previewDistance,
		previewRingGap,
		chargeDistance: Math.round(Math.max(360, directDistance + previewDistance + previewRingGap)),
	};
}

function clamp(value: number, minimum: number, maximum: number): number {
	return Math.min(maximum, Math.max(minimum, value));
}
