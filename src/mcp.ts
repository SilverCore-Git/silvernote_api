import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { 
    ChatCompletionTool, 
    ChatCompletionMessageToolCall, 
    ChatCompletionToolMessageParam 
} from 'openai/resources/chat/completions';

// Configuration MCP
const MCP_CONFIG = {
    command: 'npx',
    args: [
        '-y',
        'tsx',
        process.env.MCP_SERVER_PATH || './src/mcp-server/index.js'
    ]
};

interface MCPResource {
    uri?: string;
    uriTemplate?: string;
    name: string;
    description?: string;
    mimeType?: string;
}

interface ResourceContent {
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
}

export class MCPService {

    private client: Client | null = null;
    private openaiTools: ChatCompletionTool[] = [];
    private resources: MCPResource[] = [];
    private resourceTemplates: MCPResource[] = [];

    constructor() {}


    async connect(): Promise<void>
    {

        if (this.client) {
            return;
        }

        try {
            console.log('Connecting to MCP server...');

            this.client = new Client(
                {
                    name: 'openai-mcp-client',
                    version: '1.0.0',
                },
                {
                    capabilities: {
                        tools: {},
                        resources: {},
                    },
                }
            );

            const transport = new StdioClientTransport(MCP_CONFIG);
            await this.client.connect(transport);

            await this.loadTools();
            await this.loadResources();

            console.log(`MCP connected! Ready for OpenAI.`);

        } catch (error: any) {
            console.error('Failed to connect to MCP:', error.message);
            throw error;
        }
    }


    private async loadTools(): Promise<void>
    {

        if (!this.client) {
            throw new Error('MCP client not connected');
        }

        try {

            const toolsResponse = await this.client.listTools();
            const rawTools = toolsResponse.tools || [];

            // Conversion au format strict OpenAI (ChatCompletionTool)
            this.openaiTools = rawTools.map(tool => ({
                type: 'function' as const,
                function: {
                    name: tool.name,
                    description: tool.description || '',
                    parameters: tool.inputSchema as Record<string, unknown>,
                },
            }));

            const toolNames = this.openaiTools
                .map(t => (t.type === 'function' ? t.function.name : 'unknown'))
                .join(', ');
            console.log(`Loaded ${this.openaiTools.length} tools: ${toolNames}`);

        } catch (error: any) {
            console.error('Failed to load tools:', error.message);
            this.openaiTools = [];
        }

    }


    private async loadResources(): Promise<void>
    {

        if (!this.client) {
            throw new Error('MCP client not connected');
        }

        try {

            const resourcesResponse = await this.client.listResources();
            const rawResources = resourcesResponse.resources || [];

            // Séparer les resources statiques et les templates
            this.resources = rawResources
                .filter(r => r.uri && !r.uri.includes('{'))
                .map(resource => ({
                    uri: resource.uri,
                    name: resource.name,
                    description: resource.description,
                    mimeType: resource.mimeType,
                }));

            this.resourceTemplates = rawResources
                .filter(r => r.uri && r.uri.includes('{'))
                .map(resource => ({
                    uriTemplate: resource.uri,
                    name: resource.name,
                    description: resource.description,
                    mimeType: resource.mimeType,
                }));

            console.log(`Loaded ${this.resources.length} static resources and ${this.resourceTemplates.length} resource templates.`);

        } catch (error: any) {
            console.error('Failed to load resources:', error.message);
            this.resources = [];
            this.resourceTemplates = [];
        }

    }


    public getOpenAITools(): ChatCompletionTool[] {
        return this.openaiTools;
    }


    public getResources(): MCPResource[] {
        return this.resources;
    }


    public getResourceTemplates(): MCPResource[] {
        return this.resourceTemplates;
    }


    async readResource(uri: string): Promise<ResourceContent | null>
    {

        if (!this.client) {
            throw new Error('MCP client not connected');
        }

        try {
            console.log(`Reading resource: ${uri}`);

            const result = await this.client.readResource({ uri });

            if (result.contents && result.contents.length > 0) {
                const content = result.contents[0];
                return {
                    uri: content.uri,
                    mimeType: content.mimeType,
                    text: typeof content.text === 'string' ? content.text : undefined,
                    blob: typeof content.blob === 'string' ? content.blob : undefined,
                };
            }

            return null;
        } catch (error: any) {
            console.error(`Failed to read resource ${uri}:`, error.message);
            return null;
        }

    }


    async readResources(uris: string[]): Promise<Map<string, ResourceContent>>
    {

        const results = new Map<string, ResourceContent>();

        await Promise.all(
            uris.map(async (uri) => {
                const content = await this.readResource(uri);
                if (content) {
                    results.set(uri, content);
                }
            })
        );

        return results;

    }


    public getResourcesSystemPrompt(): string
    {

        const allResources = [
            ...this.resources.map(r => ({
                name: r.name,
                uri: r.uri,
                description: r.description || 'No description',
            })),
            ...this.resourceTemplates.map(r => ({
                name: r.name,
                uri: r.uriTemplate,
                description: r.description || 'No description',
            })),
        ];

        if (allResources.length === 0) {
            return '';
        }

        return `\n\nResources disponibles:\n${allResources
            .map(r => `- ${r.name}: ${r.description} (URI: ${r.uri})`)
            .join('\n')}`;

    }


    async getResourceContext(uri: string): Promise<string>
    {

        const content = await this.readResource(uri);
        
        if (!content) {
            return '';
        }

        let text = content.text || '';
        
        // Si c'est du blob, on le convertit en base64 info (pas le contenu complet)
        if (content.blob && !text) {
            text = `[Binary content: ${content.mimeType || 'unknown type'}]`;
        }

        // Parser le JSON si c'est du JSON
        if (content.mimeType === 'application/json' && text) {
            try {
                const parsed = JSON.parse(text);
                text = JSON.stringify(parsed, null, 2);
            } catch {
                // Garder le texte tel quel si le parsing échoue
            }
        }

        return text;

    }


    async callTool(name: string, args: any = {}): Promise<string>
    {

        if (!this.client) {
            throw new Error('MCP client not connected');
        }

        try {
            console.log(`Calling MCP tool: ${name}`, args);

            const result = await this.client.callTool({
                name,
                arguments: args,
            });

            // Convertir le résultat en texte pour OpenAI
            const contents = Array.isArray(result.content) ? result.content : [result.content];
            
            const resultText = contents
                .map((c: any) => {
                    if (c.type === 'text') {
                        return c.text;
                    } else if (c.type === 'resource') {
                        return `Resource: ${c.resource?.uri || 'unknown'}\n${c.resource?.text || ''}`;
                    } else {
                        return JSON.stringify(c);
                    }
                })
                .join('\n\n');

            console.log(`Tool ${name} executed successfully (${resultText.length} chars)`);

            return resultText;

        } catch (error: any) {
            console.error(`Tool call failed: ${error.message}`);
            throw error;
        }

    }


    async handleToolCalls(toolCalls: ChatCompletionMessageToolCall[]): Promise<ChatCompletionToolMessageParam[]>
    {

        const results: ChatCompletionToolMessageParam[] = [];

        for (const toolCall of toolCalls) {
            // Vérifier que c'est bien un appel de fonction
            if (toolCall.type !== 'function') {
                continue;
            }

            const functionName = toolCall.function.name;
            let functionArgs: any = {};

            try {
                functionArgs = JSON.parse(toolCall.function.arguments);
            } catch (parseError) {
                console.error(`Failed to parse tool arguments for ${functionName}:`, parseError);
                results.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: `Error: Invalid JSON arguments`,
                });
                continue;
            }

            try {
                // Exécution de l'outil
                const content = await this.callTool(functionName, functionArgs);

                // Ajout du résultat au format attendu par OpenAI (role: tool)
                results.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: content,
                });
            } catch (error: any) {
                // En cas d'erreur, on renvoie l'erreur au modèle pour qu'il puisse se corriger
                results.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: `Error executing tool ${functionName}: ${error.message}`,
                });
            }
        }

        return results;

    }


    async loadContextResources(noteUuid?: string): Promise<string>
    {

        const contextParts: string[] = [];

        // Charger la note si fournie
        if (noteUuid) {
            const noteUri = `note:///${noteUuid}`;
            const noteContent = await this.getResourceContext(noteUri);
            
            if (noteContent) {
                contextParts.push(`Note actuelle (UUID: ${noteUuid}):\n${noteContent}`);
            }
        }

        return contextParts.join('\n\n');

    }

    
    isConnected(): boolean {
        return this.client !== null;
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.openaiTools = [];
            this.resources = [];
            this.resourceTemplates = [];
            console.log('MCP client disconnected');
        }
    }

    async ensureConnected(): Promise<void> {
        if (!this.isConnected()) {
            await this.connect();
        }
    }


    async reload(): Promise<void> {
        if (!this.client) {
            throw new Error('MCP client not connected');
        }

        await this.loadTools();
        await this.loadResources();
        console.log('MCP tools and resources reloaded');
    }
    
}

// Singleton
let mcpServiceInstance: MCPService | null = null;

export function getMCPService(): MCPService {
    if (!mcpServiceInstance) {
        mcpServiceInstance = new MCPService();
    }
    return mcpServiceInstance;
}

export default MCPService;