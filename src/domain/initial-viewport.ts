/**
 * An existing workspace owns its camera. Only a graph with no saved view needs
 * an automatic overview fit; refreshes and reloads must preserve user intent.
 */
export function shouldFitInitialOverview(
	preserveViewport: boolean,
	hasSavedView: boolean,
): boolean {
	return !preserveViewport && !hasSavedView;
}
