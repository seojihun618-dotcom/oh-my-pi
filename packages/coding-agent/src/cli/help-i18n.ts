import { createTranslator, englishSource, type Translator } from "@oh-my-pi/pi-utils/i18n-core";

/** Only root-help headings opt in; importing this module never loads a pack. */
export async function initializeHelpI18n(options: { language?: string; packFile?: string } = {}): Promise<Translator> {
	const language = (options.language ?? "en").toLowerCase().split(/[-_.]/, 1)[0];
	if (!language || language === "en" || !options.packFile) return englishSource;
	try {
		return createTranslator(await Bun.file(options.packFile).json());
	} catch {
		// An optional presentation pack must never prevent CLI help from opening.
		return englishSource;
	}
}
