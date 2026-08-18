import { Plugin, TAbstractFile, TFile, WorkspaceLeaf } from "obsidian";
import {
	GRAPH_DEFINITION_EXTENSION,
	GRAPH_DEFINITION_FOLDER,
	availableGraphDefinitionPath,
	graphDefinitionPath,
	parseGraphDefinition,
	serializeGraphDefinition,
} from "./domain/graph-definition";
import { createGraphWorkspace, GraphScopeInput, GraphViewState, GraphWorkspace, graphScopeIncludesPath, includePathInScope, migrateGraphWorkspaces } from "./domain/graph-workspace";
import { GraphPhysics } from "./graph/simulation";
import { ContextTreeSettingTab, ContextTreeSettings, DEFAULT_SETTINGS } from "./settings";
import { GraphWorkspaceModal } from "./topic-modals";
import { COPY } from "./ui/copy";
import { ContextTreeView, VIEW_TYPE_CONTEXT_TREE } from "./view";

export default class ContextTreePlugin extends Plugin {
	settings!: ContextTreeSettings;
	private refreshTimer?: number;
	private viewStateTimer?: number;
	private definitionRefreshTimer?: number;
	private settingsSaveQueue: Promise<void> = Promise.resolve();
	private readonly definitionPaths = new Map<string, string>();

	async onload(): Promise<void> {
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
			callback: () => void this.activateView(),
		});
		this.addCommand({
			id: "manage-graphs",
			name: COPY.view.manageCommand,
			callback: () => this.openGraphPicker(),
		});

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
		const graphs = migrateGraphWorkspaces(stored?.graphs, stored?.sourceFolder, stored?.graphPhysics);
		this.settings = {
			...DEFAULT_SETTINGS,
			graphs,
			defaultGraphId: graphs.some((graph) => graph.id === stored?.defaultGraphId)
				? stored!.defaultGraphId!
				: graphs[0]!.id,
			viewStates: stored?.viewStates ?? {},
		};
	}

	defaultGraph(): GraphWorkspace | undefined {
		return this.getGraph(this.settings.defaultGraphId) ?? this.settings.graphs[0];
	}

	/** Exact lookup only. Falling back here would let a stale file/tab mutate the
	 * default graph while still claiming to represent the missing graph id. */
	getGraph(id: string | undefined): GraphWorkspace | undefined {
		return this.settings.graphs.find((graph) => graph.id === id);
	}

	async createGraph(name: string, scope: GraphScopeInput = { kind: "curated" }): Promise<GraphWorkspace> {
		const graph = createGraphWorkspace(name, this.settings.graphs.map((item) => item.id), scope);
		this.settings.graphs.push(graph);
		await this.writeGraphDefinition(graph);
		await this.persistSettings();
		this.refreshOpenViews();
		return graph;
	}

	/** Opens the workspace library; individual graphs still render in independent tabs. */
	openGraphPicker(): void {
		new GraphWorkspaceModal(this.app, this.settings.graphs, this.settings.defaultGraphId, {
			onOpenGraph: (graphId) => void this.activateView(graphId),
			onCreateGraph: (name, scope) => {
				void this.createGraph(name, scope)
					.then((graph) => this.activateView(graph.id))
					.catch((error: unknown) => console.error("Context Graph: failed to create graph workspace", error));
			},
		}).open();
	}

	async includePathInGraph(graphId: string, path: string): Promise<void> {
		const graph = this.getGraph(graphId);
		if (!graph || graphScopeIncludesPath(graph.scope, path)) return;
		graph.scope = includePathInScope(graph.scope, path);
		await this.writeGraphDefinition(graph);
		await this.persistSettings();
		this.refreshOpenViews();
	}

	graphViewState(graphId: string): GraphViewState | undefined {
		return this.settings.viewStates[graphId];
	}

	scheduleGraphViewStateSave(graphId: string, state: GraphViewState): void {
		this.settings.viewStates[graphId] = state;
		if (this.viewStateTimer !== undefined) window.clearTimeout(this.viewStateTimer);
		this.viewStateTimer = window.setTimeout(() => {
			this.viewStateTimer = undefined;
			void this.persistSettings().catch((error: unknown) => console.error("Context Graph: failed to save view state", error));
		}, 420);
	}

	async saveGraphViewState(graphId: string, state: GraphViewState): Promise<void> {
		this.settings.viewStates[graphId] = state;
		if (this.viewStateTimer !== undefined) {
			window.clearTimeout(this.viewStateTimer);
			this.viewStateTimer = undefined;
		}
		await this.persistSettings();
	}

	async saveSettings(): Promise<void> {
		await Promise.all(this.settings.graphs.map((graph) => this.writeGraphDefinition(graph)));
		await this.persistSettings();
		this.refreshOpenViews();
	}

	private persistSettings(): Promise<void> {
		const save = this.settingsSaveQueue.then(() => this.saveData(this.settings));
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
	}

	/** Returns the Vault file backing a graph, when this graph has been migrated. */
	graphDefinitionFile(graphId: string): TFile | undefined {
		const path = this.definitionPaths.get(graphId);
		const file = path ? this.app.vault.getAbstractFileByPath(path) : undefined;
		return file instanceof TFile ? file : undefined;
	}

	/** FileView calls this after a user opens a `.context-graph` file in Explorer. */
	async graphForDefinitionFile(file: TFile): Promise<GraphWorkspace | undefined> {
		const graph = parseGraphDefinition(await this.app.vault.cachedRead(file));
		if (!graph) return undefined;
		const index = this.settings.graphs.findIndex((item) => item.id === graph.id);
		if (index >= 0) this.settings.graphs[index] = graph;
		else this.settings.graphs.push(graph);
		this.definitionPaths.set(graph.id, file.path);
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
		if (this.isGraphDefinitionPath(file?.path ?? "") || this.isGraphDefinitionPath(previousPath ?? "")) {
			this.scheduleDefinitionRefresh();
			return;
		}
		this.scheduleGraphRefresh(file, previousPath);
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
		return this.settings.graphs.some((graph) => graphScopeIncludesPath(graph.scope, path));
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
		const discovered = await this.readGraphDefinitions();
		const known = new Set(discovered.map((graph) => graph.id));
		for (const graph of this.settings.graphs) {
			if (known.has(graph.id)) continue;
			await this.writeGraphDefinition(graph);
			discovered.push(graph);
			known.add(graph.id);
		}
		this.settings.graphs = discovered;
		if (!this.settings.graphs.some((graph) => graph.id === this.settings.defaultGraphId)) {
			this.settings.defaultGraphId = this.settings.graphs[0]?.id ?? "";
		}
		await this.persistSettings();
	}

	private async reloadGraphDefinitions(): Promise<void> {
		const graphs = await this.readGraphDefinitions();
		if (!graphs.length) return;
		this.settings.graphs = graphs;
		if (!this.settings.graphs.some((graph) => graph.id === this.settings.defaultGraphId)) {
			this.settings.defaultGraphId = this.settings.graphs[0]!.id;
		}
		await this.persistSettings();
		this.refreshOpenViews();
	}

	private async readGraphDefinitions(): Promise<GraphWorkspace[]> {
		this.definitionPaths.clear();
		const seen = new Set<string>();
		const graphs: GraphWorkspace[] = [];
		for (const file of this.app.vault.getFiles()) {
			if (!this.isGraphDefinitionPath(file.path)) continue;
			const graph = parseGraphDefinition(await this.app.vault.cachedRead(file));
			if (!graph || seen.has(graph.id)) continue;
			seen.add(graph.id);
			graphs.push(graph);
			this.definitionPaths.set(graph.id, file.path);
		}
		return graphs;
	}

	private async writeGraphDefinition(graph: GraphWorkspace): Promise<void> {
		const existing = this.graphDefinitionFile(graph.id);
		if (existing) {
			await this.app.vault.modify(existing, serializeGraphDefinition(graph));
			return;
		}
		await this.ensureFolder(GRAPH_DEFINITION_FOLDER);
		const preferredPath = graphDefinitionPath(graph);
		const file = this.app.vault.getAbstractFileByPath(preferredPath);
		if (file instanceof TFile) {
			const existingGraph = parseGraphDefinition(await this.app.vault.cachedRead(file));
			if (existingGraph?.id === graph.id) {
				await this.app.vault.modify(file, serializeGraphDefinition(graph));
				this.definitionPaths.set(graph.id, file.path);
				return;
			}
		}
		const targetPath = availableGraphDefinitionPath(graph, this.app.vault.getFiles().map((item) => item.path));
		let resolved: TFile | undefined;
		try {
			resolved = await this.app.vault.create(targetPath, serializeGraphDefinition(graph));
		} catch (error) {
			// The adapter can know about an existing file a few turns before the
			// Vault index does. Re-read that file instead of treating the race as a
			// second graph or failing plugin startup.
			resolved = await this.waitForIndexedFile(targetPath);
			if (!resolved) throw error;
		}
		if (!resolved) throw new Error(`Unable to create graph definition: ${targetPath}`);
		const resolvedGraph = parseGraphDefinition(await this.app.vault.cachedRead(resolved));
		if (resolvedGraph?.id !== graph.id) {
			throw new Error(`Graph definition path is already used: ${targetPath}`);
		}
		this.definitionPaths.set(graph.id, resolved.path);
	}

	/** Wait briefly for the Vault index after an adapter-level create collision. */
	private async waitForIndexedFile(path: string): Promise<TFile | undefined> {
		let candidate = this.app.vault.getAbstractFileByPath(path);
		if (candidate instanceof TFile) return candidate;
		if (!(await this.app.vault.adapter.exists(path))) return undefined;
		for (const delay of [20, 40, 80, 160]) {
			await new Promise<void>((resolve) => window.setTimeout(resolve, delay));
			candidate = this.app.vault.getAbstractFileByPath(path);
			if (candidate instanceof TFile) return candidate;
		}
		return undefined;
	}

	private async ensureFolder(path: string): Promise<void> {
		const parts = path.split("/").filter(Boolean);
		let current = "";
		for (const part of parts) {
			current = current ? `${current}/${part}` : part;
			if (this.app.vault.getAbstractFileByPath(current)) continue;
			try {
				await this.app.vault.createFolder(current);
			} catch (error) {
				// Vault startup can race its folder index. Treat the specific benign
				// "already exists" outcome as success, but surface any other error.
				if (this.app.vault.getAbstractFileByPath(current) || (error instanceof Error && /already exists/i.test(error.message))) continue;
				throw error;
			}
		}
	}

	private isGraphDefinitionPath(path: string): boolean {
		return path.endsWith(`.${GRAPH_DEFINITION_EXTENSION}`);
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
