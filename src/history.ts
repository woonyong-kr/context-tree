export interface NavigationHistoryState {
	canBack: boolean;
	canForward: boolean;
}

export class SessionNavigationHistory {
	private readonly entries: string[] = [];
	private index = -1;

	record(path: string): void {
		if (this.entries[this.index] === path) return;
		this.entries.splice(this.index + 1);
		this.entries.push(path);
		this.index = this.entries.length - 1;
	}

	state(): NavigationHistoryState {
		return {
			canBack: this.index > 0,
			canForward: this.index >= 0 && this.index < this.entries.length - 1,
		};
	}

	target(delta: -1 | 1): string | null {
		return this.entries[this.index + delta] ?? null;
	}

	commit(delta: -1 | 1): string | null {
		const target = this.target(delta);
		if (!target) return null;
		this.index += delta;
		return target;
	}
}
