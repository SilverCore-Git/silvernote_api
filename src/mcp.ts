import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { ListToolsRequest, ToolSchema } from "@modelcontextprotocol/sdk/types.js";
import OpenAI from 'openai';

// Configuration MCP
const MCP_CONFIG = {
    command: 'npx',
    args: [
        '-y',
        'tsx',
        process.env.MCP_SERVER_PATH || './src/mcp-server/index.ts'
    ]
};

export class MCPService {
    private client: Client | null = null;
    private tools: any[] = [];
    private openaiTools: any[] = [];

    constructor() {}

    /**
     * Se connecter au serveur MCP
     */
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

    /**
     * Charger les outils depuis le serveur MCP
     */
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

    /**
     * Obtenir les outils au format OpenAI
     */
    getOpenAITools() {
        return this.openaiTools;
    }

    /**
     * Appeler un outil MCP
     */
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

    /**
     * Gérer les appels de fonction OpenAI avec MCP
     */
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

    /**
     * Vérifier si le client est connecté
     */
    isConnected() {
        return this.client !== null;
    }

    /**
     * Fermer la connexion MCP
     */
    async disconnect() {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.tools = [];
            this.openaiTools = [];
            console.log('MCP client disconnected');
        }
    }

    /**
     * Reconnecter si nécessaire
     */
    async ensureConnected() {
        if (!this.isConnected()) {
            await this.connect();
        }
    }
}

// Singleton instance
let mcpServiceInstance: MCPService | null = null;

/**
 * Obtenir l'instance singleton du service MCP
 */
export function getMCPService(): MCPService {
    if (!mcpServiceInstance) {
        mcpServiceInstance = new MCPService();
    }
    return mcpServiceInstance;
}

export default MCPService;