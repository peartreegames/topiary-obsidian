import {CompletionContext, CompletionResult} from "@codemirror/autocomplete";
import {App} from "obsidian";

export class Completion {
	speakers: { label: string }[];
	boughs: { label: string }[];

	constructor(app: App) {
		this.speakers = [];
		this.boughs = [];
		for(const file of app.vault.getFiles()) {
			switch (file.extension) {
				case 'md': {
					const data = app.metadataCache.getFileCache(file);
					if (!data?.frontmatter?.tags?.includes("topiSpeaker")) continue;
					this.speakers.push({ label: file.basename });
					break;
				}
				case 'topi': {
				}
			}
		}
	}

	updateSpeakers(source: string) {
		const speakerRegEx = /^\s*:(\w*)?:/gm;
		let match;
		const speakers = new Set<string>();
		while ((match = speakerRegEx.exec(source)) !== null) {
			if (match[1]) speakers.add(match[1]);
		}
		this.speakers = [...speakers].map(s => ({ label: s}));
	}

	updateBoughs(source: string) {
		const boughRegEx = /^\s*===\s*(\w*)/gm;
		let match;
		const boughs = new Set<string>();
		while ((match = boughRegEx.exec(source)) !== null) {
			if (match[1]) boughs.add(match[1]);
		}
		this.boughs = [...boughs].map(b => ({ label: b }));
	}
}

export const getCompletions = (completion: Completion) => (context: CompletionContext): CompletionResult | null => {
	console.log(context)
	const speaker = context.matchBefore(/^\s*:/);
	if (speaker !== null) {
		return {
			from: speaker.from,
			options: completion.speakers,
		}
	}

	const bough = context.matchBefore(/^\s*=>\s/);
	if (bough != null) return {
		from:bough.from,
		options: completion.boughs
	}
	return null;
}
