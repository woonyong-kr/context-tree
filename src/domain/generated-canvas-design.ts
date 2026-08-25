import type { SecondaryGraphNodeRole } from "../types";

export type GeneratedCanvasRole = "root" | SecondaryGraphNodeRole | "image" | "pdf";

interface GeneratedCanvasRoleDesign {
	width: number;
	height: number;
	color?: string;
}

/** Standard JSON Canvas role palette and editorial board rhythm for generated cards. */
export const GENERATED_CANVAS_DESIGN = {
	roles: {
		root: { width: 440, height: 300, color: "6" },
		topic: { width: 360, height: 240 },
		entity: { width: 360, height: 240, color: "4" },
		question: { width: 360, height: 240, color: "3" },
		image: { width: 400, height: 320 },
		pdf: { width: 420, height: 440 },
	} satisfies Record<GeneratedCanvasRole, GeneratedCanvasRoleDesign>,
	placement: {
		rootX: 0,
		rootY: 0,
		boardX: 560,
		boardY: -220,
		columns: 2,
		columnStride: 460,
		rowStride: 500,
	},
} as const;

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "avif"]);

export function generatedCanvasRole(path: string, isRoot: boolean, visualRole?: SecondaryGraphNodeRole): GeneratedCanvasRole {
	if (isRoot) return "root";
	const extension = path.split(".").pop()?.toLowerCase();
	if (extension === "pdf") return "pdf";
	if (IMAGE_EXTENSIONS.has(extension ?? "")) return "image";
	return visualRole ?? "topic";
}

export function generatedCanvasNodeDesign(path: string, isRoot: boolean, visualRole?: SecondaryGraphNodeRole): GeneratedCanvasRoleDesign {
	return GENERATED_CANVAS_DESIGN.roles[generatedCanvasRole(path, isRoot, visualRole)];
}

export function generatedCanvasNodePosition(index: number): { x: number; y: number } {
	const placement = GENERATED_CANVAS_DESIGN.placement;
	if (index === 0) return { x: placement.rootX, y: placement.rootY };
	const boardIndex = index - 1;
	const column = boardIndex % placement.columns;
	const row = Math.floor(boardIndex / placement.columns);
	return {
		x: placement.boardX + column * placement.columnStride,
		y: placement.boardY + row * placement.rowStride,
	};
}
