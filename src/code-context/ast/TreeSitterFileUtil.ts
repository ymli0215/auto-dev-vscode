import vscode from "vscode";
import { TreeSitterFile } from "./TreeSitterFile";
import { DefaultLanguageService } from "../../editor/language/service/DefaultLanguageService";

/**
 * Converts a given VSCode text document into a TreeSitterFile.
 *
 * @param document The VSCode text document to convert.
 * @returns The TreeSitterFile representation of the document, or null if the conversion fails.
 */
export async function documentToTreeSitterFile(document: vscode.TextDocument) {
	const cached = TreeSitterFile.cache.getDocument(document.uri, document.version);
	if (cached) {
		return cached;
	}

	const src = document.getText();
	const langId = document.languageId;

	const file = await TreeSitterFile.tryBuild(src, langId, new DefaultLanguageService());
	TreeSitterFile.cache.setDocument(document.uri, document.version, file);
	return file;
}
