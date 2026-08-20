import { App, Component, MarkdownRenderer, setIcon } from "obsidian";
import { cardPointerAction } from "../domain/card-pointer-action";
import { inlineEditorCardHeight } from "../domain/inline-editor-layout";
import { settledReadingCardHeight } from "../domain/reading-card-layout";
import { CardAnchor, cardAnchorAtPoint } from "../graph/simulation";
import { ContextTreeNode } from "../types";
import { COPY, cardToggleLabel } from "./copy";

export interface CardConnection {
	label: string;
	target: ContextTreeNode;
}

export interface TopicCardRendererCallbacks {
	onToggle: (nodeId: string) => void;
	onOpen: (nodeId: string) => void;
	onCardDragStart: (event: PointerEvent, node: ContextTreeNode) => void;
	onConnectionStart: (event: PointerEvent, node: ContextTreeNode, anchor: CardAnchor) => void;
	onConnectionCandidate: (nodeId?: string, anchor?: CardAnchor) => void;
	onPin: (node: ContextTreeNode) => void;
	onEdit: (node: ContextTreeNode) => void;
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
	onCopyDraft: () => void;
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
		trigger.addEventListener("click", () => this.callbacks.onToggle(node.id));
		// Two click events precede `dblclick`. Make the final gesture idempotently
		// open the card so a double click cannot leave it closed after toggling twice.
		trigger.addEventListener("dblclick", (event) => {
			event.preventDefault();
			event.stopPropagation();
			this.callbacks.onOpen(node.id);
		});
		card.addEventListener("pointerdown", (event) => {
			const target = event.target;
			if (!(target instanceof Element)) return;
			const action = cardPointerAction({
				isEditing: card.hasClass("is-editing"),
				// The title/summary owns the primary click that opens a card. Do not
				// capture it as a graph drag gesture: pointer capture can cause
				// browsers to cancel the button click after the gesture target changes.
				// The surrounding card surface stays draggable in both Reading states.
				isInteractiveTarget: !!target.closest("a, input, textarea, select, [contenteditable=true], .context-tree-card-trigger, .context-tree-card-quick-action, .context-tree-card-more, .context-tree-connect-port, .context-tree-connection-jump"),
				// Reading Markdown preserves native selection and scrolling. The card
				// frame remains the explicit graph-drag surface.
				isTextSelectionTarget: !!target.closest(".context-tree-detail"),
			});
			if (action === "move-node") this.callbacks.onCardDragStart(event, node);
		});
		card.addEventListener("pointerenter", () => this.callbacks.onHover(node.id));
		card.addEventListener("pointermove", (event) => {
			const bounds = card.getBoundingClientRect();
			this.callbacks.onConnectionCandidate(node.id, cardAnchorAtPoint(
				{ width: bounds.width, height: bounds.height },
				{ x: event.clientX - bounds.left, y: event.clientY - bounds.top },
			));
		});
		card.addEventListener("pointerleave", () => {
			this.callbacks.onHover();
			this.callbacks.onConnectionCandidate();
		});

		const quickActions = card.createDiv({ cls: "context-tree-card-quick-actions" });
		this.createIconAction(quickActions, "pin", COPY.actions.pinCard, "context-tree-card-quick-action context-tree-card-pin", () => {
			this.callbacks.onPin(node);
		});
		const connectionPort = this.createIconAction(
			card,
			"",
			COPY.actions.dragToConnect,
			"context-tree-connect-port",
			(event) => this.callbacks.onConnectionStart(event as PointerEvent, node, this.connectionAnchor(connectionPort)),
			"pointerdown",
		);
		// The port is a pointer gesture. Adding it as a tab stop for every card
		// would turn keyboard reading into a long sequence of decorative controls.
		connectionPort.tabIndex = -1;
		this.createIconAction(quickActions, "pencil", COPY.actions.editCard, "context-tree-card-quick-action context-tree-card-detail-action", () => {
			this.callbacks.onEdit(node);
		});
		this.createMoreMenu(card, node);
		return element;
	}

	sync(element: HTMLElement, node: ContextTreeNode, state: TopicCardState): void {
		const card = element.querySelector<HTMLElement>(".context-tree-card");
		if (!card) return;
		// A Vault change can reuse this element during graph refresh. Update the
		// visible heading before measuring it so the card tracks the Markdown title.
		this.updateHeader(card, node);
		this.syncInteraction(element, state);
		card.toggleClass("is-detail-open", state.isOpen);
		card.toggleClass("is-editing", state.isEditing);
		card.toggleClass("is-pinned", state.isPinned);
		if (!state.isOpen) {
			card.style.removeProperty("--ct-open-card-height");
			card.style.removeProperty("--ct-source-card-height");
		}
		const pinButton = card.querySelector<HTMLButtonElement>(".context-tree-card-pin");
		if (pinButton) {
			const label = state.isPinned ? COPY.actions.unpinCard : COPY.actions.pinCard;
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
		return settledReadingCardHeight({
			cardHeight: card.getBoundingClientRect().height,
			detailHeight: wrapper?.getBoundingClientRect().height ?? 0,
			detailContentHeight: wrapper?.scrollHeight ?? 0,
			isDetailReady: this.detailReady.has(nodeId),
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
		const copy = actions.createEl("button", { text: COPY.actions.copyDraft });
		copy.addEventListener("click", (event) => {
			event.stopPropagation();
			callbacks.onCopyDraft();
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
		const quickActionSpace = 44;
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
		const detail = wrapper.createDiv({ cls: "context-tree-detail markdown-rendered" });
		const rendering = MarkdownRenderer.render(this.app, node.body, detail, node.path, this.component)
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
				console.error("Context Graph: failed to render card Markdown", error);
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
			const connectionText = connection.label === "연결"
				? connection.target.title
				: `${connection.label} · ${connection.target.title}`;
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

	private createMoreMenu(parent: HTMLElement, node: ContextTreeNode): void {
		const menuWrap = parent.createDiv({ cls: "context-tree-card-more" });
		const trigger = menuWrap.createEl("button", {
			cls: "context-tree-card-quick-action",
			attr: { "aria-label": COPY.actions.more, title: COPY.actions.more, "aria-haspopup": "menu", "aria-expanded": "false" },
		});
		// The vertical overflow glyph is the conventional compact-menu signifier.
		// A horizontal ellipsis can read as ordinary text inside a dense card.
		setIcon(trigger, "ellipsis-vertical");
		const menu = menuWrap.createDiv({
			cls: "context-tree-card-menu",
			attr: { role: "menu", hidden: "true", "aria-hidden": "true" },
		});
		const deleteItem = menu.createEl("button", {
			cls: "context-tree-card-menu-item is-destructive",
			text: COPY.actions.moveToTrash,
			attr: { role: "menuitem" },
		});
		trigger.addEventListener("click", (event) => {
			event.stopPropagation();
			if (this.activeMenu?.wrap === menuWrap) this.closeActiveMenu();
			else this.openMenu(menuWrap, trigger, menu);
		});
		deleteItem.addEventListener("click", (event) => {
			event.stopPropagation();
			this.closeActiveMenu();
			this.callbacks.onMoveToTrash(node);
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
