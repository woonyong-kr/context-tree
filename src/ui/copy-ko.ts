export const COPY_KO = {
	view: { title: "Linked Graph", openRibbon: "현재 문서를 Linked Graph로 보기", openCommand: "현재 문서의 Linked Graph 열기", refreshCommand: "Linked Graph 새로고침" },
	actions: {
		search: "현재 링크 검색",
		collapseAll: "모두 접기",
		expand: (label: string) => `${label} 펼치기`,
		collapse: (label: string) => `${label} 접기`,
		preview: (label: string) => `${label}의 링크를 여기서 펼치기`,
	},
	labels: {
		currentDocument: "현재 문서", noCurrentDocument: "현재 Markdown 문서 없음", searchPlaceholder: "현재 경로 검색",
		treeAria: "현재 Markdown 문서에서 시작하는 링크 경로", loading: "링크를 읽는 중…",
		openMarkdown: "Markdown 문서를 열면 작성된 링크 순서가 여기에 표시됩니다.", noLinks: "이 문서에 연결된 Markdown 링크가 없습니다.",
		noSearchResults: "일치하는 링크가 없습니다.", readFailed: "현재 문서의 링크를 읽지 못했습니다.", branchEmpty: "다음 링크 없음",
		cycle: "이미 위 경로에 있는 문서",
	},
	notice: { openMarkdownFirst: "먼저 Wiki 또는 Markdown 문서를 여세요." },
} as const;
