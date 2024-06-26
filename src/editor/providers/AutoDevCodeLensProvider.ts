import * as vscode from "vscode";
import { l10n } from "vscode";

import { SUPPORTED_LANGUAGES, SupportedLanguage } from "../language/SupportedLanguage";
import { AutoDevExtension } from "../../AutoDevExtension";
import { TreeSitterFileError } from "../../code-context/ast/TreeSitterFile";
import { NamedElement } from "../ast/NamedElement";
import { NamedElementBuilder } from "../ast/NamedElementBuilder";
import { documentToTreeSitterFile } from "../../code-context/ast/TreeSitterFileUtil";

export class AutoDevCodeLensProvider implements vscode.CodeLensProvider {
	constructor(private readonly context: AutoDevExtension) {
	}

	onDidChangeCodeLenses: vscode.Event<void> | undefined;

	provideCodeLenses(
		document: vscode.TextDocument,
		token: vscode.CancellationToken
	): vscode.ProviderResult<vscode.CodeLens[]> {
		return (async () => {
			const languageId = document.languageId as SupportedLanguage;
			if (!SUPPORTED_LANGUAGES.includes(languageId)) {
				return [];
			}

			const file = await documentToTreeSitterFile(document);
			const builder = new NamedElementBuilder(file);
			const methodRanges: NamedElement[] | TreeSitterFileError = builder.buildMethod();
			let lenses: vscode.CodeLens[] = [];

			const docLens = this.setupDocIfNoExist(methodRanges, document);
			const chatLens = this.setupQuickChat(methodRanges, document);

			return lenses.concat(docLens, chatLens);
		})();
	}

	private setupDocIfNoExist(methodRanges: NamedElement[], document: vscode.TextDocument) {
		return methodRanges.map((range) => {
			const title = l10n.t("AutoComment");
			return new vscode.CodeLens(range.identifierRange, {
				title,
				command: "autodev.autoComment",
				arguments: [document, range],
			});
		});
	}

	private setupQuickChat(methodRanges: NamedElement[], document: vscode.TextDocument) {
		return methodRanges.map((range) => {
			const title = `$(autodev-icon)$(chevron-down)`;
			return new vscode.CodeLens(range.identifierRange, {
				title,
				command: "autodev.action.quickAction",
				arguments: [document, range],
			});
		});
	}
}

