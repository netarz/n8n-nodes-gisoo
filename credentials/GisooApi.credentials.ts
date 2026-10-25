import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
	Icon,
} from "n8n-workflow";

export class GisooApi implements ICredentialType {
	name = "gisooApi";

	displayName = "Gisoo API";

	icon: Icon = { light: 'file:../icons/gisoo.svg', dark: 'file:../icons/gisoo.dark.svg' };

	documentationUrl = "https://gisoo.pro/docs/authentication";

	properties: INodeProperties[] = [
		{
			displayName: "API Key",
			name: "apiKey",
			type: "string",
			typeOptions: { password: true },
			required: true,
			default: "",
			description: "Create a key at https://gisoo.pro/app/api/keys. It starts with sk-gisoo-v1-",
		},
		{
			displayName: "Base URL",
			name: "url",
			type: "string",
			default: "https://gisoo.pro/api/v1",
			description:
				"The Gisoo API address. Use https://ir.gisoo.pro/api/v1 for servers inside Iran.",
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: "generic",
		properties: {
			headers: {
				Authorization: "=Bearer {{$credentials.apiKey}}",
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: "={{$credentials.url}}",
			url: "/me",
		},
	};
}
