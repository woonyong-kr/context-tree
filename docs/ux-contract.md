# Context Graph UX 계약

이 문서는 Context Graph 상호작용의 단일 제품 계약이다. 구현·테스트·UI 검수는 이 문서와 충돌해서는 안 된다.

## 공간과 카드

1. 일반 카드 클릭은 **제자리에서** Reading 카드를 열거나 닫는다. 클릭은 카메라를 이동시키지 않으며, 막 열린 카드의 그래프 좌표는 고정한다. 카드 크기가 바뀐 뒤에는 주변 카드만 충돌 여유 공간을 갱신할 수 있다.
2. 관계 칩 탐색과 검색 결과 선택처럼 사용자가 명시적으로 `이동`을 선택한 경우에만 카메라를 해당 카드로 이동한다. 카메라 이동도 카드 좌표나 물리 배치를 바꾸지 않는다.
3. Reading과 Source는 같은 카드의 두 표현이다. Source에 들어갈 때 확정한 외곽 폭·높이는 Markdown을 수정하고 Reading으로 돌아와도 카드를 닫을 때까지 유지한다. 바뀐 내용이 길어지면 Source와 Reading 모두 카드 내부에서만 스크롤하며 카드와 다른 카드의 좌표를 바꾸지 않는다.
4. Markdown 상세가 아직 렌더링·펼침 중이면 Source 전환은 완성된 Reading 높이를 얻을 때까지 기다린다. 중간 애니메이션 높이를 저장하지 않는다.
5. **더보기 → 원본을 오른쪽에서 열기**는 같은 Markdown 노트를 현재 그래프 오른쪽의 세로 분할 pane에 연다. 이 탐색은 그래프 좌표·카메라·관계를 바꾸지 않는다.

## 포인터와 키보드

1. 배경 드래그는 캔버스를 이동한다. 편집 중인 카드가 고정되지 않았더라도 배경을 끌면 먼저 캔버스를 이동하며, 배경 클릭만 편집 종료를 요청한다.
2. 카드의 제목·요약은 클릭하면 Reading을 열고 닫으며, 5px 이상 끌면 고정·Reading·Source 여부와 무관하게 그 카드만 이동하는 주 drag handle이다. Reading 본문과 Source textarea·스크롤 영역은 선택·편집·스크롤의 고유 동작을 우선한다.
3. Reading 본문과 Source 편집기 위 휠은 포인터 아래 카드 내부를 스크롤한다. 배경 위 휠은 포커스와 무관하게 뷰포트 중앙을 기준으로 캔버스를 확대·축소하며, 줌 자체가 화면 중심을 이동시키는 암묵적 pan이 되어서는 안 된다. 검색 패널 위 휠은 검색 패널의 고유 동작을 유지한다.
4. 카드의 링크·버튼·입력 요소·관계 칩은 카드 드래그를 시작하지 않는다.

## 관계와 안전

1. 연결점 드래그는 카드 위에서 놓았을 때만 관계를 생성한다.
2. 관계 삭제는 선택된 단일 관계 끝점을 충분히 끌어 **현재 그래프의 빈 캔버스 안**에 놓았을 때만 수행한다. 카드·도구·사이드바·다른 Obsidian 영역에서 놓으면 취소한다.

## 도구와 가독성

1. 새 카드는 전역 그래프 도구 모음에서만 만든다. 카드 내부에는 중복 `+`를 두지 않는다.
2. 그래프 도구 모음은 뷰포트 우하단에 고정한다.
3. 다중 그래프 관리는 명령 팔레트의 `지식 그래프 관리`로 진입한다. 도구 모음에는 사용 빈도가 낮고 의미가 모호한 레이어 버튼을 두지 않는다.
4. 본문 텍스트는 1.2배로 읽기 쉽게 하되, 아이콘과 버튼의 물리적 크기·위치는 바꾸지 않는다.
5. Reading 본문은 Obsidian `MarkdownRenderer`의 제목 단계·목록·인용·코드·링크·미디어·표 의미를 유지한다. 긴 카드의 내부 스크롤은 유지하되, 스크롤바는 hover 또는 focus 중에만 드러내 중첩 패널처럼 보이지 않게 한다.

## 검증 원칙

각 계약 항목은 순수 판정 테스트 또는 UI 상태 전이 테스트를 가진다. 브라우저 렌더 완료·포인터 대상·그래프 외부 드롭처럼 순수 함수만으로 검증할 수 없는 항목은 실제 Obsidian UI에서 별도로 확인한다.

## 구현·검증 연결

| 계약 범위 | 구현 경계 | 자동 검증 |
| --- | --- | --- |
| 제자리 열기와 명시적 탐색 | `card-open-action.ts`, `ContextTreeView.openNode()` | `card-open-action.test.ts` |
| Reading ↔ Source 풋프린트 | `reading-card-layout.ts`, `inline-editor-layout.ts`, `TopicCardRenderer.waitForStableReadingCardHeight()` | `reading-card-layout.test.ts`, `inline-editor-layout.test.ts` |
| 오른쪽 원본 pane | `TopicCardRenderer.createMoreMenu()`, `ContextTreeView.openSourceFileBesideGraph()` | `copy.test.ts`, Desktop UI 검증 |
| 카드 표면·본문 드래그 구분 | `card-pointer-action.ts` | `card-pointer-action.test.ts` |
| 배경 클릭·드래그 구분 | `canvas-pointer-action.ts` | `canvas-pointer-action.test.ts` |
| 휠 소유권과 중앙 기준 줌 | `canvas-wheel-target.ts`, `canvas-wheel-action.ts`, `ContextTreeView.zoomAt()` | `canvas-wheel-target.test.ts`, `canvas-wheel-action.test.ts` |
| Markdown Reading 의미 | `TopicCardRenderer.ensureDetails()`, `topicDisplayContent()`, `styles.css` | `topic-display.test.ts`, Desktop UI 검증 |
| 관계 삭제 드롭 안전성 | `disconnect-drop-action.ts` | `disconnect-drop-action.test.ts` |

새 상호작용을 추가하거나 기존 항목을 바꿀 때는 이 표의 계약 문장, 구현 경계, 자동 검증을 함께 갱신한다. 테스트만 또는 구현만 별도로 바꾸는 것은 계약 변경으로 인정하지 않는다.

## Desktop 릴리스 회귀 절차

`npm run check` 뒤에 새 `main.js`와 `styles.css`를 테스트 vault에 복사하고
Obsidian에서 플러그인을 다시 활성화한다. 짧은 카드와 화면보다 긴 Markdown 카드를
같이 준비해, 아래 순서를 같은 그래프에서 확인한다. 이 절차의 결과는 릴리스 후보
검토 기록에 남긴다.

1. **도구와 열기:** 그래프 명령으로 열었을 때 도구 모음은 우하단에 있고 카드 내부에는
   `+`가 없으며 레이어 아이콘도 없다. 명령 팔레트의 `지식 그래프 관리`는 정상적으로 관리 화면을 연다.
   카드를 열어도 카메라와 막 열린 카드의 좌표는 바뀌지 않는다.
2. **Reading·Source 이동:** 카드 제목·요약을 클릭하면 카드를 열고 닫고, 5px 이상 끌면
   고정 여부와 무관하게 그 카드만 이동한다. Reading 본문은 텍스트
   선택을, Source textarea·스크롤 영역은 편집과 스크롤을 유지하며, 빈 캔버스는 캔버스만 이동한다.
3. **Source 전환:** 긴 카드를 Source로 전환했을 때 카드 외곽 폭·높이와 다른 카드의
   좌표가 유지된다. 내용을 추가·삭제하고 Reading으로 돌아와도 외곽과 좌표는 그대로이며,
   내용은 카드 내부에서만 스크롤되고 상단 제어 아이콘과 겹치지 않는다.
4. **휠 소유권:** Source textarea에 포커스를 둔 채 포인터를 Reading 본문, Source 편집기,
   배경 위로 각각 옮겨 휠을 사용한다. 카드 위에서는 해당 카드만 스크롤하고 배경에서는
   포커스와 무관하게 뷰포트 중앙 기준으로 그래프만 확대·축소한다. 배경 줌 전후 화면 중심의
   그래프 좌표는 같아야 한다. 검색 패널 위 휠은 검색 결과의 고유 스크롤을 유지한다.
5. **고정과 종료:** 고정하지 않은 Source 카드는 배경 클릭으로 Reading으로 돌아가고,
   배경 드래그는 편집을 즉시 닫지 않고 캔버스를 이동한다. 고정한 Source 카드는 배경
   동작으로 닫히거나 포커스를 빼앗기지 않는다.
6. **관계 안전:** 연결점은 다른 카드 위에 놓을 때만 관계를 만든다. 선택된 단일 직접
   관계 끝점만 빈 캔버스에 놓아 제거할 수 있으며, 카드·도구·그래프 밖에 놓으면 취소된다.
7. **원본 pane:** 카드의 **더보기 → 원본을 오른쪽에서 열기**를 선택하면 같은 노트가
   오른쪽 세로 분할에 열리고, 그래프 카드·카메라·관계는 그대로 남는다.
8. **Markdown Reading:** `##`·`###` 제목 단계, 목록, 인용, inline/fenced code, 내부 링크,
   미디어와 표가 Obsidian Reading 의미로 구분되어 보인다. 긴 카드의 스크롤바는 평상시
   숨고 카드 hover 또는 focus 중에만 얇게 나타난다.
