import { ItemView, MarkdownRenderer, WorkspaceLeaf } from "obsidian";
import ContextTreePlugin from "./main";
import { loadContextTree } from "./parser";
import { buildRadialLayout, RadialLayout } from "./radial-layout";
import { ContextTreeNode } from "./types";

export const VIEW_TYPE_CONTEXT_TREE = "context-tree-view";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.8;

export class ContextTreeView extends ItemView {
	private readonly expandedBranches = new Set<string>();
	private readonly collapsedBranches = new Set<string>();
	private readonly openDetails = new Set<string>();
	private allNodes: ContextTreeNode[] = [];
	private rootNodes: ContextTreeNode[] = [];
	private focusedNodeId?: string;
	private pan = { x: 0, y: 0 };
	private zoom = 1;

	constructor(leaf: WorkspaceLeaf, private readonly plugin: ContextTreePlugin) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_CONTEXT_TREE;
	}

	getDisplayText(): string {
		return "Context tree";
	}

	getIcon(): string {
		return "git-fork";
	}

	async onOpen(): Promise<void> {
		this.registerDomEvent(window, "resize", () => void this.refresh());
		await this.refresh();
	}

	async refresh(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("context-tree-view");

		const header = contentEl.createDiv({ cls: "context-tree-toolbar" });
		header.createEl("h2", { text: "Context tree" });
		const actions = header.createDiv({ cls: "context-tree-actions" });
		this.createAction(actions, "Reset view", () => {
			this.pan = { x: 0, y: 0 };
			this.zoom = 1;
			void this.refresh();
		});
		this.createAction(actions, "Expand branches", () => {
			this.expandedBranches.clear();
			this.collapsedBranches.clear();
			for (const node of this.allNodes) this.expandedBranches.add(node.id);
			void this.refresh();
		});
		this.createAction(actions, "Refresh", () => void this.refresh());

		const roots = await loadContextTree(this.app, this.plugin.settings);
		this.rootNodes = roots;
		this.allNodes = this.flatten(roots);
		if (!roots.length) {
			const empty = contentEl.createDiv({ cls: "context-tree-empty" });
			empty.createEl("h3", { text: "No context tree notes found" });
			empty.createEl("p", { text: "Add context_tree: true to a Markdown note, then connect children with context_tree_parent." });
			return;
		}

		this.focusedNodeId ??= roots[0]?.id;
		this.renderRadialGraph(
			contentEl,
			buildRadialLayout(
				this.visibleRoots(roots),
				this.focusedNodeId,
				this.openDetails.has(this.focusedNodeId ?? ""),
			),
		);
	}

	private createAction(parent: HTMLElement, label: string, callback: () => void): void {
		const button = parent.createEl("button", { text: label, cls: "context-tree-action" });
		button.addEventListener("click", callback);
	}

	private renderRadialGraph(parentEl: HTMLElement, layout: RadialLayout | undefined): void {
		if (!layout) return;

		const viewport = parentEl.createDiv({ cls: "context-tree-viewport" });
		viewport.tabIndex = 0;
		viewport.setAttribute("aria-label", "Context tree canvas. Drag to pan; use control or command plus the mouse wheel to zoom.");
		const scene = viewport.createDiv({ cls: "context-tree-scene" });
		this.applyTransform(scene);

		const width = viewport.clientWidth || 1200;
		const height = viewport.clientHeight || 760;
		const centerX = width / 2;
		const centerY = height / 2;
		const positions = new Map(layout.nodes.map((item) => [item.node.id, item]));
		const edges = scene.createSvg("svg", { cls: "context-tree-edges", attr: { viewBox: `0 0 ${width} ${height}` } });
		for (const edge of layout.edges) {
			const from = positions.get(edge.from);
			const to = positions.get(edge.to);
			if (!from || !to) continue;
			edges.createSvg("line", {
				attr: {
					x1: String(centerX + from.x),
					y1: String(centerY + from.y),
					x2: String(centerX + to.x),
					y2: String(centerY + to.y),
				},
			});
		}

		for (const item of layout.nodes) {
			this.renderCard(scene, item.node, centerX + item.x, centerY + item.y, item.node.id === layout.focus.id);
		}

		const hint = viewport.createDiv({ cls: "context-tree-hint", text: "Drag to pan · Ctrl/⌘ + wheel to zoom" });
		hint.setAttribute("aria-hidden", "true");
		this.bindCanvasControls(viewport, scene);
	}

	private renderCard(scene: HTMLElement, node: ContextTreeNode, x: number, y: number, isFocused: boolean): void {
		const card = scene.createDiv({ cls: "context-tree-card" });
		card.toggleClass("is-focused", isFocused);
		card.style.left = `${x}px`;
		card.style.top = `${y}px`;
		const isDetailOpen = this.openDetails.has(node.id);
		card.toggleClass("is-detail-open", isDetailOpen);

		const title = card.createEl("button", { cls: "context-tree-title", text: node.title });
		title.setAttribute("aria-label", `${node.title}을(를) 중심으로 보기`);
		title.addEventListener("click", () => this.focusNode(node.id));
		if (node.summary) card.createDiv({ cls: "context-tree-summary", text: node.summary });

		const controls = card.createDiv({ cls: "context-tree-card-controls" });
		const detail = controls.createEl("button", {
			cls: "context-tree-card-control",
			text: isDetailOpen ? "Close" : "Details",
		});
		detail.addEventListener("click", () => {
			if (isDetailOpen) this.openDetails.delete(node.id);
			else {
				this.openDetails.clear();
				this.openDetails.add(node.id);
			}
			this.focusedNodeId = node.id;
			this.pan = { x: 0, y: 0 };
			void this.refresh();
		});

		if (node.children.length) {
			const isBranchOpen = !this.collapsedBranches.has(node.id)
				&& (this.expandedBranches.has(node.id) || this.depthOf(node) < this.plugin.settings.initialExpandedDepth);
			const branch = controls.createEl("button", {
				cls: "context-tree-card-control",
				text: isBranchOpen ? `Children · ${node.children.length}` : `Show children · ${node.children.length}`,
			});
			branch.addEventListener("click", () => {
				if (isBranchOpen) {
					this.expandedBranches.delete(node.id);
					this.collapsedBranches.add(node.id);
				} else {
					this.collapsedBranches.delete(node.id);
					this.expandedBranches.add(node.id);
				}
				void this.refresh();
			});
		}

		if (isDetailOpen) {
			const detailBody = card.createDiv({ cls: "context-tree-detail markdown-rendered" });
			void MarkdownRenderer.render(this.app, node.body, detailBody, node.path, this);
			detailBody.addEventListener("click", (event) => this.openInternalLink(event, node.path));
			const source = card.createEl("button", { cls: "context-tree-source", text: "Open source note" });
			source.addEventListener("click", () => void this.app.workspace.openLinkText(node.path, "", true));
		}
	}

	private focusNode(nodeId: string): void {
		this.focusedNodeId = nodeId;
		this.pan = { x: 0, y: 0 };
		void this.refresh();
	}

	private bindCanvasControls(viewport: HTMLElement, scene: HTMLElement): void {
		let dragStart: { x: number; y: number; panX: number; panY: number } | undefined;
		viewport.addEventListener("pointerdown", (event) => {
			if ((event.target as Element).closest(".context-tree-card")) return;
			viewport.focus();
			dragStart = { x: event.clientX, y: event.clientY, panX: this.pan.x, panY: this.pan.y };
			viewport.setPointerCapture(event.pointerId);
			viewport.addClass("is-panning");
		});
		viewport.addEventListener("pointermove", (event) => {
			if (!dragStart) return;
			this.pan = { x: dragStart.panX + event.clientX - dragStart.x, y: dragStart.panY + event.clientY - dragStart.y };
			this.applyTransform(scene);
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
			this.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.zoom * (event.deltaY < 0 ? 1.1 : 0.9)));
			this.applyTransform(scene);
		}, { passive: false });
		viewport.addEventListener("keydown", (event) => {
			if (!event.ctrlKey && !event.metaKey) return;
			if (event.key !== "+" && event.key !== "=" && event.key !== "-") return;
			event.preventDefault();
			this.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.zoom * (event.key === "-" ? 0.9 : 1.1)));
			this.applyTransform(scene);
		});
	}

	private applyTransform(scene: HTMLElement): void {
		scene.style.transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
	}

	private depthOf(target: ContextTreeNode): number {
		const visit = (nodes: ContextTreeNode[], depth: number): number | undefined => {
			for (const node of nodes) {
				if (node.id === target.id) return depth;
				const childDepth = visit(node.children, depth + 1);
				if (childDepth !== undefined) return childDepth;
			}
			return undefined;
		};
		return visit(this.rootNodes, 0) ?? 0;
	}

	private visibleRoots(nodes: ContextTreeNode[], depth = 0): ContextTreeNode[] {
		return nodes.map((node) => {
			const isBranchOpen = !this.collapsedBranches.has(node.id)
				&& (this.expandedBranches.has(node.id) || depth < this.plugin.settings.initialExpandedDepth);
			return { ...node, children: isBranchOpen ? this.visibleRoots(node.children, depth + 1) : [] };
		});
	}

	private flatten(nodes: ContextTreeNode[]): ContextTreeNode[] {
		return nodes.flatMap((node) => [node, ...this.flatten(node.children)]);
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
