import type {
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
} from "n8n-workflow";
import { NodeConnectionTypes } from "n8n-workflow";
import { supplyModel } from "@n8n/ai-node-sdk";

type ModelOptions = {
	temperature?: number;
	maxTokens?: number;
	topP?: number;
};

type ModelListItem = { id: string; name?: string; description?: string };

export class GisooChatModel implements INodeType {
	description: INodeTypeDescription = {
		displayName: "Gisoo Chat Model",
		name: "gisooChatModel",
		icon: { light: 'file:../../icons/gisoo.svg', dark: 'file:../../icons/gisoo.dark.svg' },
		group: ["transform"],
		version: [1],
		description: "Use any Gisoo chat model (Claude, GPT, Gemini, DeepSeek and more) with AI Agent and chains",
		subtitle: "={{$parameter[\"model\"]}}",
		defaults: {
			name: "Gisoo Chat Model",
		},
		codex: {
			categories: ["AI"],
			subcategories: {
				AI: ["Language Models", "Root Nodes"],
				"Language Models": ["Chat Models (Recommended)"],
			},
			resources: {
				primaryDocumentation: [{ url: "https://gisoo.pro/docs/chat" }],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ["Model"],
		credentials: [
			{
				name: "gisooApi",
				required: true,
			},
		],
		properties: [
			{
				displayName: "Model Name or ID",
				name: "model",
				type: "options",
				typeOptions: { loadOptionsMethod: "getChatModels" },
				default: "",
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: "Options",
				name: "options",
				placeholder: "Add Option",
				description: "Additional options to add",
				type: "collection",
				default: {},
				options: [
					{
						displayName: "Maximum Number of Tokens",
						name: "maxTokens",
						type: "number",
						default: 1024,
						typeOptions: { minValue: 1 },
						description: "The maximum number of tokens to generate in the reply",
					},
					{
						displayName: "Sampling Temperature",
						name: "temperature",
						default: 0.7,
						typeOptions: { maxValue: 2, minValue: 0, numberPrecision: 1 },
						description:
							"Controls randomness: lower values give more focused and repeatable replies",
						type: "number",
					},
					{
						displayName: "Top P",
						name: "topP",
						type: "number",
						default: 1,
						typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 2 },
						description: "Nucleus sampling: only tokens within this probability mass are considered",
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getChatModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials("gisooApi");
				const baseUrl = String(credentials.url || "https://gisoo.pro/api/v1").replace(/\/+$/, "");
				const response = (await this.helpers.httpRequestWithAuthentication.call(this, "gisooApi", {
					method: "GET",
					url: `${baseUrl}/models`,
					qs: { type: "chat" },
					json: true,
				})) as { data?: ModelListItem[] };
				return (response.data ?? [])
					.map((model) => ({
						name: model.name || model.id,
						value: model.id,
						description: model.description,
					}))
					.sort((a, b) => a.name.localeCompare(b.name));
			},
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number) {
		const credentials = await this.getCredentials("gisooApi");
		const modelName = this.getNodeParameter("model", itemIndex) as string;
		const options = this.getNodeParameter("options", itemIndex, {}) as ModelOptions;

		return supplyModel(this, {
			type: "openai",
			baseUrl: String(credentials.url || "https://gisoo.pro/api/v1").replace(/\/+$/, ""),
			apiKey: credentials.apiKey as string,
			model: modelName,
			temperature: options.temperature,
			maxTokens: options.maxTokens,
			topP: options.topP,
		});
	}
}
