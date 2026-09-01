export interface PreviewPlacement {
	distance: number;
	offsetX: number;
	offsetY: number;
}

export function previewRingSize(viewportWidth: number): number {
	return viewportWidth <= 420 ? 2 : 8;
}

export function previewPlacement(
	index: number,
	total: number,
	viewportWidth: number,
	inwardAngle: number,
	baseDistance: number,
	ringGap: number,
): PreviewPlacement {
	const ringSize = previewRingSize(viewportWidth);
	const ring = Math.floor(index / ringSize);
	const ringStart = ring * ringSize;
	const ringCount = Math.min(ringSize, total - ringStart);
	const ringPosition = index - ringStart;
	const spread = Math.min(Math.PI * 1.15, 0.9 * Math.max(ringCount - 1, 1));
	const stagger = ring % 2 === 0 ? 0 : Math.min(0.2, spread / Math.max(ringCount, 1));
	const angle = inwardAngle - spread / 2 + stagger
		+ spread * (ringPosition / Math.max(ringCount - 1, 1));
	const distance = baseDistance + ring * ringGap;
	return {
		distance,
		offsetX: Math.cos(angle) * distance,
		offsetY: Math.sin(angle) * distance,
	};
}
