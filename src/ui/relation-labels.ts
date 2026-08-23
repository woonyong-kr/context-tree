import { isSymmetricRelation } from "../domain/relations";
import { ContextRelationType } from "../types";
import { COPY } from "./copy";

export function contextRelationLabel(type: ContextRelationType): string {
	return COPY.relations[type];
}

export function contextRelationNavigationLabel(
	type: ContextRelationType,
	direction: "incoming" | "outgoing",
): string {
	const label = contextRelationLabel(type);
	if (isSymmetricRelation(type)) return label;
	return direction === "outgoing" ? `${label} →` : `← ${label}`;
}
