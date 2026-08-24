export type GeneratedCanvasRole = "root" | "markdown" | "image" | "pdf";

interface GeneratedCanvasRoleDesign {
	width: number;
	height: number;
	color: string;
}

/** Standard JSON Canvas role palette and editorial board rhythm for generated cards. */
export const GENERATED_CANVAS_DESIGN = {
	roles: {
		root: { width: 440, height: 300, color: "6" },
		markdown: { width: 360, height: 240, color: "5" },
		image: { width: 400, height: 320, color: "4" },
		pdf: { width: 420, height: 440, color: "3" },
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

export function generatedCanvasRole(path: string, isRoot: boolean): GeneratedCanvasRole {
	if (isRoot) return "root";
	const extension = path.split(".").pop()?.toLowerCase();
	if (extension === "pdf") return "pdf";
	if (IMAGE_EXTENSIONS.has(extension ?? "")) return "image";
	return "markdown";
}

export function generatedCanvasNodeDesign(path: string, isRoot: boolean): GeneratedCanvasRoleDesign {
	return GENERATED_CANVAS_DESIGN.roles[generatedCanvasRole(path, isRoot)];
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
