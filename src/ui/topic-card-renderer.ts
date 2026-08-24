import { App, Component, MarkdownRenderer, setIcon } from "obsidian";
import { cardPointerAction, hasCardDragExceededClickThreshold } from "../domain/card-pointer-action";
import {
	inlineEditorCardHeight,
	retainsInlineEditorFootprint,
} from "../domain/inline-editor-layout";
import { readingCardMaximumHeight, settledReadingCardHeight } from "../domain/reading-card-layout";
import { CardAnchor, cardAnchorAtPoint } from "../graph/simulation";
import { ContextTreeNode } from "../types";
import type { RootedNeighbourhoodState } from "../domain/graph-workspace";
import { COPY, cardToggleLabel } from "./copy";
import { createReadingMarkdownFrame } from "./reading-markdown-frame";

export interface CardConnection {
	label: string;
	target: ContextTreeNode;
}

export interface TopicCardRendererCallbacks {
	onToggle: (nodeId: string, fromKeyboard: boolean) => void;
	onCardDragStart: (event: PointerEvent, node: ContextTreeNode) => void;
	onConnectionStart: (event: PointerEvent, node: ContextTreeNode, anchor: CardAnchor) => void;
	onConnectionCandidate: (nodeId?: string, anchor?: CardAnchor) => void;
	onPin: (node: ContextTreeNode) => void;
	onEdit: (node: ContextTreeNode) => void;
	onOpenSource: (node: ContextTreeNode) => void;
	onToggleNeighbours: (node: ContextTreeNode) => void;
	onRemoveFromGraph: (node: ContextTreeNode) => void;
	neighbourState: (node: ContextTreeNode) => RootedNeighbourhoodState;
	canRemoveFromGraph: (node: ContextTreeNode) => boolean;
	onMoveToTrash: (node: ContextTreeNode) => void;
	onOpenInternalLink: (event: MouseEvent, sourcePath: string) => void;
	onNavigateConnection: (nodeId: string) => void;
	onHover: (nodeId?: string) => void;
	connectionsFor: (node: ContextTreeNode) => CardConnection[];
	onMeasure: () => void;
}

export interface TopicCardState {
	isOpen: boolean;
	isFocused: boolean;
	isEditing: boolean;
	isPinned: boolean;
	isNodeDrag: boolean;
	isDragSource: boolean;
	hoverAnchor?: CardAnchor;
	dragSourceAnchor?: CardAnchor;
	isDragTarget: boolean;
	dragTargetAnchor?: CardAnchor;
	isSearchMatch: boolean;
	isSearchContext: boolean;
	isSearchHidden: boolean;
	isHoverOrigin: boolean;
	isHoverNeighbour: boolean;
	isHoverMuted: boolean;
}

export interface InlineMarkdownEditorCallbacks {
	onInput: (content: string) => void;
	onSelectDraft: () => void;
	onReloadSource: () => void;
	onOpenSource: () => void;
}

/**
 * Renders one Markdown-backed keyword card. Graph placement and Vault writes
 * intentionally remain outside this class so the UI can be reused without
 * inheriting graph physics or persistence concerns.
 */
export class TopicCardRenderer {
	private readonly renderedDetails = new Set<string>();
	private readonly detailReady = new Set<string>();
	private readonly detailRenderings = new Map<string, Promise<void>>();
	private readonly nodeReferences = new WeakMap<HTMLElement, { current: ContextTreeNode }>();
	private activeMenu?: { wrap: HTMLElement; trigger: HTMLButtonElement; menu: HTMLElement };

	constructor(
		private readonly app: App,
		private readonly component: Component,
		private readonly callbacks: TopicCardRendererCallbacks,
	) {
		// This listener is deliberately registered once per view. Registering one
		// document listener per card caused refreshes to retain detached card
		// closures until the entire view closed.
		this.component.registerDomEvent(document, "pointerdown", (event) => {
			const menu = this.activeMenu;
			if (!menu || (event.target instanceof Node && menu.wrap.contains(event.target))) return;
			this.closeActiveMenu();
		});
	}

	create(parent: HTMLElement, node: ContextTreeNode): HTMLElement {
		const element = parent.createDiv({ cls: "context-tree-node" });
		const nodeReference = { current: node };
		this.nodeReferences.set(element, nodeReference);
		element.dataset.nodeId = node.id;
		const card = element.createDiv({ cls: "context-tree-card" });
		const trigger = card.createEl("button", {
			cls: "context-tree-card-trigger",
			attr: { "aria-label": cardToggleLabel(node.title), "aria-expanded": "false" },
		});
		// Use spans, not generic block divs. Some themes give divs inside buttons
		// their own card-like surface, which breaks the visual card boundary.
		trigger.createSpan({ cls: "context-tree-title", text: node.title });
		if (node.summary) trigger.createSpan({ cls: "context-tree-summary", text: node.summary });
		let togglePointer: { pointerId: number; origin: { x: number; y: number }; moved: boolean } | undefined;
		let toggleFromKeyboard = false;
		trigger.addEventListener("pointerdown", (event) => {
			if (event.button !== 0) return;
			togglePointer = {
				pointerId: event.pointerId,
				origin: { x: event.clientX, y: event.clientY },
				moved: false,
			};
		});
		trigger.addEventListener("keydown", (event) => {
			if (event.key === "Enter" || event.key === " ") {
				togglePointer = undefined;
				toggleFromKeyboard = true;
			}
		});
		trigger.addEventListener("click", (event) => {
			const wasDragged = togglePointer?.moved ?? false;
			togglePointer = undefined;
			const fromKeyboard = toggleFromKeyboard;
			toggleFromKeyboard = false;
			if (wasDragged) {
				event.preventDefault();
				event.stopPropagation();
				return;
			}
			this.callbacks.onToggle(nodeReference.current.id, fromKeyboard);
		});
		card.addEventListener("pointerdown", (event) => {
			const target = event.target;
			if (!(target instanceof Element)) return;
			const action = cardPointerAction({
				// A click still toggles the card; movement beyond the view threshold
				// turns the same title/summary surface into a practical drag handle.
				isCardToggleTarget: !!target.closest(".context-tree-card-trigger"),
				isInteractiveTarget: !!target.closest("a, input, textarea, select, [contenteditable=true], .context-tree-markdown-editor-scroll, .context-tree-card-trigger, .context-tree-card-quick-action, .context-tree-card-more, .context-tree-connect-port, .context-tree-connection-jump"),
				// Reading Markdown preserves native selection and scrolling. The card
				// frame remains the explicit graph-drag surface.
				isTextSelectionTarget: !!target.closest(".context-tree-detail"),
			});
			if (action === "move-node") this.callbacks.onCardDragStart(event, nodeReference.current);
		});
		card.addEventListener("pointerenter", () => this.callbacks.onHover(nodeReference.current.id));
		card.addEventListener("pointermove", (event) => {
			if (togglePointer?.pointerId === event.pointerId && !togglePointer.moved) {
				togglePointer.moved = hasCardDragExceededClickThreshold(togglePointer.origin, {
					x: event.clientX,
					y: event.clientY,
				});
			}
			const bounds = card.getBoundingClientRect();
			this.callbacks.onConnectionCandidate(nodeReference.current.id, cardAnchorAtPoint(
				{ width: bounds.width, height: bounds.height },
				{ x: event.clientX - bounds.left, y: event.clientY - bounds.top },
			));
		});
		card.addEventListener("pointerleave", () => {
			this.callbacks.onHover();
			this.callbacks.onConnectionCandidate();
		});
		card.addEventListener("pointercancel", (event) => {
			if (togglePointer?.pointerId === event.pointerId) togglePointer = undefined;
		});

		const quickActions = card.createDiv({ cls: "context-tree-card-quick-actions" });
		this.createIconAction(
			quickActions,
			"network",
			COPY.actions.expandNeighbours,
			"context-tree-card-quick-action context-tree-card-expand",
			() => this.callbacks.onToggleNeighbours(nodeReference.current),
		);
		this.createIconAction(quickActions, "bookmark", COPY.actions.pinCard, "context-tree-card-quick-action context-tree-card-pin", () => {
			this.callbacks.onPin(nodeReference.current);
		});
		const connectionPort = this.createIconAction(
			card,
			"",
			COPY.actions.dragToConnect,
			"context-tree-connect-port",
			(event) => this.callbacks.onConnectionStart(event as PointerEvent, nodeReference.current, this.connectionAnchor(connectionPort)),
			"pointerdown",
		);
		// The port is a pointer gesture. Adding it as a tab stop for every card
		// would turn keyboard reading into a long sequence of decorative controls.
		connectionPort.tabIndex = -1;
		this.createIconAction(quickActions, "pencil", COPY.actions.editCard, "context-tree-card-quick-action context-tree-card-detail-action", () => {
			this.callbacks.onEdit(nodeReference.current);
		});
		// Keep the source action next to the fixed overflow slot so its physical
		// position does not move when Reading reveals pin and edit controls.
		this.createIconAction(
			quickActions,
			"panel-right-open",
			COPY.actions.openSourceBesideGraph,
			"context-tree-card-quick-action context-tree-card-open-source",
			() => this.callbacks.onOpenSource(nodeReference.current),
		);
		this.createMoreMenu(card, () => nodeReference.current);
		return element;
	}

	sync(element: HTMLElement, node: ContextTreeNode, state: TopicCardState): void {
		const card = element.querySelector<HTMLElement>(".context-tree-card");
		if (!card) return;
		const reference = this.nodeReferences.get(element);
		if (reference) reference.current = node;
		// A Vault change can reuse this element during graph refresh. Update the
		// visible heading before measuring it so the card tracks the Markdown title.
		this.updateHeader(card, node);
		this.syncInteraction(element, state);
		element.toggleClass("is-detail-open", state.isOpen);
		card.toggleClass("is-detail-open", state.isOpen);
		card.toggleClass("is-editing", state.isEditing);
		card.toggleClass("is-pinned", state.isPinned);
		const neighbourhood = this.callbacks.neighbourState(node);
		const neighbourAction = neighbourhood.action;
		const neighbourButton = card.querySelector<HTMLButtonElement>(".context-tree-card-expand");
		card.toggleClass("has-expand-action", neighbourAction !== "none");
		neighbourButton?.toggleClass("is-hidden", neighbourAction === "none");
		if (neighbourButton && neighbourAction !== "none") {
			const label = neighbourAction === "collapse"
				? COPY.actions.collapseNeighboursCount(neighbourhood.affectedCount)
				: COPY.actions.expandNeighboursCount(neighbourhood.affectedCount);
			neighbourButton.setAttribute("aria-label", label);
			neighbourButton.setAttribute("title", label);
			neighbourButton.setAttribute("aria-pressed", String(neighbourAction === "collapse"));
		}
		if (!retainsInlineEditorFootprint(state.isOpen, card.hasClass("has-fixed-open-footprint"))) {
			card.style.removeProperty("--ct-open-card-height");
			card.style.removeProperty("--ct-source-card-height");
			card.removeClass("has-fixed-open-footprint");
		}
		const pinButton = card.querySelector<HTMLButtonElement>(".context-tree-card-pin");
		if (pinButton) {
			const label = state.isPinned ? COPY.actions.unpinCard : COPY.actions.pinCard;
			setIcon(pinButton, state.isPinned ? "bookmark-check" : "bookmark");
			pinButton.setAttribute("aria-label", label);
			pinButton.setAttribute("title", label);
			pinButton.setAttribute("aria-pressed", String(state.isPinned));
		}
		const editButton = card.querySelector<HTMLButtonElement>(".context-tree-card-detail-action");
		if (editButton) {
			const label = state.isEditing ? COPY.actions.finishEditing : COPY.actions.editCard;
			editButton.setAttribute("aria-label", label);
			editButton.setAttribute("title", label);
		}
		this.updateCollapsedWidth(card, node.title, state.isOpen);
		card.querySelector(".context-tree-card-trigger")?.setAttribute("aria-expanded", String(state.isOpen));
		if (state.isEditing) return;
		if (state.isOpen) this.ensureDetails(card, node);
		else this.removeDetails(card, node.id);
	}

	/** Updates graph state without remeasuring title or rerendering Markdown. */
	syncInteraction(element: HTMLElement, state: TopicCardState): void {
		const card = element.querySelector<HTMLElement>(".context-tree-card");
		if (!card) return;
		element.toggleClass("is-focused", state.isFocused);
		element.toggleClass("is-node-dragging", state.isNodeDrag);
		element.toggleClass("is-drag-connection-source", state.isDragSource);
		element.toggleClass("is-drag-connection-target", state.isDragTarget);
		element.toggleClass("is-search-match", state.isSearchMatch);
		element.toggleClass("is-search-context", state.isSearchContext);
		element.toggleClass("is-search-hidden", state.isSearchHidden);
		element.toggleClass("is-hover-origin", state.isHoverOrigin);
		element.toggleClass("is-hover-neighbour", state.isHoverNeighbour);
		element.toggleClass("is-hover-muted", state.isHoverMuted);
		this.updateConnectionPort(card, state);
	}

	/** Pointer movement only needs to reposition the local creation port. */
	syncConnectionPort(element: HTMLElement, state: TopicCardState): void {
		const card = element.querySelector<HTMLElement>(".context-tree-card");
		if (card) this.updateConnectionPort(card, state);
	}

	reset(): void {
		this.closeActiveMenu();
		this.renderedDetails.clear();
		this.detailReady.clear();
		this.detailRenderings.clear();
	}

	/** A graph refresh keeps card elements and positions, but replaces stale Markdown. */
	invalidateDetails(): void {
		this.renderedDetails.clear();
		this.detailReady.clear();
		this.detailRenderings.clear();
	}

	/** Wait for Markdown before fixing Source mode to the complete Reading footprint. */
	async waitForStableReadingCardHeight(element: HTMLElement, nodeId: string): Promise<number> {
		await this.detailRenderings.get(nodeId);
		const card = element.querySelector<HTMLElement>(".context-tree-card");
		if (!card) return 0;
		const wrapper = card.querySelector<HTMLElement>(".context-tree-detail-wrap");
		const viewportHeight = card.closest<HTMLElement>(".context-tree-viewport")?.clientHeight ?? 0;
		return settledReadingCardHeight({
			cardHeight: card.getBoundingClientRect().height,
			detailHeight: wrapper?.getBoundingClientRect().height ?? 0,
			detailContentHeight: wrapper?.scrollHeight ?? 0,
			isDetailReady: this.detailReady.has(nodeId),
			maximumHeight: readingCardMaximumHeight(viewportHeight),
		}) ?? card.getBoundingClientRect().height;
	}

	/** The canvas and card navigation use this to keep overflow menus transient. */
	closeMenus(): void {
		this.closeActiveMenu();
	}

	startInlineMarkdownEditing(
		element: HTMLElement,
		source: string,
		readingCardHeight: number,
		callbacks: InlineMarkdownEditorCallbacks,
	): void {
		const card = element.querySelector<HTMLElement>(".context-tree-card");
		if (!card) return;
		// Source mode keeps the expanded Reading card's graph footprint. The
		// Markdown scrolls inside that footprint instead of moving other cards.
		// `readingCardHeight` is captured before `is-editing` replaces the Reading
		// layout, so CSS mode changes cannot shrink the value we preserve.
		const editorHeight = inlineEditorCardHeight(readingCardHeight, source);
		card.style.setProperty("--ct-source-card-height", `${editorHeight}px`);
		card.style.setProperty("--ct-open-card-height", `${editorHeight}px`);
		card.addClass("has-fixed-open-footprint");
		const wrapper = card.querySelector<HTMLElement>(".context-tree-detail-wrap") ?? card.createDiv({ cls: "context-tree-detail-wrap" });
		wrapper.empty();
		wrapper.addClass("is-editing");
		wrapper.createDiv({ cls: "context-tree-editor-toolbar-spacer" });
		const scroller = wrapper.createDiv({ cls: "context-tree-markdown-editor-scroll" });
		const editor = scroller.createEl("textarea", {
			cls: "context-tree-markdown-editor",
			attr: {
				"aria-label": COPY.labels.inlineMarkdownEditor,
				spellcheck: "false",
			},
		});
		editor.value = source;
		this.resizeInlineMarkdownEditor(editor);
		editor.addEventListener("input", () => {
			this.resizeInlineMarkdownEditor(editor);
			callbacks.onInput(editor.value);
		});
		window.setTimeout(() => {
			if (!editor.isConnected) return;
			editor.focus();
			editor.setSelectionRange(0, 0);
			scroller.scrollTo({ left: 0, top: 0, behavior: "auto" });
		}, 0);
	}

	showInlineMarkdownConflict(element: HTMLElement, callbacks: Omit<InlineMarkdownEditorCallbacks, "onInput">): void {
		const wrapper = element.querySelector<HTMLElement>(".context-tree-detail-wrap.is-editing");
		if (!wrapper || wrapper.querySelector(".context-tree-edit-conflict")) return;
		const conflict = wrapper.createDiv({ cls: "context-tree-edit-conflict", attr: { role: "alert" } });
		conflict.createSpan({ text: COPY.notice.inlineSaveConflict });
		const actions = conflict.createDiv({ cls: "context-tree-edit-conflict-actions" });
		const select = actions.createEl("button", { text: COPY.actions.selectDraft });
		select.addEventListener("click", (event) => {
			event.stopPropagation();
			callbacks.onSelectDraft();
		});
		const open = actions.createEl("button", { text: COPY.actions.openSource });
		open.addEventListener("click", (event) => {
			event.stopPropagation();
			callbacks.onOpenSource();
		});
		const reload = actions.createEl("button", { text: COPY.actions.reloadSource });
		reload.addEventListener("click", (event) => {
			event.stopPropagation();
			callbacks.onReloadSource();
		});
	}

	/** Replaces only the card interior; its graph node and outer DOM stay put. */
	finishInlineMarkdownEditing(element: HTMLElement, nodeId: string): void {
		const card = element.querySelector<HTMLElement>(".context-tree-card");
		if (!card) return;
		card.querySelector(".context-tree-detail-wrap")?.remove();
		this.renderedDetails.delete(nodeId);
		this.detailReady.delete(nodeId);
		this.detailRenderings.delete(nodeId);
	}

	replaceInlineMarkdownSource(element: HTMLElement, source: string): void {
		const editor = element.querySelector<HTMLTextAreaElement>(".context-tree-markdown-editor");
		const scroller = element.querySelector<HTMLElement>(".context-tree-markdown-editor-scroll");
		if (!editor) return;
		editor.value = source;
		this.resizeInlineMarkdownEditor(editor);
		scroller?.scrollTo({ left: 0, top: 0, behavior: "auto" });
		element.querySelector(".context-tree-edit-conflict")?.remove();
		editor.focus();
	}

	private resizeInlineMarkdownEditor(editor: HTMLTextAreaElement): void {
		editor.setCssProps({ height: "0px" });
		const viewportHeight = editor.parentElement?.clientHeight ?? 0;
		editor.setCssProps({ height: `${Math.max(editor.scrollHeight, viewportHeight)}px` });
	}

	updateHeader(card: HTMLElement, node: ContextTreeNode): void {
		const trigger = card.querySelector<HTMLElement>(".context-tree-card-trigger");
		const title = card.querySelector<HTMLElement>(".context-tree-title");
		title?.setText(node.title);
		trigger?.setAttribute("aria-label", cardToggleLabel(node.title));
		const summary = card.querySelector<HTMLElement>(".context-tree-summary");
		if (node.summary) {
			if (summary) summary.setText(node.summary);
			else trigger?.createSpan({ cls: "context-tree-summary", text: node.summary });
		} else summary?.remove();
	}

	private updateCollapsedWidth(card: HTMLElement, titleText: string, isOpen: boolean): void {
		if (isOpen) {
			card.style.removeProperty("--ct-card-width");
			card.removeClass("has-wrapped-title");
			return;
		}
		const title = card.querySelector<HTMLElement>(".context-tree-title");
		if (!title) return;
		card.removeClass("has-wrapped-title");
		// Reserve title space for the always-available source action and overflow
		// menu, plus the optional neighbouring-notes action.
		const quickActionSpace = card.hasClass("has-expand-action") ? 104 : 74;
		const desired = Math.max(276, this.measureTitleWidth(title, titleText) + 32 + quickActionSpace);
		const viewportWidth = card.closest<HTMLElement>(".context-tree-viewport")?.clientWidth ?? 500;
		const maximum = Math.min(500, Math.max(160, viewportWidth - 32));
		const width = Math.min(maximum, desired);
		card.style.setProperty("--ct-card-width", `${width}px`);
		const mustWrap = desired > maximum;
		card.toggleClass("has-wrapped-title", mustWrap);
	}

	private updateConnectionPort(card: HTMLElement, state: TopicCardState): void {
		const port = card.querySelector<HTMLElement>(".context-tree-connect-port");
		if (!port) return;
		if (state.isEditing) {
			port.removeClass("is-visible");
			port.removeClass("is-drag-source-port");
			port.removeClass("is-drag-target-port");
			return;
		}
		const anchor = state.isDragSource ? state.dragSourceAnchor
			: state.isDragTarget ? state.dragTargetAnchor
			: state.hoverAnchor;
		port.toggleClass("is-visible", !!anchor);
		port.toggleClass("is-drag-source-port", !!state.isDragSource);
		port.toggleClass("is-drag-target-port", !!state.isDragTarget);
		if (!anchor) return;
		port.dataset.anchorX = String(anchor.x);
		port.dataset.anchorY = String(anchor.y);
		port.style.setProperty("--ct-port-x", `${anchor.x * 100}%`);
		port.style.setProperty("--ct-port-y", `${anchor.y * 100}%`);
	}

	private connectionAnchor(port: HTMLElement): CardAnchor {
		return {
			x: Number(port.dataset.anchorX ?? 0.5),
			y: Number(port.dataset.anchorY ?? 0),
		};
	}

	/**
	 * scrollWidth reports the current block width, so an expanded card can make
	 * a short title look wide after it closes. Canvas measurement reflects only
	 * the rendered title text and keeps the collapsed baseline stable.
	 */
	private measureTitleWidth(title: HTMLElement, text: string): number {
		const canvas = title.createEl("canvas", { attr: { hidden: "true" } });
		const context = canvas.getContext("2d");
		canvas.remove();
		if (!context) return title.scrollWidth;
		const style = getComputedStyle(title);
		context.font = `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
		return Math.ceil(context.measureText(text).width);
	}

	private ensureDetails(card: HTMLElement, node: ContextTreeNode): void {
		if (this.renderedDetails.has(node.id)) return;
		this.renderedDetails.add(node.id);
		card.querySelector(".context-tree-detail-wrap")?.remove();
		const wrapper = card.createDiv({ cls: "context-tree-detail-wrap" });
		const detail = wrapper.createDiv({ cls: "context-tree-detail" });
		const renderTarget = createReadingMarkdownFrame(detail);
		const rendering = MarkdownRenderer.render(this.app, node.body, renderTarget, node.path, this.component)
			.then(() => {
				if (!wrapper.isConnected || wrapper.hasClass("is-editing")) return;
				detail.addEventListener("click", (event) => this.callbacks.onOpenInternalLink(event, node.path));
				this.renderConnections(wrapper, node);
				// CSS cannot animate to an intrinsic height. Store the measured
				// Markdown height so long notes never disappear behind an arbitrary
				// expansion ceiling.
				wrapper.style.setProperty("--ct-detail-height", `${wrapper.scrollHeight}px`);
				this.callbacks.onMeasure();
			})
			.catch((error: unknown) => {
				console.error("Linked Canvas: failed to render card Markdown", error);
				detail.setText(COPY.notice.renderFailed);
				this.callbacks.onMeasure();
			});
		this.detailRenderings.set(node.id, rendering);
		void rendering.then(() => {
			if (this.detailRenderings.get(node.id) !== rendering) return;
			this.detailRenderings.delete(node.id);
			this.detailReady.add(node.id);
		});
	}

	private renderConnections(wrapper: HTMLElement, node: ContextTreeNode): void {
		const connections = this.callbacks.connectionsFor(node);
		if (!connections.length) return;
		const list = wrapper.createDiv({ cls: "context-tree-connections" });
		for (const connection of connections) {
			const item = list.createDiv({ cls: "context-tree-connection" });
			const connectionText = `${connection.label} · ${connection.target.title}`;
			const jump = item.createEl("button", {
				cls: "context-tree-connection-jump",
				text: connectionText,
				attr: { "aria-label": `${connection.label} · ${connection.target.title}` },
			});
			jump.addEventListener("click", () => this.callbacks.onNavigateConnection(connection.target.id));
		}
	}

	private removeDetails(card: HTMLElement, nodeId: string): void {
		card.querySelector(".context-tree-detail-wrap")?.remove();
		this.renderedDetails.delete(nodeId);
		this.detailReady.delete(nodeId);
		this.detailRenderings.delete(nodeId);
	}

	private createMoreMenu(parent: HTMLElement, currentNode: () => ContextTreeNode): void {
		const menuWrap = parent.createDiv({ cls: "context-tree-card-more" });
		const trigger = menuWrap.createEl("button", {
			cls: "context-tree-card-quick-action",
			attr: { "aria-label": COPY.actions.more, title: COPY.actions.more, "aria-expanded": "false" },
		});
		// The vertical overflow glyph is the conventional compact-menu signifier.
		// A horizontal ellipsis can read as ordinary text inside a dense card.
		setIcon(trigger, "ellipsis-vertical");
		const menu = menuWrap.createDiv({
			cls: "context-tree-card-menu",
			attr: { role: "group", "aria-label": COPY.actions.more, hidden: "true", "aria-hidden": "true" },
		});
		const removeItem = this.callbacks.canRemoveFromGraph(currentNode())
			? menu.createEl("button", {
				cls: "context-tree-card-menu-item",
				text: COPY.actions.removeFromGraph,
			})
			: undefined;
		const deleteItem = menu.createEl("button", {
			cls: "context-tree-card-menu-item is-destructive",
			text: COPY.actions.moveToTrash,
		});
		menuWrap.addEventListener("keydown", (event) => {
			if (event.key !== "Escape" || this.activeMenu?.wrap !== menuWrap) return;
			event.preventDefault();
			event.stopPropagation();
			this.closeActiveMenu();
		});
		trigger.addEventListener("click", (event) => {
			event.stopPropagation();
			if (this.activeMenu?.wrap === menuWrap) this.closeActiveMenu();
			else this.openMenu(menuWrap, trigger, menu);
		});
		removeItem?.addEventListener("click", (event) => {
			event.stopPropagation();
			this.closeActiveMenu();
			this.callbacks.onRemoveFromGraph(currentNode());
		});
		deleteItem.addEventListener("click", (event) => {
			event.stopPropagation();
			this.closeActiveMenu();
			this.callbacks.onMoveToTrash(currentNode());
		});
	}

	private openMenu(wrap: HTMLElement, trigger: HTMLButtonElement, menu: HTMLElement): void {
		this.closeActiveMenu();
		this.activeMenu = { wrap, trigger, menu };
		wrap.addClass("is-open");
		trigger.setAttribute("aria-expanded", "true");
		menu.hidden = false;
		menu.setAttribute("aria-hidden", "false");
	}

	private closeActiveMenu(): void {
		const active = this.activeMenu;
		if (!active) return;
		// Move focus out before hiding the menu. Otherwise browsers reject
		// aria-hidden while a focused menu item remains inside that subtree.
		active.trigger.focus({ preventScroll: true });
		active.wrap.removeClass("is-open");
		active.trigger.setAttribute("aria-expanded", "false");
		active.menu.hidden = true;
		active.menu.setAttribute("aria-hidden", "true");
		this.activeMenu = undefined;
	}

	private createIconAction(
		parent: HTMLElement,
		icon: string,
		label: string,
		className: string,
		callback: (event: Event) => void,
		eventName: "click" | "pointerdown" = "click",
	): HTMLButtonElement {
		const button = parent.createEl("button", { cls: className, attr: { "aria-label": label, title: label } });
		if (icon) setIcon(button, icon);
		button.addEventListener(eventName, (event) => {
			event.stopPropagation();
			callback(event);
		});
		return button;
	}
}
