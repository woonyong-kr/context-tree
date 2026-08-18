import { App, normalizePath, TFile } from "obsidian";
import { noteLinkTarget } from "./domain/note-link";
import { isSymmetricRelation, relationItems } from "./domain/relations";
import { ContextRelationType, ContextTreeLink } from "./types";
import { newTopicContent } from "./topic-content";

/** A relation only needs a stable vault path; rendering may add richer fields. */
export interface RelationEndpoint {
	path: string;
}

function noteLink(path: string): string {
	return `[[${path}]]`;
}

function storedRelationTargetPath(app: App, sourcePath: string, item: unknown): string | undefined {
	const rawTarget = typeof item === "string"
		? item
		: item && typeof item === "object" && typeof (item as Record<string, unknown>).target === "string"
			? (item as Record<string, unknown>).target as string
			: "";
	if (!rawTarget) return undefined;
	return app.metadataCache.getFirstLinkpathDest(noteLinkTarget(rawTarget), sourcePath)?.path;
}

function isStoredRelationFor(
	app: App,
	sourcePath: string,
	item: unknown,
	targetPath: string,
	type: ContextRelationType,
): boolean {
	const storedType = item && typeof item === "object"
		? (item as Record<string, unknown>).type
		: type === "related" ? "related" : undefined;
	return storedType === type && storedRelationTargetPath(app, sourcePath, item) === targetPath;
}

function safeFileName(title: string): string {
	const sanitized = title.trim().replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ");
	return sanitized || "Untitled topic";
}

async function availablePath(app: App, folder: string, title: string): Promise<string> {
	const normalizedFolder = folder ? normalizePath(folder) : "";
	const base = safeFileName(title);
	let suffix = 0;
	while (true) {
		const fileName = suffix ? `${base} ${suffix + 1}.md` : `${base}.md`;
		const path = normalizedFolder ? `${normalizedFolder}/${fileName}` : fileName;
		if (!app.vault.getAbstractFileByPath(path)) return path;
		suffix += 1;
	}
}

export async function createTopic(
	app: App,
	options: { title: string; body: string; fallbackFolder: string },
): Promise<TFile> {
	const path = await availablePath(app, options.fallbackFolder, options.title);
	return app.vault.create(path, newTopicContent(options.title, options.body));
}

export async function addRelation(
	app: App,
	from: RelationEndpoint,
	to: RelationEndpoint,
	type: ContextRelationType,
): Promise<boolean> {
	const file = app.vault.getAbstractFileByPath(from.path);
	if (!(file instanceof TFile)) throw new Error("The source note no longer exists.");
	const target = app.vault.getAbstractFileByPath(to.path);
	const reciprocalFrontmatter = target instanceof TFile
		? app.metadataCache.getFileCache(target)?.frontmatter
		: undefined;
	const reciprocalExists = isSymmetricRelation(type)
		&& relationItems(reciprocalFrontmatter?.context_tree_links).some((item) =>
			isStoredRelationFor(app, to.path, item, from.path, type),
		);
	if (reciprocalExists) return false;
	let added = false;
	await app.fileManager.processFrontMatter(file, (frontmatter) => {
		const data = frontmatter as Record<string, unknown>;
		// Keep a pre-existing scalar relation when an authored relation is added.
		// YAML permits both a scalar and a sequence; normalising only here would
		// silently discard the scalar even though the parser rendered it.
		const current = relationItems(data.context_tree_links).slice();
		const exists = current.some((item) => isStoredRelationFor(app, from.path, item, to.path, type));
		if (!exists) {
			current.push({ target: noteLink(to.path), type });
			added = true;
		}
		data.context_tree_links = current;
	});
	return added;
}

export async function removeRelation(
	app: App,
	from: RelationEndpoint,
	link: ContextTreeLink,
): Promise<void> {
	const file = app.vault.getAbstractFileByPath(from.path);
	if (!(file instanceof TFile)) throw new Error("The source note no longer exists.");
	await app.fileManager.processFrontMatter(file, (frontmatter) => {
		const data = frontmatter as Record<string, unknown>;
		const current = relationItems(data.context_tree_links);
		data.context_tree_links = current.filter((item) => !isStoredRelationFor(app, from.path, item, link.targetPath, link.type));
	});
}

export async function moveTopicToTrash(app: App, node: RelationEndpoint): Promise<void> {
	const file = app.vault.getAbstractFileByPath(node.path);
	if (!(file instanceof TFile)) throw new Error("The source note no longer exists.");
	await app.fileManager.trashFile(file);
}
