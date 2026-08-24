export interface OpenCardViewportWidthInput {
	viewportWidth: number;
	screenCenterX: number;
	screenScale: number;
}

const OPEN_CARD_MAX_WIDTH = 680;
const OPEN_CARD_MIN_WIDTH = 180;
const OPEN_CARD_VIEWPORT_MARGIN = 16;

/**
 * Keeps an opened document inside the horizontal viewport without moving its
 * graph coordinate or the camera. The card remains centred on its node and
 * gives up width only when that exact position would otherwise be clipped.
 */
export function openCardViewportWidth(input: OpenCardViewportWidthInput): number {
	if (!Number.isFinite(input.viewportWidth) || input.viewportWidth <= 0) return OPEN_CARD_MAX_WIDTH;
	if (!Number.isFinite(input.screenCenterX)) return OPEN_CARD_MAX_WIDTH;
	if (!Number.isFinite(input.screenScale) || input.screenScale <= 0) return OPEN_CARD_MAX_WIDTH;
	const left = input.screenCenterX - OPEN_CARD_VIEWPORT_MARGIN;
	const right = input.viewportWidth - OPEN_CARD_VIEWPORT_MARGIN - input.screenCenterX;
	const availableHalf = Math.max(0, Math.min(left, right));
	const availableGraphWidth = Math.floor((availableHalf * 2) / input.screenScale);
	return Math.min(OPEN_CARD_MAX_WIDTH, Math.max(OPEN_CARD_MIN_WIDTH, availableGraphWidth));
}
