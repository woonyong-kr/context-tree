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
import { GRAPH_MOTION, minimumSimulationAlpha } from "./graph-motion";
import { graphLayoutMetrics, nodeAnchorOffset, type GraphLayoutMetrics, type NodeAnchorOffset } from "./graph-layout";
import { boundedItems, previewGraphNodeLimit } from "./limits";
import type { GraphNavigationTarget, NodeVisualKind } from "./navigation";
import { hasNodeDragIntent } from "./pointer-intent";

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
	previewOffsetX?: number;
	previewOffsetY?: number;
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
	startedPinned: boolean;
	pointerType: string;
	captureTarget: HTMLElement;
	phase: "pressed" | "dragging";
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
// Never shrink labels on first open. Compact sidebars can pan the unbounded
// graph or explicitly press Fit; silent auto-shrinking makes every node an
// unreadable thumbnail and hides the real information architecture.
const AUTO_FIT_MIN_SCALE = 1;

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
	private suppressedClickNodeId: string | null = null;
	private suppressClickTimer: number | null = null;
	private readonly pinnedNodeIds = new Set<string>();
	private viewportTouched = false;
	private initialFitFrame: number | null = null;
	private previewAnimationFrame: number | null = null;
	private readonly previewRemovalTimers = new Set<number>();
	private readonly cancelPointerInteractionsOnBlur = (): void => {
		this.cancelNodeDrag();
		this.cancelPan();
	};

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
				if (this.consumeSuppressedClick(event as MouseEvent, this.root.id)) return;
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
		this.simulation = forceSimulation<PhysicsNode, PhysicsLink>(this.physicsNodes())
			.alpha(GRAPH_MOTION.initialAlpha)
			.alphaDecay(GRAPH_MOTION.alphaDecay)
			.velocityDecay(GRAPH_MOTION.velocityDecay)
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
			.on("tick", () => this.updateNodes())
			.on("end", () => {
				if (!this.viewportTouched) this.fitGraph(false);
			});
		this.resizeObserver = new ResizeObserver(() => {
			if (!this.updateResponsiveLayout()) return;
			this.updateNodes();
			if (!this.viewportTouched) this.fitGraph(false);
			this.simulation
				.alpha(minimumSimulationAlpha(this.simulation.alpha(), GRAPH_MOTION.resizeAlpha))
				.restart();
		});
		this.resizeObserver.observe(this.stage);

		this.renderControls(options.controls);
		this.renderOverflowNotice();
		this.stage.addEventListener("pointerdown", (event) => this.startPan(event));
		this.stage.addEventListener("pointermove", (event) => this.movePan(event));
		this.stage.addEventListener("pointerup", (event) => this.endPan(event));
		this.stage.addEventListener("pointercancel", (event) => this.endPan(event));
		this.stage.addEventListener("lostpointercapture", (event) => this.endPan(event));
		this.stage.addEventListener("wheel", (event) => this.zoomWithWheel(event), { passive: false });
		window.addEventListener("blur", this.cancelPointerInteractionsOnBlur);
		this.updateWorldTransform();
		this.updateNodes();
		this.initialFitFrame = window.requestAnimationFrame(() => {
			this.initialFitFrame = null;
			if (!this.viewportTouched) this.fitGraph(false);
		});
	}

	destroy(): void {
		this.previewToken += 1;
		if (this.initialFitFrame !== null) window.cancelAnimationFrame(this.initialFitFrame);
		if (this.previewAnimationFrame !== null) window.cancelAnimationFrame(this.previewAnimationFrame);
		for (const timer of this.previewRemovalTimers) window.clearTimeout(timer);
		if (this.suppressClickTimer !== null) window.clearTimeout(this.suppressClickTimer);
		window.removeEventListener("blur", this.cancelPointerInteractionsOnBlur);
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
				"aria-label": item.label,
				"data-node-kind": item.kind,
				type: "button",
			},
		});
		const visual = element.createSpan({ cls: "linked-graph-network-node-visual" });
		const dot = visual.createSpan({ cls: "linked-graph-network-node-dot", attr: { "aria-hidden": "true" } });
		visual.createSpan({ cls: "linked-graph-network-node-label", text: item.label });
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
			if (this.consumeSuppressedClick(event, node.id)) return;
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
		element.addEventListener("pointerdown", (event) => this.startNodeDrag(event, node, element));
		element.addEventListener("pointermove", (event) => this.moveNode(event));
		element.addEventListener("pointerup", (event) => this.endNodeDrag(event));
		element.addEventListener("pointercancel", (event) => this.cancelNodeDrag(event.pointerId));
		element.addEventListener("lostpointercapture", (event) => this.cancelNodeDrag(event.pointerId));
	}

	private consumeSuppressedClick(event: MouseEvent, nodeId: string): boolean {
		if (this.suppressedClickNodeId !== nodeId) return false;
		event.preventDefault();
		this.clearSuppressedClick();
		return true;
	}

	private physicsNodes(): PhysicsNode[] {
		return [this.root, ...this.leaves];
	}

	private visibleNodes(): PhysicsNode[] {
		return [this.root, ...this.leaves, ...this.previewNodes];
	}

	private visibleLinks(): PhysicsLink[] {
		return [...this.baseLinks, ...this.previewLinks];
	}

	private collisionRadius(node: PhysicsNode): number {
		const fallbackWidth = node.depth === 2
			? Math.min(132, 26 + node.label.length * 7)
			: Math.min(190, 34 + node.label.length * 8);
		const width = node.element?.offsetWidth || fallbackWidth;
		const fallbackHeight = node.depth === 2 ? 34 : 42;
		const height = node.element?.offsetHeight || fallbackHeight;
		const halfDiagonal = Math.hypot(width, height) / 2;
		const padding = node.depth === 2 ? 10 : 12;
		const minimum = node.depth === 2 ? 34 : 42;
		const maximum = node.depth === 2 ? 140 : 190;
		return Math.min(maximum, Math.max(minimum, halfDiagonal + padding));
	}

	private async showPreview(node: PhysicsNode): Promise<void> {
		if (!node.graph || this.previewOwnerId === node.id || this.drag?.phase === "dragging") return;
		this.clearPreview();
		this.previewOwnerId = node.id;
		node.element?.addClass("is-preview-source");
		node.fx = node.x;
		node.fy = node.y;
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
		const visibleItems = boundedItems(items, previewGraphNodeLimit(this.layoutWidth));
		this.previewStatus.hidden = false;
		this.previewStatus.setText(this.options.controls.previewStatus(
			node.label,
			visibleItems.items.length,
			visibleItems.total,
		));
		const inwardAngle = Math.atan2(this.root.y - node.y, this.root.x - node.x);
		this.previewNodes = visibleItems.items.map((item, index) => {
			const ringSize = this.layoutWidth <= 420 ? 2 : 8;
			const ring = Math.floor(index / ringSize);
			const ringStart = ring * ringSize;
			const ringCount = Math.min(ringSize, visibleItems.items.length - ringStart);
			const ringPosition = index - ringStart;
			const spread = Math.min(Math.PI * 1.15, 0.9 * Math.max(ringCount - 1, 1));
			const stagger = ring % 2 === 0 ? 0 : Math.min(0.2, spread / Math.max(ringCount, 1));
			const angle = inwardAngle - spread / 2 + stagger + spread * (ringPosition / Math.max(ringCount - 1, 1));
			const distance = this.layout.previewDistance + ring * this.layout.previewRingGap;
			const element = this.world.createDiv({
				cls: "linked-graph-network-preview-node",
				attr: { "aria-hidden": "true", "data-node-kind": item.kind },
			});
			const dot = element.createSpan({ cls: "linked-graph-network-node-dot", attr: { "aria-hidden": "true" } });
			element.createSpan({ cls: "linked-graph-network-node-label", text: item.label });
			const offsetX = Math.cos(angle) * distance;
			const offsetY = Math.sin(angle) * distance;
			return {
				id: `preview:${node.id}:${item.key}`,
				depth: 2,
				label: item.label,
				kind: item.kind,
				x: node.x + offsetX,
				y: node.y + offsetY,
				graph: item,
				previewParent: node,
				previewOffsetX: offsetX,
				previewOffsetY: offsetY,
				element,
				dot,
			};
		});
		this.previewLinks = this.previewNodes.map((preview, index) => this.createLink(
			node,
			preview,
			true,
			this.layout.previewDistance + Math.floor(index / (this.layoutWidth <= 420 ? 2 : 8)) * this.layout.previewRingGap,
		));
		this.updateNodes();
		this.previewAnimationFrame = window.requestAnimationFrame(() => {
			this.previewAnimationFrame = null;
			if (this.previewOwnerId !== node.id) return;
			for (const preview of this.previewNodes) preview.element?.addClass("is-visible");
			for (const link of this.previewLinks) link.element.classList.add("is-visible");
		});
	}

	private hidePreview(node: PhysicsNode): void {
		if (this.drag?.node === node && this.drag.phase === "dragging") return;
		if (this.previewOwnerId === node.id) this.clearPreview(true);
	}

	private clearPreview(animate = false): void {
		this.previewToken += 1;
		if (this.previewAnimationFrame !== null) {
			window.cancelAnimationFrame(this.previewAnimationFrame);
			this.previewAnimationFrame = null;
		}
		const previousOwner = this.leaves.find((leaf) => leaf.id === this.previewOwnerId);
		if (previousOwner && this.drag?.node !== previousOwner && !this.pinnedNodeIds.has(previousOwner.id)) {
			previousOwner.fx = null;
			previousOwner.fy = null;
		}
		for (const leaf of this.leaves) leaf.element?.removeClass("is-preview-source");
		const removedNodes = this.previewNodes;
		const removedLinks = this.previewLinks;
		if (animate && previousOwner) {
			for (const node of removedNodes) node.element?.removeClass("is-visible");
			for (const link of removedLinks) link.element.classList.remove("is-visible");
			const timer = window.setTimeout(() => {
				for (const node of removedNodes) node.element?.remove();
				for (const link of removedLinks) link.element.remove();
				this.previewRemovalTimers.delete(timer);
			}, 190);
			this.previewRemovalTimers.add(timer);
		} else {
			for (const node of removedNodes) node.element?.remove();
			for (const link of removedLinks) link.element.remove();
		}
		this.previewNodes = [];
		this.previewLinks = [];
		this.previewOwnerId = null;
		this.previewStatus.hidden = true;
		this.previewStatus.setText("");
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
			link.distance = this.layout.previewDistance
				+ Math.floor(index / (this.layoutWidth <= 420 ? 2 : 8)) * this.layout.previewRingGap;
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
		for (const node of this.previewNodes) {
			if (!node.previewParent) continue;
			node.x = (node.previewParent.x ?? 0) + (node.previewOffsetX ?? 0);
			node.y = (node.previewParent.y ?? 0) + (node.previewOffsetY ?? 0);
		}
		for (const node of this.visibleNodes()) {
			const x = node.x ?? 0;
			const y = node.y ?? 0;
			if (node.depth === 2) {
				node.element?.style.setProperty("--lg-node-x", `${String(x)}px`);
				node.element?.style.setProperty("--lg-node-y", `${String(y)}px`);
				node.element?.style.setProperty("--lg-preview-offset-x", `${String(node.previewOffsetX ?? 0)}px`);
				node.element?.style.setProperty("--lg-preview-offset-y", `${String(node.previewOffsetY ?? 0)}px`);
			} else {
				node.element?.style.setProperty("transform", `translate(${String(x)}px, ${String(y)}px) translate(-50%, -50%)`);
			}
		}
		for (const link of this.visibleLinks()) {
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

	private startNodeDrag(event: PointerEvent, node: PhysicsNode, captureTarget: HTMLElement): void {
		if (!event.isPrimary || event.button !== 0) return;
		event.stopPropagation();
		if (this.drag) this.cancelNodeDrag();
		this.drag = {
			node,
			pointerId: event.pointerId,
			startClientX: event.clientX,
			startClientY: event.clientY,
			startNodeX: node.x ?? 0,
			startNodeY: node.y ?? 0,
			startedPinned: this.pinnedNodeIds.has(node.id),
			pointerType: event.pointerType,
			captureTarget,
			phase: "pressed",
		};
		captureTarget.setPointerCapture(event.pointerId);
	}

	private moveNode(event: PointerEvent): void {
		if (!this.drag || this.drag.pointerId !== event.pointerId) return;
		if (this.drag.phase === "pressed") {
			if (!hasNodeDragIntent(
				{ clientX: this.drag.startClientX, clientY: this.drag.startClientY },
				event.clientX,
				event.clientY,
				this.drag.pointerType,
			)) return;
			this.drag.phase = "dragging";
			if (this.previewOwnerId === this.drag.node.id) this.clearPreview(true);
			this.viewportTouched = true;
			this.drag.node.element?.addClass("is-dragging");
			this.drag.node.fx = this.drag.node.x;
			this.drag.node.fy = this.drag.node.y;
			this.simulation
				.alpha(minimumSimulationAlpha(this.simulation.alpha(), GRAPH_MOTION.dropAlpha))
				.alphaTarget(GRAPH_MOTION.dragAlphaTarget)
				.restart();
		}
		const deltaX = (event.clientX - this.drag.startClientX) / this.scale;
		const deltaY = (event.clientY - this.drag.startClientY) / this.scale;
		this.drag.node.fx = this.drag.startNodeX + deltaX;
		this.drag.node.fy = this.drag.startNodeY + deltaY;
		this.drag.node.x = this.drag.node.fx;
		this.drag.node.y = this.drag.node.fy;
		this.updateNodes();
	}

	private endNodeDrag(event: PointerEvent): void {
		if (!this.drag || this.drag.pointerId !== event.pointerId) return;
		const completed = this.drag;
		this.drag = null;
		this.releasePointerCapture(completed);
		if (completed.phase === "pressed") return;
		completed.node.element?.removeClass("is-dragging");
		this.suppressClickFor(completed.node.id);
		this.pinnedNodeIds.add(completed.node.id);
		completed.node.fx = completed.node.x;
		completed.node.fy = completed.node.y;
		this.simulation
			.alphaTarget(0)
			.alpha(minimumSimulationAlpha(this.simulation.alpha(), GRAPH_MOTION.dropAlpha))
			.restart();
	}

	private cancelNodeDrag(pointerId?: number): void {
		if (!this.drag || (pointerId !== undefined && this.drag.pointerId !== pointerId)) return;
		const cancelled = this.drag;
		this.drag = null;
		this.releasePointerCapture(cancelled);
		cancelled.node.element?.removeClass("is-dragging");
		if (this.previewOwnerId === cancelled.node.id) this.clearPreview();
		cancelled.node.x = cancelled.startNodeX;
		cancelled.node.y = cancelled.startNodeY;
		if (cancelled.startedPinned) {
			this.pinnedNodeIds.add(cancelled.node.id);
			cancelled.node.fx = cancelled.startNodeX;
			cancelled.node.fy = cancelled.startNodeY;
		} else {
			this.pinnedNodeIds.delete(cancelled.node.id);
			cancelled.node.fx = null;
			cancelled.node.fy = null;
		}
		this.simulation
			.alphaTarget(0)
			.alpha(minimumSimulationAlpha(this.simulation.alpha(), GRAPH_MOTION.cancelAlpha))
			.restart();
		this.updateNodes();
	}

	private releasePointerCapture(drag: DragState): void {
		if (drag.captureTarget.hasPointerCapture(drag.pointerId)) {
			drag.captureTarget.releasePointerCapture(drag.pointerId);
		}
	}

	private suppressClickFor(nodeId: string): void {
		this.clearSuppressedClick();
		this.suppressedClickNodeId = nodeId;
		this.suppressClickTimer = window.setTimeout(() => this.clearSuppressedClick(), 0);
	}

	private clearSuppressedClick(): void {
		if (this.suppressClickTimer !== null) window.clearTimeout(this.suppressClickTimer);
		this.suppressClickTimer = null;
		this.suppressedClickNodeId = null;
	}

	private startPan(event: PointerEvent): void {
		if (!event.isPrimary || event.button !== 0) return;
		if (event.target instanceof Element && event.target.closest("button")) return;
		this.viewportTouched = true;
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
		if (this.pan?.pointerId !== event.pointerId) return;
		const pointerId = this.pan.pointerId;
		this.pan = null;
		if (this.stage.hasPointerCapture(pointerId)) this.stage.releasePointerCapture(pointerId);
	}

	private cancelPan(): void {
		if (!this.pan) return;
		const pointerId = this.pan.pointerId;
		this.pan = null;
		if (this.stage.hasPointerCapture(pointerId)) this.stage.releasePointerCapture(pointerId);
	}

	private zoomWithWheel(event: WheelEvent): void {
		event.preventDefault();
		this.viewportTouched = true;
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
		this.viewportTouched = true;
		this.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
		this.updateWorldTransform();
	}

	private fitGraph(markViewportTouched = true): void {
		const nodes = this.visibleNodes();
		if (nodes.length === 0) return;
		if (markViewportTouched) this.viewportTouched = true;
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
		const fitScale = Math.min(this.stage.clientWidth / graphWidth, this.stage.clientHeight / graphHeight);
		this.scale = markViewportTouched
			? Math.min(1, Math.max(MIN_SCALE, fitScale))
			: Math.min(1, Math.max(AUTO_FIT_MIN_SCALE, fitScale));
		this.panX = -((minX + maxX) / 2) * this.scale;
		this.panY = -((minY + maxY) / 2) * this.scale;
		this.updateWorldTransform();
	}
}
