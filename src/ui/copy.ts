import { COPY_EN } from "./copy-en";
import { COPY_KO } from "./copy-ko";

function isKoreanLanguage(): boolean {
	const language = typeof document !== "undefined" ? document.documentElement.lang : "";
	const fallback = typeof navigator !== "undefined" ? navigator.language : "";
	return (language || fallback).toLowerCase().startsWith("ko");
}

/** User-facing copy follows Obsidian's language; Korean remains the local UX. */
export const COPY = isKoreanLanguage() ? COPY_KO : COPY_EN;

export function cardToggleLabel(title: string): string {
	return isKoreanLanguage()
		? `${title} 카드 열기 또는 닫기`
		: `Open or close ${title}`;
}

export function graphPhysicsSettingName(graphName: string, settingName: string): string {
	return `${graphName} · ${settingName}`;
}

export function movedToTrashNotice(title: string): string {
	return isKoreanLanguage()
		? `${title} 원본 노트를 휴지통으로 이동했습니다.`
		: `Moved the source note for ${title} to trash.`;
}
