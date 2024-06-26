import vscode, { l10n } from "vscode";
import { injectable } from "inversify";

import { TestGenProvider } from "../_base/test/TestGenProvider";
import { CodeStructure } from "../../editor/codemodel/CodeFile";
import { TSLanguageService } from "../../editor/language/service/TSLanguageService";
import { AutoTestTemplateContext } from "../_base/test/AutoTestTemplateContext";
import { GradleBuildToolProvider } from "../../toolchain-context/buildtool/GradleBuildToolProvider";
import { ToolchainContextItem, CreateToolchainContext } from "../../toolchain-context/ToolchainContextProvider";
import { MvcUtil } from "./JavaMvcUtil";
import { TestTemplateFinder } from "../TestTemplateFinder";
import { SupportedLanguage } from "../../editor/language/SupportedLanguage";
import { NamedElement } from "../../editor/ast/NamedElement";

@injectable()
export class JavaTestGenProvider implements TestGenProvider {
	baseTestPrompt: string = `${l10n.t("lang.java.prompt.basicTestTemplate")}`.trim();
	// write a regex for java import statement
	importRegex = /import\s+([\w.]+);/g;

	isApplicable(lang: SupportedLanguage): boolean {
		return lang === "java";
	}

	private context: AutoTestTemplateContext | undefined;
	private languageService: TSLanguageService | undefined;

	constructor() {
	}

	async setup(defaultLanguageService: TSLanguageService, context?: AutoTestTemplateContext) {
		this.languageService = defaultLanguageService;
		this.context = context;
	}

	async findOrCreateTestFile(sourceFile: vscode.TextDocument, element: NamedElement): Promise<AutoTestTemplateContext> {
		const language = sourceFile.languageId;

		const targetPath = sourceFile.fileName.replace(".java", "Test.java");

		const testContext: AutoTestTemplateContext = {
			filename: sourceFile.fileName,
			language: language,
			targetPath: targetPath,
			testClassName: element.identifierRange.text,
			sourceCode: element.blockRange.text,
			relatedClasses: [],
			imports: [],
		};

		const targetUri = vscode.Uri.file(targetPath);
		await vscode.workspace.fs.writeFile(targetUri, new Uint8Array());

		return Promise.resolve(testContext);
	}

	lookupRelevantClass(element: any): Promise<CodeStructure> {
		throw new Error("Method not implemented.");
	}

	private clazzName = "JavaTestContextProvider";

	async collect(context: AutoTestTemplateContext): Promise<ToolchainContextItem[]> {
		const fileName = context.filename;

		let isSpringRelated = true;
		if (context) {
			const imports = this.importRegex.exec(context.sourceCode!!);
			const importStrings = imports?.map((imp) => imp[1]) ?? [];
			this.context!!.imports = imports?.map((imp) => imp[1]) ?? [];
			isSpringRelated = this.checkIsSpringRelated(importStrings) ?? false;
		}

		let prompt = this.baseTestPrompt + await this.junitRule();

		const testPrompt = new TestTemplateFinder();
		let finalPrompt: ToolchainContextItem;

		if (this.isController(fileName) && isSpringRelated) {
			let testControllerPrompt = prompt + `\n${l10n.t("lang.java.prompt.testForController")}\n`.trim();

			const lookup = testPrompt.lookup("ControllerTest.java");
			if (lookup !== null) {
				testControllerPrompt += `\nTest code template:\n\`\`\`java\n${lookup}\n\`\`\`\n`;
			}

			finalPrompt = { clazz: this.clazzName, text: testControllerPrompt };
		} else if (this.isService(fileName) && isSpringRelated) {
			let testServicePrompt = prompt + `\n${l10n.t("lang.java.prompt.testForService")}\n`.trim();

			const lookup = testPrompt.lookup("ServiceTest.java");
			if (lookup !== null) {
				testServicePrompt += `\nTest code template:\n\`\`\`java\n${lookup}\n\`\`\`\n`;
			}

			finalPrompt = { clazz: this.clazzName, text: testServicePrompt };
		} else {
			const lookup = testPrompt.lookup("Test.java");
			if (lookup !== null) {
				prompt += `\nTest code template:\n\`\`\`java\n${lookup}\n\`\`\`\n`;
			}
			finalPrompt = { clazz: this.clazzName, text: prompt };
		}

		return [finalPrompt];
	}

	protected isService(fileName: string | null): boolean {
		return fileName !== null && MvcUtil.isService(fileName, "java");
	}

	protected isController(fileName: string | null): boolean {
		return fileName !== null && MvcUtil.isController(fileName, "java");
	}

	async junitRule(): Promise<string> {
		let dependencies = await GradleBuildToolProvider.instance().getDependencies();
		let rule = "";
		let hasJunit5 = false;
		let hasJunit4 = false;

		const libraryData = dependencies.dependencies;
		if (libraryData) {
			for (const lib of libraryData) {
				if (lib.group === "org.junit.jupiter") {
					hasJunit5 = true;
					break;
				}

				if (lib.group === "junit") {
					hasJunit4 = true;
					break;
				}
			}
		}

		if (hasJunit5) {
			rule = l10n.t("lang.java.prompt.useJunit5");
		} else if (hasJunit4) {
			rule = l10n.t("lang.java.prompt.useJunit4");
		}

		return rule;
	}

	private checkIsSpringRelated(imports: string[]) {
		for (const imp of imports) {
			if (imp.startsWith("org.springframework")) {
				return true;
			}
		}
	}
}