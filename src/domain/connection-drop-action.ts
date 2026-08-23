export type ConnectionDropAction = "connect" | "cancel";

/** Pointer cancellation is never a completed authoring gesture. */
export function connectionDropAction(input: {
	cancelled: boolean;
	hasSource: boolean;
	hasTarget: boolean;
}): ConnectionDropAction {
	return !input.cancelled && input.hasSource && input.hasTarget ? "connect" : "cancel";
}
