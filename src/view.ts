import { ItemView, MarkdownRenderer, Notice, setIcon, TFile, WorkspaceLeaf } from "obsidian";
import {
	forceCollide as d3ForceCollide,
	forceLink as d3ForceLink,
	forceManyBody as d3ForceManyBody,
	forceSimulation as d3ForceSimulation,
	forceX as d3ForceX,
	forceY as d3ForceY,
	ForceCollide,
	ForceLink,
	Simulation,
	SimulationLinkDatum,
	SimulationNodeDatum,
} from "d3-force";
import ContextTreePlugin from "./main";
import { replaceDocumentBody } from "./document-body";
import { loadContextTree } from "./parser";
import { buildContextGraph, GraphEdge } from "./radial-layout";
import { ContextTreeNode } from "./types";

export const VIEW_TYPE_CONTEXT_TREE = "context-tree-view";

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2.5;
const FALLBACK_CARD = { width: 276, height: 146 };

interface NodeSize {
	width: number;
	height: number;
}

interface SimNode extends SimulationNodeDatum {
	id: string;
	node: ContextTreeNode;
	size: NodeSize;
}

interface SimLink extends SimulationLinkDatum<SimNode> {
	from: string;
	to: string;
	source: string | SimNode;
	target: string | SimNode;
}

/**
 * An interactive ego graph. Topic cards contain Markdown directly; the graph
 * is physical rather than a tree layout so cards push one another apart when
 * their details open.
 */
export class ContextTreeView extends ItemView {
	private readonly openDetails = new Set<string>();
	private readonly renderedDetails = new Set<string>();
	private readonly nodeElements = new Map<string, HTMLElement>();
	private readonly edgeElements = new Map<string, SVGPathElement>();
	private editingNodeId?: string;
	private rootNodes: ContextTreeNode[] = [];
	private simNodes: SimNode[] = [];
	private simLinks: SimLink[] = [];
	private focusedNodeId?: string;
	private pan = { x: 0, y: 0 };
	private zoom = 1;
	private viewport?: HTMLElement;
	private scene?: HTMLElement;
	private edges?: SVGSVGElement;
	private simulation?: Simulation<SimNode, undefined>;
	private linkForce?: ForceLink<SimNode, SimLink>;
	private collideForce?: ForceCollide<SimNode>;
	private resizeTimer?: number;
	private fitWhenMeasured = false;

	constructor(leaf: WorkspaceLeaf, private readonly plugin: ContextTreePlugin) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_CONTEXT_TREE;
	}

	getDisplayText(): string {
		return "Context graph";
	}

	getIcon(): string {
		return "git-fork";
	}

	async onOpen(): Promise<void> {
		this.registerDomEvent(window, "resize", () => this.scheduleMeasure());
		await this.refresh();
	}

	onClose(): Promise<void> {
		this.simulation?.stop();
		if (this.resizeTimer !== undefined) window.clearTimeout(this.resizeTimer);
		return Promise.resolve();
	}

	async refresh(): Promise<void> {
		const roots = await loadContextTree(this.app, this.plugin.settings);
		this.rootNodes = roots;
		this.focusedNodeId ??= roots[0]?.id;
		if (!roots.length) {
			this.renderEmpty();
			return;
		}
		this.renderShell();
		this.createGraph();
	}

	private renderShell(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("context-tree-view");
		this.nodeElements.clear();
		this.edgeElements.clear();
		this.renderedDetails.clear();

		const header = contentEl.createDiv({ cls: "context-tree-toolbar" });
		header.createEl("h2", { text: "Context graph" });
		const actions = header.createDiv({ cls: "context-tree-actions" });
		this.createAction(actions, "Re-center", () => this.focusNode(this.focusedNodeId));
		this.createAction(actions, "Refresh", () => void this.refresh());

		this.viewport = contentEl.createDiv({ cls: "context-tree-viewport" });
		this.viewport.tabIndex = 0;
		this.viewport.setAttribute("aria-label", "Context graph. Drag to pan; use control or command plus the mouse wheel to zoom.");
		this.scene = this.viewport.createDiv({ cls: "context-tree-scene" });
		this.edges = this.scene.createSvg("svg", { cls: "context-tree-edges" });
		this.createZoomControls(this.viewport);
		this.applyTransform();
		this.bindCanvasControls(this.viewport);
	}

	private renderEmpty(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("context-tree-view");
		const empty = contentEl.createDiv({ cls: "context-tree-empty" });
		empty.createEl("h3", { text: "No graph topics found" });
		empty.createEl("p", { text: "Add context_tree: true to a Markdown note, then connect related notes with context_tree_parent." });
	}

	private createAction(parent: HTMLElement, label: string, callback: () => void): void {
		const button = parent.createEl("button", { text: label, cls: "context-tree-action" });
		button.addEventListener("click", callback);
	}

	private createZoomControls(parent: HTMLElement): void {
		const controls = parent.createDiv({ cls: "context-tree-zoom-controls" });
		this.createZoomButton(controls, "−", "Zoom out", 0.86);
		const label = controls.createDiv({ cls: "context-tree-zoom-label", text: "100%" });
		label.setAttribute("aria-live", "polite");
		this.createZoomButton(controls, "+", "Zoom in", 1.16);
		const reset = controls.createEl("button", { cls: "context-tree-zoom-button", text: "⌾", attr: { "aria-label": "Reset graph view", title: "Reset graph view" } });
		reset.addEventListener("click", (event) => {
			event.stopPropagation();
			this.fitOverview();
		});
	}

	private createZoomButton(parent: HTMLElement, text: string, label: string, multiplier: number): void {
		const button = parent.createEl("button", { cls: "context-tree-zoom-button", text, attr: { "aria-label": label, title: label } });
		button.addEventListener("click", (event) => {
			event.stopPropagation();
			if (!this.viewport) return;
			const rect = this.viewport.getBoundingClientRect();
			this.zoomAt(this.viewport, rect.left + rect.width / 2, rect.top + rect.height / 2, this.clampZoom(this.zoom * multiplier));
		});
	}

	private createGraph(): void {
		this.simulation?.stop();
		const graph = buildContextGraph(this.rootNodes);
		const previous = new Map(this.simNodes.map((node) => [node.id, node]));
		const focusId = graph.nodes.some((node) => node.id === this.focusedNodeId) ? this.focusedNodeId : graph.nodes[0]?.id;
		this.focusedNodeId = focusId;
		this.simNodes = graph.nodes.map((node, index) => {
			const saved = previous.get(node.id);
			const initial = saved ?? this.initialPosition(index, graph.nodes.length, node.id === focusId);
			return { id: node.id, node, size: saved?.size ?? FALLBACK_CARD, x: initial.x, y: initial.y, vx: saved?.vx, vy: saved?.vy };
		});
		this.simLinks = graph.edges.map((edge) => this.toSimulationLink(edge));
		this.syncCards();
		this.createSimulation();
		this.focusNode(focusId, false);
		this.paintGraph();
		this.fitWhenMeasured = true;
		this.scheduleMeasure();
	}

	private initialPosition(index: number, total: number, isFocus: boolean): { x: number; y: number } {
		if (isFocus) return { x: 0, y: 0 };
		const angle = (index / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;
		const radius = 360 + (index % 3) * 78;
		return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
	}

	private toSimulationLink(edge: GraphEdge): SimLink {
		return { from: edge.from, to: edge.to, source: edge.from, target: edge.to };
	}

	private createSimulation(): void {
		this.linkForce = d3ForceLink<SimNode, SimLink>(this.simLinks)
			.id((node) => node.id)
			.distance((edge) => this.linkDistance(edge))
			.strength(0.42);
		this.collideForce = d3ForceCollide<SimNode>()
			.radius((node) => this.cardRadius(node) + 30)
			.strength(1)
			.iterations(3);
		this.simulation = d3ForceSimulation(this.simNodes)
			.force("link", this.linkForce)
			.force("charge", d3ForceManyBody<SimNode>().strength(-980).distanceMax(1900))
			.force("collide", this.collideForce)
			.force("x", d3ForceX<SimNode>(0).strength(0.018))
			.force("y", d3ForceY<SimNode>(0).strength(0.018))
			.alphaDecay(0.038)
			.velocityDecay(0.46)
			.on("tick", () => this.paintGraph())
			.on("end", () => this.finishOverviewFit());
	}

	private syncCards(): void {
		if (!this.scene) return;
		const wanted = new Set(this.simNodes.map((node) => node.id));
		for (const [id, element] of this.nodeElements) {
			if (wanted.has(id)) continue;
			element.remove();
			this.nodeElements.delete(id);
		}
		for (const node of this.simNodes) {
			let element = this.nodeElements.get(node.id);
			if (!element) {
				element = this.createNode(node.node);
				this.nodeElements.set(node.id, element);
			}
			this.syncNode(element, node.node);
		}
	}

	private createNode(node: ContextTreeNode): HTMLElement {
		const element = this.scene!.createDiv({ cls: "context-tree-node" });
		const card = element.createDiv({ cls: "context-tree-card" });
		card.tabIndex = 0;
		card.setAttribute("role", "button");
		card.setAttribute("aria-label", `${node.title} 카드 열기 또는 닫기`);
		card.createDiv({ cls: "context-tree-title", text: node.title });
		if (node.summary) card.createDiv({ cls: "context-tree-summary", text: node.summary });
		card.addEventListener("click", (event) => {
			if ((event.target as Element).closest("a, button, textarea, input, select")) return;
			this.toggleNode(node.id);
		});
		card.addEventListener("keydown", (event) => {
			if (event.key !== "Enter" && event.key !== " ") return;
			event.preventDefault();
			this.toggleNode(node.id);
		});
		return element;
	}

	private syncNode(element: HTMLElement, node: ContextTreeNode): void {
		const card = element.querySelector<HTMLElement>(".context-tree-card");
		if (!card) return;
		const isOpen = this.openDetails.has(node.id);
		element.toggleClass("is-focused", node.id === this.focusedNodeId);
		card.toggleClass("is-detail-open", isOpen);
		card.setAttribute("aria-expanded", String(isOpen));
		if (isOpen) this.ensureDetails(card, node);
	}

	private ensureDetails(card: HTMLElement, node: ContextTreeNode): void {
		if (this.renderedDetails.has(node.id)) return;
		this.renderedDetails.add(node.id);
		const wrapper = card.createDiv({ cls: "context-tree-detail-wrap" });
		const actions = wrapper.createDiv({ cls: "context-tree-detail-actions" });
		const edit = actions.createEl("button", {
			cls: "context-tree-edit",
			attr: { "aria-label": "Edit this card", title: "Edit this card" },
		});
		setIcon(edit, "pencil");
		edit.addEventListener("click", (event) => {
			event.stopPropagation();
			this.openEditor(card, wrapper, node);
		});
		const detail = wrapper.createDiv({ cls: "context-tree-detail markdown-rendered" });
		void MarkdownRenderer.render(this.app, node.body, detail, node.path, this).then(() => {
			detail.addEventListener("click", (event) => this.openInternalLink(event, node.path));
			const source = wrapper.createEl("button", { cls: "context-tree-source", text: "Open source note" });
			source.addEventListener("click", (event) => {
				event.stopPropagation();
				void this.app.workspace.openLinkText(node.path, "", true);
			});
			this.scheduleMeasure();
		});
	}

	private openEditor(card: HTMLElement, wrapper: HTMLElement, node: ContextTreeNode): void {
		if (this.editingNodeId && this.editingNodeId !== node.id) {
			new Notice("Finish or cancel the open card editor first.");
			return;
		}
		this.editingNodeId = node.id;
		wrapper.empty();
		wrapper.addClass("is-editing");
		const editor = wrapper.createDiv({ cls: "context-tree-editor" });
		editor.createDiv({ cls: "context-tree-editor-label", text: "Markdown body" });
		const textarea = editor.createEl("textarea", { cls: "context-tree-editor-input" });
		textarea.value = node.body;
		textarea.setAttribute("aria-label", `${node.title} Markdown body`);
		const actions = editor.createDiv({ cls: "context-tree-editor-actions" });
		const save = actions.createEl("button", { cls: "context-tree-editor-save", text: "Save" });
		const cancel = actions.createEl("button", { cls: "context-tree-editor-cancel", text: "Cancel" });
		cancel.addEventListener("click", (event) => {
			event.stopPropagation();
			this.restoreRenderedDetails(card, wrapper, node);
		});
		save.addEventListener("click", (event) => {
			event.stopPropagation();
			void this.saveEditor(card, wrapper, node, textarea, save, cancel);
		});
		textarea.focus();
		this.scheduleMeasure();
	}

	private async saveEditor(
		card: HTMLElement,
		wrapper: HTMLElement,
		node: ContextTreeNode,
		textarea: HTMLTextAreaElement,
		save: HTMLButtonElement,
		cancel: HTMLButtonElement,
	): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(node.path);
		if (!(file instanceof TFile)) {
			new Notice("The source note no longer exists.");
			return;
		}
		const nextBody = textarea.value.trim();
		save.disabled = true;
		cancel.disabled = true;
		try {
			const source = await this.app.vault.read(file);
			await this.app.vault.modify(file, replaceDocumentBody(source, nextBody));
			node.body = nextBody;
			this.restoreRenderedDetails(card, wrapper, node);
			new Notice("Card content saved.");
		} catch (error) {
			console.error("Context Tree: failed to save card content", error);
			new Notice("Could not save this card. The note was left unchanged.");
			save.disabled = false;
			cancel.disabled = false;
		}
	}

	private restoreRenderedDetails(card: HTMLElement, wrapper: HTMLElement, node: ContextTreeNode): void {
		this.editingNodeId = undefined;
		wrapper.remove();
		this.renderedDetails.delete(node.id);
		this.ensureDetails(card, node);
		this.scheduleMeasure();
	}

	private toggleNode(nodeId: string): void {
		const isOpen = this.openDetails.has(nodeId);
		this.openDetails.clear();
		if (!isOpen) this.openDetails.add(nodeId);
		this.syncCards();
		this.focusNode(nodeId);
		window.setTimeout(() => this.scheduleMeasure(), 220);
		window.setTimeout(() => this.scheduleMeasure(), 520);
	}

	private focusNode(nodeId?: string, restart = true): void {
		if (!nodeId || !this.simulation) return;
		const focus = this.simNodes.find((node) => node.id === nodeId);
		if (!focus) return;
		const dx = focus.x ?? 0;
		const dy = focus.y ?? 0;
		for (const node of this.simNodes) {
			node.x = (node.x ?? 0) - dx;
			node.y = (node.y ?? 0) - dy;
			node.fx = undefined;
			node.fy = undefined;
		}
		focus.x = 0;
		focus.y = 0;
		focus.fx = 0;
		focus.fy = 0;
		this.focusedNodeId = nodeId;
		this.fitWhenMeasured = false;
		this.pan = { x: 0, y: 0 };
		this.applyTransform();
		this.syncCards();
		this.paintGraph();
		if (restart) this.simulation.alpha(0.92).restart();
	}

	private cardRadius(node: SimNode): number {
		return Math.hypot(node.size.width / 2, node.size.height / 2);
	}

	private linkDistance(edge: SimLink): number {
		const source = typeof edge.source === "string" ? this.simNodes.find((node) => node.id === edge.source) : edge.source;
		const target = typeof edge.target === "string" ? this.simNodes.find((node) => node.id === edge.target) : edge.target;
		if (!source || !target) return 440;
		return this.cardRadius(source) + this.cardRadius(target) + 100;
	}

	private paintGraph(): void {
		if (!this.viewport || !this.edges) return;
		const width = this.viewport.clientWidth || 1200;
		const height = this.viewport.clientHeight || 760;
		const centerX = width / 2;
		const centerY = height / 2;
		for (const node of this.simNodes) {
			const element = this.nodeElements.get(node.id);
			if (!element) continue;
			element.style.left = `${centerX + (node.x ?? 0)}px`;
			element.style.top = `${centerY + (node.y ?? 0)}px`;
		}
		this.paintEdges(centerX, centerY, width, height);
	}

	private paintEdges(centerX: number, centerY: number, width: number, height: number): void {
		if (!this.edges) return;
		this.edges.setAttribute("viewBox", `0 0 ${width} ${height}`);
		const wanted = new Set<string>();
		for (const edge of this.simLinks) {
			const source = typeof edge.source === "string" ? undefined : edge.source;
			const target = typeof edge.target === "string" ? undefined : edge.target;
			if (!source || !target) continue;
			const key = `${edge.from}\u0000${edge.to}`;
			wanted.add(key);
			let path = this.edgeElements.get(key);
			if (!path) {
				path = this.edges.createSvg("path");
				this.edgeElements.set(key, path);
			}
			const x1 = centerX + (source.x ?? 0);
			const y1 = centerY + (source.y ?? 0);
			const x2 = centerX + (target.x ?? 0);
			const y2 = centerY + (target.y ?? 0);
			const dx = x2 - x1;
			const dy = y2 - y1;
			const length = Math.max(1, Math.hypot(dx, dy));
			const curve = Math.min(56, length * 0.1);
			const controlX = (x1 + x2) / 2 - (dy / length) * curve;
			const controlY = (y1 + y2) / 2 + (dx / length) * curve;
			path.setAttribute("d", `M ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}`);
		}
		for (const [key, path] of this.edgeElements) {
			if (wanted.has(key)) continue;
			path.remove();
			this.edgeElements.delete(key);
		}
	}

	private scheduleMeasure(): void {
		if (this.resizeTimer !== undefined) window.clearTimeout(this.resizeTimer);
		this.resizeTimer = window.setTimeout(() => {
			this.resizeTimer = undefined;
			let changed = false;
			for (const node of this.simNodes) {
				const card = this.nodeElements.get(node.id)?.querySelector<HTMLElement>(".context-tree-card");
				if (!card) continue;
				const size = { width: card.offsetWidth, height: card.offsetHeight };
				if (Math.abs(node.size.width - size.width) <= 2 && Math.abs(node.size.height - size.height) <= 2) continue;
				node.size = size;
				changed = true;
			}
			if (!changed || !this.simulation) return;
			this.collideForce?.radius((node) => this.cardRadius(node) + 30);
			this.linkForce?.distance((edge) => this.linkDistance(edge));
			this.simulation.alpha(0.86).restart();
		}, 90);
	}

	private finishOverviewFit(): void {
		if (!this.fitWhenMeasured) return;
		this.fitGraph();
		this.fitWhenMeasured = false;
	}

	private fitOverview(): void {
		if (!this.focusedNodeId || !this.simulation) return;
		this.focusNode(this.focusedNodeId, false);
		this.fitWhenMeasured = true;
		this.simulation.alpha(0.92).restart();
	}

	private fitGraph(): void {
		if (!this.viewport || !this.simNodes.length) return;
		const width = this.viewport.clientWidth || 1200;
		const height = this.viewport.clientHeight || 760;
		let extentX = 1;
		let extentY = 1;
		for (const node of this.simNodes) {
			const radius = this.cardRadius(node);
			extentX = Math.max(extentX, Math.abs(node.x ?? 0) + radius);
			extentY = Math.max(extentY, Math.abs(node.y ?? 0) + radius);
		}
		const horizontal = Math.max(120, width / 2 - 48) / extentX;
		const vertical = Math.max(120, height / 2 - 48) / extentY;
		this.zoom = this.clampZoom(Math.min(1, horizontal, vertical));
		this.pan = { x: 0, y: 0 };
		this.updateZoomLabel();
		this.applyTransform();
	}

	private bindCanvasControls(viewport: HTMLElement): void {
		let dragStart: { x: number; y: number; panX: number; panY: number } | undefined;
		viewport.addEventListener("pointerdown", (event) => {
			if ((event.target as Element).closest(".context-tree-card, .context-tree-zoom-controls")) return;
			viewport.focus();
			dragStart = { x: event.clientX, y: event.clientY, panX: this.pan.x, panY: this.pan.y };
			viewport.setPointerCapture(event.pointerId);
			viewport.addClass("is-panning");
		});
		viewport.addEventListener("pointermove", (event) => {
			if (!dragStart) return;
			this.pan = { x: dragStart.panX + event.clientX - dragStart.x, y: dragStart.panY + event.clientY - dragStart.y };
			this.applyTransform();
		});
		const stopDragging = (event: PointerEvent) => {
			if (!dragStart) return;
			dragStart = undefined;
			if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
			viewport.removeClass("is-panning");
		};
		viewport.addEventListener("pointerup", stopDragging);
		viewport.addEventListener("pointercancel", stopDragging);
		viewport.addEventListener("wheel", (event) => {
			if (!event.ctrlKey && !event.metaKey) return;
			event.preventDefault();
			this.zoomAt(viewport, event.clientX, event.clientY, this.clampZoom(this.zoom * (event.deltaY < 0 ? 1.12 : 0.89)));
		}, { passive: false });
		viewport.addEventListener("keydown", (event) => {
			if (!event.ctrlKey && !event.metaKey) return;
			if (event.key !== "+" && event.key !== "=" && event.key !== "-") return;
			event.preventDefault();
			const rect = viewport.getBoundingClientRect();
			this.zoomAt(viewport, rect.left + rect.width / 2, rect.top + rect.height / 2, this.clampZoom(this.zoom * (event.key === "-" ? 0.89 : 1.12)));
		});
	}

	private clampZoom(value: number): number {
		return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
	}

	private zoomAt(viewport: HTMLElement, clientX: number, clientY: number, nextZoom: number): void {
		const rect = viewport.getBoundingClientRect();
		const pointX = clientX - rect.left - rect.width / 2;
		const pointY = clientY - rect.top - rect.height / 2;
		this.pan = {
			x: pointX - ((pointX - this.pan.x) * nextZoom) / this.zoom,
			y: pointY - ((pointY - this.pan.y) * nextZoom) / this.zoom,
		};
		this.zoom = nextZoom;
		this.updateZoomLabel();
		this.applyTransform();
	}

	private updateZoomLabel(): void {
		this.viewport?.querySelector<HTMLElement>(".context-tree-zoom-label")?.setText(`${Math.round(this.zoom * 100)}%`);
	}

	private applyTransform(): void {
		if (!this.scene) return;
		this.scene.style.transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
	}

	private openInternalLink(event: MouseEvent, sourcePath: string): void {
		const target = event.target;
		if (!(target instanceof Element)) return;
		const link = target.closest<HTMLAnchorElement>("a.internal-link");
		if (!link) return;
		const href = link.dataset.href || link.getAttribute("href") || "";
		const linkText = href.startsWith("app://obsidian.md/")
			? decodeURIComponent(href.slice("app://obsidian.md/".length))
			: href;
		if (!linkText) return;
		event.preventDefault();
		event.stopPropagation();
		void this.app.workspace.openLinkText(linkText, sourcePath, true);
	}
}
