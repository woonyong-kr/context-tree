import { COPY_EN } from "./copy-en";
import { COPY_KO } from "./copy-ko";

function isKoreanLanguage(): boolean {
	const language = typeof document !== "undefined" ? document.documentElement.lang : "";
	const fallback = typeof navigator !== "undefined" ? navigator.language : "";
	return (language || fallback).toLowerCase().startsWith("ko");
}

export const COPY = isKoreanLanguage() ? COPY_KO : COPY_EN;
