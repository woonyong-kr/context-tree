import {
	forceCollide,
	forceLink,
	forceManyBody,
	forceSimulation,
	forceX,
	forceY,
	type Simulation,
	type SimulationLinkDatum,
	type SimulationNodeDatum,
} from "d3-force";
import { setIcon } from "obsidian";

export interface OneHopGraphNode {
	key: string;
	label: string;
	linkText: string;
	path: string;
	group: string;
}

export interface OneHopGraphControls {
	zoomOut: string;
	zoomIn: string;
	fitGraph: string;
}

interface PhysicsNode extends SimulationNodeDatum {
	id: string;
	root: boolean;
	x: number;
	y: number;
	graph?: OneHopGraphNode;
	element?: HTMLButtonElement;
	edge?: SVGLineElement;
}

interface PhysicsLink extends SimulationLinkDatum<PhysicsNode> {
	source: PhysicsNode;
	target: PhysicsNode;
}

interface DragState {
	node: PhysicsNode;
	pointerId: number;
	startClientX: number;
	startClientY: number;
	startNodeX: number;
	startNodeY: number;
	moved: boolean;
}

interface PanState {
	pointerId: number;
	startClientX: number;
	startClientY: number;
	startPanX: number;
	startPanY: number;
}

const MIN_SCALE = 0.55;
const MAX_SCALE = 2.4;

export class OneHopForceGraph {
	private readonly stage: HTMLElement;
	private readonly world: HTMLElement;
	private readonly root: PhysicsNode;
	private readonly leaves: PhysicsNode[];
	private readonly groupAnchors = new Map<string, { x: number; y: number }>();
	private readonly simulation: Simulation<PhysicsNode, PhysicsLink>;
	private readonly resizeObserver: ResizeObserver;
	private panX = 0;
	private panY = 0;
	private scale = 1;
	private drag: DragState | null = null;
	private pan: PanState | null = null;
	private suppressClick = false;

	constructor(
		host: HTMLElement,
		title: string,
		ariaLabel: string,
		controlLabels: OneHopGraphControls,
		items: readonly OneHopGraphNode[],
		onOpen: (node: OneHopGraphNode) => void,
	) {
		this.stage = host.createDiv({ cls: "linked-graph-network" });
		this.stage.tabIndex = 0;
		this.stage.setAttribute("role", "group");
		this.stage.ariaLabel = `${ariaLabel}: ${title}`;
		this.world = this.stage.createDiv({ cls: "linked-graph-network-world" });
		const edgeLayer = createSvg("svg");
		edgeLayer.setAttribute("class", "linked-graph-network-edges");
		edgeLayer.setAttribute("aria-hidden", "true");
		this.world.append(edgeLayer);

		const rootElement = this.world.createDiv({ cls: "linked-graph-network-root" });
		rootElement.createSpan({ cls: "linked-graph-network-root-dot", attr: { "aria-hidden": "true" } });
		rootElement.createSpan({ cls: "linked-graph-network-root-label", text: title });
		this.root = { id: "__current__", root: true, x: 0, y: 0, fx: 0, fy: 0 };

		const radius = Math.min(176, Math.max(118, 92 + items.length * 7));
		const grouped = [...new Set(items.map((item) => item.group).filter(Boolean))];
		for (const [index, group] of grouped.entries()) {
			const angle = -Math.PI / 2 + (Math.PI * 2 * index) / grouped.length;
			const anchor = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
			this.groupAnchors.set(group, anchor);
			const label = this.world.createDiv({ cls: "linked-graph-network-group-label", text: group });
			label.style.transform = `translate(${String(Math.cos(angle) * (radius + 62))}px, ${String(Math.sin(angle) * (radius + 62))}px) translate(-50%, -50%)`;
		}

		this.leaves = items.map((item, index) => {
			const groupItems = item.group
				? items.filter((candidate) => candidate.group === item.group)
				: items.filter((candidate) => !candidate.group);
			const groupItemIndex = groupItems.findIndex((candidate) => candidate.key === item.key);
			const anchor = item.group ? this.groupAnchors.get(item.group) : undefined;
			const angle = anchor
				? Math.atan2(anchor.y, anchor.x) + (groupItemIndex - (groupItems.length - 1) / 2) * 0.22
				: -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(items.length, 1);
			const initialRadius = anchor ? radius + (groupItemIndex % 2) * 18 - 9 : radius;
			const edge = createSvg("line");
			edge.setAttribute("class", "linked-graph-network-edge");
			edge.setAttribute("x1", "0");
			edge.setAttribute("y1", "0");
			edgeLayer.append(edge);
			const element = this.world.createEl("button", {
				cls: "linked-graph-network-node",
				attr: { "aria-label": item.label, title: item.path, type: "button" },
			});
			element.createSpan({ cls: "linked-graph-network-node-dot", attr: { "aria-hidden": "true" } });
			element.createSpan({ cls: "linked-graph-network-node-label", text: item.label });
			const node: PhysicsNode = {
				id: item.key,
				root: false,
				x: Math.cos(angle) * initialRadius,
				y: Math.sin(angle) * initialRadius,
				graph: item,
				element,
				edge,
			};
			element.addEventListener("pointerdown", (event) => this.startNodeDrag(event, node));
			element.addEventListener("pointermove", (event) => this.moveNode(event));
			element.addEventListener("pointerup", (event) => this.endNodeDrag(event));
			element.addEventListener("pointercancel", (event) => this.endNodeDrag(event));
			element.addEventListener("click", (event) => {
				if (this.suppressClick) {
					event.preventDefault();
					this.suppressClick = false;
					return;
				}
				onOpen(item);
			});
			return node;
		});

		const links: PhysicsLink[] = this.leaves.map((node) => ({ source: this.root, target: node }));
		this.simulation = forceSimulation<PhysicsNode, PhysicsLink>([this.root, ...this.leaves])
			.alpha(0.9)
			.alphaDecay(0.035)
			.velocityDecay(0.28)
			.force("link", forceLink<PhysicsNode, PhysicsLink>(links)
				.id((node) => node.id)
				.distance(132)
				.strength(0.5))
			.force("charge", forceManyBody<PhysicsNode>()
				.strength((node) => node.root ? -90 : -210)
				.distanceMax(360))
			.force("collision", forceCollide<PhysicsNode>()
				.radius((node) => node.root ? 42 : this.collisionRadius(node))
				.strength(0.92)
				.iterations(2))
			.force("group-x", forceX<PhysicsNode>((node) => this.groupTarget(node).x)
				.strength((node) => node.root ? 0 : node.graph?.group ? 0.045 : 0.006))
			.force("group-y", forceY<PhysicsNode>((node) => this.groupTarget(node).y)
				.strength((node) => node.root ? 0 : node.graph?.group ? 0.045 : 0.006))
			.on("tick", () => this.updateNodes());
		this.resizeObserver = new ResizeObserver(() => {
			this.updateNodes();
			this.simulation.alpha(0.18).restart();
		});
		this.resizeObserver.observe(this.stage);

		this.renderControls(controlLabels);
		this.stage.addEventListener("pointerdown", (event) => this.startPan(event));
		this.stage.addEventListener("pointermove", (event) => this.movePan(event));
		this.stage.addEventListener("pointerup", (event) => this.endPan(event));
		this.stage.addEventListener("pointercancel", (event) => this.endPan(event));
		this.stage.addEventListener("wheel", (event) => this.zoomWithWheel(event), { passive: false });
		this.updateWorldTransform();
		this.updateNodes();
	}

	destroy(): void {
		this.resizeObserver.disconnect();
		this.simulation.stop();
	}

	private collisionRadius(node: PhysicsNode): number {
		const labelLength = node.graph?.label.length ?? 0;
		return Math.min(88, 38 + labelLength * 2.2);
	}

	private groupTarget(node: PhysicsNode): { x: number; y: number } {
		if (node.root) return { x: 0, y: 0 };
		return this.groupAnchors.get(node.graph?.group ?? "") ?? { x: 0, y: 0 };
	}

	private renderControls(labels: OneHopGraphControls): void {
		const controls = this.stage.createDiv({ cls: "linked-graph-network-controls" });
		controls.append(
			this.iconButton("minus", labels.zoomOut, () => this.setScale(this.scale / 1.18)),
			this.iconButton("plus", labels.zoomIn, () => this.setScale(this.scale * 1.18)),
			this.iconButton("scan", labels.fitGraph, () => this.resetViewport()),
		);
	}

	private iconButton(icon: string, label: string, action: () => void): HTMLButtonElement {
		const button = createEl("button", {
			cls: "clickable-icon linked-graph-network-control",
			attr: { "aria-label": label, title: label, type: "button" },
		});
		setIcon(button, icon);
		button.addEventListener("click", (event) => {
			event.stopPropagation();
			action();
		});
		return button;
	}

	private updateNodes(): void {
		for (const node of this.leaves) {
			const halfNodeWidth = (node.element?.offsetWidth ?? 40) / 2;
			const halfNodeHeight = (node.element?.offsetHeight ?? 30) / 2;
			const maxX = Math.max(36, this.stage.clientWidth / 2 - halfNodeWidth - 12);
			const maxY = Math.max(48, this.stage.clientHeight / 2 - halfNodeHeight - 12);
			const x = Math.max(-maxX, Math.min(maxX, node.x ?? 0));
			const y = Math.max(-maxY, Math.min(maxY, node.y ?? 0));
			if (x !== node.x) node.vx = (node.vx ?? 0) * -0.2;
			if (y !== node.y) node.vy = (node.vy ?? 0) * -0.2;
			node.x = x;
			node.y = y;
			node.element?.style.setProperty("transform", `translate(${String(x)}px, ${String(y)}px) translate(-50%, -50%)`);
			node.edge?.setAttribute("x2", String(x));
			node.edge?.setAttribute("y2", String(y));
		}
	}

	private updateWorldTransform(): void {
		this.world.style.transform = `translate(${String(this.panX)}px, ${String(this.panY)}px) scale(${String(this.scale)})`;
	}

	private startNodeDrag(event: PointerEvent, node: PhysicsNode): void {
		event.stopPropagation();
		this.drag = {
			node,
			pointerId: event.pointerId,
			startClientX: event.clientX,
			startClientY: event.clientY,
			startNodeX: node.x ?? 0,
			startNodeY: node.y ?? 0,
			moved: false,
		};
		node.fx = node.x;
		node.fy = node.y;
		this.simulation.alphaTarget(0.22).restart();
		node.element?.setPointerCapture(event.pointerId);
	}

	private moveNode(event: PointerEvent): void {
		if (!this.drag || this.drag.pointerId !== event.pointerId) return;
		const deltaX = (event.clientX - this.drag.startClientX) / this.scale;
		const deltaY = (event.clientY - this.drag.startClientY) / this.scale;
		this.drag.moved ||= Math.hypot(deltaX, deltaY) > 4;
		this.drag.node.fx = this.drag.startNodeX + deltaX;
		this.drag.node.fy = this.drag.startNodeY + deltaY;
		this.drag.node.x = this.drag.node.fx;
		this.drag.node.y = this.drag.node.fy;
		this.updateNodes();
	}

	private endNodeDrag(event: PointerEvent): void {
		if (!this.drag || this.drag.pointerId !== event.pointerId) return;
		this.suppressClick = this.drag.moved;
		this.drag.node.fx = null;
		this.drag.node.fy = null;
		this.drag = null;
		this.simulation.alphaTarget(0);
	}

	private startPan(event: PointerEvent): void {
		if (event.target instanceof Element && event.target.closest("button")) return;
		this.pan = {
			pointerId: event.pointerId,
			startClientX: event.clientX,
			startClientY: event.clientY,
			startPanX: this.panX,
			startPanY: this.panY,
		};
		this.stage.setPointerCapture(event.pointerId);
	}

	private movePan(event: PointerEvent): void {
		if (!this.pan || this.pan.pointerId !== event.pointerId) return;
		this.panX = this.pan.startPanX + event.clientX - this.pan.startClientX;
		this.panY = this.pan.startPanY + event.clientY - this.pan.startClientY;
		this.updateWorldTransform();
	}

	private endPan(event: PointerEvent): void {
		if (this.pan?.pointerId === event.pointerId) this.pan = null;
	}

	private zoomWithWheel(event: WheelEvent): void {
		event.preventDefault();
		const factor = Math.exp(-event.deltaY * 0.0012);
		const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, this.scale * factor));
		const bounds = this.stage.getBoundingClientRect();
		const pointerX = event.clientX - bounds.left - bounds.width / 2;
		const pointerY = event.clientY - bounds.top - bounds.height / 2;
		const graphX = (pointerX - this.panX) / this.scale;
		const graphY = (pointerY - this.panY) / this.scale;
		this.scale = next;
		this.panX = pointerX - graphX * next;
		this.panY = pointerY - graphY * next;
		this.updateWorldTransform();
	}

	private setScale(next: number): void {
		this.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
		this.updateWorldTransform();
	}

	private resetViewport(): void {
		this.panX = 0;
		this.panY = 0;
		this.scale = 1;
		this.updateWorldTransform();
	}
}
