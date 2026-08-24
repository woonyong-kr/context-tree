# Linked Canvas UX 계약

이 문서는 Linked Canvas 상호작용의 단일 제품 계약이다. 구현·테스트·UI 검수는 이 문서와 충돌해서는 안 된다.

## 제품 모델

1. Linked Canvas의 핵심 작업은 **연결된 파일을 즉시 발견하고, 같은 원문을 공간 위에서 읽고 편집하며, 필요한 배치를 계속 사용하는 것**이다. 전체 Vault 관계 추론이나 별도 카드 데이터베이스는 범위가 아니다.
2. 제품은 서로 대체하지 않는 두 표면을 제공한다. **Linked Map**은 현재 Markdown의 1-hop을 즉시 읽고 가지를 탐색하는 임시 표면이다. **Linked Canvas**는 Markdown·PDF·이미지·웹 링크·그룹을 자유롭게 배치하는 표준 Obsidian Canvas이며, 연결된 Markdown 범위를 선택적으로 동기화하는 지속 표면이다.
3. Markdown 노트에서 ribbon을 한 번 누르면 Linked Map이 열린다. 같은 노트에서 **Linked Canvas 만들기**를 실행하거나 Map 도구 모음의 Canvas 아이콘을 누르면 표준 `.canvas`가 바로 열린다. 이미 만든 Canvas에서는 **현재 Canvas에 연결 동기화 켜기**를 한 번 실행한다. wizard·폴더 설정·전용 frontmatter는 필요 없다.
4. 내용 정본은 원본 Markdown·PDF·이미지 파일이다. `.canvas`는 위치·크기·그룹·수동 카드·수동 연결선의 정본이다. `.linked-canvas.json` sidecar는 root·seed·제외 목록과 자동 생성 개체 ID만 소유한다. 어느 파일도 다른 파일의 내용을 복제하지 않는다.
5. 기본 연결은 일반 wikilink·embed·backlink다. 새 관계는 `linked_canvas_links`에 기록하고, 기존 `context_tree_links`는 읽기·삭제 호환성을 유지한다. Canvas의 수동 연결선은 기본적으로 시각적 메모이며 사용자가 명시적으로 켠 경우에만 방향성 관계를 Markdown frontmatter에 **추가**한다. 삭제를 역동기화하지 않는다.
6. 기존 `.context-graph` 저장 그래프와 plugin ID `context-graph`는 업데이트 호환성을 위해 유지한다. 새 저장 동작은 `.context-graph`를 만들지 않고 표준 `.canvas`를 만든다. 사용자 화면과 문서의 제품명은 Linked Canvas다.

## 상호작용 깊이

1. 연결된 노트 읽기 지도 열기, 카드 읽기, 인접 노트 펼치기·접기, 오른쪽 원문 편집기 열기, 검색과 필터는 한 번의 직접 동작으로 끝난다. 인접 노트와 원문 편집기는 카드의 직접 동작으로 제공하며 더보기 메뉴를 거치지 않는다. 새 이웃이 없는 카드는 무효한 펼치기 동작을 노출하지 않고, 유효한 동작은 실행 전에 바뀔 노트 수를 이름으로 알려 준다.
2. 현재 Map을 Canvas로 전환, 현재 노트에서 Canvas 생성, 기존 Canvas 활성화, 원문 편집은 각각 한 단계로 끝난다. 일상 동작에서 이름 입력 modal이나 modal 위 modal을 열지 않는다.
3. 그래프에서 카드 제거는 두 단계 이내로 끝나되 Markdown 원문을 변경하지 않는다. 원본 노트를 휴지통으로 보내는 작업만 명시적 경고와 확인을 포함한 세 단계까지 허용한다.
4. 첫 실행은 설정 wizard 대신 현재 노트 주변 그래프와 한 줄 도움말을 보여 준다. 빈 상태의 주 동작은 하나만 제공한다.

## 공간과 카드

1. 일반 카드 클릭은 **제자리에서** Reading 카드를 열거나 닫는다. 카드 좌표와 카메라는 이동하지 않는다. 전체 보기처럼 낮은 배율에서도 열린 카드만 화면상 72%의 최소 읽기 크기를 유지하며, 빈 배경의 휠은 나머지 캔버스를 계속 확대·축소한다. Reading 또는 Source가 열린 동안 현재 카드 좌표 전체는 하나의 공간 문맥으로 보존되며, 카드 크기 측정이 force layout을 다시 깨우지 않는다. 새로 펼친 이웃만 기존 좌표 밖에서 배치될 수 있다.
2. 관계 칩 탐색과 검색 결과 선택처럼 사용자가 명시적으로 `이동`을 선택한 경우에만 카메라를 해당 카드로 이동한다. 카메라 이동도 카드 좌표나 물리 배치를 바꾸지 않는다.
3. Reading과 Source는 같은 카드의 두 표현이다. Source에 들어갈 때 확정한 외곽 폭·높이는 Markdown을 수정하고 Reading으로 돌아와도 카드를 닫을 때까지 유지한다. 바뀐 내용이 길어지면 Source와 Reading 모두 카드 내부에서만 스크롤하며 카드와 다른 카드의 좌표를 바꾸지 않는다.
4. 열린 카드가 화면 가장자리에서 잘릴 위치라면 노드 좌표와 카메라는 유지하고, 해당 위치에서 보이는 가로폭까지만 카드 폭을 줄인다. 중앙이나 충분한 공간에 있는 카드는 기본 문서 폭을 유지한다.
5. Markdown 상세가 아직 렌더링·펼침 중이면 Source 전환은 완성된 Reading 높이를 얻을 때까지 기다린다. 중간 애니메이션 높이를 저장하지 않는다.
6. 카드의 **원본을 오른쪽 편집기로 열기** 아이콘은 같은 Markdown 노트를 현재 그래프 오른쪽의 세로 분할 pane에 한 번에 연다. 이 탐색은 그래프 좌표·카메라·관계를 바꾸지 않는다.

## 포인터와 키보드

1. 배경 드래그는 캔버스를 이동한다. 편집 중인 카드가 고정되지 않았더라도 배경을 끌면 먼저 캔버스를 이동하며, 배경 클릭만 편집 종료를 요청한다.
2. 카드의 제목·요약은 클릭하면 Reading을 열고 닫으며, 5px 이상 끌면 고정·Reading·Source 여부와 무관하게 그 카드만 이동하는 주 drag handle이다. Reading 본문과 Source textarea·스크롤 영역은 선택·편집·스크롤의 고유 동작을 우선한다.
3. 열린 Reading·Source 카드 위 휠은 제목과 여백을 포함해 포인터 아래 카드 내부를 스크롤한다. 배경 위 휠은 포커스와 무관하게 뷰포트 중앙을 기준으로 캔버스를 확대·축소하며, 줌 자체가 화면 중심을 이동시키는 암묵적 pan이 되어서는 안 된다. 검색 패널 위 휠은 검색 패널의 고유 동작을 유지한다.
4. Reading 또는 Source가 열린 동안 사용자가 직접 바꾼 pan·zoom은 카드를 닫아도 유지한다. 카드 열기 전 camera snapshot으로 자동 복귀하지 않는다.
5. 카드의 링크·버튼·입력 요소·관계 칩은 카드 드래그를 시작하지 않는다.

## 관계와 안전

1. 연결점 드래그는 카드 위에서 놓았을 때만 관계를 생성한다.
2. 관계 삭제는 선택된 단일 관계 끝점을 충분히 끌어 **현재 그래프의 빈 캔버스 안**에 놓았을 때만 수행한다. 카드·도구·사이드바·다른 Obsidian 영역에서 놓으면 취소한다.
3. **그래프에서 제거**는 현재 저장된 그래프의 포함 범위만 바꾸며 Markdown 파일과 다른 저장된 그래프에는 영향을 주지 않는다.
4. **원본 노트를 휴지통으로 이동**은 모든 그래프에 영향을 주는 별도 파괴 작업이다. 메뉴 문구와 확인 화면은 그래프 제거와 원본 삭제를 구분한다.
5. 편집 중 view가 닫히거나 plugin이 unload될 때 저장 가능한 draft는 먼저 원문에 반영한다. 충돌이나 I/O 실패로 저장할 수 없는 draft는 local plugin data에 복구 가능하게 보존하며 성공한 저장 뒤 제거한다. 원문에 이미 같은 내용이 저장된 장부는 충돌로 취급하지 않는다.

## Linked Canvas 동기화

1. 생성 직후 root Markdown, outgoing link·embed, backlink의 1-hop만 표준 file card와 방향성 edge로 투영한다. 기본 depth는 1이고 profile parser가 허용하는 최대치는 3이다. 존재하지 않는 파일과 제외한 파일은 범위를 넓히지 않는다.
2. 사용자가 옮기거나 크기를 바꾼 카드, 직접 만든 text·link·group·file card, 수동 연결선과 알 수 없는 JSON Canvas 확장 필드는 그대로 보존한다. 동기화는 자동 생성 edge만 교체하고 카드의 geometry나 수동 개체를 삭제하지 않는다.
3. Canvas에 Markdown file card를 직접 놓으면 그 카드는 추가 seed가 되고 주변 1-hop이 자동으로 나타난다. PDF·이미지는 자체 file card로 유지되지만 탐색 seed가 되지 않는다.
4. 자동 추적 중인 카드를 사용자가 Canvas에서 삭제하면 해당 경로를 제외 목록에 기록해 다시 만들지 않는다. 같은 Markdown을 직접 다시 놓으면 제외를 해제하고 seed로 복원한다.
5. Markdown 링크·embed가 바뀌거나 source·Canvas 파일 이름이 바뀌면 짧은 debounce 뒤 sidecar와 자동 edge를 갱신한다. source 파일명 변경은 file card의 새 path를 따라가며, Canvas 이름 변경은 sidecar 이름과 `canvasPath`를 함께 바꾼다.
6. Canvas가 손상된 JSON이거나 write 중 외부 변경을 감지하면 덮어쓰지 않고 실패한다. Canvas 생성 뒤 sidecar 생성에 실패해도 표준 Canvas는 삭제하지 않는다.
7. plugin을 제거해도 `.canvas`는 Obsidian Canvas에서 그대로 열린다. sidecar는 자동화 장부일 뿐 렌더링 필수 파일이 아니다.

## 도구와 가독성

1. 시각 언어는 **문서 우선의 조용한 작업면**이다. Notion과 같은 문서 도구의 원칙을 따르되 특정 제품의 외형을 복제하지 않는다. Linked Map의 카드와 도구는 Obsidian 테마의 중성 배경·텍스트 변수를 사용하고, 강한 색상·큰 그림자·항상 보이는 버튼 테두리로 내용과 경쟁하지 않는다. Map의 Obsidian 강조색은 시작·중심 카드, 열린 문서와 그 직접 관계, 검색 결과, 선택된 관계, keyboard focus처럼 의미가 있는 상태에만 사용한다. 새 Linked Canvas는 표준 JSON Canvas 색상으로 root·일반 Markdown·PDF·이미지를 절제되게 구분하되 사용자가 정한 기존 카드 색을 덮어쓰거나 카드마다 무작위 색을 배정하지 않는다.
2. 일반 상태의 카드는 얇은 중성 경계와 낮은 그림자만 가진다. hover·focus·drag는 같은 카드 표면의 경계와 높이감만 단계적으로 바꾸며 폭·높이·좌표를 바꾸지 않는다. 카드 동작은 작은 단일 도구 묶음으로 드러나고 각 아이콘을 독립된 장식 상자로 보이게 만들지 않는다.
3. 캔버스는 이동과 배율을 인지할 수 있는 20px 중성 도트 작업면이다. 도트는 텍스트보다 충분히 낮은 대비를 유지한다. 배경, compact 카드, 열린 문서는 서로 다른 세 단계의 중성 surface를 사용하고 열린 문서는 compact 카드보다 위 z-depth와 shadow를 가진다. 관계선은 카드 본문보다 한 단계 낮은 대비를 사용하되 기본 상태에서도 경로를 식별할 수 있고 카드 경계에서 끝나야 한다. hover는 직접 관계를 선명하게 만들 수 있지만 Reading·Source가 열린 동안 다른 카드와 관계를 흐리게 만들지 않는다. 우하단 도구 모음과 검색 패널은 같은 surface·radius 체계를 공유한다.
4. Reading 카드는 Obsidian의 본문 글꼴과 Markdown 계층을, compact 카드와 도구는 interface 글꼴을 사용한다. 플러그인 장식이 Markdown 제목·목록·callout·표의 의미 계층을 덮어쓰지 않는다.
5. 새 카드는 전역 그래프 도구 모음에서만 만든다. 카드 내부에는 중복 `+`를 두지 않는다. 현재 노트 주변 그래프에서는 루트 노트와 같은 폴더에 일반 Markdown으로 만들며 legacy opt-in frontmatter를 추가하지 않는다. 저장된 legacy scope 그래프에서는 해당 그래프의 설정 폴더 또는 안전한 전용 폴더와 호환 marker를 사용한다. 임시 그래프 ID를 Vault 경로로 사용하지 않는다.
6. 그래프 도구 모음은 뷰포트 우하단에 고정한다.
7. 그래프 이름은 Obsidian 탭 제목에만 표시하고 캔버스 위에 중복 텍스트 버튼을 두지 않는다. 임시 Map의 **Linked Canvas로 저장**은 우하단 도구 모음의 Canvas 아이콘으로 한 번에 실행한다. 이름 입력창, 레이어·새로고침·관리 버튼을 두지 않는다.
8. 본문 텍스트는 1.2배로 읽기 쉽게 하되, 아이콘과 버튼의 물리적 크기·위치는 바꾸지 않는다. bookmark는 위치 고정이 아니라 **다른 카드를 열어도 이 카드 유지**이며 유지 여부와 무관하게 카드 프레임을 끌어 이동할 수 있다. 선택 상태는 아이콘과 accent로 함께 표시한다.
9. Reading 본문은 Obsidian의 native Reading View DOM 경계 안에서 `MarkdownRenderer`와 등록된 Markdown post-processor가 직접 렌더링한다. 제목·목록·task·callout·wikilink·embed·수식·코드·표·각주·지원 HTML 등 Obsidian이 지원하는 Markdown 문법을 플러그인이 부분 재구현하거나 평탄화하지 않는다. 문서의 첫 H1과 `[!summary]`는 카드 제목·요약으로 한 번만 표현하고, frontmatter를 포함한 불변 원문 전체는 Source에서 제공한다. 긴 카드의 내부 스크롤은 유지하되, 스크롤바는 hover 또는 focus 중에만 드러내 중첩 패널처럼 보이지 않게 한다.
10. 카드의 직접 동작과 더보기는 같은 hover·keyboard focus 상태에서 드러난다. 낮은 그래프 배율에서도 카드 동작은 제한된 역배율을 적용해 클릭 가능한 크기를 유지하고, 같은 배율로 넓어진 제목 여백과 Source 상단 여백 안에 들어가야 한다. 원본 편집기 동작은 Reading·Source 전환으로 다른 아이콘이 생겨도 더보기 바로 왼쪽의 같은 슬롯을 유지한다.

## 검증 원칙

각 계약 항목은 순수 판정 테스트 또는 UI 상태 전이 테스트를 가진다. 브라우저 렌더 완료·포인터 대상·그래프 외부 드롭처럼 순수 함수만으로 검증할 수 없는 항목은 실제 Obsidian UI에서 별도로 확인한다.

## 구현·검증 연결

| 계약 범위 | 구현 경계 | 자동 검증 |
| --- | --- | --- |
| 제자리 열기와 명시적 탐색 | `card-open-action.ts`, `ContextTreeView.openNode()` | `card-open-action.test.ts` |
| Reading ↔ Source 풋프린트 | `reading-card-layout.ts`, `inline-editor-layout.ts`, `TopicCardRenderer.waitForStableReadingCardHeight()` | `reading-card-layout.test.ts`, `inline-editor-layout.test.ts` |
| 화면 가장자리의 열린 카드 폭 | `open-card-viewport.ts`, `ContextTreeView.paintGraphNow()` | `open-card-viewport.test.ts`, Desktop UI 검증 |
| 오른쪽 원본 pane | `TopicCardRenderer.create()`, `ContextTreeView.openSourceFileBesideGraph()` | `copy.test.ts`, Desktop UI 검증 |
| 가역적 주변 탐색 | `rootedNeighbourhoodAction()`, `collapsePathInScope()`, `ContextTreeView.toggleNodeNeighbourhood()` | `graph-workspace.test.ts`, Desktop UI 검증 |
| 카드 표면·본문 드래그 구분 | `card-pointer-action.ts` | `card-pointer-action.test.ts` |
| 배경 클릭·드래그 구분 | `canvas-pointer-action.ts` | `canvas-pointer-action.test.ts` |
| 휠 소유권과 중앙 기준 줌 | `canvas-wheel-target.ts`, `canvas-wheel-action.ts`, `ContextTreeView.zoomAt()` | `canvas-wheel-target.test.ts`, `canvas-wheel-action.test.ts` |
| Markdown Reading 의미 | `TopicCardRenderer.ensureDetails()`, `createReadingMarkdownFrame()`, `topicDisplayContent()`, `styles.css` | `reading-markdown-frame.test.ts`, `topic-display.test.ts`, Desktop UI 검증 |
| 관계 삭제 드롭 안전성 | `disconnect-drop-action.ts` | `disconnect-drop-action.test.ts` |
| 현재 노트와 1-hop 탐색 | `graph-workspace.ts`, `parser.ts`, `ContextTreePlugin.activateCurrentNote()`, ribbon·Markdown file menu | `graph-workspace.test.ts`, `parser-rooted.test.ts`, copy regression, Desktop UI 검증 |
| 새 카드 저장 위치 | `graphNoteFolder()`, `ContextTreeView.createInlineTopic()` | `graph-workspace.test.ts` |
| 편집 draft 복구 | `inline-editor-draft.ts`, `ContextTreeView` lifecycle, plugin settings | `inline-editor-draft.test.ts`, lifecycle regression |
| 그래프 제거와 원문 휴지통 구분 | `graph-workspace.ts`, card menu callbacks | `graph-workspace.test.ts`, copy regression, Desktop UI 검증 |
| 저장된 그래프 단일 정본 | graph definition adapter, plugin settings migration | graph definition integration regression |
| 표준 Canvas parse·보존·reconcile | `json-canvas.ts` | `json-canvas.test.ts` |
| root·seed·제외·수동 관계 계약 | `linked-canvas-profile.ts` | `linked-canvas-profile.test.ts` |
| bounded link projection | `linked-canvas-projection.ts` | `linked-canvas-projection.test.ts` |
| Vault event·rename·optimistic write 조정 | `linked-canvas-service.ts` | pure contracts + Desktop UI 검증 |

새 상호작용을 추가하거나 기존 항목을 바꿀 때는 이 표의 계약 문장, 구현 경계, 자동 검증을 함께 갱신한다. 테스트만 또는 구현만 별도로 바꾸는 것은 계약 변경으로 인정하지 않는다.

## Desktop 릴리스 회귀 절차

`npm run check` 뒤에 새 `main.js`와 `styles.css`를 테스트 vault에 복사하고
Obsidian에서 플러그인을 다시 활성화한다. 짧은 카드와 화면보다 긴 Markdown 카드를
같이 준비해, 아래 순서를 같은 그래프에서 확인한다. 이 절차의 결과는 릴리스 후보
검토 기록에 남긴다.

1. **도구와 열기:** Markdown 노트를 연 뒤 왼쪽 ribbon의 Linked Canvas 아이콘을 한 번 눌러 해당 노트의 임시 Map이 나타난다. Command Palette와 Markdown 파일 메뉴에서도 같은 노트를 열었을 때 동일한 Map이 나타난다. 활성 Markdown 노트가 없으면 다음 행동을 알리고 저장 그래프로 fallback하지 않는다. Map을 열었을 때 도구 모음은 우하단에 있고 카드 내부에는
   `+`가 없으며 레이어 아이콘과 좌상단 텍스트 버튼도 없다. 그래프 이름은 탭 제목에만 보이고, 임시 탐색의 저장 아이콘은 같은 도구 모음에 있다.
   어떤 배율에서도 카드를 열면 카메라와 카드 중심 좌표가 바뀌지 않는다. 72% 미만에서는
   열린 카드만 화면상 최소 읽기 크기를 유지하고, 빈 배경에서 축소하면 나머지 그래프만
   계속 축소된다.
2. **Reading·Source 이동:** 카드 제목·요약을 클릭하면 카드를 열고 닫고, 5px 이상 끌면
   고정 여부와 무관하게 그 카드만 이동한다. Reading 본문은 텍스트
   선택을, Source textarea·스크롤 영역은 편집과 스크롤을 유지하며, 빈 캔버스는 캔버스만 이동한다.
3. **Source 전환:** 긴 카드를 Source로 전환했을 때 카드 외곽 폭·높이와 다른 카드의
   좌표가 유지된다. 내용을 추가·삭제하고 Reading으로 돌아와도 외곽과 좌표는 그대로이며,
   내용은 카드 내부에서만 스크롤되고 상단 제어 아이콘과 겹치지 않는다.
4. **휠 소유권:** Source textarea에 포커스를 둔 채 포인터를 Reading 본문, Source 편집기,
   배경 위로 각각 옮겨 휠을 사용한다. 카드 위에서는 해당 카드만 스크롤하고 배경에서는
   포커스와 무관하게 뷰포트 중앙 기준으로 그래프만 확대·축소한다. 배경 줌 전후 화면 중심의
   그래프 좌표는 같아야 한다. 그 상태에서 카드를 닫아도 사용자가 정한 pan·zoom은 유지한다.
   검색 패널 위 휠은 검색 결과의 고유 스크롤을 유지한다.
5. **열어두기와 종료:** 열어두지 않은 Source 카드는 배경 클릭으로 Reading으로 돌아가고,
   배경 드래그는 편집을 즉시 닫지 않고 캔버스를 이동한다. 고정한 Source 카드는 배경
   동작으로 닫히거나 포커스를 빼앗기지 않는다.
6. **관계 안전:** 연결점은 다른 카드 위에 놓을 때만 관계를 만든다. 선택된 단일 직접
   관계 끝점만 빈 캔버스에 놓아 제거할 수 있으며, 카드·도구·그래프 밖에 놓으면 취소된다.
7. **주변 탐색:** 새 이웃이 있는 카드의 동작 이름은 실제 추가될 노트 수를 먼저 보여 준다. 주변 노트를 펼치면 카메라와 seed 카드 좌표가
   유지되고 새 카드만 추가된다. 같은 동작을 다시 선택하면 seed는 남고 그 확장 범위만
   접힌다. 새 이웃이 없는 카드에는 무효한 동작이 보이지 않는다.
8. **원본 pane:** 카드의 원본 편집기 아이콘을 한 번 선택하면 같은 노트가
   오른쪽 세로 분할에 열리고, 그래프 카드·카메라·관계는 그대로 남는다.
9. **Markdown Reading:** `##`·`###` 제목 단계, 목록·task, callout, inline/fenced code,
   내부 링크·embed, 수식, 미디어, 표, 각주와 지원 HTML이 Obsidian Reading 의미로
   렌더링되고 등록된 Markdown post-processor가 실행된다. 첫 H1·summary가 본문에
   중복되지 않으며 Source에는 frontmatter를 포함한 전체 원문이 남는다. 긴 카드의
   스크롤바는 평상시 숨고 카드 hover 또는 focus 중에만 얇게 나타난다.
10. **시각 계층:** 기본 테마와 설치된 사용자 테마에서 compact·Reading·Source 카드를
   각각 확인한다. 20px 도트, canvas, compact, 열린 문서의 단계가 색상만으로도 구분되고 열린 문서는 겹친 compact 카드보다 위에 보여야 한다. 중심 카드와 열린 문서·직접 관계에는 같은 theme accent 계열이 적용되며 일반 카드는 중성을 유지해야 한다. compact 카드는 얇은 중성 경계가 있고 관계선은 기본 상태에서도 식별 가능한 중성 저대비이며, 검색·관계 선택·keyboard
   focus만 강조색을 사용한다. 카드 hover와 Source focus는 폭·높이·좌표를 바꾸지 않고,
   열린 카드 hover는 다른 카드와 관계를 지우지 않는다. 카드 동작은 하나의 hover surface로
   보이며 54% 배율에서도 제목·본문과 겹치지 않는다. 우하단 도구 모음,
   검색 패널, 메뉴와 빈 상태는 같은 surface·radius·shadow 체계를 사용한다.
11. **Linked Canvas 생성:** Map 우하단 Canvas 아이콘과 Markdown file menu에서 각각 한 번 실행해 표준 `.canvas`가 열리는지 확인한다. root, outgoing, backlink, link된 이미지·PDF는 file card이고 원문 내용이 복제되지 않아야 한다.
12. **기존 Canvas 활성화:** Markdown·text·image·PDF·group과 수동 edge가 있는 Canvas에서 동기화를 켠다. 모든 기존 geometry와 수동 개체가 유지되고 Markdown 카드의 1-hop만 추가되어야 한다.
13. **양방향 작업:** Canvas에서 Markdown card를 편집하면 원본 `.md`가 바뀌고 다른 editor에서 즉시 보인다. Markdown을 Canvas에 직접 놓으면 주변 카드가 추가되며, 그 카드를 옮기고 크기를 바꾼 뒤 source link를 변경해도 geometry가 유지된다.
14. **제외·재시작:** 자동 card를 삭제한 뒤 sync·plugin 재활성화·Obsidian 재시작을 거쳐도 다시 생기지 않아야 한다. 같은 파일을 직접 다시 놓으면 복원된다. Canvas·source rename도 끊기지 않아야 한다.
15. **관계 쓰기 안전:** 기본 모드에서 수동 Canvas edge가 Markdown을 바꾸지 않는지 확인한다. opt-in 뒤 새 방향성 edge는 `linked_canvas_links`에 한 번만 추가되고, edge 삭제는 원문 관계를 삭제하지 않아야 한다.
16. **비활성 호환성:** 플러그인을 끈 상태에서도 생성·활성화한 `.canvas`를 Obsidian Canvas로 열어 Markdown·PDF·이미지·그룹·text와 수동 edge를 읽고 이동할 수 있어야 한다. `.linked-canvas.json`은 렌더링 필수 파일이 아니다. 확인 뒤 플러그인을 다시 켜고 같은 Canvas를 열었을 때 자동 범위가 이어져야 한다.
17. **공개 미디어:** 같은 릴리스 후보로 Linked Map overview, native Reading, Source, 색상 역할이 보이는 표준 Canvas를 캡처하고 4단계 GIF를 만든다. `docs/release-media.json`의 version·Obsidian version·날짜·크기·SHA-256과 README 참조가 `npm run check:media`를 통과해야 한다.
