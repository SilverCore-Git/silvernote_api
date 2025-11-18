import type { Request, Response } from 'express';
import { GoogleGenerativeAI, Content, Part } from '@google/generative-ai';
import notes_db from '../../assets/ts/notes.js';
import { getMCPService } from '../../mcp.js';
import { UUID } from 'crypto';

export interface Chat { 
    uuid: UUID;
    userID: string;
    data: { notes: any; tags: any };
    messages: { content: string, role: string }[];
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export default async function send_to_gemini
(req: Request, res: Response, chats: Chat[])
{

    const { uuid, message } = req.body;
    const note = req.body?.note || undefined;

    try {
        const chat = chats.find(chat => chat.uuid == uuid);

        if (!chat) {
            res.json({ error: true, message: 'Chat non trouvé' });
            return;
        }

        // Préparer le prompt
        let prompt: string = '';

        if (!note) {
            prompt = `Message de l'utilisateur : ${message}`;
        } else {
            let db_note = (await notes_db.getNoteByUUID(note)).note;
            if (db_note) {
                db_note = { ...db_note, content: db_note.content.replace(/<img[^>]*>/g, '') };
            }
            prompt = `Note ouverte : ${JSON.stringify({ db_note })}\n Message de l'utilisateur : ${message}`;
        }

        chat.messages.push({
            role: 'user',
            content: prompt
        });

        
        const mcpService = getMCPService();
        await mcpService.ensureConnected();

        // Obtenir les outils MCP au format Gemini
        const mcpTools = mcpService.getGeminiTools();

        // Configuration SSE
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();
        res.socket?.setNoDelay(true);

        // Convertir les messages au format Gemini
        const convertToGeminiMessages = (messages: any[]): Content[] => {
            return messages
                .filter(msg => msg.role !== 'system')
                .map(msg => {
                    const parts: Part[] = [];
                    
                    if (msg.content) {
                        parts.push({ text: msg.content });
                    }
                    
                    if (msg.tool_calls && msg.tool_calls.length > 0) {
                        for (const toolCall of msg.tool_calls) {
                            parts.push({
                                functionCall: {
                                    name: toolCall.function.name,
                                    args: JSON.parse(toolCall.function.arguments)
                                }
                            });
                        }
                    }
                    
                    if (msg.role === 'function') {
                        parts.push({
                            functionResponse: {
                                name: msg.name,
                                response: {
                                    content: msg.content
                                }
                            }
                        });
                    }
                    
                    return {
                        role: msg.role === 'assistant' || msg.role === 'function' ? 'model' : 'user',
                        parts
                    } as Content;
                });
        };

        let conversationMessages = [...chat.messages.slice(-10)];
        let iterationCount = 0;
        const maxIterations = 5;

        // Extraire le system message s'il existe
        const systemMessage = conversationMessages.find(m => m.role === 'system');

        // Boucle pour gérer les appels d'outils
        while (iterationCount < maxIterations) {
            iterationCount++;

            // Configurer le modèle Gemini
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-pro",
                systemInstruction: systemMessage?.content,
                tools: mcpTools.length > 0 ? [{
                    functionDeclarations: mcpTools
                }] : undefined
            });

            // Convertir l'historique au format Gemini
            const geminiHistory = convertToGeminiMessages(conversationMessages);
            
            // Démarrer le chat
            const geminiChat = model.startChat({
                history: geminiHistory.slice(0, -1) // Tous sauf le dernier
            });

            // Envoyer le dernier message en streaming
            const lastMessage = geminiHistory[geminiHistory.length - 1];
            const result = await geminiChat.sendMessageStream(
                lastMessage.parts[0].text || ''
            );

            let assistantMessage: string = "";
            let buffer: string = '';
            let toolCalls: any[] = [];

            for await (const chunk of result.stream) {
                const candidate = chunk.candidates?.[0];
                
                if (!candidate) continue;

                // Gérer le contenu texte
                if (candidate.content?.parts) {
                    for (const part of candidate.content.parts) {
                        if (part.text) {
                            const token = part.text;
                            assistantMessage += token;
                            buffer += token;
                            res.write(`data: ${token}\n\n`);
                        }

                        // Gérer les appels d'outils
                        if (part.functionCall) {
                            const toolCall = {
                                id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                type: 'function' as const,
                                function: {
                                    name: part.functionCall.name,
                                    arguments: JSON.stringify(part.functionCall.args)
                                }
                            };
                            
                            toolCalls.push(toolCall);
                        }
                    }
                }
            }

            // Ajouter le message de l'assistant
            conversationMessages.push({
                role: 'assistant',
                content: assistantMessage || null,
                tool_calls: toolCalls.length > 0 ? toolCalls : undefined
            } as any);

            chat.messages.push({
                role: 'assistant',
                content: assistantMessage
            });

            // Si pas d'appel d'outil, on termine
            if (toolCalls.length === 0) {
                break;
            }

            // Exécuter les appels d'outils via MCP
            res.write(`data: [TOOLS:${toolCalls.map(tc => tc.function.name).join(',')}]\n\n`);

            const toolResults = await mcpService.handleToolCalls(toolCalls);
            
            // Convertir les résultats au format compatible
            for (const result of toolResults) {
                conversationMessages.push({
                    role: 'function',
                    //name: result.tool_call_id,
                    content: result.content
                });
                
                res.write(`data: [TOOL_RESULT:${result.content}]\n\n`);
            }
        }

        res.write("data: [DONE]\n\n");
        res.end();

    } catch (err: any) {
        console.error('Error in /send:', err);
        res.status(500).json({ error: true, message: err.message });
    }

}