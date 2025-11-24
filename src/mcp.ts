import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import OpenAI from 'openai';

// Configuration MCP
const MCP_CONFIG = {
    command: 'npx',
    args: [
        '-y',
        'tsx',
        process.env.MCP_SERVER_PATH || './mcp-server/index.js'
    ]
};

export class MCPService {
    private client: Client | null = null;
    private tools: any[] = [];
    private openaiTools: any[] = [];

    constructor() {}

    async connect() {
        if (this.client) {
            return;
        }

        try {
            console.log('Connecting to MCP server...');

            this.client = new Client(
                {
                    name: 'silvernote-ai-client',
                    version: '1.0.0',
                },
                {
                    capabilities: {},
                }
            );

            const transport = new StdioClientTransport(MCP_CONFIG);
            await this.client.connect(transport);

            // Charger les outils
            await this.loadTools();

            console.log(`MCP connected! Found ${this.tools.length} tools`);
        } catch (error: any) {
            console.error('Failed to connect to MCP:', error.message);
            throw error;
        }
    }

    private async loadTools() {
        if (!this.client) {
            throw new Error('MCP client not connected');
        }

        const toolsResponse = await this.client.listTools();
        this.tools = toolsResponse.tools || [];

        // Convertir en format OpenAI
        this.openaiTools = this.tools.map(tool => ({
            type: 'function' as const,
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.inputSchema,
            },
        }));

        console.log(`Loaded tools: ${this.tools.map(t => t.name).join(', ')}`);
    }

    public getOpenAITools() {
        return this.openaiTools.map(tool => ({
            ...tool,
            resources: ["note://*"],
        }));
    }

    public getGeminiTools() 
    {
        if (!this.tools || this.tools.length === 0) {
            return [];
        }
        
        return this.tools
            .filter(tool => tool && (tool.function?.name || tool.name))
            .map(tool => {
                const isOpenAIFormat = 'function' in tool;
                
                const parameters = isOpenAIFormat 
                    ? tool.function.parameters 
                    : (tool.inputSchema || tool.parameters || {});
                
                const cleanedParameters = this.cleanSchemaForGemini(parameters);
                
                return {
                    name: isOpenAIFormat ? tool.function.name : tool.name,
                    description: isOpenAIFormat ? tool.function.description : tool.description,
                    parameters: cleanedParameters
                };
            });
    }

    private cleanSchemaForGemini(schema: any): any 
    {
        if (!schema || typeof schema !== 'object') {
            return schema;
        }
        
        const cleaned = JSON.parse(JSON.stringify(schema));
        
        const removeInvalidFields = (obj: any): any => {
            if (Array.isArray(obj)) {
                return obj.map(removeInvalidFields);
            }
            
            if (obj && typeof obj === 'object') {
                
                delete obj.$schema;
                delete obj.additionalProperties;
                delete obj.$defs;
                delete obj.definitions;
                
                for (const key in obj) {
                    obj[key] = removeInvalidFields(obj[key]);
                }
            }
            
            return obj;
        };
        
        return removeInvalidFields(cleaned);
    }

    async callTool(name: string, args: any = {}) {
        if (!this.client) {
            throw new Error('MCP client not connected');
        }

        try {
            console.log(`Calling MCP tool: ${name}`, args);

            const result: any = await this.client.callTool({
                name,
                arguments: args,
            });

            const resultText = (result as any).content
                .map((c: any) => c.type === 'text' ? c.text : JSON.stringify(c))
                .join('\n');

            console.log(`Tool result: ${resultText}`);

            return resultText;
        } catch (error: any) {
            console.error(`Tool call failed: ${error.message}`);
            throw error;
        }
    }

    async handleToolCallsGemini(toolCalls: any[]) {
        const results = [];

        for (const toolCall of toolCalls) {
            const name = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);

            try {
                const result = await this.callTool(name, args);

                results.push({
                    role: 'function',
                    name: name,
                    content: result
                });

            } catch (error: any) {
                results.push({
                    role: 'function',
                    name: name,
                    content: `Error: ${error.message}`
                });
            }
        }

        return results;
    }

    async handleToolCalls(toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[]) {
        const results = [];

        for (const toolCall of toolCalls) {
            const functionName = (toolCall as any).function.name;
            const functionArgs = JSON.parse((toolCall as any).function.arguments);

            try {
                const result = await this.callTool(functionName, functionArgs);
                
                results.push({
                    role: 'tool' as const,
                    tool_call_id: toolCall.id,
                    content: result,
                });
            } catch (error: any) {
                results.push({
                    role: 'tool' as const,
                    tool_call_id: toolCall.id,
                    content: `Error: ${error.message}`,
                });
            }
        }

        return results;
    }

    isConnected() {
        return this.client !== null;
    }

    async disconnect() {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.tools = [];
            this.openaiTools = [];
            console.log('MCP client disconnected');
        }
    }

    async ensureConnected() {
        if (!this.isConnected()) {
            await this.connect();
        }
    }

}

let mcpServiceInstance: MCPService | null = null;

export function getMCPService(): MCPService {
    if (!mcpServiceInstance) {
        mcpServiceInstance = new MCPService();
    }
    return mcpServiceInstance;
}

export default MCPService;