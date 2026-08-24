export interface CardActionLayout {
	controlScale: number;
	detailScale: number;
	compactReserve: number;
	compactExpandedReserve: number;
	openReserve: number;
	openExpandedReserve: number;
	openPaddingTop: number;
	editorToolbarSpacer: number;
}

/**
 * Keeps inverse-scaled card controls inside the space reserved for them.
 * Scaling only the buttons made the rail wider and taller than the title
 * padding at overview zoom, which let controls cover the document heading.
 */
export function cardActionLayout(zoom: number): CardActionLayout {
	const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
	const controlScale = Math.min(2.4, Math.max(1, 0.72 / safeZoom));
	const detailScale = Math.max(1, 0.72 / safeZoom);
	return {
		controlScale,
		detailScale,
		compactReserve: Math.ceil(74 * controlScale),
		compactExpandedReserve: Math.ceil(104 * controlScale),
		openReserve: 96,
		openExpandedReserve: 126,
		openPaddingTop: 32,
		editorToolbarSpacer: 62,
	};
}
