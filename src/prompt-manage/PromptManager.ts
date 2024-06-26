import vscode from "vscode";

import { VSCodeTemplateLoader } from "./loader/VSCodeTemplateLoader";
import { TemplateRender } from "./template/TemplateRender";
import { TemplateContext } from "./template/TemplateContext";
import { ToolchainContextManager } from "../toolchain-context/ToolchainContextManager";
import { CreateToolchainContext, ToolchainContextItem } from "../toolchain-context/ToolchainContextProvider";
import { ActionType } from "./ActionType";
import { CustomActionTemplateContext } from "./custom-action/CustomActionTemplateContext";
import { CustomActionExecutePrompt } from "./custom-action/CustomActionExecutePrompt";

export class PromptManager {
	private static _instance: PromptManager;
	private templateLoader: VSCodeTemplateLoader;

	private constructor() {
		this.templateLoader = new VSCodeTemplateLoader();
	}

	static getInstance(): PromptManager {
		if (!PromptManager._instance) {
			PromptManager._instance = new PromptManager();
		}
		return PromptManager._instance;
	}

	async collectToolchain(context: CreateToolchainContext): Promise<ToolchainContextItem[]> {
		return ToolchainContextManager.instance().collectContextItems(context);
	}

	async constructContext(): Promise<CustomActionTemplateContext> {
		return Promise.reject("Not implemented");
	}

	/**
	 * Constructs a custom-action intention prompt using the [Velocity] templating engine.
	 *
	 * This function is used to generate a custom-action prompt message for an intention action based on the provided PsiElement, selected text,
	 * before and after cursor text. It uses a set of [VariableResolver]s to resolve variables within the template and populate the
	 * [VelocityContext].
	 *
	 * The [VelocityContext] is then used to evaluate the template and generate the prompt message.
	 *
	 */
	async constructCustomPrompt(): Promise<CustomActionExecutePrompt[]> {
		return [];
	}

	/**
	 * Asynchronously builds a string based on the specified ActionType and TemplateContext.
	 *
	 * @param type The ActionType enum value indicating the type of action to perform.
	 * @param context The TemplateContext object containing data to be used in the template rendering.
	 * @returns A Promise that resolves to a string generated by rendering the template with the provided context.
	 */
	async templateToPrompt(type: ActionType, context: TemplateContext): Promise<string> {
		let templateRender = new TemplateRender(this.templateLoader);
		let template: string | undefined;

		// we only support for zh-cn-cn and en only, if the language is not supported, we default to en
		let humanLanguage = vscode.env.language;
		if (humanLanguage !== "zh-cn") {
			humanLanguage = "en";
		}

		switch (type) {
			case ActionType.AutoDoc:
				template = await templateRender.getTemplate(`prompts/genius/${humanLanguage}/code/auto-doc.vm`);
				break;
			case ActionType.AutoTest:
				template = await templateRender.getTemplate(`prompts/genius/${humanLanguage}/code/test-gen.vm`);
				break;
			case ActionType.GenApiData:
				template = await templateRender.getTemplate(`prompts/genius/${humanLanguage}/code/gen-api-data.vm`);
		}

		if (!template) {
			throw new Error(`No template found for action type ${type}`);
		}

		return templateRender.render(template, context);
	}
}