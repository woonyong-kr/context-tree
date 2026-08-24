import { App, normalizePath, TAbstractFile, TFile, TFolder, WorkspaceLeaf } from "obsidian";
import {
	parseJsonCanvas,
	reconcileLinkedCanvas,
	serializeJsonCanvas,
	type JsonCanvasFileNode,
} from "./domain/json-canvas";
import { buildLinkedCanvasProjection, linkedCanvasVaultLinks } from "./domain/linked-canvas-projection";
import {
	createLinkedCanvasProfile,
	createLinkedCanvasProfileForExistingCanvas,
	enableLinkedCanvasExpansion,
	linkedCanvasIncludesSource,
	linkedCanvasProfileFileName,
	linkedCanvasProfilePath,
	manualCanvasRelations,
	manualMarkdownSeeds,
	parseLinkedCanvasProfile,
	pathsRemovedFromCanvas,
	removeManagedCanvasSelfCard,
	renamePathInLinkedCanvasProfile,
	serializeLinkedCanvasProfile,
	type LinkedCanvasProfile,
} from "./domain/linked-canvas-profile";
import { DIRECT_RELATION } from "./domain/relations";
import { addRelation } from "./topic-store";

function safeFileStem(name: string): string {
	return name.trim()
		.replace(/[\\/:*?"<>|]+/g, "-")
		.replace(/\s+/g, " ")
		.replace(/^\.+|\.+$/g, "")
		.trim() || "Linked Canvas";
}

function uniquePaths(paths: readonly string[]): string[] {
	return [...new Set(paths.filter(Boolean))];
}

function sameSource(left: string, right: string): boolean {
	return left === right;
}

/**
 * Bridges Vault files and the public JSON Canvas format. Markdown and media
 * remain the content authority; Canvas owns spatial layout; the small profile
 * owns only automation scope and generated-object provenance.
 */
export class LinkedCanvasService {
	private readonly profilesByCanvasPath = new Map<string, LinkedCanvasProfile>();
	private readonly profileFilesByCanvasPath = new Map<string, TFile>();
	private readonly profileSourcesByCanvasPath = new Map<string, string>();
	private syncTimer?: number;
	private profileReloadTimer?: number;
	private syncing = false;
	private syncAgain = false;
	private initialization?: Promise<void>;

	constructor(private readonly app: App) {}

	initialize(): Promise<void> {
		this.initialization ??= this.initializeOnce().catch((error: unknown) => {
			this.initialization = undefined;
			throw error;
		});
		return this.initialization;
	}

	private async initializeOnce(): Promise<void> {
		await this.reloadProfiles();
		await this.syncAll();
	}

	dispose(): void {
		if (this.syncTimer !== undefined) window.clearTimeout(this.syncTimer);
		if (this.profileReloadTimer !== undefined) window.clearTimeout(this.profileReloadTimer);
	}

	hasProfile(canvasPath: string): boolean {
		return this.profilesByCanvasPath.has(canvasPath);
	}

	canvasesForSource(sourcePath: string): TFile[] {
		return [...this.profilesByCanvasPath.values()]
			.filter((profile) => linkedCanvasIncludesSource(profile, sourcePath))
			.map((profile) => this.app.vault.getAbstractFileByPath(profile.canvasPath))
			.filter((file): file is TFile => file instanceof TFile && file.extension === "canvas")
			.sort((left, right) => left.basename.localeCompare(right.basename));
	}

	canvases(): TFile[] {
		// The Vault is the card library and every standard Canvas is a valid
		// whiteboard. A profile is optional automation, not an ownership marker.
		return this.app.vault.getFiles()
			.filter((file) => file.extension === "canvas")
			.sort((left, right) => left.basename.localeCompare(right.basename));
	}

	async createBlank(suggestedName = "Linked Canvas", folderPath = ""): Promise<TFile> {
		const canvasPath = this.availableCanvasPath(suggestedName, folderPath);
		const profilePath = linkedCanvasProfilePath(canvasPath);
		const profile = createLinkedCanvasProfile(canvasPath);
		const canvasSource = serializeJsonCanvas({ nodes: [], edges: [] });
		const profileSource = serializeLinkedCanvasProfile(profile);
		const canvas = await this.app.vault.create(canvasPath, canvasSource);
		let profileFile: TFile;
		try {
			profileFile = await this.app.vault.create(profilePath, profileSource);
		} catch (error) {
			const detail = error instanceof Error ? ` ${error.message}` : "";
			throw new Error(`Created ${canvas.path}, but could not create its Linked Canvas profile.${detail}`);
		}
		this.profilesByCanvasPath.set(canvasPath, profile);
		this.profileFilesByCanvasPath.set(canvasPath, profileFile);
		this.profileSourcesByCanvasPath.set(canvasPath, profileSource);
		return canvas;
	}

	async createFromRoot(root: TFile, suggestedName = `${root.basename} Canvas`): Promise<TFile> {
		if (root.extension !== "md") throw new Error("Linked Canvas requires a Markdown root.");
		const canvasPath = this.availableCanvasPath(suggestedName, root.parent?.path ?? "");
		const profilePath = linkedCanvasProfilePath(canvasPath);
		const profile = createLinkedCanvasProfile(canvasPath, root.path);
		const projection = this.projection(profile);
		const reconciled = reconcileLinkedCanvas({ nodes: [], edges: [] }, profile.managed, projection);
		profile.managed = reconciled.managed;
		const canvasSource = serializeJsonCanvas(reconciled.document);
		const profileSource = serializeLinkedCanvasProfile(profile);

		const canvas = await this.app.vault.create(canvasPath, canvasSource);
		let profileFile: TFile;
		try {
			profileFile = await this.app.vault.create(profilePath, profileSource);
		} catch (error) {
			// The standard Canvas remains useful even when a profile write fails.
			// Do not destroy user-visible work while reporting the failed automation.
			const detail = error instanceof Error ? ` ${error.message}` : "";
			throw new Error(`Created ${canvas.path}, but could not create its Linked Canvas profile.${detail}`);
		}
		this.profilesByCanvasPath.set(canvasPath, profile);
		this.profileFilesByCanvasPath.set(canvasPath, profileFile);
		this.profileSourcesByCanvasPath.set(canvasPath, profileSource);
		return canvas;
	}

	async enableForExistingCanvas(canvasFile: TFile): Promise<boolean> {
		if (canvasFile.extension !== "canvas") throw new Error("Linked Canvas requires an Obsidian Canvas file.");
		const existingProfile = this.profilesByCanvasPath.get(canvasFile.path);
		if (existingProfile) {
			if (!enableLinkedCanvasExpansion(existingProfile)) return false;
			await this.writeProfile(existingProfile);
			await this.syncCanvas(canvasFile.path);
			return true;
		}
		const canvasSource = await this.app.vault.cachedRead(canvasFile);
		const canvas = parseJsonCanvas(canvasSource);
		if (!canvas) throw new Error(`Linked Canvas did not modify malformed Canvas: ${canvasFile.path}`);
		const markdownPaths = canvas.nodes
			.filter((node): node is JsonCanvasFileNode => node.type === "file" && node.file.toLowerCase().endsWith(".md"))
			.map((node) => node.file)
			.filter((path) => this.app.vault.getAbstractFileByPath(path) instanceof TFile);
		const profile = createLinkedCanvasProfileForExistingCanvas(canvasFile.path, markdownPaths);
		if (!profile) throw new Error("Add at least one Markdown file card before enabling Linked Canvas.");
		const reconciled = reconcileLinkedCanvas(canvas, profile.managed, this.projection(profile));
		profile.managed = reconciled.managed;
		const profileSource = serializeLinkedCanvasProfile(profile);
		const profilePath = linkedCanvasProfilePath(canvasFile.path);
		if (this.app.vault.getAbstractFileByPath(profilePath)) {
			throw new Error(`Linked Canvas profile already exists: ${profilePath}`);
		}
		const profileFile = await this.app.vault.create(profilePath, profileSource);
		this.profilesByCanvasPath.set(canvasFile.path, profile);
		this.profileFilesByCanvasPath.set(canvasFile.path, profileFile);
		this.profileSourcesByCanvasPath.set(canvasFile.path, profileSource);
		const nextCanvasSource = serializeJsonCanvas(reconciled.document);
		if (nextCanvasSource !== canvasSource) {
			await this.app.vault.process(canvasFile, (currentSource) => {
				if (currentSource !== canvasSource) throw new Error(`Canvas changed while enabling Linked Canvas: ${canvasFile.path}`);
				return nextCanvasSource;
			});
		}
		return true;
	}

	async open(canvas: TFile): Promise<WorkspaceLeaf> {
		const leaf = this.app.workspace.getLeaf("tab");
		await leaf.openFile(canvas, { active: true });
		await this.app.workspace.revealLeaf(leaf);
		return leaf;
	}

	async syncNow(canvas: TFile): Promise<boolean> {
		if (canvas.extension !== "canvas" || !this.hasProfile(canvas.path)) return false;
		return this.syncCanvas(canvas.path);
	}

	async toggleRelationSync(canvas: TFile): Promise<"visual-only" | "frontmatter-additive" | undefined> {
		const profile = this.profilesByCanvasPath.get(canvas.path);
		if (!profile) return undefined;
		profile.relationSync = profile.relationSync === "visual-only" ? "frontmatter-additive" : "visual-only";
		await this.writeProfile(profile);
		if (profile.relationSync === "frontmatter-additive") await this.syncCanvas(canvas.path);
		return profile.relationSync;
	}

	handleVaultChange(file: TAbstractFile, previousPath?: string): void {
		if (previousPath && previousPath !== file.path) {
			if (file instanceof TFile && file.extension === "canvas" && this.hasProfile(previousPath)) {
				void this.renameCanvasProfile(previousPath, file.path).catch((error: unknown) => {
					console.error("Linked Canvas: failed to follow Canvas rename", error);
				});
				return;
			}
			void this.renameSourceInProfiles(previousPath, file.path).catch((error: unknown) => {
				console.error("Linked Canvas: failed to follow Vault rename", error);
			});
		}
		if (linkedCanvasProfileFileName(file.path) || linkedCanvasProfileFileName(previousPath ?? "")) {
			this.scheduleProfileReload();
			return;
		}
		if (file instanceof TFile && file.extension === "canvas") {
			if (this.hasProfile(file.path) || (previousPath && this.hasProfile(previousPath))) this.scheduleSync();
			return;
		}
		if (file instanceof TFolder) return;
		this.scheduleSync();
	}

	private scheduleProfileReload(): void {
		if (this.profileReloadTimer !== undefined) window.clearTimeout(this.profileReloadTimer);
		this.profileReloadTimer = window.setTimeout(() => {
			this.profileReloadTimer = undefined;
			void this.reloadProfiles()
				.then(() => this.scheduleSync())
				.catch((error: unknown) => console.error("Linked Canvas: failed to reload profiles", error));
		}, 240);
	}

	private scheduleSync(): void {
		if (!this.profilesByCanvasPath.size) return;
		if (this.syncTimer !== undefined) window.clearTimeout(this.syncTimer);
		this.syncTimer = window.setTimeout(() => {
			this.syncTimer = undefined;
			void this.syncAll().catch((error: unknown) => console.error("Linked Canvas: automatic sync failed", error));
		}, 520);
	}

	private async syncAll(): Promise<void> {
		if (this.syncing) {
			this.syncAgain = true;
			return;
		}
		this.syncing = true;
		try {
			for (const canvasPath of [...this.profilesByCanvasPath.keys()]) {
				await this.syncCanvas(canvasPath);
			}
		} finally {
			this.syncing = false;
			if (this.syncAgain) {
				this.syncAgain = false;
				this.scheduleSync();
			}
		}
	}

	private async syncCanvas(canvasPath: string): Promise<boolean> {
		const profile = this.profilesByCanvasPath.get(canvasPath);
		const canvasFile = this.app.vault.getAbstractFileByPath(canvasPath);
		if (!profile || !(canvasFile instanceof TFile)) return false;
		const canvasSource = await this.app.vault.cachedRead(canvasFile);
		const parsedCanvas = parseJsonCanvas(canvasSource);
		if (!parsedCanvas) throw new Error(`Linked Canvas did not overwrite malformed Canvas: ${canvasPath}`);
		const canvas = removeManagedCanvasSelfCard(profile, parsedCanvas);
		for (const node of canvas.nodes) {
			if (node.type !== "file") continue;
			const managedPath = profile.managed.filesByNodeId[node.id];
			if (managedPath && node.file !== managedPath) node.file = managedPath;
		}

		const removedPaths = pathsRemovedFromCanvas(profile, canvas);
		if (removedPaths.length) profile.excludedPaths = uniquePaths([...profile.excludedPaths, ...removedPaths]);
		const newSeeds = manualMarkdownSeeds(profile, canvas);
		if (newSeeds.length) {
			profile.seedPaths = uniquePaths([...profile.seedPaths, ...newSeeds]);
			profile.excludedPaths = profile.excludedPaths.filter((path) => !newSeeds.includes(path));
		}

		for (const relation of manualCanvasRelations(profile, canvas)) {
			const type = relation.label ?? DIRECT_RELATION;
			await addRelation(this.app, { path: relation.fromPath }, { path: relation.toPath }, type);
		}

		const projection = this.projection(profile);
		const reconciled = reconcileLinkedCanvas(canvas, profile.managed, projection);
		profile.managed = reconciled.managed;
		const nextCanvasSource = serializeJsonCanvas(reconciled.document);
		let changed = false;
		if (!sameSource(nextCanvasSource, canvasSource)) {
			await this.app.vault.process(canvasFile, (currentSource) => {
				if (currentSource !== canvasSource) throw new Error(`Canvas changed during Linked Canvas sync: ${canvasPath}`);
				return nextCanvasSource;
			});
			changed = true;
		}
		changed = await this.writeProfile(profile) || changed;
		return changed;
	}

	private projection(profile: LinkedCanvasProfile) {
		const availablePaths = new Set(this.app.vault.getFiles().map((file) => file.path));
		const links = linkedCanvasVaultLinks(this.app.metadataCache.resolvedLinks);
		return buildLinkedCanvasProjection(profile, availablePaths, links);
	}

	private async reloadProfiles(): Promise<void> {
		const profiles = new Map<string, LinkedCanvasProfile>();
		const files = new Map<string, TFile>();
		const sources = new Map<string, string>();
		for (const file of this.app.vault.getFiles()) {
			if (!linkedCanvasProfileFileName(file.path)) continue;
			const source = await this.app.vault.cachedRead(file);
			const profile = parseLinkedCanvasProfile(source);
			if (!profile || profiles.has(profile.canvasPath)) continue;
			profiles.set(profile.canvasPath, profile);
			files.set(profile.canvasPath, file);
			sources.set(profile.canvasPath, source);
		}
		this.profilesByCanvasPath.clear();
		this.profileFilesByCanvasPath.clear();
		this.profileSourcesByCanvasPath.clear();
		for (const [canvasPath, profile] of profiles) this.profilesByCanvasPath.set(canvasPath, profile);
		for (const [canvasPath, file] of files) this.profileFilesByCanvasPath.set(canvasPath, file);
		for (const [canvasPath, source] of sources) this.profileSourcesByCanvasPath.set(canvasPath, source);
	}

	private async renameSourceInProfiles(previousPath: string, nextPath: string): Promise<void> {
		let changed = false;
		for (const [canvasPath, profile] of [...this.profilesByCanvasPath]) {
			const renamed = renamePathInLinkedCanvasProfile(profile, previousPath, nextPath);
			if (serializeLinkedCanvasProfile(renamed) === serializeLinkedCanvasProfile(profile)) continue;
			this.profilesByCanvasPath.set(canvasPath, renamed);
			await this.writeProfile(renamed);
			changed = true;
		}
		if (changed) this.scheduleSync();
	}

	private async renameCanvasProfile(previousCanvasPath: string, nextCanvasPath: string): Promise<void> {
		const profile = this.profilesByCanvasPath.get(previousCanvasPath);
		const profileFile = this.profileFilesByCanvasPath.get(previousCanvasPath);
		if (!profile || !(profileFile instanceof TFile)) return;
		const nextProfilePath = linkedCanvasProfilePath(nextCanvasPath);
		const occupied = this.app.vault.getAbstractFileByPath(nextProfilePath);
		if (occupied && occupied !== profileFile) throw new Error(`Linked Canvas profile path already exists: ${nextProfilePath}`);
		await this.app.fileManager.renameFile(profileFile, nextProfilePath);
		const renamed = renamePathInLinkedCanvasProfile(profile, previousCanvasPath, nextCanvasPath);
		const previousSource = this.profileSourcesByCanvasPath.get(previousCanvasPath) ?? await this.app.vault.cachedRead(profileFile);
		this.profilesByCanvasPath.delete(previousCanvasPath);
		this.profileFilesByCanvasPath.delete(previousCanvasPath);
		this.profileSourcesByCanvasPath.delete(previousCanvasPath);
		this.profilesByCanvasPath.set(nextCanvasPath, renamed);
		this.profileFilesByCanvasPath.set(nextCanvasPath, profileFile);
		this.profileSourcesByCanvasPath.set(nextCanvasPath, previousSource);
		await this.writeProfile(renamed);
		this.scheduleSync();
	}

	private async writeProfile(profile: LinkedCanvasProfile): Promise<boolean> {
		const file = this.profileFilesByCanvasPath.get(profile.canvasPath);
		if (!(file instanceof TFile)) throw new Error(`Linked Canvas profile is unavailable: ${profile.canvasPath}`);
		const previousSource = this.profileSourcesByCanvasPath.get(profile.canvasPath) ?? await this.app.vault.cachedRead(file);
		const nextSource = serializeLinkedCanvasProfile(profile);
		if (sameSource(previousSource, nextSource)) return false;
		await this.app.vault.process(file, (currentSource) => {
			if (currentSource !== previousSource) throw new Error(`Linked Canvas profile changed during sync: ${file.path}`);
			return nextSource;
		});
		this.profileSourcesByCanvasPath.set(profile.canvasPath, nextSource);
		return true;
	}

	private availableCanvasPath(name: string, folderPath: string): string {
		const stem = safeFileStem(name);
		const folder = normalizePath(folderPath).replace(/^\/+|\/+$/g, "");
		let suffix = 0;
		while (true) {
			const fileName = suffix ? `${stem} ${suffix + 1}.canvas` : `${stem}.canvas`;
			const candidate = normalizePath(folder ? `${folder}/${fileName}` : fileName);
			if (!this.app.vault.getAbstractFileByPath(candidate)
				&& !this.app.vault.getAbstractFileByPath(linkedCanvasProfilePath(candidate))) return candidate;
			suffix += 1;
		}
	}

}
