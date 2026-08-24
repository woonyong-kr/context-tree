export type GeneratedCanvasRole = "root" | "markdown" | "image" | "pdf";

interface GeneratedCanvasRoleDesign {
	width: number;
	height: number;
	color: string;
}

/** Standard JSON Canvas role palette and layout rhythm for generated cards. */
export const GENERATED_CANVAS_DESIGN = {
	roles: {
		root: { width: 380, height: 240, color: "6" },
		markdown: { width: 380, height: 240, color: "5" },
		image: { width: 400, height: 300, color: "4" },
		pdf: { width: 460, height: 560, color: "3" },
	} satisfies Record<GeneratedCanvasRole, GeneratedCanvasRoleDesign>,
	placement: {
		rootX: -190,
		rootY: -120,
		cardsPerRing: 8,
		firstRingRadius: 540,
		ringStep: 460,
		startAngle: -Math.PI / 2,
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
	const ringIndex = index - 1;
	const ring = Math.floor(ringIndex / placement.cardsPerRing);
	const slot = ringIndex % placement.cardsPerRing;
	const angle = placement.startAngle + slot * (Math.PI * 2 / placement.cardsPerRing);
	const radius = placement.firstRingRadius + ring * placement.ringStep;
	return {
		x: Math.round(Math.cos(angle) * radius + placement.rootX),
		y: Math.round(Math.sin(angle) * radius + placement.rootY),
	};
}
