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

interface SimulatedNode extends OneHopGraphNode {
	x: number;
	y: number;
	vx: number;
	vy: number;
	element: HTMLButtonElement;
	edge: SVGLineElement;
}

interface DragState {
	node: SimulatedNode;
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
	private readonly nodes: SimulatedNode[];
	private readonly groupAnchors = new Map<string, { x: number; y: number }>();
	private frame = 0;
	private ticks = 0;
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
		const root = this.world.createDiv({ cls: "linked-graph-network-root" });
		root.createSpan({ cls: "linked-graph-network-root-dot", attr: { "aria-hidden": "true" } });
		root.createSpan({ cls: "linked-graph-network-root-label", text: title });

		const radius = Math.min(180, Math.max(112, 92 + items.length * 5));
		const grouped = [...new Set(items.map((item) => item.group).filter(Boolean))];
		for (const [index, group] of grouped.entries()) {
			const angle = -Math.PI / 2 + (Math.PI * 2 * index) / grouped.length;
			this.groupAnchors.set(group, {
				x: Math.cos(angle) * radius,
				y: Math.sin(angle) * radius,
			});
			const label = this.world.createDiv({ cls: "linked-graph-network-group-label", text: group });
			label.style.transform = `translate(${String(Math.cos(angle) * (radius + 58))}px, ${String(Math.sin(angle) * (radius + 58))}px) translate(-50%, -50%)`;
		}
		this.nodes = items.map((item, index) => {
			const groupItems = item.group ? items.filter((candidate) => candidate.group === item.group) : items.filter((candidate) => !candidate.group);
			const groupItemIndex = groupItems.findIndex((candidate) => candidate.key === item.key);
			const anchor = item.group ? this.groupAnchors.get(item.group) : undefined;
			const angle = anchor
				? Math.atan2(anchor.y, anchor.x) + (groupItemIndex - (groupItems.length - 1) / 2) * 0.18
				: -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(items.length, 1);
			const nodeRadius = anchor ? radius + (groupItemIndex % 2) * 22 - 11 : radius;
			const edge = createSvg("line");
			edge.setAttribute("class", "linked-graph-network-edge");
			edge.setAttribute("x1", "0");
			edge.setAttribute("y1", "0");
			edgeLayer.append(edge);
			const element = this.world.createEl("button", {
				cls: "linked-graph-network-node",
				attr: { title: item.path, type: "button" },
			});
			element.createSpan({ cls: "linked-graph-network-node-dot", attr: { "aria-hidden": "true" } });
			element.createSpan({ cls: "linked-graph-network-node-label", text: item.label });
			const node: SimulatedNode = {
				...item,
				x: Math.cos(angle) * nodeRadius,
				y: Math.sin(angle) * nodeRadius,
				vx: 0,
				vy: 0,
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

		this.renderControls(controlLabels);
		this.stage.addEventListener("pointerdown", (event) => this.startPan(event));
		this.stage.addEventListener("pointermove", (event) => this.movePan(event));
		this.stage.addEventListener("pointerup", (event) => this.endPan(event));
		this.stage.addEventListener("pointercancel", (event) => this.endPan(event));
		this.stage.addEventListener("wheel", (event) => this.zoomWithWheel(event), { passive: false });
		this.updateWorldTransform();
		this.updateNodes();
		this.frame = window.requestAnimationFrame(() => this.simulate());
	}

	destroy(): void {
		if (this.frame) window.cancelAnimationFrame(this.frame);
		this.frame = 0;
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

	private simulate(): void {
		if (this.drag) {
			this.frame = window.requestAnimationFrame(() => this.simulate());
			return;
		}
		const targetRadius = Math.min(180, Math.max(112, 92 + this.nodes.length * 5));
		for (let index = 0; index < this.nodes.length; index += 1) {
			const node = this.nodes[index]!;
			for (let otherIndex = index + 1; otherIndex < this.nodes.length; otherIndex += 1) {
				const other = this.nodes[otherIndex]!;
				const dx = node.x - other.x;
				const dy = node.y - other.y;
				const distanceSquared = Math.max(160, dx * dx + dy * dy);
				const distance = Math.sqrt(distanceSquared);
				const force = Math.min(0.9, 920 / distanceSquared);
				const forceX = (dx / distance) * force;
				const forceY = (dy / distance) * force;
				node.vx += forceX;
				node.vy += forceY;
				other.vx -= forceX;
				other.vy -= forceY;
			}
			const distance = Math.max(1, Math.hypot(node.x, node.y));
			const spring = (distance - targetRadius) * 0.012;
			node.vx -= (node.x / distance) * spring;
			node.vy -= (node.y / distance) * spring;
			const anchor = this.groupAnchors.get(node.group);
			if (anchor) {
				node.vx += (anchor.x - node.x) * 0.006;
				node.vy += (anchor.y - node.y) * 0.006;
			}
		}
		let motion = 0;
		for (const node of this.nodes) {
			node.vx *= 0.84;
			node.vy *= 0.84;
			node.x += node.vx;
			node.y += node.vy;
			motion += Math.abs(node.vx) + Math.abs(node.vy);
		}
		this.updateNodes();
		this.ticks += 1;
		if (this.ticks < 220 && motion > 0.008) {
			this.frame = window.requestAnimationFrame(() => this.simulate());
		} else {
			this.frame = 0;
		}
	}

	private updateNodes(): void {
		for (const node of this.nodes) {
			node.element.style.transform = `translate(${String(node.x)}px, ${String(node.y)}px) translate(-50%, -50%)`;
			node.edge.setAttribute("x2", String(node.x));
			node.edge.setAttribute("y2", String(node.y));
		}
	}

	private updateWorldTransform(): void {
		this.world.style.transform = `translate(${String(this.panX)}px, ${String(this.panY)}px) scale(${String(this.scale)})`;
	}

	private startNodeDrag(event: PointerEvent, node: SimulatedNode): void {
		event.stopPropagation();
		this.drag = {
			node,
			pointerId: event.pointerId,
			startClientX: event.clientX,
			startClientY: event.clientY,
			startNodeX: node.x,
			startNodeY: node.y,
			moved: false,
		};
		node.element.setPointerCapture(event.pointerId);
	}

	private moveNode(event: PointerEvent): void {
		if (!this.drag || this.drag.pointerId !== event.pointerId) return;
		const deltaX = (event.clientX - this.drag.startClientX) / this.scale;
		const deltaY = (event.clientY - this.drag.startClientY) / this.scale;
		this.drag.moved ||= Math.hypot(deltaX, deltaY) > 4;
		this.drag.node.x = this.drag.startNodeX + deltaX;
		this.drag.node.y = this.drag.startNodeY + deltaY;
		this.drag.node.vx = 0;
		this.drag.node.vy = 0;
		this.updateNodes();
	}

	private endNodeDrag(event: PointerEvent): void {
		if (!this.drag || this.drag.pointerId !== event.pointerId) return;
		this.suppressClick = this.drag.moved;
		this.drag = null;
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
