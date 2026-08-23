import { Notice, Plugin, TAbstractFile, TFile, WorkspaceLeaf } from "obsidian";
import { GRAPH_DEFINITION_EXTENSION } from "./domain/graph-definition";
import {
	collapsePathInScope,
	createCurrentNoteGraph,
	createGraphWorkspace,
	currentNoteGraphId,
	currentNoteGraphPath,
	excludePathFromScope,
	GraphScope,
	GraphScopeInput,
	GraphViewState,
	GraphWorkspace,
	graphScopeIncludesPath,
	includePathInScope,
	migrateGraphViewStates,
	migrateGraphWorkspaces,
	renamePathInScope,
	renamePathInViewState,
} from "./domain/graph-workspace";
import { GraphPhysics } from "./graph/simulation";
import { GraphDefinitionStore } from "./graph-definition-store";
import { ContextTreeSettingTab, ContextTreeSettings, DEFAULT_SETTINGS } from "./settings";
import { SavedGraphsModal } from "./topic-modals";
import { COPY } from "./ui/copy";
import { ContextTreeView, VIEW_TYPE_CONTEXT_TREE } from "./view";
import type { InlineEditorDraft } from "./domain/inline-editor-draft";
import { migrateInlineDrafts, persistedSettings } from "./domain/settings-storage";

export default class ContextTreePlugin extends Plugin {
	settings!: ContextTreeSettings;
	private refreshTimer?: number;
	private viewStateTimer?: number;
	private definitionRefreshTimer?: number;
	private physicsSaveTimer?: number;
	private draftSaveTimer?: number;
	private readonly pendingPhysicsGraphIds = new Set<string>();
	private settingsSaveQueue: Promise<void> = Promise.resolve();
	private definitionStore!: GraphDefinitionStore;
	private readonly transientGraphs = new Map<string, GraphWorkspace>();

	async onload(): Promise<void> {
		this.definitionStore = new GraphDefinitionStore(this.app);
		await this.loadSettings();

		this.registerView(
			VIEW_TYPE_CONTEXT_TREE,
			(leaf) => new ContextTreeView(leaf, this),
		);
		this.registerExtensions([GRAPH_DEFINITION_EXTENSION], VIEW_TYPE_CONTEXT_TREE);
		// The file index may still be warming during plugin onload. Deferring
		// migration until the workspace is ready avoids racing a real definition
		// file and then failing with "File already exists".
		this.app.workspace.onLayoutReady(() => {
			void this.initialiseGraphDefinitions().catch((error: unknown) => {
				console.error("Context Graph: failed to initialise graph definitions", error);
			});
		});

		this.addCommand({
			id: "open-tree",
			name: COPY.view.openCommand,
			callback: () => void this.activateCurrentNote(),
		});
		this.addCommand({
			id: "manage-graphs",
			name: COPY.view.manageCommand,
			callback: () => this.openGraphPicker(),
		});
		this.registerEvent(this.app.workspace.on("file-menu", (menu, file) => {
			if (!(file instanceof TFile) || file.extension !== "md") return;
			menu.addItem((item) => item
				.setTitle(COPY.view.openCommand)
				.setIcon("share-2")
				.onClick(() => void this.activateNote(file)));
		}));

		this.registerEvent(this.app.vault.on("create", (file) => this.handleVaultChange(file)));
		this.registerEvent(this.app.vault.on("modify", (file) => this.handleVaultChange(file)));
		this.registerEvent(this.app.vault.on("delete", (file) => this.handleVaultChange(file)));
		this.registerEvent(this.app.vault.on("rename", (file, oldPath) => this.handleVaultChange(file, oldPath)));

		this.addCommand({
			id: "refresh-tree",
			name: COPY.view.refreshCommand,
			callback: () => this.refreshOpenViews(),
		});

		this.addSettingTab(new ContextTreeSettingTab(this.app, this));
	}

	async loadSettings(): Promise<void> {
		const stored = (await this.loadData()) as (Partial<ContextTreeSettings> & {
			sourceFolder?: string;
			graphPhysics?: GraphPhysics;
		}) | null;
		const graphs = stored && stored.definitionsMigrated !== true
			? migrateGraphWorkspaces(stored.graphs, stored.sourceFolder, stored.graphPhysics)
			: [];
		this.settings = {
			...DEFAULT_SETTINGS,
			graphs,
			defaultGraphId: graphs.some((graph) => graph.id === stored?.defaultGraphId)
				? stored!.defaultGraphId!
				: graphs[0]?.id ?? "",
			viewStates: migrateGraphViewStates(
				stored?.viewStates,
				stored?.definitionsMigrated === true
					? Object.keys(stored.viewStates ?? {})
					: graphs.map((graph) => graph.id),
			),
			inlineDrafts: migrateInlineDrafts(stored?.inlineDrafts),
			definitionsMigrated: stored?.definitionsMigrated === true,
		};
	}

	defaultGraph(): GraphWorkspace | undefined {
		return this.getGraph(this.settings.defaultGraphId) ?? this.settings.graphs[0];
	}

	/** Exact lookup only. Falling back here would let a stale file/tab mutate the
	 * default graph while still claiming to represent the missing graph id. */
	getGraph(id: string | undefined): GraphWorkspace | undefined {
		const graphId = id ?? "";
		const existing = this.transientGraphs.get(graphId) ?? this.settings.graphs.find((graph) => graph.id === graphId);
		if (existing) return existing;
		const path = currentNoteGraphPath(graphId);
		if (!path) return undefined;
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile) || file.extension !== "md") return undefined;
		const transient = createCurrentNoteGraph(path, file.basename, COPY.labels.currentNoteGraphName(file.basename));
		this.transientGraphs.set(transient.id, transient);
		return transient;
	}

	isTransientGraph(id: string): boolean {
		return this.transientGraphs.has(id);
	}

	releaseTransientGraph(graphId: string): void {
		if (!this.transientGraphs.has(graphId)) return;
		window.setTimeout(() => {
			const stillOpen = this.app.workspace.getLeavesOfType(VIEW_TYPE_CONTEXT_TREE).some((leaf) =>
				leaf.view instanceof ContextTreeView && leaf.view.getGraphId() === graphId,
			);
			if (!stillOpen) this.transientGraphs.delete(graphId);
		}, 0);
	}

	async activateCurrentNote(): Promise<void> {
		const file = this.app.workspace.getActiveFile();
		if (!(file instanceof TFile) || file.extension !== "md") {
			new Notice(COPY.notice.openMarkdownFirst);
			return;
		}
		await this.activateNote(file);
	}

	private async activateNote(file: TFile): Promise<void> {
		const existing = [...this.transientGraphs.entries()].find(([, graph]) =>
			graph.scope.kind === "rooted" && graph.scope.rootPath === file.path,
		);
		const id = existing?.[0] ?? currentNoteGraphId(file.path);
		if (!this.transientGraphs.has(id)) {
			this.transientGraphs.set(id, createCurrentNoteGraph(
				file.path,
				file.basename,
				COPY.labels.currentNoteGraphName(file.basename),
			));
		}
		await this.activateView(id);
	}

	async createGraph(
		name: string,
		scope: GraphScopeInput = { kind: "curated" },
		initialViewState?: GraphViewState,
	): Promise<GraphWorkspace> {
		const graph = createGraphWorkspace(name, this.settings.graphs.map((item) => item.id), scope);
		await this.writeGraphDefinition(graph);
		this.settings.graphs.push(graph);
		if (initialViewState) this.settings.viewStates[graph.id] = initialViewState;
		if (!this.settings.defaultGraphId) this.settings.defaultGraphId = graph.id;
		await this.persistSettings();
		this.refreshOpenViews();
		return graph;
	}

	/** Opens the saved graph list; creating a graph starts from the current note. */
	openGraphPicker(): void {
		new SavedGraphsModal(
			this.app,
			this.settings.graphs,
			this.settings.defaultGraphId,
			(graphId) => void this.activateView(graphId),
		).open();
	}

	async includePathInGraph(graphId: string, path: string): Promise<void> {
		const graph = this.getGraph(graphId);
		if (!graph || graphScopeIncludesPath(graph.scope, path)) return;
		await this.updateGraphScope(graphId, graph, includePathInScope(graph.scope, path));
	}

	async collapsePathInGraph(graphId: string, path: string): Promise<void> {
		const graph = this.getGraph(graphId);
		if (!graph || graph.scope.kind !== "rooted" || !graph.scope.expandedPaths.includes(path)) return;
		await this.updateGraphScope(graphId, graph, collapsePathInScope(graph.scope, path));
	}

	async removePathFromGraph(graphId: string, path: string): Promise<void> {
		const graph = this.getGraph(graphId);
		if (!graph || (graph.scope.kind === "rooted" && graph.scope.rootPath === path)) return;
		await this.updateGraphScope(graphId, graph, excludePathFromScope(graph.scope, path));
	}

	/** Persists one graph-scope transition atomically and restores it on failure. */
	private async updateGraphScope(graphId: string, graph: GraphWorkspace, nextScope: GraphScope): Promise<void> {
		if (nextScope === graph.scope) return;
		const previousScope = graph.scope;
		graph.scope = nextScope;
		if (!this.isTransientGraph(graphId)) {
			try {
				await this.writeGraphDefinition(graph);
			} catch (error) {
				graph.scope = previousScope;
				throw error;
			}
			await this.persistSettings();
		}
		this.refreshOpenViews();
	}

	async saveTransientGraph(
		graphId: string,
		name: string,
		viewState: GraphViewState,
	): Promise<GraphWorkspace> {
		const transient = this.transientGraphs.get(graphId);
		if (!transient) throw new Error("Only a current-note graph can be saved here.");
		return this.createGraph(name, transient.scope, viewState);
	}

	inlineDraft(path: string): InlineEditorDraft | undefined {
		return this.settings.inlineDrafts[path];
	}

	stageInlineDraft(path: string, draft: InlineEditorDraft): void {
		this.settings.inlineDrafts[path] = draft;
		if (this.draftSaveTimer !== undefined) window.clearTimeout(this.draftSaveTimer);
		this.draftSaveTimer = window.setTimeout(() => {
			this.draftSaveTimer = undefined;
			void this.persistSettings().catch((error: unknown) => {
				console.error("Context Graph: failed to persist inline draft", error);
			});
		}, 600);
	}

	async saveInlineDraft(path: string, draft: InlineEditorDraft): Promise<void> {
		this.settings.inlineDrafts[path] = draft;
		if (this.draftSaveTimer !== undefined) {
			window.clearTimeout(this.draftSaveTimer);
			this.draftSaveTimer = undefined;
		}
		await this.persistSettings();
	}

	async clearInlineDraft(path: string): Promise<void> {
		if (!(path in this.settings.inlineDrafts)) return;
		delete this.settings.inlineDrafts[path];
		if (this.draftSaveTimer !== undefined) {
			window.clearTimeout(this.draftSaveTimer);
			this.draftSaveTimer = undefined;
		}
		await this.persistSettings();
	}

	graphViewState(graphId: string): GraphViewState | undefined {
		return this.settings.viewStates[graphId];
	}

	scheduleGraphViewStateSave(graphId: string, state: GraphViewState): void {
		if (this.isTransientGraph(graphId)) return;
		this.settings.viewStates[graphId] = state;
		if (this.viewStateTimer !== undefined) window.clearTimeout(this.viewStateTimer);
		this.viewStateTimer = window.setTimeout(() => {
			this.viewStateTimer = undefined;
			void this.persistSettings().catch((error: unknown) => console.error("Context Graph: failed to save view state", error));
		}, 420);
	}

	async saveGraphViewState(graphId: string, state: GraphViewState): Promise<void> {
		if (this.isTransientGraph(graphId)) return;
		this.settings.viewStates[graphId] = state;
		if (this.viewStateTimer !== undefined) {
			window.clearTimeout(this.viewStateTimer);
			this.viewStateTimer = undefined;
		}
		await this.persistSettings();
	}

	/** Coalesce slider input into one write for the graph being adjusted. */
	scheduleGraphPhysicsSave(graphId: string): void {
		this.pendingPhysicsGraphIds.add(graphId);
		if (this.physicsSaveTimer !== undefined) window.clearTimeout(this.physicsSaveTimer);
		this.physicsSaveTimer = window.setTimeout(() => {
			this.physicsSaveTimer = undefined;
			void this.flushGraphPhysicsSaves().catch((error: unknown) => {
				console.error("Context Graph: failed to save graph physics", error);
				this.scheduleDefinitionRefresh();
			});
		}, 240);
	}

	private async flushGraphPhysicsSaves(): Promise<void> {
		const graphIds = [...this.pendingPhysicsGraphIds];
		this.pendingPhysicsGraphIds.clear();
		const graphs = graphIds
			.map((graphId) => this.getGraph(graphId))
			.filter((graph): graph is GraphWorkspace => graph !== undefined);
		if (!graphs.length) return;
		await Promise.all(graphs.map((graph) => this.writeGraphDefinition(graph)));
		await this.persistSettings();
		this.refreshOpenViews();
	}

	private persistSettings(): Promise<void> {
		const save = this.settingsSaveQueue.then(() => this.saveData(persistedSettings(this.settings)));
		this.settingsSaveQueue = save.catch((error: unknown) => {
			console.error("Context Graph: failed to persist plugin settings", error);
		});
		return save;
	}

	onunload(): void {
		if (this.refreshTimer !== undefined) window.clearTimeout(this.refreshTimer);
		if (this.viewStateTimer !== undefined) {
			window.clearTimeout(this.viewStateTimer);
			void this.persistSettings();
		}
		if (this.definitionRefreshTimer !== undefined) window.clearTimeout(this.definitionRefreshTimer);
		if (this.physicsSaveTimer !== undefined) window.clearTimeout(this.physicsSaveTimer);
		if (this.draftSaveTimer !== undefined) {
			window.clearTimeout(this.draftSaveTimer);
			this.draftSaveTimer = undefined;
			void this.persistSettings();
		}
		if (this.pendingPhysicsGraphIds.size) {
			void this.flushGraphPhysicsSaves().catch((error: unknown) => {
				console.error("Context Graph: failed to flush graph physics", error);
			});
		}
	}

	/** Returns the Vault file backing a graph, when this graph has been migrated. */
	graphDefinitionFile(graphId: string): TFile | undefined {
		return this.definitionStore.file(graphId);
	}

	/** FileView calls this after a user opens a `.context-graph` file in Explorer. */
	async graphForDefinitionFile(file: TFile): Promise<GraphWorkspace | undefined> {
		const graph = await this.definitionStore.readFile(file);
		if (!graph) return undefined;
		const index = this.settings.graphs.findIndex((item) => item.id === graph.id);
		if (index >= 0) this.settings.graphs[index] = graph;
		else this.settings.graphs.push(graph);
		return graph;
	}

	private scheduleGraphRefresh(file?: TAbstractFile, previousPath?: string): void {
		if (!this.app.workspace.getLeavesOfType(VIEW_TYPE_CONTEXT_TREE).length) return;
		if (file && !this.isEligiblePath(file.path) && !this.isEligiblePath(previousPath ?? "")) return;
		if (this.refreshTimer !== undefined) window.clearTimeout(this.refreshTimer);
		this.refreshTimer = window.setTimeout(() => {
			this.refreshTimer = undefined;
			this.refreshOpenViews();
		}, 360);
	}

	private handleVaultChange(file?: TAbstractFile, previousPath?: string): void {
		if (this.definitionStore.isDefinitionPath(file?.path ?? "") || this.definitionStore.isDefinitionPath(previousPath ?? "")) {
			this.scheduleDefinitionRefresh();
			return;
		}
		if (file instanceof TFile && file.extension === "md" && previousPath?.endsWith(".md") && previousPath !== file.path) {
			void this.handleMarkdownRename(previousPath, file.path).catch((error: unknown) => {
				console.error("Context Graph: failed to preserve graph state after a note rename", error);
			});
			return;
		}
		this.scheduleGraphRefresh(file, previousPath);
	}

	private async handleMarkdownRename(previousPath: string, nextPath: string): Promise<void> {
		const transientIds = new Map([...this.transientGraphs.entries()].map(([id, graph]) => [graph, id]));
		for (const graph of [...this.settings.graphs, ...this.transientGraphs.values()]) {
			const previousScope = graph.scope;
			const nextScope = renamePathInScope(previousScope, previousPath, nextPath);
			if (JSON.stringify(nextScope) === JSON.stringify(previousScope)) continue;
			graph.scope = nextScope;
			const transientId = transientIds.get(graph);
			if (transientId) {
				if (previousScope.kind === "rooted" && previousScope.rootPath === previousPath) {
					const basename = nextPath.split("/").pop()?.replace(/\.md$/i, "") ?? COPY.view.title;
					const nextId = currentNoteGraphId(nextPath);
					graph.id = nextId;
					graph.name = COPY.labels.currentNoteGraphName(basename);
					this.transientGraphs.delete(transientId);
					this.transientGraphs.set(nextId, graph);
					for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_CONTEXT_TREE)) {
						if (leaf.view instanceof ContextTreeView) leaf.view.replaceGraphId(transientId, nextId);
					}
				}
				continue;
			}
			try {
				await this.writeGraphDefinition(graph);
			} catch (error) {
				graph.scope = previousScope;
				console.error(`Context Graph: did not overwrite externally changed graph ${graph.id}`, error);
			}
		}
		for (const [graphId, state] of Object.entries(this.settings.viewStates)) {
			this.settings.viewStates[graphId] = renamePathInViewState(state, previousPath, nextPath);
		}
		const draft = this.settings.inlineDrafts[previousPath];
		if (draft) {
			this.settings.inlineDrafts[nextPath] = draft;
			delete this.settings.inlineDrafts[previousPath];
		}
		await this.persistSettings();
		this.scheduleGraphRefresh(undefined, previousPath);
	}

	private scheduleDefinitionRefresh(): void {
		if (this.definitionRefreshTimer !== undefined) window.clearTimeout(this.definitionRefreshTimer);
		this.definitionRefreshTimer = window.setTimeout(() => {
			this.definitionRefreshTimer = undefined;
			void this.reloadGraphDefinitions().catch((error: unknown) => {
				console.error("Context Graph: failed to reload graph definition files", error);
			});
		}, 180);
	}

	private isEligiblePath(path: string): boolean {
		if (!path.endsWith(".md")) return false;
		return [...this.settings.graphs, ...this.transientGraphs.values()]
			.some((graph) => graph.scope.kind === "rooted" || graphScopeIncludesPath(graph.scope, path));
	}

	async activateView(graphId = this.settings.defaultGraphId): Promise<void> {
		const existingLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_CONTEXT_TREE);
		let leaf: WorkspaceLeaf | undefined = existingLeaves.find((candidate) =>
			candidate.view instanceof ContextTreeView && candidate.view.getGraphId() === graphId,
		);
		if (!leaf) {
			leaf = this.app.workspace.getLeaf("tab");
			const definition = this.graphDefinitionFile(graphId);
			if (definition) await leaf.openFile(definition, { active: true });
			else await leaf.setViewState({ type: VIEW_TYPE_CONTEXT_TREE, state: { graphId }, active: true });
		}
		await this.app.workspace.revealLeaf(leaf);
	}

	private async initialiseGraphDefinitions(): Promise<void> {
		const discovered = await this.definitionStore.readAll();
		if (!this.settings.definitionsMigrated) {
			const known = new Set(discovered.map((graph) => graph.id));
			for (const graph of this.settings.graphs) {
				if (known.has(graph.id)) continue;
				await this.writeGraphDefinition(graph);
				discovered.push(graph);
				known.add(graph.id);
			}
			this.settings.definitionsMigrated = true;
		}
		await this.replaceGraphDefinitions(discovered);
	}

	private async reloadGraphDefinitions(): Promise<void> {
		const graphs = await this.definitionStore.readAll();
		await this.replaceGraphDefinitions(graphs);
		this.refreshOpenViews();
	}

	/** Reconciles portable graph files with device-local view state in one path. */
	private async replaceGraphDefinitions(graphs: GraphWorkspace[]): Promise<void> {
		this.settings.graphs = graphs;
		this.settings.viewStates = migrateGraphViewStates(
			this.settings.viewStates,
			graphs.map((graph) => graph.id),
		);
		if (!this.settings.graphs.some((graph) => graph.id === this.settings.defaultGraphId)) {
			this.settings.defaultGraphId = this.settings.graphs[0]?.id ?? "";
		}
		await this.persistSettings();
	}

	private async writeGraphDefinition(graph: GraphWorkspace): Promise<void> {
		await this.definitionStore.write(graph);
	}

	refreshOpenViews(): void {
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_CONTEXT_TREE)) {
			const view = leaf.view;
			if (view instanceof ContextTreeView) {
				void view.refresh().catch((error: unknown) => {
					console.error("Context Graph: failed to refresh graph", error);
				});
			}
		}
	}
}
