import type { LinkedCanvasProjection, LinkedCanvasRelation } from "./json-canvas";
import type { LinkedCanvasProfile } from "./linked-canvas-profile";

export type VaultLinks = Record<string, readonly string[]>;

export function linkedCanvasVaultLinks(
	resolvedLinks: Record<string, Record<string, number>>,
): VaultLinks {
	return Object.fromEntries(Object.entries(resolvedLinks)
		.filter(([source]) => source.toLowerCase().endsWith(".md"))
		.map(([source, targets]) => [source, Object.keys(targets)]));
}

function backlinks(links: VaultLinks): VaultLinks {
	const result: Record<string, string[]> = {};
	for (const [source, targets] of Object.entries(links)) {
		for (const target of targets) {
			(result[target] ??= []).push(source);
		}
	}
	return result;
}

function uniqueSorted(paths: readonly string[]): string[] {
	return [...new Set(paths)].sort((left, right) => left.localeCompare(right));
}

/**
 * Keeps explicit seeds visible and, only when depth is enabled, expands them by
 * a bounded number of Vault-link hops. A zero-depth whiteboard therefore
 * reflects the cards the user deliberately placed instead of treating every
 * link in an index note as a spatial decision.
 */
export function buildLinkedCanvasProjection(
	profile: Pick<LinkedCanvasProfile,
		"rootPaths" | "seedPaths" | "depth" | "includeOutgoing" | "includeBacklinks" | "excludedPaths">,
	availablePaths: ReadonlySet<string>,
	links: VaultLinks,
): LinkedCanvasProjection {
	const excluded = new Set(profile.excludedPaths);
	const roots = [...new Set([...profile.rootPaths, ...profile.seedPaths])]
		.filter((path) => availablePaths.has(path) && !excluded.has(path));
	const incoming = profile.includeBacklinks ? backlinks(links) : {};
	const visible = new Set(roots);
	let frontier = roots;
	for (let depth = 0; depth < profile.depth; depth += 1) {
		const next: string[] = [];
		for (const source of frontier) {
			const candidates = [
				...(profile.includeOutgoing ? links[source] ?? [] : []),
				...(profile.includeBacklinks ? incoming[source] ?? [] : []),
			];
			for (const candidate of uniqueSorted(candidates)) {
				if (!availablePaths.has(candidate) || excluded.has(candidate) || visible.has(candidate)) continue;
				visible.add(candidate);
				next.push(candidate);
			}
		}
		frontier = next;
		if (!frontier.length) break;
	}

	const relations: LinkedCanvasRelation[] = [];
	const seen = new Set<string>();
	for (const [source, targets] of Object.entries(links)) {
		if (!visible.has(source)) continue;
		for (const target of uniqueSorted(targets)) {
			if (!visible.has(target) || source === target) continue;
			const key = `${source}\u0000${target}`;
			if (seen.has(key)) continue;
			seen.add(key);
			relations.push({ fromPath: source, toPath: target });
		}
	}

	return {
		rootPaths: roots,
		filePaths: [...roots, ...[...visible].filter((path) => !roots.includes(path)).sort((left, right) => left.localeCompare(right))],
		relations,
	};
}
