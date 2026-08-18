import {
	forceCollide,
	forceLink,
	forceManyBody,
	forceSimulation,
	forceX,
	forceY,
	ForceCollide,
	ForceLink,
	Simulation,
	SimulationLinkDatum,
	SimulationNodeDatum,
} from "d3-force";
import { GraphEdge, GraphRelationType, StoredGraphLink } from "./model";
import { ContextTreeNode } from "../types";

export const GRAPH_ZOOM = { hardMin: 0.001, max: 8 } as const;
export const DEFAULT_CARD_SIZE = { width: 276, height: 146 } as const;

/**
 * The three physical controls exposed in plugin settings. Keep them separate
 * from view state: they describe how the whole graph settles, not one card's
 * temporary position or the current camera.
 */
export interface GraphPhysics {
	linkStrength: number;
	repulsion: number;
	linkGap: number;
}

export const DEFAULT_GRAPH_PHYSICS: GraphPhysics = {
	linkStrength: 0.42,
	repulsion: 980,
	linkGap: 100,
};

export interface CardSize {
	width: number;
	height: number;
}

/**
 * A normalized position on a card boundary. Unlike named north/east/south/west
 * handles, it keeps the precise perimeter location the reader chose while
 * remaining independent of the card's rendered size.
 */
export interface CardAnchor {
	x: number;
	y: number;
}

export interface SimNode extends SimulationNodeDatum {
	id: string;
	node: ContextTreeNode;
	size: CardSize;
}

export interface SimLink extends SimulationLinkDatum<SimNode> {
	id: string;
	nodeA: string;
	nodeB: string;
	types: GraphRelationType[];
	storedLinks: StoredGraphLink[];
	source: string | SimNode;
	target: string | SimNode;
}

export interface GraphSimulation {
	simulation: Simulation<SimNode, undefined>;
	linkForce: ForceLink<SimNode, SimLink>;
	collideForce: ForceCollide<SimNode>;
}

export function initialGraphPosition(index: number, total: number, isFocus: boolean): { x: number; y: number } {
	if (isFocus) return { x: 0, y: 0 };
	const angle = (index / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;
	const radius = 360 + (index % 3) * 78;
	return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

/**
 * The overview must always be reachable. A fixed minimum such as 35% makes a
 * large graph impossible to inspect, while this lower bound follows its fit.
 */
export function graphZoomBounds(overviewZoom?: number): { min: number; max: number } {
	const fitFloor = overviewZoom === undefined ? 0.1 : overviewZoom * 0.8;
	return { min: Math.max(GRAPH_ZOOM.hardMin, Math.min(0.1, fitFloor)), max: GRAPH_ZOOM.max };
}

/** Converts a pointer movement in the transformed viewport into graph space. */
export function graphPointerDelta(
	start: { x: number; y: number },
	current: { x: number; y: number },
	zoom: number,
): { x: number; y: number } {
	const scale = Math.max(zoom, Number.EPSILON);
	return { x: (current.x - start.x) / scale, y: (current.y - start.y) / scale };
}

/** D3 requires source/target; the persisted graph remains peer-to-peer. */
export function simulationLinkFor(edge: GraphEdge): SimLink {
	return {
		id: edge.id,
		nodeA: edge.nodeA,
		nodeB: edge.nodeB,
		types: edge.types,
		storedLinks: edge.storedLinks,
		source: edge.nodeA,
		target: edge.nodeB,
	};
}

export function cardRadius(node: SimNode): number {
	return Math.hypot(node.size.width / 2, node.size.height / 2);
}

export function linkDistance(edge: SimLink, gap = DEFAULT_GRAPH_PHYSICS.linkGap): number {
	const source = typeof edge.source === "string" ? undefined : edge.source;
	const target = typeof edge.target === "string" ? undefined : edge.target;
	return source && target ? cardRadius(source) + cardRadius(target) + gap : 440;
}

export function createGraphSimulation(
	nodes: SimNode[],
	links: SimLink[],
	callbacks: { onTick: () => void; onEnd: () => void },
	physics: GraphPhysics = DEFAULT_GRAPH_PHYSICS,
): GraphSimulation {
	const linkForce = forceLink<SimNode, SimLink>(links)
		.id((node) => node.id)
		.distance((link) => linkDistance(link, physics.linkGap))
		.strength(physics.linkStrength);
	const collideForce = forceCollide<SimNode>()
		.radius((node) => cardRadius(node) + 30)
		.strength(1)
		.iterations(3);
	const simulation = forceSimulation(nodes)
		.force("link", linkForce)
		.force("charge", forceManyBody<SimNode>().strength(-physics.repulsion).distanceMax(1900))
		.force("collide", collideForce)
		.force("x", forceX<SimNode>(0).strength(0.018))
		.force("y", forceY<SimNode>(0).strength(0.018))
		.alphaDecay(0.038)
		.velocityDecay(0.46)
		.on("tick", callbacks.onTick)
		.on("end", callbacks.onEnd);
	return { simulation, linkForce, collideForce };
}

export function curvedEdgePath(
	first: { x: number; y: number },
	second: { x: number; y: number },
): string {
	const dx = second.x - first.x;
	const dy = second.y - first.y;
	const length = Math.max(1, Math.hypot(dx, dy));
	const curve = Math.min(56, length * 0.1);
	const controlX = (first.x + second.x) / 2 - (dy / length) * curve;
	const controlY = (first.y + second.y) / 2 + (dx / length) * curve;
	return `M ${first.x} ${first.y} Q ${controlX} ${controlY} ${second.x} ${second.y}`;
}

/**
 * Projects a ray from a card's centre to the exact point where it meets the
 * rectangle. This is the one geometric rule for persistent edge endpoints.
 */
export function cardBoundaryPoint(
	center: { x: number; y: number },
	size: CardSize,
	toward: { x: number; y: number },
): { x: number; y: number } {
	const dx = toward.x - center.x;
	const dy = toward.y - center.y;
	if (dx === 0 && dy === 0) return { x: center.x + size.width / 2, y: center.y };
	const halfWidth = Math.max(size.width / 2, 1);
	const halfHeight = Math.max(size.height / 2, 1);
	const scale = 1 / Math.max(Math.abs(dx) / halfWidth, Math.abs(dy) / halfHeight);
	return { x: center.x + dx * scale, y: center.y + dy * scale };
}

/**
 * Converts a pointer position within a card to its closest perimeter point.
 * The normalized output survives CSS scaling and card resizing.
 */
export function cardAnchorAtPoint(size: CardSize, point: { x: number; y: number }): CardAnchor {
	const width = Math.max(size.width, 1);
	const height = Math.max(size.height, 1);
	const x = Math.min(width, Math.max(0, point.x));
	const y = Math.min(height, Math.max(0, point.y));
	const distances = [
		{ distance: x, anchor: { x: 0, y: y / height } },
		{ distance: width - x, anchor: { x: 1, y: y / height } },
		{ distance: y, anchor: { x: x / width, y: 0 } },
		{ distance: height - y, anchor: { x: x / width, y: 1 } },
	];
	return distances.reduce((nearest, candidate) => candidate.distance < nearest.distance ? candidate : nearest).anchor;
}

/** The interactive candidate and its draft edge share this exact coordinate. */
export function cardAnchorPoint(
	center: { x: number; y: number },
	size: CardSize,
	anchor: CardAnchor,
): { x: number; y: number } {
	return {
		x: center.x + (Math.min(1, Math.max(0, anchor.x)) - 0.5) * size.width,
		y: center.y + (Math.min(1, Math.max(0, anchor.y)) - 0.5) * size.height,
	};
}

export function cardEdgeEndpoints(
	first: Pick<SimNode, "x" | "y" | "size">,
	second: Pick<SimNode, "x" | "y" | "size">,
): {
	first: { x: number; y: number };
	second: { x: number; y: number };
} {
	const firstCenter = { x: first.x ?? 0, y: first.y ?? 0 };
	const secondCenter = { x: second.x ?? 0, y: second.y ?? 0 };
	return {
		first: cardBoundaryPoint(firstCenter, first.size, secondCenter),
		second: cardBoundaryPoint(secondCenter, second.size, firstCenter),
	};
}
