import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription, JsonObject 
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

type ModelListItem = { id: string; name?: string; description?: string };

const DEFAULT_BASE_URL = 'https://gisoo.pro/api/v1';

async function loadModels(
	context: ILoadOptionsFunctions,
	type: string,
): Promise<INodePropertyOptions[]> {
	const credentials = await context.getCredentials('gisooApi');
	const baseUrl = String(credentials.url || DEFAULT_BASE_URL).replace(/\/+$/, '');
	const response = (await context.helpers.httpRequestWithAuthentication.call(context, 'gisooApi', {
		method: 'GET',
		url: `${baseUrl}/models`,
		qs: { type },
		json: true,
	})) as { data?: ModelListItem[] };
	return (response.data ?? [])
		.map((model) => ({
			name: model.name || model.id,
			value: model.id,
			description: model.description,
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}

export class Gisoo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Gisoo',
		name: 'gisoo',
		icon: { light: 'file:../../icons/gisoo.svg', dark: 'file:../../icons/gisoo.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Chat, create images and embeddings with Gisoo AI models',
		defaults: {
			name: 'Gisoo',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'gisooApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'Chat', value: 'chat' },
					{ name: 'Embedding', value: 'embedding' },
					{ name: 'Image', value: 'image' },
					{ name: 'Model', value: 'model' },
				],
				default: 'chat',
			},

			// Account
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['account'] } },
				options: [
					{
						name: 'Get',
						value: 'get',
						action: 'Get account balance and limits',
						description: 'Read the balance and limits of the API key (free)',
					},
				],
				default: 'get',
			},

			// Chat
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['chat'] } },
				options: [
					{
						name: 'Complete',
						value: 'complete',
						action: 'Create a chat completion',
						description: 'Send a message and get the model reply',
					},
				],
				default: 'complete',
			},
			{
				displayName: 'Model Name or ID',
				name: 'chatModel',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getChatModels' },
				displayOptions: { show: { resource: ['chat'], operation: ['complete'] } },
				default: '',
				required: true,
			},
			{
				displayName: 'System Prompt',
				name: 'systemPrompt',
				type: 'string',
				typeOptions: { rows: 3 },
				displayOptions: { show: { resource: ['chat'], operation: ['complete'] } },
				default: '',
				description: 'Optional instructions that set the behavior of the model',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				typeOptions: { rows: 4 },
				displayOptions: { show: { resource: ['chat'], operation: ['complete'] } },
				default: '',
				required: true,
				description: 'The user message to send to the model',
			},
			{
				displayName: 'Options',
				name: 'chatOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { resource: ['chat'], operation: ['complete'] } },
				options: [
					{
						displayName: 'Maximum Number of Tokens',
						name: 'max_tokens',
						type: 'number',
						default: 1024,
						typeOptions: { minValue: 1 },
						description: 'The maximum number of tokens to generate',
					},
					{
						displayName: 'Sampling Temperature',
						name: 'temperature',
						type: 'number',
						default: 0.7,
						typeOptions: { minValue: 0, maxValue: 2, numberPrecision: 1 },
						description: 'Controls randomness: lower values give more focused replies',
					},
					{
						displayName: 'Top P',
						name: 'top_p',
						type: 'number',
						default: 1,
						typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 },
						description: 'Nucleus sampling probability mass',
					},
				],
			},

			// Image
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['image'] } },
				options: [
					{
						name: 'Generate',
						value: 'generate',
						action: 'Generate an image',
						description: 'Create an image from a text description',
					},
				],
				default: 'generate',
			},
			{
				displayName: 'Model Name or ID',
				name: 'imageModel',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getImageModels' },
				displayOptions: { show: { resource: ['image'], operation: ['generate'] } },
				default: '',
				required: true,
			},
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				typeOptions: { rows: 4 },
				displayOptions: { show: { resource: ['image'], operation: ['generate'] } },
				default: '',
				required: true,
				description: 'A text description of the image you want',
			},
			{
				displayName: 'Options',
				name: 'imageOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { resource: ['image'], operation: ['generate'] } },
				options: [
					{
						displayName: 'Binary Property',
						name: 'binaryPropertyName',
						type: 'string',
						default: 'data',
						description: 'Name of the binary property that receives the image file',
					},
					{
						displayName: 'Quality',
						name: 'quality',
						type: 'string',
						default: '',
						placeholder: 'medium',
						description:
							'Quality level supported by the chosen model, for example low, medium or high',
					},
					{
						displayName: 'Size',
						name: 'size',
						type: 'string',
						default: '1024x1024',
						description: 'Image size supported by the chosen model, for example 1024x1024',
					},
				],
			},

			// Embedding
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['embedding'] } },
				options: [
					{
						name: 'Create',
						value: 'create',
						action: 'Create an embedding',
						description: 'Turn text into a vector',
					},
				],
				default: 'create',
			},
			{
				displayName: 'Model Name or ID',
				name: 'embeddingModel',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getEmbeddingModels' },
				displayOptions: { show: { resource: ['embedding'], operation: ['create'] } },
				default: '',
				required: true,
			},
			{
				displayName: 'Text',
				name: 'input',
				type: 'string',
				typeOptions: { rows: 3 },
				displayOptions: { show: { resource: ['embedding'], operation: ['create'] } },
				default: '',
				required: true,
				description: 'The text to turn into a vector',
			},

			// Model
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['model'] } },
				options: [
					{
						name: 'Get Many',
						value: 'getAll',
						action: 'Get many models',
						description: 'List the models available on Gisoo',
					},
				],
				default: 'getAll',
			},
			{
				displayName: 'Type',
				name: 'modelType',
				type: 'options',
				displayOptions: { show: { resource: ['model'], operation: ['getAll'] } },
				options: [
					{ name: 'All', value: '' },
					{ name: 'Audio', value: 'audio' },
					{ name: 'Chat', value: 'chat' },
					{ name: 'Embedding', value: 'embedding' },
					{ name: 'Image', value: 'image' },
					{ name: 'Music', value: 'music' },
					{ name: 'Video', value: 'video' },
				],
				default: 'chat',
				description: 'Only list models of this type',
			},
		],
	};

	methods = {
		loadOptions: {
			async getChatModels(this: ILoadOptionsFunctions) {
				return await loadModels(this, 'chat');
			},
			async getImageModels(this: ILoadOptionsFunctions) {
				return await loadModels(this, 'image');
			},
			async getEmbeddingModels(this: ILoadOptionsFunctions) {
				return await loadModels(this, 'embedding');
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('gisooApi');
		const baseUrl = String(credentials.url || DEFAULT_BASE_URL).replace(/\/+$/, '');

		const call = async (
			method: IHttpRequestMethods,
			path: string,
			body?: IDataObject,
			qs?: IDataObject,
		) =>
			(await this.helpers.httpRequestWithAuthentication.call(this, 'gisooApi', {
				method,
				url: `${baseUrl}${path}`,
				body,
				qs,
				json: true,
			})) as IDataObject;

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				if (resource === 'chat' && operation === 'complete') {
					const model = this.getNodeParameter('chatModel', i) as string;
					const system = this.getNodeParameter('systemPrompt', i, '') as string;
					const message = this.getNodeParameter('message', i) as string;
					const options = this.getNodeParameter('chatOptions', i, {}) as IDataObject;
					const messages: IDataObject[] = [];
					if (system) messages.push({ role: 'system', content: system });
					messages.push({ role: 'user', content: message });
					const response = await call('POST', '/chat/completions', {
						model,
						messages,
						...options,
					});
					const choices = (response.choices as IDataObject[] | undefined) ?? [];
					const first = (choices[0]?.message as IDataObject | undefined) ?? {};
					returnData.push({
						json: {
							text: (first.content as string | null) ?? '',
							model: response.model,
							finish_reason: choices[0]?.finish_reason,
							usage: response.usage,
						},
						pairedItem: { item: i },
					});
				} else if (resource === 'image' && operation === 'generate') {
					const model = this.getNodeParameter('imageModel', i) as string;
					const prompt = this.getNodeParameter('prompt', i) as string;
					const options = this.getNodeParameter('imageOptions', i, {}) as IDataObject;
					const binaryName = (options.binaryPropertyName as string) || 'data';
					const body: IDataObject = { model, prompt };
					if (options.size) body.size = options.size;
					if (options.quality) body.quality = options.quality;
					const response = await call('POST', '/images/generations', body);
					const data = (response.data as IDataObject[] | undefined) ?? [];
					const first = data[0];
					if (!first?.b64_json) {
						throw new NodeOperationError(this.getNode(), 'Gisoo returned no image data', {
							itemIndex: i,
						});
					}
					const binary = await this.helpers.prepareBinaryData(
						Buffer.from(first.b64_json as string, 'base64'),
						'image.png',
						'image/png',
					);
					returnData.push({
						json: { model: response.model ?? model, usage: response.usage },
						binary: { [binaryName]: binary },
						pairedItem: { item: i },
					});
				} else if (resource === 'embedding' && operation === 'create') {
					const model = this.getNodeParameter('embeddingModel', i) as string;
					const input = this.getNodeParameter('input', i) as string;
					const response = await call('POST', '/embeddings', { model, input });
					const data = (response.data as IDataObject[] | undefined) ?? [];
					returnData.push({
						json: { embedding: data[0]?.embedding, model: response.model, usage: response.usage },
						pairedItem: { item: i },
					});
				} else if (resource === 'account' && operation === 'get') {
					const response = await call('GET', '/me');
					returnData.push({ json: response, pairedItem: { item: i } });
				} else if (resource === 'model' && operation === 'getAll') {
					const type = this.getNodeParameter('modelType', i) as string;
					const response = await call('GET', '/models', undefined, type ? { type } : undefined);
					for (const model of (response.data as IDataObject[] | undefined) ?? []) {
						returnData.push({ json: model, pairedItem: { item: i } });
					}
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`Unsupported operation: ${resource}/${operation}`,
						{ itemIndex: i },
					);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
