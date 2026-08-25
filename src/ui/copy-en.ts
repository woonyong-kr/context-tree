export const COPY_EN = {
	view: { title: "Linked Graph", openRibbon: "View the current note in Linked Graph", openCommand: "Open Linked Graph for the current note", refreshCommand: "Refresh Linked Graph" },
	actions: {
		search: "Search current links", collapseAll: "Collapse all", expand: (label: string) => `Expand ${label}`,
		collapse: (label: string) => `Collapse ${label}`, preview: (label: string) => `Preview links from ${label} here`,
	},
	labels: {
		currentDocument: "Current note", noCurrentDocument: "No current Markdown note", searchPlaceholder: "Search current routes",
		treeAria: "Link routes authored from the current Markdown note", loading: "Reading links…",
		openMarkdown: "Open a Markdown note to see its authored links in order.", noLinks: "This note has no resolved Markdown links.",
		noSearchResults: "No matching links.", readFailed: "Linked Graph could not read the current note.", branchEmpty: "No next links",
		cycle: "This note already appears earlier in the route",
	},
	notice: { openMarkdownFirst: "Open a Wiki or Markdown note first." },
} as const;
