export interface ReadingCardMeasurement {
	cardHeight: number;
	detailHeight: number;
	detailContentHeight: number;
	maximumHeight?: number;
	isDetailReady?: boolean;
}

const MIN_READING_CARD_HEIGHT = 180;
const READING_CARD_VIEWPORT_MARGIN = 72;

export function readingCardMaximumHeight(viewportHeight: number): number | undefined {
	return viewportHeight > 0
		? Math.max(MIN_READING_CARD_HEIGHT, viewportHeight - READING_CARD_VIEWPORT_MARGIN)
		: undefined;
}

/**
 * Derives the final Reading footprint from rendered content, not the current
 * CSS transition frame. Source mode uses this to preserve a card's footprint.
 */
export function settledReadingCardHeight(input: ReadingCardMeasurement): number | undefined {
	if (input.isDetailReady === false) return undefined;
	const cardHeight = Math.ceil(Math.max(0, input.cardHeight));
	const detailHeight = Math.ceil(Math.max(0, input.detailHeight));
	const detailContentHeight = Math.ceil(Math.max(0, input.detailContentHeight));
	const staticHeight = Math.max(0, cardHeight - detailHeight);
	const settled = Math.max(cardHeight, staticHeight + detailContentHeight);
	return input.maximumHeight === undefined ? settled : Math.min(settled, Math.max(0, input.maximumHeight));
}
