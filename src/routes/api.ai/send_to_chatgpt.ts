import type { Request, Response } from 'express';
import OpenAI from "openai";
import { Chat } from './types.js';
import notes_db from '../../assets/ts/notes.js';
import { getMCPService } from '../../mcp.js';

const AIclient = new OpenAI({ apiKey: process.env.OPENAI_SECRET_KEY });

export default async function send_to_chatgpt
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

        // Obtenir le service MCP
        const mcpService = getMCPService();
        await mcpService.ensureConnected();

        // Obtenir les outils MCP au format OpenAI
        const mcpTools = mcpService.getOpenAITools();

        // Configuration SSE
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();
        res.socket?.setNoDelay(true);

        let conversationMessages = [...chat.messages.slice(-10)];
        let iterationCount = 0;
        const maxIterations = 5;

        // Boucle pour gérer les appels d'outils
        while (iterationCount < maxIterations) {
            iterationCount++;

            // Appel à OpenAI avec les outils MCP
            const stream = await AIclient.chat.completions.create({
                model: "gpt-5.2",
                messages: conversationMessages,
                tools: mcpTools.length > 0 ? mcpTools : undefined,
                tool_choice: 'auto',
                stream: true
            });

            let assistantMessage: string = "";
            let buffer: string = '';
            let toolCalls: any[] = [];
            let currentToolCall: any = null;

            for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta;

                // Gérer le contenu texte
                if (delta?.content) {
                    const token = delta.content;
                    assistantMessage += token;
                    buffer += token;
                    res.write(`data: ${token}\n\n`);
                }

                // Gérer les appels d'outils
                if (delta?.tool_calls) {
                    for (const toolCallDelta of delta.tool_calls) {
                        if (toolCallDelta.index !== undefined) {
                            if (!toolCalls[toolCallDelta.index]) {
                                toolCalls[toolCallDelta.index] = {
                                    id: toolCallDelta.id || '',
                                    type: 'function',
                                    function: {
                                        name: toolCallDelta.function?.name || '',
                                        arguments: ''
                                    }
                                };
                            }

                            if (toolCallDelta.function?.arguments) {
                                toolCalls[toolCallDelta.index].function.arguments += toolCallDelta.function.arguments;
                            }
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
            conversationMessages.push(...toolResults);

            // Envoyer les résultats au client
            for (const result of toolResults) {
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