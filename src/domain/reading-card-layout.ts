export interface ReadingCardMeasurement {
	cardHeight: number;
	detailHeight: number;
	detailContentHeight: number;
	isDetailReady?: boolean;
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
	return Math.max(cardHeight, staticHeight + detailContentHeight);
}
