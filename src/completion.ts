import {CompletionContext, CompletionResult} from "@codemirror/autocomplete";

export class Completion {
	speakers: { label: string, type: string }[];
	boughs: { label: string, type: string }[];

	constructor() {
		this.speakers = [];
		this.boughs = [];
	}

	updateSpeakers(source: string) {
		const speakerRegEx = /^\s*:(\w*)?:/gm;
		let match;
		const speakers = new Set<string>();
		while ((match = speakerRegEx.exec(source)) !== null) {
			if (match[1]) speakers.add(match[1]);
		}
		this.speakers = [...speakers].map(s => ({ label: s, type: 'variable'}));
	}

	updateBoughs(source: string) {
		const boughRegEx = /^\s*===\s*(\w*)/gm;
		let match;
		const boughs = new Set<string>();
		while ((match = boughRegEx.exec(source)) !== null) {
			if (match[1]) boughs.add(match[1]);
		}
		this.boughs = [...boughs].map(b => ({ label: b, type: 'variable' }));
	}
}

export const getCompletions = (completion: Completion) => (context: CompletionContext): CompletionResult | null => {
	const speaker = context.matchBefore(/:/);
	if (speaker != null) return {
		from: speaker.from,
		options: completion.speakers,
	}

	const bough = context.matchBefore(/=>\s*/);
	if (bough != null) return {
		from:bough.from,
		options: completion.boughs
	}
	return null;
}
