import { describe, expect, it, spyOn } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { type CliConfig, type CommandMetadata, renderRootHelp } from "@oh-my-pi/pi-utils/cli";
import type { Translator } from "@oh-my-pi/pi-utils/i18n-core";
import { initializeHelpI18n } from "../src/cli/help-i18n";

const config: CliConfig<CommandMetadata> = {
	bin: "omp",
	version: "test",
	commands: new Map([["read", { description: "Read a file" }]]),
};

function render(translate?: Translator): string {
	const chunks: string[] = [];
	const stdout = spyOn(process.stdout, "write").mockImplementation(chunk => {
		chunks.push(String(chunk));
		return true;
	});
	try {
		renderRootHelp(config, translate);
	} finally {
		stdout.mockRestore();
	}
	return chunks.join("");
}

describe("root help language initialization", () => {
	it("preserves existing English output by default and for unsupported languages", async () => {
		expect(render(await initializeHelpI18n())).toBe(render());
		expect(render(await initializeHelpI18n({ language: "fr" }))).toBe(render());
		expect(render()).toContain("USAGE\n  $ omp [COMMAND]");
		expect(render()).toContain("COMMANDS\n  read  Read a file");
	});

	it("loads an explicit pack only for an explicitly selected non-English language", async () => {
		const directory = await fs.mkdtemp(path.join(os.tmpdir(), "omp-help-i18n-"));
		const packFile = path.join(directory, "custom.json");
		try {
			await Bun.write(
				packFile,
				JSON.stringify({
					"USAGE\u0004cli.root-help.usage-heading": "사용법",
					"COMMANDS\u0004cli.root-help.commands-heading": "명령어",
					"Read a file": "must not translate command metadata",
				}),
			);
			expect(render(await initializeHelpI18n({ packFile }))).toBe(render());
			expect(render(await initializeHelpI18n({ language: "en", packFile }))).toBe(render());
			const output = render(await initializeHelpI18n({ language: "ko-KR", packFile }));
			expect(output).toContain("사용법\n  $ omp [COMMAND]");
			expect(output).toContain("명령어\n  read  Read a file");
			expect(output).not.toContain("\u0004");
			expect(render()).toContain("USAGE");
		} finally {
			await fs.rm(directory, { recursive: true, force: true });
		}
	});

	it("keeps help available for missing, malformed, and invalid packs", async () => {
		const directory = await fs.mkdtemp(path.join(os.tmpdir(), "omp-help-i18n-"));
		const packFile = path.join(directory, "invalid.json");
		try {
			expect(render(await initializeHelpI18n({ language: "ko", packFile }))).toBe(render());
			for (const content of ["{", "[]", '{"USAGE\\u0004cli.root-help.usage-heading":"{0}"}']) {
				await Bun.write(packFile, content);
				expect(render(await initializeHelpI18n({ language: "ko", packFile }))).toBe(render());
			}
		} finally {
			await fs.rm(directory, { recursive: true, force: true });
		}
	});
});
