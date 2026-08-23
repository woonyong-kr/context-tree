import { App, TFile, TFolder } from "obsidian";
import {
	GRAPH_DEFINITION_EXTENSION,
	GRAPH_DEFINITION_FOLDER,
	availableGraphDefinitionPath,
	graphDefinitionPath,
	parseGraphDefinition,
	serializeGraphDefinition,
} from "./domain/graph-definition";
import { GraphWorkspace } from "./domain/graph-workspace";

/** Owns the Vault files that are the single canon for saved graph definitions. */
export class GraphDefinitionStore {
	private readonly paths = new Map<string, string>();
	private readonly sources = new Map<string, string>();

	constructor(private readonly app: App) {}

	isDefinitionPath(path: string): boolean {
		return path.endsWith(`.${GRAPH_DEFINITION_EXTENSION}`);
	}

	file(graphId: string): TFile | undefined {
		const path = this.paths.get(graphId);
		const file = path ? this.app.vault.getAbstractFileByPath(path) : undefined;
		return file instanceof TFile ? file : undefined;
	}

	async readFile(file: TFile): Promise<GraphWorkspace | undefined> {
		const source = await this.app.vault.cachedRead(file);
		const graph = parseGraphDefinition(source);
		if (!graph) return undefined;
		this.paths.set(graph.id, file.path);
		this.sources.set(graph.id, source);
		return graph;
	}

	async readAll(): Promise<GraphWorkspace[]> {
		this.paths.clear();
		this.sources.clear();
		const seen = new Set<string>();
		const graphs: GraphWorkspace[] = [];
		for (const path of await this.definitionPaths()) {
			const file = this.app.vault.getAbstractFileByPath(path);
			if (!(file instanceof TFile) || !this.isDefinitionPath(file.path)) continue;
			const source = await this.app.vault.cachedRead(file);
			const graph = parseGraphDefinition(source);
			if (!graph || seen.has(graph.id)) continue;
			seen.add(graph.id);
			graphs.push(graph);
			this.paths.set(graph.id, file.path);
			this.sources.set(graph.id, source);
		}
		return graphs;
	}

	async write(graph: GraphWorkspace): Promise<void> {
		const existing = this.file(graph.id);
		if (existing) {
			const nextSource = serializeGraphDefinition(graph);
			await this.app.vault.process(existing, (currentSource) => {
				const expectedSource = this.sources.get(graph.id);
				if (expectedSource !== undefined && currentSource !== expectedSource) {
					throw new Error(`Graph definition changed outside Context Graph: ${existing.path}`);
				}
				return nextSource;
			});
			this.sources.set(graph.id, nextSource);
			return;
		}

		await this.ensureFolder(GRAPH_DEFINITION_FOLDER);
		const preferredPath = graphDefinitionPath(graph);
		const preferred = this.app.vault.getAbstractFileByPath(preferredPath);
		if (preferred instanceof TFile) {
			const existingSource = await this.app.vault.cachedRead(preferred);
			const existingGraph = parseGraphDefinition(existingSource);
			if (existingGraph?.id === graph.id) {
				const nextSource = serializeGraphDefinition(graph);
				await this.app.vault.process(preferred, (currentSource) => {
					if (currentSource !== existingSource) {
						throw new Error(`Graph definition changed outside Context Graph: ${preferred.path}`);
					}
					return nextSource;
				});
				this.paths.set(graph.id, preferred.path);
				this.sources.set(graph.id, nextSource);
				return;
			}
		}

		const targetPath = availableGraphDefinitionPath(
			graph,
			await this.definitionPaths(),
		);
		let resolved: TFile | undefined;
		try {
			resolved = await this.app.vault.create(targetPath, serializeGraphDefinition(graph));
		} catch (error) {
			// A create can reach the adapter before the Vault index observes it.
			resolved = await this.waitForIndexedFile(targetPath);
			if (!resolved) throw error;
		}
		if (!resolved) throw new Error(`Unable to create graph definition: ${targetPath}`);
		const resolvedSource = await this.app.vault.cachedRead(resolved);
		const resolvedGraph = parseGraphDefinition(resolvedSource);
		if (resolvedGraph?.id !== graph.id) {
			throw new Error(`Graph definition path is already used: ${targetPath}`);
		}
		this.paths.set(graph.id, resolved.path);
		this.sources.set(graph.id, resolvedSource);
	}

	private async waitForIndexedFile(path: string): Promise<TFile | undefined> {
		let candidate = this.app.vault.getAbstractFileByPath(path);
		if (candidate instanceof TFile) return candidate;
		for (const delay of [20, 40, 80, 160]) {
			await new Promise<void>((resolve) => window.setTimeout(resolve, delay));
			candidate = this.app.vault.getAbstractFileByPath(path);
			if (candidate instanceof TFile) return candidate;
		}
		return undefined;
	}

	/** Lists only the plugin-owned definition folder, never the whole Vault. */
	private async definitionPaths(): Promise<string[]> {
		const folder = this.app.vault.getAbstractFileByPath(GRAPH_DEFINITION_FOLDER);
		if (!(folder instanceof TFolder)) return [];
		return (await this.app.vault.adapter.list(GRAPH_DEFINITION_FOLDER)).files;
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
				if (
					this.app.vault.getAbstractFileByPath(current)
					|| (error instanceof Error && /already exists/i.test(error.message))
				) continue;
				throw error;
			}
		}
	}
}
