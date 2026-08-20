/** Relationship removal is valid only after an intentional blank-canvas drop. */
export function canDisconnectAtDrop(input: {
	movedFarEnough: boolean;
	isInsideCanvas: boolean;
	isProtectedTarget: boolean;
}): boolean {
	return input.movedFarEnough && input.isInsideCanvas && !input.isProtectedTarget;
}
