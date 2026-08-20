/** User-facing copy is centralised so the graph stays consistent and localisable. */
export const COPY = {
	view: {
		title: "지식 그래프",
		openCommand: "기본 지식 그래프 열기",
		manageCommand: "지식 그래프 관리",
		refreshCommand: "지식 그래프 새로고침",
		aria: "지식 그래프. 드래그로 이동하고 마우스 휠로 확대 또는 축소합니다.",
	},
	actions: {
		addExistingNote: "기존 노트 추가",
		searchGraph: "그래프 검색",
		filterRelations: "관계 필터",
		manageGraphs: "지식 그래프 관리",
		createGraph: "새 지식 그래프 만들기",
		openGraph: "그래프 열기",
		newCard: "새 카드",
		createCard: "새 카드 만들기",
		refresh: "새로고침",
		zoomIn: "확대",
		zoomOut: "축소",
		resetView: "그래프 보기 초기화",
		dragToConnect: "연결점에서 끌기",
		pinCard: "카드 고정",
		unpinCard: "카드 고정 해제",
		editCard: "카드에서 Markdown 편집",
		finishEditing: "편집 마치고 읽기 모드로 전환",
		copyDraft: "내 편집 복사",
		reloadSource: "원문 다시 불러오기",
		openSource: "원문 열기",
		more: "더보기",
		moveToTrash: "삭제",
		removeConnection: "연결 삭제",
		cancel: "취소",
	},
	labels: {
		selectGraphNote: "이 그래프에 추가할 노트 선택",
		searchPlaceholder: "카드 제목·요약·본문 검색",
		relationFilters: "표시할 관계",
		searchNoResults: "일치하는 카드가 없습니다",
		graphName: "그래프 이름",
		graphScope: "노트 범위",
		graphFolder: "대상 폴더",
		allNotes: "모든 context_tree 노트",
		folderNotes: "폴더 아래의 노트",
		curatedNotes: "직접 추가한 노트",
		newTopicTitle: "새 주제",
		inlineMarkdownEditor: "원본 Markdown 편집기",
		emptyTitle: "포함된 노트가 없습니다",
		emptyFolderScope: (folder: string) => `“${folder}” 범위에서 그래프에 포함할 노트를 찾지 못했습니다.`,
		emptyCuratedScope: "이 작업공간에는 아직 직접 추가한 노트가 없습니다.",
		emptyAllScope: "이 작업공간에 표시할 그래프 노트가 아직 없습니다.",
		emptyNextStep: "노트 범위를 조정하거나 첫 카드를 만들어 이 작업공간을 시작하세요.",
	},
	settings: {
		graphSettingsDescription: "그래프마다 물리 설정을 독립적으로 저장합니다. 노트 범위와 기존 노트 추가는 지식 그래프 화면의 그래프 관리에서 설정합니다.",
		graphFolderPlaceholder: "maps/learning",
		physicsHeading: "그래프 물리",
		physicsDescription: "그래프의 모든 카드가 서로 밀고 연결선이 당기는 정도를 조절합니다. 화면 위치나 Markdown 내용은 바꾸지 않습니다.",
		linkStrengthName: "연결 강도",
		linkStrengthDescription: "연결된 카드가 서로 끌어당기는 힘입니다. 높을수록 연결된 항목이 가깝게 유지됩니다.",
		repulsionName: "반발력",
		repulsionDescription: "모든 카드가 서로 밀어내는 힘입니다. 높을수록 그래프가 넓게 퍼집니다.",
		linkGapName: "연결 간격",
		linkGapDescription: "연결된 카드 테두리 사이의 기본 여백입니다. 높을수록 관계선이 길어집니다.",
	},
	modal: {
		graphsTitle: "지식 그래프",
		graphsDescription: "그래프는 Markdown 노트를 복제하지 않는 독립 작업공간입니다. 같은 노트는 여러 그래프에서 재사용할 수 있습니다.",
		newGraphHeading: "새 지식 그래프",
		trashTitle: "카드를 삭제할까요?",
		trashDescription: (title: string) => `${title} 카드를 삭제합니다. 휴지통에서 복원하면 연결도 다시 사용할 수 있습니다.`,
		reloadSourceTitle: "원문을 다시 불러올까요?",
		reloadSourceDescription: "현재 카드의 저장되지 않은 편집은 사라집니다. 먼저 ‘내 편집 복사’로 내용을 보관할 수 있습니다.",
	},
	notice: {
		finishEditing: "열린 카드 편집을 먼저 저장하거나 취소하세요.",
		sourceMissing: "원문 노트를 찾을 수 없습니다.",
		openMarkdownFailed: "Markdown 편집기를 열지 못했습니다.",
		inlineSaveFailed: "Markdown 저장에 실패했습니다. 내용을 유지한 채 다시 시도합니다.",
		inlineSaveConflict: "다른 곳에서 수정된 원문을 감지했습니다. 현재 편집은 보존했고 자동 저장을 멈췄습니다.",
		inlineDraftCopied: "현재 편집을 클립보드에 복사했습니다.",
		createFailed: "새 카드를 만들지 못했습니다.",
		connectFailed: "카드를 연결하지 못했습니다.",
		connectionRemoved: "연결을 삭제했습니다.",
		connectionRemoveFailed: "연결을 삭제하지 못했습니다.",
		connectionRemoveAmbiguous: "한 선에 여러 관계가 있어 여기서 삭제하지 않았습니다. 관계별 편집은 원문 Markdown에서 할 수 있습니다.",
		trashFailed: "카드를 삭제하지 못했습니다.",
		graphDefinitionInvalid: "이 지식 그래프 파일을 읽지 못했습니다. 파일 내용을 확인하세요.",
		renderFailed: "이 카드를 렌더링하지 못했습니다. 원문 노트에서 Markdown을 확인하세요.",
	},
} as const;

export function cardToggleLabel(title: string): string {
	return `${title} 카드 열기 또는 닫기`;
}

/** Settings API renders graph controls without the legacy graph heading. */
export function graphPhysicsSettingName(graphName: string, settingName: string): string {
	return `${graphName} · ${settingName}`;
}

export function movedToTrashNotice(title: string): string {
	return `${title} 카드를 삭제했습니다.`;
}
