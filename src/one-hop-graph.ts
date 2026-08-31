import {
	forceCollide,
	forceLink,
	forceManyBody,
	forceSimulation,
	forceX,
	forceY,
	type ForceLink,
	type Simulation,
	type SimulationLinkDatum,
	type SimulationNodeDatum,
} from "d3-force";
import { setIcon } from "obsidian";
import { graphLayoutMetrics, nodeAnchorOffset, type GraphLayoutMetrics, type NodeAnchorOffset } from "./graph-layout";
import { MAX_PREVIEW_GRAPH_NODES, boundedItems } from "./limits";
import type { GraphNavigationTarget, NodeVisualKind } from "./navigation";

export interface OneHopGraphNode {
	key: string;
	label: string;
	linkText: string;
	path: string;
	kind: NodeVisualKind;
	context: string;
}

interface OneHopGraphControls {
	zoomOut: string;
	zoomIn: string;
	fitGraph: string;
	openParent: (label: string) => string;
	omittedRoutes: (count: number) => string;
	previewStatus: (label: string, shown: number, total: number) => string;
	showAllInOutline: string;
}

interface OneHopForceGraphOptions {
	title: string;
	rootKind: NodeVisualKind;
	parent: GraphNavigationTarget | null;
	ariaLabel: string;
	controls: OneHopGraphControls;
	items: readonly OneHopGraphNode[];
	omittedDirectCount: number;
	onOpen: (node: OneHopGraphNode) => void;
	onOpenParent: (parent: GraphNavigationTarget) => void;
	onPreview: (node: OneHopGraphNode) => Promise<readonly OneHopGraphNode[]>;
	onShowAll: () => void;
}

interface PhysicsNode extends SimulationNodeDatum {
	id: string;
	depth: 0 | 1 | 2;
	label: string;
	kind: NodeVisualKind;
	x: number;
	y: number;
	graph?: OneHopGraphNode;
	previewParent?: PhysicsNode;
	element?: HTMLElement;
	dot?: HTMLElement;
	anchor?: HTMLElement;
}

interface PhysicsLink extends SimulationLinkDatum<PhysicsNode> {
	source: PhysicsNode;
	target: PhysicsNode;
	element: SVGLineElement;
	preview: boolean;
	distance: number;
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

const MIN_SCALE = 0.12;
const MAX_SCALE = 2.4;

export class OneHopForceGraph {
	private readonly stage: HTMLElement;
	private readonly world: HTMLElement;
	private readonly edgeLayer: SVGSVGElement;
	private readonly root: PhysicsNode;
	private readonly leaves: PhysicsNode[];
	private readonly baseLinks: PhysicsLink[];
	private readonly simulation: Simulation<PhysicsNode, PhysicsLink>;
	private readonly linkForce: ForceLink<PhysicsNode, PhysicsLink>;
	private readonly resizeObserver: ResizeObserver;
	private readonly previewStatus: HTMLElement;
	private layout: GraphLayoutMetrics;
	private layoutWidth = 0;
	private layoutHeight = 0;
	private previewNodes: PhysicsNode[] = [];
	private previewLinks: PhysicsLink[] = [];
	private previewOwnerId: string | null = null;
	private previewToken = 0;
	private panX = 0;
	private panY = 0;
	private scale = 1;
	private drag: DragState | null = null;
	private pan: PanState | null = null;
	private suppressClick = false;

	constructor(host: HTMLElement, private readonly options: OneHopForceGraphOptions) {
		this.stage = host.createDiv({ cls: "linked-graph-network" });
		this.stage.tabIndex = 0;
		this.stage.setAttribute("role", "group");
		this.stage.ariaLabel = `${options.ariaLabel}: ${options.title}`;
		this.world = this.stage.createDiv({ cls: "linked-graph-network-world" });
		this.edgeLayer = createSvg("svg");
		this.edgeLayer.setAttribute("class", "linked-graph-network-edges");
		this.edgeLayer.setAttribute("aria-hidden", "true");
		this.world.append(this.edgeLayer);
		this.previewStatus = this.stage.createDiv({
			cls: "linked-graph-preview-status",
			attr: { "aria-live": "polite", role: "status" },
		});
		this.previewStatus.hidden = true;

		const rootElement = options.parent
			? this.world.createEl("button", {
					cls: "linked-graph-network-root has-parent",
					attr: {
						"aria-label": options.controls.openParent(options.parent.label),
						"data-node-kind": options.rootKind,
						type: "button",
					},
				})
			: this.world.createDiv({
					cls: "linked-graph-network-root",
					attr: {
						"aria-label": options.title,
						"data-node-kind": options.rootKind,
					},
				});
		if (!options.parent) rootElement.tabIndex = -1;
		const rootDot = rootElement.createSpan({ cls: "linked-graph-network-root-dot", attr: { "aria-hidden": "true" } });
		rootElement.createSpan({ cls: "linked-graph-network-root-label", text: options.title });
		this.root = {
			id: "__current__",
			depth: 0,
			label: options.title,
			kind: options.rootKind,
			x: 0,
			y: 0,
			element: rootElement,
			dot: rootDot,
		};
		this.registerDrag(rootElement, this.root);
		if (options.parent) {
			rootElement.addEventListener("click", (event) => {
				if (this.consumeSuppressedClick(event as MouseEvent)) return;
				options.onOpenParent(options.parent!);
			});
		}

		this.layoutWidth = this.stage.clientWidth || host.clientWidth;
		this.layoutHeight = this.stage.clientHeight || host.clientHeight;
		this.layout = graphLayoutMetrics(this.layoutWidth, this.layoutHeight, options.items.length);
		this.leaves = options.items.map((item, index) => this.createLeaf(item, index, this.layout.leafRadius));
		this.baseLinks = this.leaves.map((node) => this.createLink(this.root, node, false, this.layout.directDistance));
		this.linkForce = forceLink<PhysicsNode, PhysicsLink>(this.baseLinks)
			.id((node) => node.id)
			.distance((link) => link.distance)
			.strength((link) => link.preview ? 0.24 : 0.3);
		this.simulation = forceSimulation<PhysicsNode, PhysicsLink>(this.allNodes())
			.alpha(0.9)
			.alphaDecay(0.022)
			.velocityDecay(0.3)
			.force("link", this.linkForce)
			.force("charge", forceManyBody<PhysicsNode>()
				.strength((node) => node.depth === 0 ? -260 : node.depth === 1 ? -320 : -92)
				.distanceMax(this.layout.chargeDistance))
			.force("collision", forceCollide<PhysicsNode>()
				.radius((node) => this.collisionRadius(node))
				.strength(0.92)
				.iterations(3))
			.force("center-x", forceX<PhysicsNode>(0)
				.strength((node) => node.depth === 0 ? 0.025 : node.depth === 1 ? 0.002 : 0.001))
			.force("center-y", forceY<PhysicsNode>(0)
				.strength((node) => node.depth === 0 ? 0.025 : node.depth === 1 ? 0.002 : 0.001))
			.on("tick", () => this.updateNodes());
		this.resizeObserver = new ResizeObserver(() => {
			if (!this.updateResponsiveLayout()) return;
			this.updateNodes();
			this.simulation.alpha(0.12).restart();
		});
		this.resizeObserver.observe(this.stage);

		this.renderControls(options.controls);
		this.renderOverflowNotice();
		this.stage.addEventListener("pointerdown", (event) => this.startPan(event));
		this.stage.addEventListener("pointermove", (event) => this.movePan(event));
		this.stage.addEventListener("pointerup", (event) => this.endPan(event));
		this.stage.addEventListener("pointercancel", (event) => this.endPan(event));
		this.stage.addEventListener("wheel", (event) => this.zoomWithWheel(event), { passive: false });
		this.updateWorldTransform();
		this.updateNodes();
	}

	destroy(): void {
		this.previewToken += 1;
		this.resizeObserver.disconnect();
		this.simulation.stop();
	}

	private createLeaf(item: OneHopGraphNode, index: number, radius: number): PhysicsNode {
		const goldenAngle = Math.PI * (3 - Math.sqrt(5));
		const angle = -Math.PI / 2 + goldenAngle * index;
		const fill = Math.sqrt((index + 1) / Math.max(this.options.items.length, 1));
		const initialRadius = radius * (0.68 + fill * 0.32);
		const shell = this.world.createDiv({ cls: "linked-graph-network-node-shell" });
		const element = shell.createEl("button", {
			cls: "linked-graph-network-node",
			attr: {
				"aria-label": item.context ? `${item.context}: ${item.label}` : item.label,
				"data-node-kind": item.kind,
				type: "button",
			},
		});
		const dot = element.createSpan({ cls: "linked-graph-network-node-dot", attr: { "aria-hidden": "true" } });
		element.createSpan({ cls: "linked-graph-network-node-label", text: item.label });
		if (item.context) element.createSpan({ cls: "linked-graph-network-node-context", text: item.context });
		const node: PhysicsNode = {
			id: item.key,
			depth: 1,
			label: item.label,
			kind: item.kind,
			x: Math.cos(angle) * initialRadius,
			y: Math.sin(angle) * initialRadius,
			graph: item,
			element: shell,
			dot,
			anchor: element,
		};
		this.registerDrag(element, node);
		shell.addEventListener("pointerenter", () => void this.showPreview(node));
		shell.addEventListener("pointerleave", () => this.hidePreview(node));
		element.addEventListener("focus", () => void this.showPreview(node));
		shell.addEventListener("focusout", (event) => {
			if (!(event.relatedTarget instanceof Node) || !shell.contains(event.relatedTarget)) this.hidePreview(node);
		});
		element.addEventListener("click", (event) => {
			if (this.consumeSuppressedClick(event)) return;
			this.options.onOpen(item);
		});
		return node;
	}

	private createLink(source: PhysicsNode, target: PhysicsNode, preview: boolean, distance: number): PhysicsLink {
		const element = createSvg("line");
		element.setAttribute("class", `linked-graph-network-edge${preview ? " is-preview" : ""}`);
		this.edgeLayer.append(element);
		return { source, target, element, preview, distance };
	}

	private registerDrag(element: HTMLElement, node: PhysicsNode): void {
		element.addEventListener("pointerdown", (event) => this.startNodeDrag(event, node));
		element.addEventListener("pointermove", (event) => this.moveNode(event));
		element.addEventListener("pointerup", (event) => this.endNodeDrag(event));
		element.addEventListener("pointercancel", (event) => this.endNodeDrag(event));
	}

	private consumeSuppressedClick(event: MouseEvent): boolean {
		if (!this.suppressClick) return false;
		event.preventDefault();
		this.suppressClick = false;
		return true;
	}

	private allNodes(): PhysicsNode[] {
		return [this.root, ...this.leaves, ...this.previewNodes];
	}

	private allLinks(): PhysicsLink[] {
		return [...this.baseLinks, ...this.previewLinks];
	}

	private collisionRadius(node: PhysicsNode): number {
		const fallbackWidth = node.depth === 2
			? Math.min(132, 26 + node.label.length * 7)
			: Math.min(190, 34 + node.label.length * 8);
		const halfWidth = (node.element?.offsetWidth || fallbackWidth) / 2;
		const padding = node.depth === 2 ? 10 : 12;
		const minimum = node.depth === 2 ? 34 : 42;
		const maximum = node.depth === 2 ? 82 : 112;
		return Math.min(maximum, Math.max(minimum, halfWidth + padding));
	}

	private async showPreview(node: PhysicsNode): Promise<void> {
		if (!node.graph || this.previewOwnerId === node.id) return;
		this.clearPreview();
		this.previewOwnerId = node.id;
		node.element?.addClass("is-preview-source");
		const token = this.previewToken;
		let items: readonly OneHopGraphNode[];
		try {
			items = await this.options.onPreview(node.graph);
		} catch (error) {
			console.error("Linked Graph Navigator: failed to read hover preview links", error);
			if (token === this.previewToken && this.previewOwnerId === node.id) this.clearPreview();
			return;
		}
		if (token !== this.previewToken || this.previewOwnerId !== node.id) return;
		const visibleItems = boundedItems(items, MAX_PREVIEW_GRAPH_NODES);
		this.previewStatus.hidden = false;
		this.previewStatus.setText(this.options.controls.previewStatus(
			node.label,
			visibleItems.items.length,
			visibleItems.total,
		));
		node.fx = node.x;
		node.fy = node.y;
		const outwardAngle = Math.atan2(node.y - this.root.y, node.x - this.root.x);
		this.previewNodes = visibleItems.items.map((item, index) => {
			const ringSize = 8;
			const ring = Math.floor(index / ringSize);
			const ringStart = ring * ringSize;
			const ringCount = Math.min(ringSize, visibleItems.items.length - ringStart);
			const ringPosition = index - ringStart;
			const spread = Math.min(Math.PI * 0.95, 0.34 * Math.max(ringCount - 1, 1));
			const angle = outwardAngle - spread / 2 + spread * (ringPosition / Math.max(ringCount - 1, 1));
			const distance = this.layout.previewDistance + ring * this.layout.previewRingGap;
			const element = this.world.createDiv({
				cls: "linked-graph-network-preview-node",
				attr: { "aria-hidden": "true", "data-node-kind": item.kind },
			});
			const dot = element.createSpan({ cls: "linked-graph-network-node-dot", attr: { "aria-hidden": "true" } });
			element.createSpan({ cls: "linked-graph-network-node-label", text: item.label });
			if (item.context) element.createSpan({ cls: "linked-graph-network-node-context", text: item.context });
			return {
				id: `preview:${node.id}:${item.key}`,
				depth: 2,
				label: item.label,
				kind: item.kind,
				x: node.x + Math.cos(angle) * distance,
				y: node.y + Math.sin(angle) * distance,
				graph: item,
				previewParent: node,
				element,
				dot,
			};
		});
		this.previewLinks = this.previewNodes.map((preview, index) => this.createLink(
			node,
			preview,
			true,
			this.layout.previewDistance + Math.floor(index / 8) * this.layout.previewRingGap,
		));
		this.restartSimulation(0.3);
	}

	private hidePreview(node: PhysicsNode): void {
		if (this.previewOwnerId === node.id) this.clearPreview();
	}

	private clearPreview(): void {
		this.previewToken += 1;
		const previousOwner = this.leaves.find((leaf) => leaf.id === this.previewOwnerId);
		if (previousOwner && this.drag?.node !== previousOwner) {
			previousOwner.fx = null;
			previousOwner.fy = null;
		}
		for (const leaf of this.leaves) leaf.element?.removeClass("is-preview-source");
		for (const node of this.previewNodes) node.element?.remove();
		for (const link of this.previewLinks) link.element.remove();
		this.previewNodes = [];
		this.previewLinks = [];
		this.previewOwnerId = null;
		this.previewStatus.hidden = true;
		this.previewStatus.setText("");
		if (this.simulation) this.restartSimulation(0.12);
	}

	private restartSimulation(alpha: number): void {
		this.simulation.nodes(this.allNodes());
		this.linkForce.links(this.allLinks());
		this.simulation.alpha(alpha).restart();
	}

	private updateResponsiveLayout(): boolean {
		const width = this.stage.clientWidth;
		const height = this.stage.clientHeight;
		if (width <= 0 || height <= 0) return false;
		if (Math.abs(width - this.layoutWidth) < 8 && Math.abs(height - this.layoutHeight) < 8) return false;
		this.layoutWidth = width;
		this.layoutHeight = height;
		this.layout = graphLayoutMetrics(width, height, this.options.items.length);
		for (const link of this.baseLinks) link.distance = this.layout.directDistance;
		for (const [index, link] of this.previewLinks.entries()) {
			link.distance = this.layout.previewDistance + Math.floor(index / 8) * this.layout.previewRingGap;
		}
		this.linkForce.distance((link) => link.distance);
		return true;
	}

	private renderControls(labels: OneHopGraphControls): void {
		const controls = this.stage.createDiv({ cls: "linked-graph-network-controls" });
		controls.append(
			this.iconButton("minus", labels.zoomOut, () => this.setScale(this.scale / 1.18)),
			this.iconButton("plus", labels.zoomIn, () => this.setScale(this.scale * 1.18)),
			this.iconButton("scan", labels.fitGraph, () => this.fitGraph()),
		);
	}

	private renderOverflowNotice(): void {
		if (this.options.omittedDirectCount <= 0) return;
		const notice = this.stage.createDiv({ cls: "linked-graph-network-overflow" });
		notice.createSpan({ text: this.options.controls.omittedRoutes(this.options.omittedDirectCount) });
		const button = notice.createEl("button", {
			text: this.options.controls.showAllInOutline,
			attr: { type: "button" },
		});
		button.addEventListener("click", (event) => {
			event.stopPropagation();
			this.options.onShowAll();
		});
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
		for (const node of this.allNodes()) {
			const x = node.x ?? 0;
			const y = node.y ?? 0;
			node.element?.style.setProperty("transform", `translate(${String(x)}px, ${String(y)}px) translate(-50%, -50%)`);
		}
		for (const link of this.allLinks()) {
			const sourceAnchor = this.nodeAnchor(link.source);
			const targetAnchor = this.nodeAnchor(link.target);
			link.element.setAttribute("x1", String((link.source.x ?? 0) + sourceAnchor.x));
			link.element.setAttribute("y1", String((link.source.y ?? 0) + sourceAnchor.y));
			link.element.setAttribute("x2", String((link.target.x ?? 0) + targetAnchor.x));
			link.element.setAttribute("y2", String((link.target.y ?? 0) + targetAnchor.y));
		}
	}

	private nodeAnchor(node: PhysicsNode): NodeAnchorOffset {
		const anchor = node.anchor ?? node.element;
		if (!anchor || !node.dot) return { x: 0, y: 0 };
		return nodeAnchorOffset(
			anchor.offsetWidth,
			anchor.offsetHeight,
			node.dot.offsetLeft,
			node.dot.offsetTop,
			node.dot.offsetWidth,
			node.dot.offsetHeight,
		);
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
		if (this.previewOwnerId === this.drag.node.id) {
			this.drag.node.fx = this.drag.node.x;
			this.drag.node.fy = this.drag.node.y;
		} else {
			this.drag.node.fx = null;
			this.drag.node.fy = null;
		}
		this.drag = null;
		this.simulation.alphaTarget(0).alpha(0.32).restart();
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

	private fitGraph(): void {
		const nodes = this.allNodes();
		if (nodes.length === 0) return;
		let minX = Number.POSITIVE_INFINITY;
		let maxX = Number.NEGATIVE_INFINITY;
		let minY = Number.POSITIVE_INFINITY;
		let maxY = Number.NEGATIVE_INFINITY;
		for (const node of nodes) {
			const halfWidth = (node.element?.offsetWidth ?? 40) / 2;
			const halfHeight = (node.element?.offsetHeight ?? 30) / 2;
			minX = Math.min(minX, (node.x ?? 0) - halfWidth);
			maxX = Math.max(maxX, (node.x ?? 0) + halfWidth);
			minY = Math.min(minY, (node.y ?? 0) - halfHeight);
			maxY = Math.max(maxY, (node.y ?? 0) + halfHeight);
		}
		const padding = 40;
		const graphWidth = Math.max(1, maxX - minX + padding * 2);
		const graphHeight = Math.max(1, maxY - minY + padding * 2);
		this.scale = Math.min(
			1,
			Math.max(
				MIN_SCALE,
				Math.min(this.stage.clientWidth / graphWidth, this.stage.clientHeight / graphHeight),
			),
		);
		this.panX = -((minX + maxX) / 2) * this.scale;
		this.panY = -((minY + maxY) / 2) * this.scale;
		this.updateWorldTransform();
	}
}
