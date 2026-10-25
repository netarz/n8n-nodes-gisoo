# n8n-nodes-gisoo

[n8n](https://n8n.io/) community nodes for [Gisoo](https://gisoo.pro), a multi-model AI service with an OpenAI-compatible API. One API key reaches Claude, GPT, Gemini, DeepSeek, Qwen and many other chat, image and embedding models, paid from a prepaid balance.

This package adds two nodes:

- **Gisoo Chat Model**: a language model sub-node. Plug it into the AI Agent, Basic LLM Chain, Question and Answer Chain and other AI nodes.
- **Gisoo**: an action node with chat completion, image generation, embeddings, a model list and an account (balance) check.

[Installation](#installation) | [Credentials](#credentials) | [Operations](#operations) | [Example workflow](#example-workflow) | [Compatibility](#compatibility) | [Resources](#resources)

## Installation

Follow the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) and install the package `n8n-nodes-gisoo`.

## Credentials

1. Create an account at [gisoo.pro](https://gisoo.pro) and add credit.
2. Open [gisoo.pro/app/api/keys](https://gisoo.pro/app/api/keys) and create an API key. It starts with `sk-gisoo-v1-`.
3. In n8n, create a **Gisoo API** credential and paste the key.

| Field | Default | Notes |
| --- | --- | --- |
| API Key | none | Required. Sent as `Authorization: Bearer <key>`. |
| Base URL | `https://gisoo.pro/api/v1` | Use `https://ir.gisoo.pro/api/v1` for servers inside Iran. |

The credential test calls `GET /me`, which is free and confirms that the key is valid.

## Operations

### Gisoo Chat Model

Select a model from the live list (loaded from `GET /models?type=chat`) or set a model ID with an expression. Options: temperature, maximum tokens, top P. Tool calling and structured output depend on the model you choose.

### Gisoo node

| Resource | Operation | Endpoint |
| --- | --- | --- |
| Chat | Complete | `POST /chat/completions` |
| Image | Generate | `POST /images/generations` (the image is returned as binary data) |
| Embedding | Create | `POST /embeddings` |
| Model | Get Many | `GET /models` (free) |
| Account | Get | `GET /me` (free) |

Chat, image and embedding calls use your Gisoo balance at the price of the model you pick. Model prices are listed at [gisoo.pro/models](https://gisoo.pro/models).

## Example workflow

Import this JSON into n8n (menu, Import from clipboard), select your Gisoo API credential on both nodes, and pick a model.

```json
{
  "name": "Gisoo chat example",
  "nodes": [
    {
      "parameters": {},
      "name": "When clicking Execute workflow",
      "type": "n8n-nodes-base.manualTrigger",
      "typeVersion": 1,
      "position": [0, 0]
    },
    {
      "parameters": {
        "resource": "chat",
        "operation": "complete",
        "chatModel": "gpt-5-mini",
        "systemPrompt": "You answer in one short sentence.",
        "message": "What can I automate with n8n?"
      },
      "name": "Gisoo",
      "type": "n8n-nodes-gisoo.gisoo",
      "typeVersion": 1,
      "position": [240, 0],
      "credentials": { "gisooApi": { "id": "", "name": "Gisoo API" } }
    }
  ],
  "connections": {
    "When clicking Execute workflow": {
      "main": [[{ "node": "Gisoo", "type": "main", "index": 0 }]]
    }
  }
}
```

To use Gisoo inside an AI Agent, add an **AI Agent** node, then choose **Gisoo Chat Model** as its chat model and select the same credential.

## Compatibility

Built with the n8n node CLI against n8n-workflow with `n8nNodesApiVersion` 1. The package has no runtime dependencies.

## Resources

- [Gisoo](https://gisoo.pro)
- [Gisoo API documentation](https://gisoo.pro/docs)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Source code and issues](https://github.com/netarz/n8n-nodes-gisoo)

## License

[MIT](LICENSE.md)
