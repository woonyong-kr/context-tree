export const COPY_EN = {
	view: { title: "Linked Graph", openRibbon: "View the current note in Linked Graph", openCommand: "Open Linked Graph for the current note", refreshCommand: "Refresh Linked Graph" },
	actions: {
		search: "Search current links", showGraph: "Graph view", showOutline: "Outline view",
		expand: (label: string) => `Expand ${label}`, collapse: (label: string) => `Collapse ${label}`,
	},
	labels: {
		noCurrentDocument: "No current Markdown note", searchPlaceholder: "Search current routes",
		routeCount: (count: number) => `Current note · ${String(count)} routes`,
		treeAria: "Link outline authored from the current Markdown note", graphAria: "One-hop link graph for the current Markdown note", loading: "Reading links…",
		openMarkdown: "Open a Markdown note to see its authored links in order.", noLinks: "This note has no resolved Markdown links.",
		noSearchResults: "No matching links.", readFailed: "Linked Graph could not read the current note.",
	},
	notice: { openMarkdownFirst: "Open a Wiki or Markdown note first." },
} as const;
