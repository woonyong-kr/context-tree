# Context Graph UX 계약

이 문서는 Context Graph 상호작용의 단일 제품 계약이다. 구현·테스트·UI 검수는 이 문서와 충돌해서는 안 된다.

## 공간과 카드

1. 일반 카드 클릭은 **제자리에서** Reading 카드를 열거나 닫는다. 클릭은 카메라를 이동시키지 않으며, 막 열린 카드의 그래프 좌표는 고정한다. 카드 크기가 바뀐 뒤에는 주변 카드만 충돌 여유 공간을 갱신할 수 있다.
2. 관계 칩 탐색과 검색 결과 선택처럼 사용자가 명시적으로 `이동`을 선택한 경우에만 카메라를 해당 카드로 이동한다. 카메라 이동도 카드 좌표나 물리 배치를 바꾸지 않는다.
3. Reading과 Source는 같은 카드의 두 표현이다. 전환 중 카드의 외곽 폭·높이와 다른 카드의 좌표는 유지된다. Source 편집기는 카드 내부에서만 스크롤한다.
4. Markdown 상세가 아직 렌더링·펼침 중이면 Source 전환은 완성된 Reading 높이를 얻을 때까지 기다린다. 중간 애니메이션 높이를 저장하지 않는다.

## 포인터와 키보드

1. 배경 드래그는 캔버스를 이동한다. 편집 중인 카드가 고정되지 않았더라도 배경을 끌면 먼저 캔버스를 이동하며, 배경 클릭만 편집 종료를 요청한다.
2. 열린 Reading 카드의 테두리·여백 드래그는 그 카드만 이동한다. 본문 Markdown 텍스트는 선택·복사의 고유 동작을 우선한다.
3. Source 편집기 위 휠은 편집기 내부를 스크롤하고, 배경 위 휠은 포커스와 무관하게 캔버스를 확대·축소한다. 검색 패널 위 휠은 검색 패널의 고유 동작을 유지한다.
4. 카드의 링크·버튼·입력 요소·관계 칩은 카드 드래그를 시작하지 않는다.

## 관계와 안전

1. 연결점 드래그는 카드 위에서 놓았을 때만 관계를 생성한다.
2. 관계 삭제는 선택된 단일 관계 끝점을 충분히 끌어 **현재 그래프의 빈 캔버스 안**에 놓았을 때만 수행한다. 카드·도구·사이드바·다른 Obsidian 영역에서 놓으면 취소한다.

## 도구와 가독성

1. 새 카드는 전역 그래프 도구 모음에서만 만든다. 카드 내부에는 중복 `+`를 두지 않는다.
2. 그래프 도구 모음은 뷰포트 우하단에 고정한다.
3. 본문 텍스트는 1.2배로 읽기 쉽게 하되, 아이콘과 버튼의 물리적 크기·위치는 바꾸지 않는다.

## 검증 원칙

각 계약 항목은 순수 판정 테스트 또는 UI 상태 전이 테스트를 가진다. 브라우저 렌더 완료·포인터 대상·그래프 외부 드롭처럼 순수 함수만으로 검증할 수 없는 항목은 실제 Obsidian UI에서 별도로 확인한다.

## 구현·검증 연결

| 계약 범위 | 구현 경계 | 자동 검증 |
| --- | --- | --- |
| 제자리 열기와 명시적 탐색 | `card-open-action.ts`, `ContextTreeView.openNode()` | `card-open-action.test.ts` |
| Reading ↔ Source 풋프린트 | `reading-card-layout.ts`, `TopicCardRenderer.waitForStableReadingCardHeight()` | `reading-card-layout.test.ts`, `inline-editor-layout.test.ts` |
| 카드 표면·본문 드래그 구분 | `card-pointer-action.ts` | `card-pointer-action.test.ts` |
| 배경 클릭·드래그 구분 | `canvas-pointer-action.ts` | `canvas-pointer-action.test.ts` |
| 휠 소유권 | `canvas-wheel-target.ts`, `canvas-wheel-action.ts` | `canvas-wheel-target.test.ts`, `canvas-wheel-action.test.ts` |
| 관계 삭제 드롭 안전성 | `disconnect-drop-action.ts` | `disconnect-drop-action.test.ts` |

새 상호작용을 추가하거나 기존 항목을 바꿀 때는 이 표의 계약 문장, 구현 경계, 자동 검증을 함께 갱신한다. 테스트만 또는 구현만 별도로 바꾸는 것은 계약 변경으로 인정하지 않는다.
