import { FileView, Notice, setIcon, TFile, ViewStateResult, WorkspaceLeaf } from "obsidian";
import { GRAPH_DEFINITION_EXTENSION } from "./domain/graph-definition";
import { canvasWheelAction, canvasWheelZoomFactor, canvasWheelZoomPoint } from "./domain/canvas-wheel-action";
import { canvasWheelSurface } from "./domain/canvas-wheel-target";
import { canvasPointerAction } from "./domain/canvas-pointer-action";
import { isCanvasControlTarget } from "./domain/canvas-pointer-target";
import { cardOpenEffects, type CardOpenIntent } from "./domain/card-open-action";
import { hasCardDragExceededClickThreshold } from "./domain/card-pointer-action";
import { canDisconnectAtDrop } from "./domain/disconnect-drop-action";
import { connectionDropAction } from "./domain/connection-drop-action";
import { normalizePinnedCardIds, openCardAlongsidePins, retainPinnedCards } from "./domain/card-pin-state";
import ContextTreePlugin from "./main";
import { graphHoverNodeIds, graphSearchVisibility, isGraphEdgeVisible } from "./domain/graph-filter";
import type { GraphSearchVisibility } from "./domain/graph-filter";
import {
	graphNoteFolder,
	GraphViewState,
	GraphWorkspace,
	rootedNeighbourhoodAction,
	type RootedNeighbourhoodAction,
} from "./domain/graph-workspace";
import { shouldFitInitialOverview } from "./domain/initial-viewport";
import { decideInlineEditorSave } from "./domain/inline-editor-save";
import { recoverInlineDraft } from "./domain/inline-editor-draft";
import { DIRECT_RELATION, isSymmetricRelation, RELATION_TYPES } from "./domain/relations";
import {
	cardRadius,
	CardAnchor,
	cardAnchorAtPoint,
	cardAnchorPoint,
	cardEdgeEndpoints,
	createGraphSimulation,
	curvedEdgePath,
	DEFAULT_CARD_SIZE,
	graphZoomBounds,
	graphPointerDelta,
	GRAPH_ZOOM,
	initialGraphPosition,
	linkDistance,
	SimLink,
	SimNode,
	simulationLinkFor,
} from "./graph/simulation";
import { loadContextTree, topicDisplayContent, topicGraphMetadataSignature } from "./parser";
import { buildContextGraph, graphStructureSignature, GraphRelationType, isDetachableGraphEdge } from "./graph/model";
import { ContextTreeLink, ContextTreeNode } from "./types";
import { addRelation, createTopic, moveTopicToTrash, removeRelation } from "./topic-store";
import { markdownSummary } from "./topic-content";
import { DeleteTopicModal, ReloadInlineSourceModal } from "./topic-modals";
import { CardConnection, TopicCardRenderer } from "./ui/topic-card-renderer";
import type { TopicCardState } from "./ui/topic-card-renderer";
import { COPY, movedToTrashNotice } from "./ui/copy";
import { contextRelationLabel, contextRelationNavigationLabel } from "./ui/relation-labels";

export const VIEW_TYPE_CONTEXT_TREE = "context-tree-view";

type EdgeVisual = {
	path: SVGPathElement;
	firstEndpoint: HTMLElement;
	secondEndpoint: HTMLElement;
};

type PointerCaptureTarget = HTMLElement | SVGPathElement;

/**
 * An interactive ego graph. Topic cards contain Markdown directly; the graph
 * is physical rather than a tree layout. Expanded cards retain their graph
 * position while surrounding compact cards make space for their details.
 */
export class ContextTreeView extends FileView {
	private readonly openDetails = new Set<string>();
	/** Open-card pins are per graph view and intentionally never enter Markdown. */
	private readonly pinnedOpenNodeIds = new Set<string>();
	/** Temporary D3 pins keep expanded readers stationary without persisting them
	 * as manually positioned cards. The saved coordinates are restored on close. */
	private readonly openCardPositionLocks = new Map<string, Pick<SimNode, "fx" | "fy">>();
	/** Existing cards stay where they are while newly revealed neighbours settle. */
	private readonly neighbourhoodLayoutLocks = new Map<string, Pick<SimNode, "fx" | "fy">>();
	private readonly nodeElements = new Map<string, HTMLElement>();
	private readonly edgeElements = new Map<string, EdgeVisual>();
	private readonly cards: TopicCardRenderer;
	private rootNodes: ContextTreeNode[] = [];
	private simNodes: SimNode[] = [];
	private simLinks: SimLink[] = [];
	private focusedNodeId?: string;
	private hoveredNodeId?: string;
	private hoverNodeIds = new Set<string>();
	private selectedEdgeId?: string;
	private hoveredAnchor?: { nodeId: string; anchor: CardAnchor };
	private dragNode?: { nodeId: string; pointerId: number; originPointer: { x: number; y: number }; originGraph: { x: number; y: number }; captureTarget?: HTMLElement; moved: boolean };
	private canvasPan?: { pointerId: number; originPointer: { x: number; y: number }; originPan: { x: number; y: number }; captureTarget: HTMLElement; moved: boolean; dismissUnpinnedEditorOnClick: boolean };
	private suppressNextToggleFor?: string;
	private dragConnection?: { sourceId: string; sourceAnchor: CardAnchor; targetId?: string; targetAnchor?: CardAnchor; pointerId: number; x: number; y: number };
	private disconnectDrag?: { edgeId: string; pointerId: number; captureTarget: PointerCaptureTarget; start: { x: number; y: number } };
	private draftEdges?: SVGSVGElement;
	private draftEdge?: SVGPathElement;
	private inlineEdit?: { nodeId: string; file: TFile; content: string; lastPersisted: string; graphMetadataSignature: string; summaryFallback: string; timer?: number; saving?: Promise<void>; saveFailed?: boolean; hasConflict?: boolean };
	private pendingEditorPath?: string;
	private pan = { x: 0, y: 0 };
	private zoom = 1;
	private viewportBeforeDetails?: { pan: { x: number; y: number }; zoom: number };
	private viewport?: HTMLElement;
	private scene?: HTMLElement;
	private edges?: SVGSVGElement;
	private simulation?: ReturnType<typeof createGraphSimulation>["simulation"];
	private linkForce?: ReturnType<typeof createGraphSimulation>["linkForce"];
	private collideForce?: ReturnType<typeof createGraphSimulation>["collideForce"];
	private resizeTimer?: number;
	private viewportObserver?: ResizeObserver;
	private fitWhenMeasured = false;
	private hasRenderedGraph = false;
	private renderedGraphId?: string;
	private refreshGeneration = 0;
	private readonly delayedTimers = new Set<number>();
	private graphId?: string;
	private searchQuery = "";
	private searchVisibilityCache?: {
		nodes: readonly SimNode[];
		links: readonly SimLink[];
		query: string;
		visibility: GraphSearchVisibility;
	};
	private paintFrame?: number;
	private sourceLeaf?: WorkspaceLeaf;
	private readonly relationFilter = new Set<GraphRelationType>(["derived", ...RELATION_TYPES]);
	private searchPanel?: HTMLElement;
	private searchPanelMode?: "search" | "filter";
	private searchPanelButtons?: Record<"search" | "filter", HTMLButtonElement>;
	private refreshPending = false;
	private isOpen = false;
	private rootedOutgoingByPath: Readonly<Record<string, readonly string[]>> = {};

	constructor(leaf: WorkspaceLeaf, private readonly plugin: ContextTreePlugin) {
		super(leaf);
		this.cards = new TopicCardRenderer(this.app, this, {
			onToggle: (nodeId, fromKeyboard) => void this.toggleNodeFromCard(nodeId, fromKeyboard),
			onCardDragStart: (event, node) => this.startNodeDrag(event, node),
			onConnectionStart: (event, node, anchor) => this.startDragConnection(event, node, anchor),
			onConnectionCandidate: (nodeId, anchor) => this.setConnectionCandidate(nodeId, anchor),
			onPin: (node) => void this.toggleCardPin(node),
			onEdit: (node) => void this.toggleInlineMarkdownEditor(node),
			onOpenSource: (node) => void this.openNodeSourceBesideGraph(node),
			onToggleNeighbours: (node) => void this.toggleNodeNeighbourhood(node),
			onRemoveFromGraph: (node) => void this.removeNodeFromGraph(node),
			neighbourAction: (node) => this.nodeNeighbourhoodAction(node),
			canRemoveFromGraph: (node) => this.graph.scope.kind !== "rooted" || this.graph.scope.rootPath !== node.path,
			onMoveToTrash: (node) => void this.deleteFromCard(node),
			onOpenInternalLink: (event, sourcePath) => this.openInternalLink(event, sourcePath),
			onNavigateConnection: (nodeId) => void this.navigateToNode(nodeId),
			onHover: (nodeId) => this.setHoveredNode(nodeId),
			connectionsFor: (node) => this.connectionsFor(node),
			onMeasure: () => this.scheduleMeasure(),
		});
	}

	getViewType(): string {
		return VIEW_TYPE_CONTEXT_TREE;
	}

	getDisplayText(): string {
		return this.plugin.getGraph(this.graphId)?.name ?? this.file?.basename ?? COPY.view.title;
	}

	getIcon(): string {
		return "share-2";
	}

	getGraphId(): string {
		return this.graphId ?? this.plugin.defaultGraph()?.id ?? "";
	}

	replaceGraphId(previousId: string, nextId: string): void {
		if (this.graphId === previousId) this.graphId = nextId;
	}

	getState(): Record<string, unknown> {
		return { ...super.getState(), graphId: this.getGraphId() };
	}

	async setState(state: unknown, result: ViewStateResult): Promise<void> {
		const record = state && typeof state === "object" ? state as Record<string, unknown> : undefined;
		const candidate = record?.graphId;
		this.graphId = typeof candidate === "string" && this.plugin.getGraph(candidate) ? candidate : undefined;
		// FileView's state handler requires a backing file. Calling it for a
		// transient current-note graph makes Obsidian replace this view with an
		// empty file tab. Definition-backed states still follow the native file
		// lifecycle and finish rendering in onLoadFile().
		if (typeof record?.file === "string") await super.setState(state, result);
		// Obsidian may apply command-created view state after onOpen(). File-backed
		// views render from onLoadFile(), while transient current-note views need
		// this state transition to start their first render.
		if (this.isOpen && this.graphId !== undefined) await this.refresh();
	}

	canAcceptExtension(extension: string): boolean {
		return extension === GRAPH_DEFINITION_EXTENSION;
	}

	async onLoadFile(file: TFile): Promise<void> {
		await super.onLoadFile(file);
		const graph = await this.plugin.graphForDefinitionFile(file);
		if (!graph) {
			new Notice(COPY.notice.graphDefinitionInvalid);
			return;
		}
		this.graphId = graph.id;
		await this.refresh();
	}

	private get graph(): GraphWorkspace {
		const graph = this.plugin.getGraph(this.graphId);
		if (!graph) throw new Error("Context Graph requires at least one graph workspace.");
		return graph;
	}

	async onOpen(): Promise<void> {
		this.isOpen = true;
		this.registerDomEvent(window, "resize", () => this.scheduleMeasure());
		this.registerDomEvent(window, "pointermove", (event) => {
			this.updateCanvasPan(event);
			this.updateNodeDrag(event);
			this.updateDragConnection(event);
		});
		this.registerDomEvent(window, "pointerup", (event) => {
			this.finishCanvasPan(event);
			this.finishNodeDrag(event);
			this.finishDragConnection(event);
			this.finishDisconnectDrag(event);
		});
		this.registerDomEvent(window, "pointercancel", (event) => {
			this.finishCanvasPan(event);
			this.finishNodeDrag(event, true);
			this.finishDragConnection(event, true);
			this.finishDisconnectDrag(event, true);
		});
		// A FileView receives onOpen() before onLoadFile(). Its graph id does not
		// exist yet in that path, so rendering here would either throw or briefly
		// render the default graph. onLoadFile() performs the first render for a
		// `.context-graph` file; legacy command-created leaves already have an id.
		if (this.graphId !== undefined) await this.refresh();
	}

	async onClose(): Promise<void> {
		this.isOpen = false;
		const closingGraphId = this.getGraphId();
		await this.finishInlineMarkdownEditor();
		if (this.inlineEdit) {
			await this.plugin.saveInlineDraft(this.inlineEdit.file.path, {
				content: this.inlineEdit.content,
				lastPersisted: this.inlineEdit.lastPersisted,
				updatedAt: Date.now(),
			});
		}
		await this.persistGraphViewState();
		this.refreshGeneration += 1;
		this.simulation?.stop();
		if (this.paintFrame !== undefined) window.cancelAnimationFrame(this.paintFrame);
		this.viewportObserver?.disconnect();
		if (this.resizeTimer !== undefined) window.clearTimeout(this.resizeTimer);
		if (this.inlineEdit?.timer !== undefined) window.clearTimeout(this.inlineEdit.timer);
		for (const timer of this.delayedTimers) window.clearTimeout(timer);
		this.delayedTimers.clear();
		this.plugin.releaseTransientGraph(closingGraphId);
	}

	async refresh(): Promise<void> {
		const generation = ++this.refreshGeneration;
		// Autosaving a raw Markdown edit triggers Vault modify events. Preserve
		// the focused textarea until the reader explicitly leaves edit mode.
		if (this.inlineEdit) {
			this.refreshPending = true;
			return;
		}
		this.rootedOutgoingByPath = Object.fromEntries(Object.entries(this.app.metadataCache.resolvedLinks)
			.map(([sourcePath, targets]) => [sourcePath, Object.keys(targets)]));
		const roots = await loadContextTree(this.app, this.graph);
		// Vault events can arrive faster than cachedRead() completes. Only the
		// newest snapshot may update the view; otherwise a stale read can repaint
		// a card after its source note was already changed or removed.
		if (generation !== this.refreshGeneration) return;
		if (!roots.length) {
			this.rootNodes = roots;
			this.renderEmpty();
			return;
		}
		const preserveViewport = this.hasRenderedGraph
			&& this.renderedGraphId === this.getGraphId()
			&& !!this.viewport
			&& !!this.scene;
		if (preserveViewport) {
			const previousGraph = buildContextGraph(this.rootNodes);
			const nextGraph = buildContextGraph(roots);
			if (graphStructureSignature(previousGraph) === graphStructureSignature(nextGraph)) {
				this.rootNodes = roots;
				const nodesById = new Map(nextGraph.nodes.map((node) => [node.id, node]));
				for (const simNode of this.simNodes) simNode.node = nodesById.get(simNode.id) ?? simNode.node;
				this.searchVisibilityCache = undefined;
				this.cards.invalidateDetails();
				this.syncCards();
				this.scheduleMeasure();
				return;
			}
		}
		this.rootNodes = roots;
		this.focusedNodeId ??= roots[0]?.id;
		if (preserveViewport) this.cards.invalidateDetails();
		else this.renderShell();
		this.createGraph(preserveViewport);
		this.renderedGraphId = this.getGraphId();
	}

	private renderShell(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("context-tree-view");
		this.nodeElements.clear();
		this.edgeElements.clear();
		this.cards.reset();

		this.viewport = contentEl.createDiv({ cls: "context-tree-viewport" });
		this.viewport.tabIndex = 0;
		this.viewport.setAttribute("aria-label", COPY.view.aria);
		this.scene = this.viewport.createDiv({ cls: "context-tree-scene" });
		this.edges = this.scene.createSvg("svg", { cls: "context-tree-edges" });
		this.draftEdges = this.viewport.createSvg("svg", { cls: "context-tree-draft-edges" });
		this.createGraphControls(this.viewport);
		this.applyTransform();
		this.bindCanvasControls(this.viewport);
		this.viewportObserver?.disconnect();
		this.viewportObserver = new ResizeObserver(() => {
			const width = this.viewport?.clientWidth ?? 0;
			const height = this.viewport?.clientHeight ?? 0;
			this.updateViewportSize(width, height);
			this.scheduleMeasure();
			this.finishOverviewFit();
		});
		this.viewportObserver.observe(this.viewport);
		this.updateViewportSize(this.viewport.clientWidth, this.viewport.clientHeight);
	}

	private renderEmpty(): void {
		this.simulation?.stop();
		this.simulation = undefined;
		this.linkForce = undefined;
		this.collideForce = undefined;
		this.simNodes = [];
		this.simLinks = [];
		this.openDetails.clear();
		this.pinnedOpenNodeIds.clear();
		this.openCardPositionLocks.clear();
		this.neighbourhoodLayoutLocks.clear();
		this.nodeElements.clear();
		this.edgeElements.clear();
		this.cards.reset();
		this.viewportObserver?.disconnect();
		this.viewportObserver = undefined;
		this.viewport = undefined;
		this.scene = undefined;
		this.edges = undefined;
		this.draftEdges = undefined;
		this.draftEdge = undefined;
		this.dragConnection = undefined;
		this.viewportBeforeDetails = undefined;
		this.hasRenderedGraph = false;
		this.renderedGraphId = undefined;
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("context-tree-view");
		const empty = contentEl.createDiv({ cls: "context-tree-empty" });
		empty.createDiv({ cls: "context-tree-empty-eyebrow", text: this.graph.name });
		empty.createEl("h2", { text: COPY.labels.emptyTitle });
		empty.createEl("p", { cls: "context-tree-empty-status", text: this.emptyScopeStatus() });
		empty.createEl("p", { cls: "context-tree-empty-next", text: COPY.labels.emptyNextStep });
		const actions = empty.createDiv({ cls: "context-tree-empty-actions" });
		this.createAction(actions, COPY.actions.createCard, () => this.createInlineTopic());
	}

	private emptyScopeStatus(): string {
		const { scope } = this.graph;
		if ((scope.kind === "folders" || scope.kind === "hybrid") && scope.folders[0]) {
			return COPY.labels.emptyFolderScope(scope.folders[0]);
		}
		return scope.kind === "curated" ? COPY.labels.emptyCuratedScope : COPY.labels.emptyAllScope;
	}

	private createAction(parent: HTMLElement, label: string, callback: () => void): HTMLButtonElement {
		const button = parent.createEl("button", { text: label, cls: "context-tree-action" });
		button.addEventListener("click", callback);
		return button;
	}

	private createGraphControls(parent: HTMLElement): void {
		const controls = parent.createDiv({ cls: "context-tree-graph-controls" });
		const search = this.createIconControl(controls, "search", COPY.actions.searchGraph, () => this.toggleSearchPanel("search"));
		const filter = this.createIconControl(controls, "sliders-horizontal", COPY.actions.filterRelations, () => this.toggleSearchPanel("filter"));
		this.searchPanelButtons = { search, filter };
		search.setAttribute("aria-expanded", "false");
		filter.setAttribute("aria-expanded", "false");
		this.createIconControl(controls, "file-plus-2", COPY.actions.newCard, () => this.createInlineTopic());
		if (this.plugin.isTransientGraph(this.getGraphId())) this.createSaveGraphControl(controls);
		controls.createDiv({ cls: "context-tree-control-divider" });
		this.createZoomButton(controls, "minus", COPY.actions.zoomOut, 0.86);
		const label = controls.createDiv({ cls: "context-tree-zoom-label", text: "100%" });
		label.setAttribute("aria-live", "polite");
		this.createZoomButton(controls, "plus", COPY.actions.zoomIn, 1.16);
		const reset = controls.createEl("button", { cls: "context-tree-zoom-button", attr: { "aria-label": COPY.actions.resetView, title: COPY.actions.resetView } });
		setIcon(reset, "maximize-2");
		reset.addEventListener("click", (event) => {
			event.stopPropagation();
			void this.showOverview();
		});
		this.createSearchPanel(parent);
	}

	private createSaveGraphControl(controls: HTMLElement): void {
		const save = controls.createEl("button", {
			cls: "context-tree-zoom-button context-tree-control-button",
			attr: { "aria-label": COPY.actions.saveGraph, title: COPY.actions.saveGraph },
		});
		setIcon(save, "bookmark-plus");
		save.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			save.addClass("is-hidden");
			const input = controls.createEl("input", {
				type: "text",
				cls: "context-tree-save-graph-input",
				attr: { "aria-label": COPY.labels.graphName, placeholder: COPY.labels.graphName },
			});
			const cancelSave = (): void => {
				if (!input.isConnected || input.disabled) return;
				input.remove();
				save.removeClass("is-hidden");
			};
			input.addEventListener("blur", cancelSave);
			input.addEventListener("keydown", (keyEvent) => {
				if (keyEvent.key === "Escape") {
					keyEvent.preventDefault();
					keyEvent.stopPropagation();
					cancelSave();
					return;
				}
				if (keyEvent.key !== "Enter" || !input.value.trim()) return;
				input.disabled = true;
				const transientGraphId = this.getGraphId();
				void this.plugin.saveTransientGraph(
					transientGraphId,
					input.value.trim(),
					this.graphViewState(),
				)
					.then((graph) => {
						new Notice(COPY.notice.graphSaved);
						this.replaceGraphId(transientGraphId, graph.id);
						this.plugin.releaseTransientGraph(transientGraphId);
						return this.refresh();
					})
					.catch((error: unknown) => {
						console.error("Context Graph: failed to save current-note graph", error);
						input.disabled = false;
						new Notice(COPY.notice.graphSaveFailed);
					});
			});
			input.focus();
		});
	}

	private toggleSearchPanel(mode: "search" | "filter"): void {
		const panel = this.searchPanel;
		if (!panel) return;
		const isOpen = !(panel.hasClass("is-open") && this.searchPanelMode === mode);
		this.searchPanelMode = isOpen ? mode : undefined;
		panel.toggleClass("is-open", isOpen);
		for (const [buttonMode, button] of Object.entries(this.searchPanelButtons ?? {})) {
			button.setAttribute("aria-expanded", String(isOpen && buttonMode === mode));
		}
		if (!isOpen) {
			this.searchPanelButtons?.[mode].focus({ preventScroll: true });
			return;
		}
		if (mode === "search") panel.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
		else panel.querySelector<HTMLInputElement>('input[type="checkbox"]')?.focus();
	}

	private createSearchPanel(parent: HTMLElement): void {
		const panel = parent.createDiv({ cls: "context-tree-search-panel" });
		this.searchPanel = panel;
		const input = panel.createEl("input", {
			type: "search",
			attr: { placeholder: COPY.labels.searchPlaceholder, "aria-label": COPY.actions.searchGraph },
		});
		input.value = this.searchQuery;
		input.addEventListener("input", () => {
			this.searchQuery = input.value;
			this.applySearchAndFilter();
		});
		input.addEventListener("keydown", (event) => {
			if (event.key === "Escape") {
				event.preventDefault();
				event.stopPropagation();
				input.value = "";
				this.searchQuery = "";
				this.applySearchAndFilter();
				panel.removeClass("is-open");
				this.searchPanelMode = undefined;
				for (const button of Object.values(this.searchPanelButtons ?? {})) button.setAttribute("aria-expanded", "false");
				this.searchPanelButtons?.search.focus({ preventScroll: true });
				return;
			}
			if (event.key !== "Enter") return;
			const firstMatch = this.searchVisibility().matches.values().next().value;
			if (firstMatch) this.focusNode(firstMatch);
		});
		const filters = panel.createDiv({ cls: "context-tree-relation-filters" });
		filters.createDiv({ cls: "context-tree-filter-label", text: COPY.labels.relationFilters });
		for (const type of ["derived", ...RELATION_TYPES] as readonly GraphRelationType[]) {
			const label = filters.createEl("label", { cls: "context-tree-relation-filter" });
			const checkbox = label.createEl("input", { type: "checkbox" });
			checkbox.checked = this.relationFilter.has(type);
			checkbox.addEventListener("change", () => {
				if (checkbox.checked) this.relationFilter.add(type);
				else this.relationFilter.delete(type);
				this.applySearchAndFilter();
			});
			label.createSpan({ text: type === "derived" ? COPY.relations.derived : contextRelationLabel(type) });
		}
		const empty = panel.createDiv({ cls: "context-tree-search-empty", text: COPY.labels.searchNoResults });
		empty.toggleClass("is-visible", false);
		panel.addEventListener("keydown", (event) => {
			if (event.key !== "Escape" || event.target === input) return;
			event.preventDefault();
			event.stopPropagation();
			const mode = this.searchPanelMode ?? "filter";
			panel.removeClass("is-open");
			this.searchPanelMode = undefined;
			for (const button of Object.values(this.searchPanelButtons ?? {})) button.setAttribute("aria-expanded", "false");
			this.searchPanelButtons?.[mode].focus({ preventScroll: true });
		});
	}

	private searchVisibility(): GraphSearchVisibility {
		const cached = this.searchVisibilityCache;
		if (cached && cached.nodes === this.simNodes && cached.links === this.simLinks && cached.query === this.searchQuery) {
			return cached.visibility;
		}
		const visibility = graphSearchVisibility(this.searchQuery, this.simNodes.map((node) => node.node), this.simLinks);
		this.searchVisibilityCache = {
			nodes: this.simNodes,
			links: this.simLinks,
			query: this.searchQuery,
			visibility,
		};
		return visibility;
	}

	private applySearchAndFilter(): void {
		const visibility = this.searchVisibility();
		this.refreshHoverNodeIds();
		this.searchPanel?.querySelector(".context-tree-search-empty")?.toggleClass("is-visible", !!this.searchQuery.trim() && visibility.matches.size === 0);
		this.clearSelectedEdge();
		if (this.openDetails.size && ![...this.openDetails].some((id) => visibility.visible.has(id))) this.closeDetailsForCanvas();
		this.syncCards();
		this.paintGraph();
	}

	private createIconControl(parent: HTMLElement, icon: string, label: string, callback: () => void): HTMLButtonElement {
		const button = parent.createEl("button", {
			cls: "context-tree-zoom-button context-tree-control-button",
			attr: { "aria-label": label, title: label },
		});
		setIcon(button, icon);
		button.addEventListener("click", (event) => {
			event.stopPropagation();
			callback();
		});
		return button;
	}

	private createZoomButton(parent: HTMLElement, icon: string, label: string, multiplier: number): void {
		const button = parent.createEl("button", { cls: "context-tree-zoom-button", attr: { "aria-label": label, title: label } });
		setIcon(button, icon);
		button.addEventListener("click", (event) => {
			event.stopPropagation();
			if (!this.viewport) return;
			const rect = this.viewport.getBoundingClientRect();
			this.zoomAt(this.viewport, rect.left + rect.width / 2, rect.top + rect.height / 2, this.clampZoom(this.zoom * multiplier));
		});
	}

	private createGraph(preserveViewport: boolean): void {
		this.simulation?.stop();
		if (!preserveViewport) this.neighbourhoodLayoutLocks.clear();
		const graph = buildContextGraph(this.rootNodes);
		if (!graph.edges.some((edge) => edge.id === this.selectedEdgeId)) this.selectedEdgeId = undefined;
		const previous = new Map(this.simNodes.map((node) => [node.id, node]));
		const savedView = preserveViewport ? undefined : this.plugin.graphViewState(this.getGraphId());
		const availableIds = graph.nodes.map((node) => node.id);
		for (const nodeId of this.neighbourhoodLayoutLocks.keys()) {
			if (!availableIds.includes(nodeId)) this.neighbourhoodLayoutLocks.delete(nodeId);
		}
		if (savedView) {
			this.pinnedOpenNodeIds.clear();
			for (const id of normalizePinnedCardIds(savedView.pinnedOpenNodeIds, availableIds)) this.pinnedOpenNodeIds.add(id);
			this.openCardPositionLocks.clear();
			this.openDetails.clear();
			for (const id of this.pinnedOpenNodeIds) this.openDetails.add(id);
		} else {
			const validPins = normalizePinnedCardIds([...this.pinnedOpenNodeIds], availableIds);
			this.pinnedOpenNodeIds.clear();
			for (const id of validPins) this.pinnedOpenNodeIds.add(id);
			this.replaceOpenDetails(new Set([...this.openDetails].filter((id) => availableIds.includes(id))));
		}
		const focusId = graph.nodes.some((node) => node.id === this.focusedNodeId)
			? this.focusedNodeId
			: graph.nodes.some((node) => node.id === savedView?.focusedNodeId)
				? savedView?.focusedNodeId
				: graph.nodes[0]?.id;
		this.focusedNodeId = focusId;
		this.simNodes = graph.nodes.map((node, index) => {
			const saved = previous.get(node.id);
			const persisted = savedView?.positions[node.id];
			const initial = saved ?? persisted ?? initialGraphPosition(index, graph.nodes.length, node.id === focusId);
			return {
				id: node.id,
				node,
				size: saved?.size ?? DEFAULT_CARD_SIZE,
				x: initial.x,
				y: initial.y,
				vx: saved?.vx,
				vy: saved?.vy,
				fx: saved?.fx ?? (persisted?.pinned ? persisted.x : undefined),
				fy: saved?.fy ?? (persisted?.pinned ? persisted.y : undefined),
			};
		});
		this.searchVisibilityCache = undefined;
		this.syncOpenCardPositionLocks();
		this.simLinks = graph.edges.map(simulationLinkFor);
		if (!this.simNodes.some((node) => node.id === this.hoveredNodeId)) this.hoveredNodeId = undefined;
		this.refreshHoverNodeIds();
		if (savedView) {
			this.pan = { ...savedView.pan };
			this.zoom = this.clampZoom(savedView.zoom);
			this.updateZoomLabel();
			this.applyTransform();
		}
		this.syncCards();
		this.createSimulation();
		if (!preserveViewport && !savedView) this.focusNode(focusId);
		this.openPendingEditor();
		this.paintGraph();
		this.fitWhenMeasured = shouldFitInitialOverview(preserveViewport, savedView !== undefined);
		this.hasRenderedGraph = true;
		this.scheduleMeasure();
	}

	private createSimulation(): void {
		const graphSimulation = createGraphSimulation(this.simNodes, this.simLinks, {
			onTick: () => {
				this.paintGraph();
				// Some Obsidian webviews keep the simulation warm after a card
				// measurement restart. Fit once it is visually stable instead of
				// waiting indefinitely for D3's end event.
				if (this.fitWhenMeasured && this.simulation?.alpha() !== undefined && this.simulation.alpha() < 0.08) {
					this.finishOverviewFit();
				}
			},
			onEnd: () => this.finishOverviewFit(),
		}, this.graph.physics);
		this.simulation = graphSimulation.simulation;
		this.linkForce = graphSimulation.linkForce;
		this.collideForce = graphSimulation.collideForce;
	}

	private syncCards(): void {
		if (!this.scene) return;
		const wanted = new Set(this.simNodes.map((node) => node.id));
		const visibility = this.searchVisibility();
		for (const [id, element] of this.nodeElements) {
			if (wanted.has(id)) continue;
			element.remove();
			this.nodeElements.delete(id);
		}
		for (const node of this.simNodes) {
			let element = this.nodeElements.get(node.id);
			if (!element) {
				element = this.cards.create(this.scene, node.node);
				this.nodeElements.set(node.id, element);
			}
			this.cards.sync(element, node.node, this.cardState(node, visibility));
		}
	}

	private cardState(node: SimNode, visibility: GraphSearchVisibility): TopicCardState {
		const isHoverActive = this.hoverNodeIds.has(node.id);
		return {
			isOpen: this.openDetails.has(node.id),
			isFocused: node.id === this.focusedNodeId,
			isEditing: this.inlineEdit?.nodeId === node.id,
			isPinned: this.pinnedOpenNodeIds.has(node.id),
			isNodeDrag: this.dragNode?.nodeId === node.id && this.dragNode.moved,
			isDragSource: this.dragConnection?.sourceId === node.id,
			hoverAnchor: this.hoveredAnchor?.nodeId === node.id ? this.hoveredAnchor.anchor : undefined,
			dragSourceAnchor: this.dragConnection?.sourceId === node.id ? this.dragConnection.sourceAnchor : undefined,
			isDragTarget: this.dragConnection?.targetId === node.id,
			dragTargetAnchor: this.dragConnection?.targetId === node.id ? this.dragConnection.targetAnchor : undefined,
			isSearchMatch: visibility.matches.has(node.id),
			isSearchContext: visibility.context.has(node.id),
			isSearchHidden: !visibility.visible.has(node.id),
			isHoverOrigin: node.id === this.hoveredNodeId,
			isHoverNeighbour: !!this.hoveredNodeId && node.id !== this.hoveredNodeId && isHoverActive,
			isHoverMuted: !!this.hoveredNodeId && !isHoverActive,
		};
	}

	private refreshHoverNodeIds(): void {
		this.hoverNodeIds = graphHoverNodeIds(this.hoveredNodeId, this.simLinks, this.relationFilter);
	}

	private syncInteractionStates(): void {
		const visibility = this.searchVisibility();
		for (const node of this.simNodes) {
			const element = this.nodeElements.get(node.id);
			if (element) this.cards.syncInteraction(element, this.cardState(node, visibility));
		}
	}

	private setHoveredNode(nodeId?: string): void {
		if (this.hoveredNodeId === nodeId) return;
		this.hoveredNodeId = nodeId;
		this.refreshHoverNodeIds();
		this.syncInteractionStates();
		this.paintGraph();
	}

	private setConnectionCandidate(nodeId?: string, anchor?: CardAnchor): void {
		if (this.dragConnection) return;
		const next = nodeId && anchor ? { nodeId, anchor } : undefined;
		if (this.sameAnchor(this.hoveredAnchor, next)) return;
		const previous = this.hoveredAnchor;
		this.hoveredAnchor = next;
		const visibility = this.searchVisibility();
		for (const id of new Set([previous?.nodeId, next?.nodeId])) {
			if (!id) continue;
			const node = this.simNodes.find((candidate) => candidate.id === id);
			const element = this.nodeElements.get(id);
			if (node && element) this.cards.syncConnectionPort(element, this.cardState(node, visibility));
		}
	}

	private connectionsFor(node: ContextTreeNode): CardConnection[] {
		return this.simLinks.flatMap((edge) => {
			if (edge.nodeA !== node.id && edge.nodeB !== node.id) return [];
			const targetId = edge.nodeA === node.id ? edge.nodeB : edge.nodeA;
			const target = this.simNodes.find((candidate) => candidate.id === targetId)?.node;
			if (!target) return [];
			const derived = edge.types.includes("derived")
				? [{ label: COPY.relations.derived, target }]
				: [];
			const stored = edge.storedLinks
				.filter((link) => link.sourcePath === node.path)
				.map((link) => this.storedConnection(link, target));
			const storedTypes = new Set(edge.storedLinks
				.filter((link) => link.sourcePath === node.path)
				.map((link) => link.type));
			const incoming = edge.storedLinks
				.filter((link) => link.targetPath === node.path && !(isSymmetricRelation(link.type) && storedTypes.has(link.type)))
				.map((link) => ({
					// Directional types retain their authored meaning. Symmetric types
					// stay arrow-free in the shared label helper.
					label: contextRelationNavigationLabel(link.type, "incoming"),
					target,
				}));
			return [...derived, ...stored, ...incoming];
		});
	}

	private storedConnection(link: ContextTreeLink & { sourcePath?: string }, target: ContextTreeNode): CardConnection {
		return {
			label: contextRelationNavigationLabel(link.type, "outgoing"),
			target,
		};
	}

	private async toggleInlineMarkdownEditor(node: ContextTreeNode): Promise<void> {
		if (this.inlineEdit?.nodeId === node.id) {
			await this.finishInlineMarkdownEditor();
			return;
		}
		if (this.inlineEdit) await this.finishInlineMarkdownEditor();
		const file = this.app.vault.getAbstractFileByPath(node.path);
		if (!(file instanceof TFile)) {
			new Notice(COPY.notice.sourceMissing);
			return;
		}
		try {
			const source = await this.app.vault.read(file);
			const recovery = recoverInlineDraft(source, this.plugin.inlineDraft(file.path));
			const editorSource = recovery.kind === "none" ? source : recovery.content;
			this.clearSelectedEdge();
			this.replaceOpenDetails(openCardAlongsidePins(this.pinnedOpenNodeIds, node.id));
			// Let Markdown settle before deriving the Source footprint. A height read
			// during the opening transition is only the first animation frame.
			this.syncCards();
			const readingElement = this.nodeElements.get(node.id);
			const readingCardHeight = readingElement
				? await this.cards.waitForStableReadingCardHeight(readingElement, node.id)
				: 0;
			this.inlineEdit = {
				nodeId: node.id,
				file,
				content: editorSource,
				lastPersisted: source,
				graphMetadataSignature: topicGraphMetadataSignature(source),
				summaryFallback: markdownSummary(editorSource) ? "" : node.summary,
				hasConflict: recovery.kind === "conflict",
			};
			this.syncCards();
			const element = this.nodeElements.get(node.id);
			if (!element) {
				this.inlineEdit = undefined;
				return;
			}
			this.cards.startInlineMarkdownEditing(element, editorSource, readingCardHeight, {
				onInput: (content) => this.queueInlineMarkdownSave(content),
				onSelectDraft: () => this.selectInlineMarkdownDraft(),
				onReloadSource: () => void this.reloadInlineMarkdownSource(),
				onOpenSource: () => void this.openInlineMarkdownSource(),
			});
			if (recovery.kind === "restore") void this.flushInlineMarkdownSave();
			if (recovery.kind === "conflict") this.showInlineMarkdownConflict(this.inlineEdit);
			this.scheduleMeasure();
		} catch (error) {
			console.error("Context Graph: failed to open inline Markdown editor", error);
			this.inlineEdit = undefined;
			new Notice(COPY.notice.openMarkdownFailed);
		}
	}

	private queueInlineMarkdownSave(content: string): void {
		const edit = this.inlineEdit;
		if (!edit) return;
		edit.content = content;
		this.plugin.stageInlineDraft(edit.file.path, {
			content,
			lastPersisted: edit.lastPersisted,
			updatedAt: Date.now(),
		});
		edit.saveFailed = false;
		if (edit.hasConflict) return;
		if (edit.timer !== undefined) window.clearTimeout(edit.timer);
		edit.timer = window.setTimeout(() => {
			edit.timer = undefined;
			void this.flushInlineMarkdownSave();
		}, 220);
	}

	private async flushInlineMarkdownSave(): Promise<void> {
		const edit = this.inlineEdit;
		if (!edit || edit.hasConflict || edit.saveFailed || edit.saving || edit.content === edit.lastPersisted) return edit?.saving;
		const content = edit.content;
		let hasConflict = false;
		edit.saving = this.app.vault.process(edit.file, (current) => {
			const decision = decideInlineEditorSave(current, edit.lastPersisted, content);
			if (decision.kind === "conflict") {
				hasConflict = true;
				return current;
			}
			return decision.kind === "write" ? content : current;
		})
			.then(() => {
				if (hasConflict) {
					edit.hasConflict = true;
					this.showInlineMarkdownConflict(edit);
					return;
				}
				edit.lastPersisted = content;
				// Keep the recovery base aligned with the Vault write. If the plugin
				// stops before Source mode closes, a saved edit must not reopen as a
				// false conflict; newer keystrokes still remain recoverable.
				this.plugin.stageInlineDraft(edit.file.path, {
					content: edit.content,
					lastPersisted: content,
					updatedAt: Date.now(),
				});
			})
			.catch((error: unknown) => {
				edit.saveFailed = true;
				console.error("Context Graph: failed to save inline Markdown", error);
				new Notice(COPY.notice.inlineSaveFailed);
			})
			.finally(() => {
				if (this.inlineEdit !== edit) return;
				edit.saving = undefined;
				if (!edit.hasConflict && edit.content !== edit.lastPersisted) void this.flushInlineMarkdownSave();
			});
		return edit.saving;
	}

	private async finishInlineMarkdownEditor(): Promise<void> {
		const edit = this.inlineEdit;
		if (!edit) return;
		if (edit.timer !== undefined) {
			window.clearTimeout(edit.timer);
			edit.timer = undefined;
		}
		while (this.inlineEdit === edit && !edit.hasConflict && !edit.saveFailed && (edit.saving || edit.content !== edit.lastPersisted)) {
			await this.flushInlineMarkdownSave();
		}
		if (edit.hasConflict || edit.saveFailed) return;
		this.inlineEdit = undefined;
		await this.plugin.clearInlineDraft(edit.file.path);
		const node = this.simNodes.find((candidate) => candidate.id === edit.nodeId);
		const element = this.nodeElements.get(edit.nodeId);
		if (!node || !element) return;
		Object.assign(node.node, topicDisplayContent(edit.content, {
			title: node.node.title,
			summary: edit.summaryFallback,
		}));
		this.cards.finishInlineMarkdownEditing(element, edit.nodeId);
		this.syncCards();
		const graphMetadataChanged = edit.graphMetadataSignature !== topicGraphMetadataSignature(edit.content);
		const refreshPending = this.refreshPending;
		this.refreshPending = false;
		if (graphMetadataChanged || refreshPending) {
			// Vault content is committed before this point, while Obsidian's metadata
			// cache updates on the ensuing event turn. Keep the outer card DOM and its
			// coordinates, then rebuild only the graph model from that fresh cache.
			this.setViewTimeout(() => void this.refresh(), 0);
		}
	}

	private showInlineMarkdownConflict(edit: NonNullable<ContextTreeView["inlineEdit"]>): void {
		if (this.inlineEdit !== edit) return;
		const element = this.nodeElements.get(edit.nodeId);
		if (!element) return;
		this.cards.showInlineMarkdownConflict(element, {
			onSelectDraft: () => this.selectInlineMarkdownDraft(),
			onReloadSource: () => void this.reloadInlineMarkdownSource(),
			onOpenSource: () => void this.openInlineMarkdownSource(),
		});
		new Notice(COPY.notice.inlineSaveConflict);
	}

	private selectInlineMarkdownDraft(): void {
		const edit = this.inlineEdit;
		if (!edit) return;
		const element = this.nodeElements.get(edit.nodeId);
		const editor = element?.querySelector<HTMLTextAreaElement>(".context-tree-markdown-editor");
		if (!editor) return;
		editor.focus();
		editor.select();
		new Notice(COPY.notice.inlineDraftSelected);
	}

	private reloadInlineMarkdownSource(): void {
		const edit = this.inlineEdit;
		if (!edit) return;
		new ReloadInlineSourceModal(this.app, () => void this.replaceInlineMarkdownSource(edit)).open();
	}

	private async replaceInlineMarkdownSource(edit: NonNullable<ContextTreeView["inlineEdit"]>): Promise<void> {
		try {
			const source = await this.app.vault.read(edit.file);
			if (this.inlineEdit !== edit) return;
			edit.content = source;
			edit.lastPersisted = source;
			edit.graphMetadataSignature = topicGraphMetadataSignature(source);
			const node = this.simNodes.find((candidate) => candidate.id === edit.nodeId);
			edit.summaryFallback = markdownSummary(source) ? "" : node?.node.summary ?? "";
			edit.hasConflict = false;
			await this.plugin.clearInlineDraft(edit.file.path);
			const element = this.nodeElements.get(edit.nodeId);
			if (element) this.cards.replaceInlineMarkdownSource(element, source);
		} catch (error) {
			console.error("Context Graph: failed to reload inline Markdown source", error);
			new Notice(COPY.notice.sourceMissing);
		}
	}

	private async openInlineMarkdownSource(): Promise<void> {
		const edit = this.inlineEdit;
		if (!edit) return;
		await this.openSourceFileBesideGraph(edit.file);
	}

	private async openNodeSourceBesideGraph(node: ContextTreeNode): Promise<void> {
		this.cards.closeMenus();
		if (this.inlineEdit?.nodeId === node.id) await this.finishInlineMarkdownEditor();
		const file = this.app.vault.getAbstractFileByPath(node.path);
		if (!(file instanceof TFile)) {
			new Notice(COPY.notice.sourceMissing);
			return;
		}
		await this.openSourceFileBesideGraph(file);
	}

	private async openSourceFileBesideGraph(file: TFile): Promise<void> {
		try {
			let leafIsOpen = false;
			if (this.sourceLeaf) {
				this.app.workspace.iterateAllLeaves((candidate) => {
					if (candidate === this.sourceLeaf) leafIsOpen = true;
				});
			}
			const leaf = leafIsOpen && this.sourceLeaf
				? this.sourceLeaf
				: this.app.workspace.getLeaf("split", "vertical");
			this.sourceLeaf = leaf;
			await leaf.setViewState({
				type: "markdown",
				state: { file: file.path, mode: "source" },
				active: true,
			});
			await this.app.workspace.revealLeaf(leaf);
		} catch (error) {
			console.error("Context Graph: failed to open source beside graph", error);
			new Notice(COPY.notice.openSourceFailed);
		}
	}

	private openPendingEditor(): void {
		const path = this.pendingEditorPath;
		if (!path) return;
		const pending = this.simNodes.find((candidate) => candidate.node.path === path);
		if (!pending) return;
		this.pendingEditorPath = undefined;
		this.replaceOpenDetails(openCardAlongsidePins(this.pinnedOpenNodeIds, pending.id));
		this.syncCards();
		this.setViewTimeout(() => void this.toggleInlineMarkdownEditor(pending.node), 0);
	}

	private async toggleNodeFromCard(nodeId: string, fromKeyboard = false): Promise<void> {
		this.cards.closeMenus();
		if (!fromKeyboard && this.suppressNextToggleFor === nodeId) {
			this.suppressNextToggleFor = undefined;
			return;
		}
		// Keyboard activation is a fresh gesture and must not inherit a pointer
		// bridge's unconsumed trailing-click marker.
		this.suppressNextToggleFor = undefined;
		this.clearSelectedEdge();
		if (!(await this.settleUnpinnedInlineEditor())) return;
		this.toggleNode(nodeId);
	}

	private toggleNode(nodeId: string): void {
		const isOpen = this.openDetails.has(nodeId);
		if (isOpen) {
			if (this.isPinnedCard(nodeId)) return;
			this.closeDetailsForCanvas();
			return;
		}
		this.openNode(nodeId);
	}

	/** Relation chips are navigation, never a second toggle or removal control. */
	private async navigateToNode(nodeId: string): Promise<void> {
		if (!(await this.settleUnpinnedInlineEditor())) return;
		if (this.openDetails.has(nodeId)) {
			this.focusNode(nodeId);
			return;
		}
		this.openNode(nodeId, "navigate-to-card");
	}

	/** Opening beneath the pointer preserves the camera; relationship navigation does not. */
	private openNode(nodeId: string, intent: CardOpenIntent = "open-in-place"): void {
		const hadOpenCard = this.openDetails.size > 0;
		this.replaceOpenDetails(openCardAlongsidePins(this.pinnedOpenNodeIds, nodeId));
		if (!hadOpenCard) {
			this.viewportBeforeDetails = { pan: { ...this.pan }, zoom: this.zoom };
		}
		this.syncCards();
		const effects = cardOpenEffects(intent);
		if (effects.cancelsPendingOverviewFit) this.fitWhenMeasured = false;
		if (effects.movesCamera) this.focusNode(nodeId);
		this.setViewTimeout(() => this.scheduleMeasure(), 220);
		this.setViewTimeout(() => this.scheduleMeasure(), 520);
	}

	private async deleteFromCard(node: ContextTreeNode): Promise<void> {
		if (this.inlineEdit) await this.finishInlineMarkdownEditor();
		if (this.inlineEdit) return;
		this.showDeleteTopic(node);
	}

	private nodeNeighbourhoodAction(node: ContextTreeNode): RootedNeighbourhoodAction {
		return this.graph.scope.kind === "rooted"
			? rootedNeighbourhoodAction(this.graph.scope, node.path, this.rootedOutgoingByPath)
			: "none";
	}

	private lockNeighbourhoodLayout(): void {
		for (const simNode of this.simNodes) {
			if (!this.neighbourhoodLayoutLocks.has(simNode.id)) {
				this.neighbourhoodLayoutLocks.set(simNode.id, { fx: simNode.fx, fy: simNode.fy });
			}
			simNode.fx = simNode.x ?? simNode.fx ?? 0;
			simNode.fy = simNode.y ?? simNode.fy ?? 0;
		}
	}

	private async toggleNodeNeighbourhood(node: ContextTreeNode): Promise<void> {
		const action = this.nodeNeighbourhoodAction(node);
		if (action === "none") return;
		this.lockNeighbourhoodLayout();
		try {
			if (action === "collapse") {
				await this.plugin.collapsePathInGraph(this.getGraphId(), node.path);
			} else {
				await this.plugin.includePathInGraph(this.getGraphId(), node.path);
			}
		} catch (error) {
			console.error("Context Graph: failed to change a rooted neighbourhood", error);
		}
	}

	private async removeNodeFromGraph(node: ContextTreeNode): Promise<void> {
		try {
			await this.plugin.removePathFromGraph(this.getGraphId(), node.path);
			new Notice(COPY.notice.removedFromGraph);
		} catch (error) {
			console.error("Context Graph: failed to remove a card from this graph", error);
			new Notice(COPY.notice.removeFromGraphFailed);
		}
	}

	private async toggleCardPin(node: ContextTreeNode): Promise<void> {
		// Pinning a different card is a structural action. Finish a regular
		// Source edit first, but keep a pinned editor available as reference
		// material while the reader opens or pins another card.
		if (this.inlineEdit?.nodeId !== node.id && !(await this.settleUnpinnedInlineEditor())) return;
		if (!this.openDetails.has(node.id)) this.openNode(node.id);
		if (this.pinnedOpenNodeIds.has(node.id)) this.pinnedOpenNodeIds.delete(node.id);
		else this.pinnedOpenNodeIds.add(node.id);
		this.replaceOpenDetails(openCardAlongsidePins(this.pinnedOpenNodeIds, node.id));
		this.syncCards();
		this.scheduleMeasure();
		this.scheduleGraphViewStateSave();
	}

	private isPinnedCard(nodeId: string): boolean {
		return this.pinnedOpenNodeIds.has(nodeId) && this.openDetails.has(nodeId);
	}

	/** A pinned Source card remains available as a reference while another card opens. */
	private async settleUnpinnedInlineEditor(): Promise<boolean> {
		if (!this.inlineEdit || this.isPinnedCard(this.inlineEdit.nodeId)) return true;
		await this.finishInlineMarkdownEditor();
		return !this.inlineEdit;
	}

	private replaceOpenDetails(next: ReadonlySet<string>): void {
		this.openDetails.clear();
		for (const id of next) this.openDetails.add(id);
		this.syncOpenCardPositionLocks();
	}

	/**
	 * Expanding changes a card's collision radius. Keep the reader at its exact
	 * current graph coordinate while that measurement settles; only surrounding
	 * compact cards may respond to the new footprint.
	 */
	private syncOpenCardPositionLocks(): void {
		const nodesById = new Map(this.simNodes.map((node) => [node.id, node]));
		for (const [nodeId, position] of this.openCardPositionLocks) {
			const node = nodesById.get(nodeId);
			if (!node || this.openDetails.has(nodeId)) continue;
			node.fx = position.fx;
			node.fy = position.fy;
			this.openCardPositionLocks.delete(nodeId);
		}
		for (const node of this.simNodes) {
			if (!this.openDetails.has(node.id)) continue;
			if (!this.openCardPositionLocks.has(node.id)) {
				this.openCardPositionLocks.set(node.id, { fx: node.fx, fy: node.fy });
			}
			node.fx = node.x ?? node.fx ?? 0;
			node.fy = node.y ?? node.fy ?? 0;
		}
	}

	/** Keep a deliberate drag after any temporary interaction lock is released. */
	private retainTemporaryLockManualPosition(node: SimNode): void {
		if (this.openCardPositionLocks.has(node.id)) {
			this.openCardPositionLocks.set(node.id, { fx: node.fx, fy: node.fy });
		}
		if (this.neighbourhoodLayoutLocks.has(node.id)) {
			this.neighbourhoodLayoutLocks.set(node.id, { fx: node.fx, fy: node.fy });
		}
	}

	private createInlineTopic(): void {
		void createTopic(this.app, {
			title: COPY.labels.newTopicTitle,
			body: "",
			fallbackFolder: graphNoteFolder(this.graph),
			includeLegacyMarker: this.graph.scope.kind !== "rooted",
		})
			.then(async (file) => {
				await this.plugin.includePathInGraph(this.getGraphId(), file.path);
				this.pendingEditorPath = file.path;
				this.setViewTimeout(() => this.plugin.refreshOpenViews(), 180);
			})
			.catch((error: unknown) => {
				console.error("Context Graph: failed to create inline topic", error);
				new Notice(COPY.notice.createFailed);
			});
	}

	private startNodeDrag(event: PointerEvent, node: ContextTreeNode): void {
		if (event.button !== 0 || this.dragConnection) return;
		// A real pointerdown starts a new gesture, so any unconsumed marker from
		// an input bridge that omitted its trailing click is now stale.
		this.suppressNextToggleFor = undefined;
		this.clearSelectedEdge();
		const simNode = this.simNodes.find((candidate) => candidate.id === node.id);
		if (!simNode) return;
		const captureTarget = event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
		this.dragNode = {
			nodeId: node.id,
			pointerId: event.pointerId,
			originPointer: { x: event.clientX, y: event.clientY },
			originGraph: { x: simNode.x ?? 0, y: simNode.y ?? 0 },
			captureTarget,
			moved: false,
		};
	}

	private startCanvasPan(event: PointerEvent, dismissUnpinnedEditorOnClick = false): void {
		if (event.button !== 0 || this.dragConnection || this.disconnectDrag || this.canvasPan) return;
		const captureTarget = event.currentTarget;
		if (!(captureTarget instanceof HTMLElement)) return;
		this.clearSelectedEdge();
		captureTarget.setPointerCapture(event.pointerId);
		this.canvasPan = {
			pointerId: event.pointerId,
			originPointer: { x: event.clientX, y: event.clientY },
			originPan: { ...this.pan },
			captureTarget,
			moved: false,
			dismissUnpinnedEditorOnClick,
		};
	}

	private updateCanvasPan(event: PointerEvent): void {
		const pan = this.canvasPan;
		if (!pan || event.pointerId !== pan.pointerId) return;
		const distance = Math.hypot(event.clientX - pan.originPointer.x, event.clientY - pan.originPointer.y);
		if (!pan.moved && distance < 5) return;
		pan.moved = true;
		event.preventDefault();
		this.pan = {
			x: pan.originPan.x + event.clientX - pan.originPointer.x,
			y: pan.originPan.y + event.clientY - pan.originPointer.y,
		};
		pan.captureTarget.addClass("is-panning");
		this.applyTransform();
	}

	private finishCanvasPan(event: PointerEvent): void {
		const pan = this.canvasPan;
		if (!pan || event.pointerId !== pan.pointerId) return;
		this.canvasPan = undefined;
		if (pan.captureTarget.hasPointerCapture(event.pointerId)) pan.captureTarget.releasePointerCapture(event.pointerId);
		pan.captureTarget.removeClass("is-panning");
		if (!pan.moved) {
			if (pan.dismissUnpinnedEditorOnClick) {
				void this.finishInlineMarkdownEditor().then(() => {
					if (!this.inlineEdit) this.closeDetailsForCanvas();
				});
			}
			return;
		}
		this.scheduleGraphViewStateSave();
	}

	private updateNodeDrag(event: PointerEvent): void {
		const drag = this.dragNode;
		if (!drag || event.pointerId !== drag.pointerId) return;
		if (!drag.moved && !hasCardDragExceededClickThreshold(drag.originPointer, {
			x: event.clientX,
			y: event.clientY,
		})) return;
		const simNode = this.simNodes.find((candidate) => candidate.id === drag.nodeId);
		if (!simNode) return;
		if (!drag.moved) {
			drag.moved = true;
			// Delay capture until this is a drag. Immediate capture on the card
			// would steal an ordinary title-button click before it can toggle.
			drag.captureTarget?.setPointerCapture(event.pointerId);
		}
		event.preventDefault();
		const delta = graphPointerDelta(drag.originPointer, { x: event.clientX, y: event.clientY }, this.zoom);
		simNode.fx = drag.originGraph.x + delta.x;
		simNode.fy = drag.originGraph.y + delta.y;
		simNode.x = simNode.fx;
		simNode.y = simNode.fy;
		this.retainTemporaryLockManualPosition(simNode);
		this.hoveredAnchor = undefined;
		this.syncCards();
		this.paintGraph();
		this.simulation?.alpha(Math.max(this.simulation.alpha(), 0.28)).restart();
	}

	private finishNodeDrag(event: PointerEvent, cancelled = false): void {
		const drag = this.dragNode;
		if (!drag || event.pointerId !== drag.pointerId) return;
		this.dragNode = undefined;
		if (drag.captureTarget?.hasPointerCapture(event.pointerId)) drag.captureTarget.releasePointerCapture(event.pointerId);
		if (!drag.moved) return;
		// Pointerup can synthesize a click after movement, including through
		// accessibility input bridges where MouseEvent.detail is zero. Consume
		// exactly that next toggle; pointercancel never creates such a click.
		if (!cancelled) this.suppressNextToggleFor = drag.nodeId;
		this.syncCards();
		this.scheduleGraphViewStateSave();
	}

	private async createDirectRelation(first: ContextTreeNode, second: ContextTreeNode): Promise<void> {
		try {
			// A drag is directional authoring: the card whose handle the user
			// grabbed owns the frontmatter record. Visual graph edges remain peer
			// relationships, but this preserves a predictable Markdown source.
			if (await addRelation(this.app, first, second, DIRECT_RELATION)) this.plugin.refreshOpenViews();
		} catch (error) {
			console.error("Context Graph: failed to connect cards", error);
			new Notice(COPY.notice.connectFailed);
		}
	}

	private startDragConnection(event: PointerEvent, node: ContextTreeNode, sourceAnchor: CardAnchor): void {
		if (event.button !== 0) return;
		event.preventDefault();
		event.stopPropagation();
		this.clearSelectedEdge();
		this.hoveredAnchor = undefined;
		this.dragConnection = { sourceId: node.id, sourceAnchor, pointerId: event.pointerId, x: event.clientX, y: event.clientY };
		this.syncCards();
		this.paintDraftConnection();
	}

	/** A direct edge owns relationship removal; cards and relation chips only navigate. */
	private startDisconnectDrag(event: PointerEvent, edgeId: string): void {
		if (event.button !== 0 || this.dragConnection) return;
		const edge = this.simLinks.find((candidate) => candidate.id === edgeId);
		if (!edge || !isDetachableGraphEdge(edge)) return;
		const captureTarget = event.currentTarget;
		if (!(captureTarget instanceof SVGPathElement || captureTarget instanceof HTMLElement)) return;
		event.preventDefault();
		event.stopPropagation();
		captureTarget.setPointerCapture(event.pointerId);
		this.disconnectDrag = {
			edgeId,
			pointerId: event.pointerId,
			captureTarget,
			start: { x: event.clientX, y: event.clientY },
		};
		this.selectEdge(edgeId);
		captureTarget.addClass("is-disconnecting");
	}

	private finishDisconnectDrag(event: PointerEvent, cancelled = false): void {
		const drag = this.disconnectDrag;
		if (!drag || event.pointerId !== drag.pointerId) return;
		this.disconnectDrag = undefined;
		if (drag.captureTarget.hasPointerCapture(event.pointerId)) drag.captureTarget.releasePointerCapture(event.pointerId);
		drag.captureTarget.removeClass("is-disconnecting");
		if (cancelled) return;
		const releasedOver = document.elementFromPoint(event.clientX, event.clientY);
		const isProtectedTarget = !!releasedOver?.closest(".context-tree-node, .context-tree-graph-controls, .context-tree-edge-endpoint, .context-tree-search-panel");
		if (!canDisconnectAtDrop({
			movedFarEnough: Math.hypot(event.clientX - drag.start.x, event.clientY - drag.start.y) >= 6,
			isInsideCanvas: !!releasedOver && !!this.viewport?.contains(releasedOver),
			isProtectedTarget,
		})) return;
		const edge = this.simLinks.find((candidate) => candidate.id === drag.edgeId);
		if (edge) void this.disconnectEdge(edge);
	}

	private updateDragConnection(event: PointerEvent): void {
		if (!this.dragConnection || event.pointerId !== this.dragConnection.pointerId) return;
		this.dragConnection.x = event.clientX;
		this.dragConnection.y = event.clientY;
		const targetId = this.nodeIdAt(event.clientX, event.clientY);
		const nextTarget = targetId === this.dragConnection.sourceId ? undefined : targetId;
		const nextTargetAnchor = nextTarget ? this.anchorForPointer(nextTarget, event.clientX, event.clientY) : undefined;
		if (nextTarget !== this.dragConnection.targetId || !this.sameAnchor(this.dragConnection.targetAnchor, nextTargetAnchor)) {
			this.dragConnection.targetId = nextTarget;
			this.dragConnection.targetAnchor = nextTargetAnchor;
			this.syncCards();
		}
		this.paintDraftConnection();
	}

	private finishDragConnection(event: PointerEvent, cancelled = false): void {
		const drag = this.dragConnection;
		if (!drag || event.pointerId !== drag.pointerId) return;
		const source = this.simNodes.find((candidate) => candidate.id === drag.sourceId)?.node;
		const target = drag.targetId ? this.simNodes.find((candidate) => candidate.id === drag.targetId)?.node : undefined;
		this.clearDragConnection();
		if (connectionDropAction({ cancelled, hasSource: !!source, hasTarget: !!target }) === "connect" && source && target) {
			void this.createDirectRelation(source, target);
		}
	}

	private clearDragConnection(): void {
		this.dragConnection = undefined;
		this.draftEdge?.remove();
		this.draftEdge = undefined;
		this.syncCards();
	}

	private sameAnchor(
		first?: { nodeId: string; anchor: CardAnchor } | CardAnchor,
		second?: { nodeId: string; anchor: CardAnchor } | CardAnchor,
	): boolean {
		if (!first || !second) return first === second;
		const firstNodeId = "nodeId" in first ? first.nodeId : undefined;
		const secondNodeId = "nodeId" in second ? second.nodeId : undefined;
		if (firstNodeId !== secondNodeId) return false;
		const firstAnchor = "anchor" in first ? first.anchor : first;
		const secondAnchor = "anchor" in second ? second.anchor : second;
		return Math.abs(firstAnchor.x - secondAnchor.x) < 0.005 && Math.abs(firstAnchor.y - secondAnchor.y) < 0.005;
	}

	private nodeIdAt(clientX: number, clientY: number): string | undefined {
		const target = document.elementFromPoint(clientX, clientY);
		const node = target?.closest<HTMLElement>(".context-tree-node");
		return node?.dataset.nodeId;
	}
	private anchorForPointer(targetId: string, clientX: number, clientY: number): CardAnchor | undefined {
		const card = this.nodeElements.get(targetId)?.querySelector<HTMLElement>(".context-tree-card");
		if (!card) return undefined;
		const bounds = card.getBoundingClientRect();
		return cardAnchorAtPoint(
			{ width: bounds.width, height: bounds.height },
			{ x: clientX - bounds.left, y: clientY - bounds.top },
		);
	}

	private paintDraftConnection(): void {
		const drag = this.dragConnection;
		if (!drag || !this.viewport || !this.draftEdges) return;
		const viewport = this.viewport.getBoundingClientRect();
		const source = this.nodeElements.get(drag.sourceId)?.querySelector<HTMLElement>(".context-tree-card")?.getBoundingClientRect();
		if (!source) return;
		this.draftEdges.setAttribute("viewBox", `0 0 ${viewport.width} ${viewport.height}`);
		const target = drag.targetId
			? this.nodeElements.get(drag.targetId)?.querySelector<HTMLElement>(".context-tree-card")?.getBoundingClientRect()
			: undefined;
		const pointer = { x: drag.x - viewport.left, y: drag.y - viewport.top };
		const sourceCenter = { x: source.left + source.width / 2 - viewport.left, y: source.top + source.height / 2 - viewport.top };
		const targetCenter = target
			? { x: target.left + target.width / 2 - viewport.left, y: target.top + target.height / 2 - viewport.top }
			: pointer;
		const first = cardAnchorPoint(sourceCenter, { width: source.width, height: source.height }, drag.sourceAnchor);
		const second = target
			? cardAnchorPoint(targetCenter, { width: target.width, height: target.height }, drag.targetAnchor ?? { x: 0.5, y: 0 })
			: pointer;
		this.draftEdge ??= this.draftEdges.createSvg("path");
		this.draftEdge.setAttribute("d", curvedEdgePath(first, second));
	}

	private showDeleteTopic(node: ContextTreeNode): void {
		new DeleteTopicModal(this.app, node, () => {
			void moveTopicToTrash(this.app, node)
				.then(() => {
					// The deleted node can no longer be a valid expanded or focused
					// graph state. Clear all transient selection before rebuilding.
					this.replaceOpenDetails(new Set());
					this.pinnedOpenNodeIds.delete(node.id);
					this.pendingEditorPath = undefined;
					this.dragConnection = undefined;
					this.disconnectDrag = undefined;
					this.draftEdge?.remove();
					this.draftEdge = undefined;
					this.focusedNodeId = undefined;
					new Notice(movedToTrashNotice(node.title));
					this.plugin.refreshOpenViews();
				})
				.catch((error: unknown) => {
					console.error("Context Graph: failed to move topic to trash", error);
					new Notice(COPY.notice.trashFailed);
				});
		}).open();
	}

	private async disconnectEdge(edge: SimLink): Promise<void> {
		try {
			if (!isDetachableGraphEdge(edge)) {
				new Notice(COPY.notice.connectionRemoveAmbiguous);
				return;
			}
			for (const link of edge.storedLinks) {
				const owner = this.simNodes.find((node) => node.node.path === link.sourcePath)?.node;
				if (!owner) throw new Error("The relation source is no longer in the graph.");
				await removeRelation(this.app, owner, link);
			}
			new Notice(COPY.notice.connectionRemoved);
			this.plugin.refreshOpenViews();
		} catch (error) {
			console.error("Context Graph: failed to disconnect cards", error);
			new Notice(COPY.notice.connectionRemoveFailed);
		}
	}

	private focusNode(nodeId?: string): void {
		if (!nodeId || !this.simulation) return;
		const focus = this.simNodes.find((node) => node.id === nodeId);
		if (!focus) return;
		// Focusing is a camera operation, never a graph-layout operation.
		// Translating every simulation node here used to erase a user's manually
		// pinned positions (`fx`/`fy`) whenever they opened a card. Keeping the
		// force coordinates untouched also makes a close restore the exact map
		// context that preceded reading.
		this.pan = {
			x: -(focus.x ?? 0) * this.zoom,
			y: -(focus.y ?? 0) * this.zoom,
		};
		this.focusedNodeId = nodeId;
		this.fitWhenMeasured = false;
		this.applyTransform();
		this.syncCards();
		this.paintGraph();
		this.scheduleGraphViewStateSave();
	}

	private paintGraph(): void {
		if (this.paintFrame !== undefined) return;
		this.paintFrame = window.requestAnimationFrame(() => {
			this.paintFrame = undefined;
			this.paintGraphNow();
		});
	}

	/** Coalesce force ticks into one browser paint without forcing layout reads. */
	private paintGraphNow(): void {
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
		const visibility = this.searchVisibility();
		for (const edge of this.simLinks) {
			const source = typeof edge.source === "string" ? undefined : edge.source;
			const target = typeof edge.target === "string" ? undefined : edge.target;
			if (!source || !target) continue;
			const key = edge.id;
			wanted.add(key);
			let visual = this.edgeElements.get(key);
			if (!visual) {
				const path = this.edges.createSvg("path", { cls: "context-tree-edge" });
				const firstEndpoint = this.createEdgeEndpoint(edge.id, edge.nodeA);
				const secondEndpoint = this.createEdgeEndpoint(edge.id, edge.nodeB);
				visual = {
					path,
					firstEndpoint,
					secondEndpoint,
				};
				this.edgeElements.set(key, visual);
			}
			visual.path.setAttribute("data-relation", edge.types.join(" "));
			const visibleBySearch = visibility.visible.has(edge.nodeA) && visibility.visible.has(edge.nodeB);
			const visibleByRelation = isGraphEdgeVisible(edge, this.relationFilter);
			const edgeVisible = visibleBySearch && visibleByRelation;
			visual.path.toggleClass("is-filter-hidden", !edgeVisible);
			const canDisconnect = isDetachableGraphEdge(edge);
			visual.firstEndpoint.toggleClass("is-detachable", canDisconnect);
			visual.secondEndpoint.toggleClass("is-detachable", canDisconnect);
			const selected = edge.id === this.selectedEdgeId;
			const connectedToHovered = !!this.hoveredNodeId
				&& this.hoverNodeIds.has(edge.nodeA)
				&& this.hoverNodeIds.has(edge.nodeB);
			const endpointsVisible = edgeVisible && !this.inlineEdit && (selected || connectedToHovered);
			visual.firstEndpoint.toggleClass("is-visible", endpointsVisible);
			visual.secondEndpoint.toggleClass("is-visible", endpointsVisible);
			visual.firstEndpoint.toggleClass("is-selected", selected);
			visual.secondEndpoint.toggleClass("is-selected", selected);
			visual.path.toggleClass("is-highlighted", selected);
			visual.path.toggleClass("is-selected", selected);
			visual.path.toggleClass("is-hover-related", connectedToHovered);
			visual.path.toggleClass("is-hover-muted", !!this.hoveredNodeId && !connectedToHovered);
			visual.path.toggleClass("is-muted", !this.hoveredNodeId && !!this.selectedEdgeId && !selected);
			const endpoints = cardEdgeEndpoints(source, target);
			const first = { x: centerX + endpoints.first.x, y: centerY + endpoints.first.y };
			const second = { x: centerX + endpoints.second.x, y: centerY + endpoints.second.y };
			const path = curvedEdgePath(first, second);
			visual.path.setAttribute("d", path);
			this.placeEdgeEndpoint(visual.firstEndpoint, first);
			this.placeEdgeEndpoint(visual.secondEndpoint, second);
		}
		for (const [key, visual] of this.edgeElements) {
			if (wanted.has(key)) continue;
			visual.path.remove();
			visual.firstEndpoint.remove();
			visual.secondEndpoint.remove();
			this.edgeElements.delete(key);
		}
	}

	/**
	 * Existing links expose their actual card-boundary attachment points only
	 * while their card is hovered or their relationship is selected. This keeps
	 * the overview quiet while preserving an explicit direct-manipulation handle.
	 */
	private createEdgeEndpoint(edgeId: string, nodeId: string): HTMLElement {
		const endpoint = this.scene!.createDiv({ cls: "context-tree-edge-endpoint" });
		// This is a mouse-only direct-manipulation affordance. Do not flood the
		// accessibility tree with one non-keyboard-operable control per edge end.
		endpoint.setAttribute("aria-hidden", "true");
		endpoint.tabIndex = -1;
		endpoint.addEventListener("pointerdown", (event) => {
			// Inspect first; deletion needs a second deliberate drag from the
			// selected endpoint. This prevents a first exploratory drag from
			// immediately becoming a destructive action.
			if (this.selectedEdgeId !== edgeId) {
				event.preventDefault();
				event.stopPropagation();
				this.selectEdge(edgeId);
				return;
			}
			this.startDisconnectDrag(event, edgeId);
		});
		endpoint.addEventListener("pointerenter", () => this.setHoveredNode(nodeId));
		endpoint.addEventListener("pointerleave", () => {
			if (!this.disconnectDrag && this.selectedEdgeId !== edgeId) this.setHoveredNode();
		});
		return endpoint;
	}

	private placeEdgeEndpoint(endpoint: HTMLElement, point: { x: number; y: number }): void {
		endpoint.style.left = `${point.x}px`;
		endpoint.style.top = `${point.y}px`;
	}

	private selectEdge(edgeId: string): void {
		if (this.selectedEdgeId === edgeId) return;
		this.selectedEdgeId = edgeId;
		this.paintGraph();
	}

	private clearSelectedEdge(): void {
		if (!this.selectedEdgeId) return;
		this.selectedEdgeId = undefined;
		this.paintGraph();
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
			this.collideForce?.radius((node) => cardRadius(node) + 30);
			this.linkForce?.distance((link) => linkDistance(link, this.graph.physics.linkGap));
			this.simulation.alpha(0.86).restart();
		}, 90);
	}

	/** Timers that outlive a card interaction must not restart a closed view. */
	private setViewTimeout(callback: () => void, delay: number): void {
		const timer = window.setTimeout(() => {
			this.delayedTimers.delete(timer);
			callback();
		}, delay);
		this.delayedTimers.add(timer);
	}

	private finishOverviewFit(): void {
		if (!this.fitWhenMeasured) return;
		if (!this.viewport || this.viewport.clientWidth < 180 || this.viewport.clientHeight < 180) return;
		this.fitGraph();
		this.fitWhenMeasured = false;
	}

	private fitOverview(): void {
		if (!this.simulation) return;
		this.fitWhenMeasured = true;
		this.simulation.alpha(0.92).restart();
	}

	/**
	 * Overview is intentionally a separate state from reading a card. Keeping an
	 * expanded document while fitting every node makes both the document and the
	 * graph illegible, so return to compact cards before calculating the camera.
	 */
	private async showOverview(): Promise<void> {
		if (this.inlineEdit) await this.finishInlineMarkdownEditor();
		if (this.inlineEdit) return;
		this.clearSelectedEdge();
		this.replaceOpenDetails(new Set());
		// Overview is an explicit graph-wide reset, unlike a background click.
		// It intentionally clears local reading pins as well.
		this.pinnedOpenNodeIds.clear();
		this.viewportBeforeDetails = undefined;
		this.syncCards();
		this.scheduleMeasure();
		this.fitOverview();
	}

	private fitGraph(): void {
		const overviewZoom = this.overviewZoom();
		if (overviewZoom === undefined) return;
		this.zoom = Math.min(GRAPH_ZOOM.max, Math.max(GRAPH_ZOOM.hardMin, overviewZoom));
		this.pan = { x: 0, y: 0 };
		this.updateZoomLabel();
		this.applyTransform();
		this.scheduleGraphViewStateSave();
	}

	/** Computes the camera scale that fits every current card into this pane. */
	private overviewZoom(): number | undefined {
		if (!this.viewport || !this.simNodes.length) return undefined;
		const width = this.viewport.clientWidth;
		const height = this.viewport.clientHeight;
		if (width < 180 || height < 180) return undefined;
		let extentX = 1;
		let extentY = 1;
		for (const node of this.simNodes) {
			const radius = cardRadius(node);
			extentX = Math.max(extentX, Math.abs(node.x ?? 0) + radius);
			extentY = Math.max(extentY, Math.abs(node.y ?? 0) + radius);
		}
		const horizontal = Math.max(120, width / 2 - 48) / extentX;
		const vertical = Math.max(120, height / 2 - 48) / extentY;
		return Math.min(1, horizontal, vertical);
	}

	/**
	 * CSS viewport units refer to the whole Obsidian window. Export the local
	 * graph pane width so an expanded card stays inside a split pane instead of
	 * overflowing into neighbouring views.
	 */
	private updateViewportSize(width: number, height: number): void {
		this.viewport?.style.setProperty("--ct-viewport-width", `${Math.max(0, width)}px`);
		this.viewport?.style.setProperty("--ct-viewport-height", `${Math.max(0, height)}px`);
	}

	private closeDetailsForCanvas(): void {
		if (!this.openDetails.size) return;
		this.replaceOpenDetails(retainPinnedCards(this.openDetails, this.pinnedOpenNodeIds));
		if (!this.openDetails.size) this.restoreViewportBeforeDetails();
		this.syncCards();
		this.scheduleMeasure();
	}

	private bindCanvasControls(viewport: HTMLElement): void {
		viewport.addEventListener("pointerdown", (event) => {
			if (this.disconnectDrag) return;
			const target = event.target;
			if (isCanvasControlTarget(target instanceof Element ? target : null)) return;
			this.cards.closeMenus();
			this.clearSelectedEdge();
			const action = canvasPointerAction({ hasUnpinnedEditor: !!this.inlineEdit && !this.isPinnedCard(this.inlineEdit.nodeId) });
			if (action === "pan-canvas") this.closeDetailsForCanvas();
			// A pinned source editor owns the keyboard until its pencil is pressed.
			// We still allow a background drag to pan the graph, but do not steal its
			// text focus or turn it back into a Reading card.
			if (!this.inlineEdit) viewport.focus();
			this.startCanvasPan(event, action === "pan-or-dismiss-editor-on-click");
		});
		viewport.addEventListener("wheel", (event) => {
			// Obsidian can retain the focused textarea as event.target after the
			// pointer has left the card. Wheel ownership must follow the pointer:
			// Reading and Source scroll inside the hovered card; canvas space zooms.
			const pointerTarget = document.elementFromPoint(event.clientX, event.clientY) ?? event.target;
			const surface = canvasWheelSurface(pointerTarget instanceof Element ? pointerTarget : null);
			const action = canvasWheelAction(surface);
			if (action === "ignore") return;
			if (action === "scroll-card" && surface.cardScroller) {
				event.preventDefault();
				surface.cardScroller.scrollBy({ left: event.deltaX, top: event.deltaY, behavior: "auto" });
				return;
			}
			event.preventDefault();
			const zoomPoint = canvasWheelZoomPoint(
				viewport.getBoundingClientRect(),
				{ x: event.clientX, y: event.clientY },
			);
			this.zoomAt(viewport, zoomPoint.x, zoomPoint.y, this.clampZoom(this.zoom * canvasWheelZoomFactor(event.deltaY, event.deltaMode)));
		}, { passive: false });
		viewport.addEventListener("keydown", (event) => {
			if (event.key === "Escape" && this.openDetails.size) {
				event.preventDefault();
				if (this.inlineEdit) {
					if (this.isPinnedCard(this.inlineEdit.nodeId)) return;
					void this.finishInlineMarkdownEditor().then(() => {
						if (!this.inlineEdit) this.closeDetailsForCanvas();
					});
					return;
				}
				this.closeDetailsForCanvas();
				return;
			}
			if (!event.ctrlKey && !event.metaKey) return;
			if (event.key !== "+" && event.key !== "=" && event.key !== "-") return;
			event.preventDefault();
			const rect = viewport.getBoundingClientRect();
			this.zoomAt(viewport, rect.left + rect.width / 2, rect.top + rect.height / 2, this.clampZoom(this.zoom * (event.key === "-" ? 0.89 : 1.12)));
		});
	}

	/** Restore the map context that existed before a card became a reader view. */
	private restoreViewportBeforeDetails(): void {
		const previous = this.viewportBeforeDetails;
		this.viewportBeforeDetails = undefined;
		if (!previous) return;
		this.pan = previous.pan;
		this.zoom = previous.zoom;
		this.updateZoomLabel();
		this.applyTransform();
	}

	private clampZoom(value: number): number {
		const bounds = graphZoomBounds(this.overviewZoom());
		return Math.min(bounds.max, Math.max(bounds.min, value));
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
		this.scheduleGraphViewStateSave();
	}

	private graphViewState(): GraphViewState {
		return {
			pan: { ...this.pan },
			zoom: this.zoom,
			focusedNodeId: this.focusedNodeId,
			pinnedOpenNodeIds: [...this.pinnedOpenNodeIds],
			positions: Object.fromEntries(this.simNodes.map((node) => [node.id, {
				x: node.x ?? 0,
				y: node.y ?? 0,
				pinned: this.isManuallyPositioned(node),
			}])),
		};
	}

	/** Temporary reader locks must never turn into persisted manual pins. */
	private isManuallyPositioned(node: SimNode): boolean {
		const beforeNeighbourhood = this.neighbourhoodLayoutLocks.get(node.id);
		if (beforeNeighbourhood) return beforeNeighbourhood.fx !== undefined || beforeNeighbourhood.fy !== undefined;
		const beforeOpen = this.openCardPositionLocks.get(node.id);
		if (beforeOpen) return beforeOpen.fx !== undefined || beforeOpen.fy !== undefined;
		return node.fx !== undefined || node.fy !== undefined;
	}

	private scheduleGraphViewStateSave(): void {
		if (!this.simNodes.length) return;
		this.plugin.scheduleGraphViewStateSave(this.getGraphId(), this.graphViewState());
	}

	private async persistGraphViewState(): Promise<void> {
		if (!this.simNodes.length) return;
		await this.plugin.saveGraphViewState(this.getGraphId(), this.graphViewState());
	}

	private updateZoomLabel(): void {
		this.viewport?.querySelector<HTMLElement>(".context-tree-zoom-label")?.setText(`${Math.round(this.zoom * 100)}%`);
	}

	private applyTransform(): void {
		if (!this.scene || !this.viewport) return;
		this.scene.style.transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
		// Card actions remain usable while the graph is zoomed out, without
		// becoming larger than the compact card that owns them.
		const cardControlScale = Math.min(2.4, Math.max(1, 0.72 / this.zoom));
		this.viewport.style.setProperty("--ct-card-control-scale", String(cardControlScale));
		// The graph scene is a transformed viewport-sized element. Keeping the
		// grid inside it exposed that finite rectangle after panning or zooming.
		// A tiled viewport background has no visible edge while still following
		// the graph's origin and scale.
		const gridStep = 18 * this.zoom;
		this.viewport.style.setProperty("--ct-grid-step", `${gridStep}px`);
		this.viewport.style.setProperty("--ct-grid-x", `${this.pan.x}px`);
		this.viewport.style.setProperty("--ct-grid-y", `${this.pan.y}px`);
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
