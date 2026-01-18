import type { Request, Response } from 'express';
import OpenAI from "openai";
import { Chat } from './types.js';
import { getMCPService } from '../../mcp.js';

const AIclient = new OpenAI({ apiKey: process.env.OPENAI_SECRET_KEY });

export default async function send_to_chatgpt
(
    req: Request,
    res: Response,
    chats: Chat[],
    model?: string
)
{

    const { uuid, message } = req.body;
    const note = req.body?.note || undefined;

    try {

        // Trouver le chat
        const chat = chats.find(chat => chat.uuid == uuid);
        if (!chat) {
            res.json({ error: true, message: 'Chat non trouvé' });
            return;
        }

        // Obtenir le service MCP et s'assurer qu'il est connecté
        const mcpService = getMCPService();
        await mcpService.ensureConnected();

        // Construire le message utilisateur avec le contexte
        const userMessage = note 
            ? `L'utilisateur est dans la note qui porte comme uuid : ${note}. \n\n Message de l'utilisateur: ${message}` 
            : `Message de l'utilisateur: ${message}` 

        // Ajouter le message à l'historique du chat
        chat.messages.push({
            role: 'user',
            content: userMessage
        });

        // Obtenir les outils MCP au format OpenAI
        const mcpTools = mcpService.getOpenAITools();
        const toolNames = mcpTools
            .map(t => (t.type === 'function' ? t.function.name : 'unknown'))
            .join(', ');
        console.log(`Available MCP tools: ${toolNames}`);

        // Configuration SSE (Server-Sent Events)
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();
        res.socket?.setNoDelay(true);

        // Préparer l'historique de conversation (garder les 10 derniers messages)
        let conversationMessages = [...chat.messages.slice(-10)];
        let iterationCount = 0;
        const maxIterations = 5;

        // Boucle pour gérer les appels d'outils multiples
        while (iterationCount < maxIterations) {
            iterationCount++;
            console.log(`Iteration ${iterationCount}/${maxIterations}`);

            // Appel à OpenAI avec streaming et outils MCP
            const stream = await AIclient.chat.completions.create({
                model: model || "gpt-4",
                messages: conversationMessages,
                tools: mcpTools.length > 0 ? mcpTools : undefined,
                tool_choice: 'auto',
                stream: true,
                temperature: 0.7,
            });

            let assistantMessage = "";
            let toolCalls: any[] = [];

            // Traiter le stream de réponse
            for await (const chunk of stream) {
                
                const delta = chunk.choices[0]?.delta;

                // Gérer le contenu texte
                if (delta?.content) {
                    const token = delta.content;
                    assistantMessage += token;
                    
                    // Envoyer le token au client en temps réel
                    res.write(`data: ${JSON.stringify({ type: 'content', content: token })}\n\n`);
                }

                // Gérer les appels d'outils
                if (delta?.tool_calls) {
                    for (const toolCallDelta of delta.tool_calls) {
                        if (toolCallDelta.index !== undefined) {
                            // Initialiser l'appel d'outil si nécessaire
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

                            // Accumuler les arguments
                            if (toolCallDelta.function?.arguments) {
                                toolCalls[toolCallDelta.index].function.arguments += 
                                    toolCallDelta.function.arguments;
                            }
                        }
                    }
                }

                // Vérifier si le stream est terminé
                if (chunk.choices[0]?.finish_reason === 'stop' || 
                    chunk.choices[0]?.finish_reason === 'tool_calls') {
                    console.log(`Stream finished: ${chunk.choices[0].finish_reason}`);
                }
            }

            // Ajouter le message de l'assistant à l'historique
            const assistantHistoryMessage: any = {
                role: 'assistant',
                content: assistantMessage || null,
            };

            if (toolCalls.length > 0) {
                assistantHistoryMessage.tool_calls = toolCalls;
            }

            conversationMessages.push(assistantHistoryMessage);

            // Sauvegarder le message dans le chat (sans les tool_calls pour simplifier)
            chat.messages.push({
                role: 'assistant',
                content: assistantMessage || '[Tool calls executed]'
            });

            // Si pas d'appel d'outil, on termine la boucle
            if (toolCalls.length === 0) {
                console.log('No tool calls, ending conversation');
                break;
            }

            // Notifier le client des outils appelés
            const toolCallNames = toolCalls.map(tc => tc.function.name).join(', ');
            console.log(`Executing tools: ${toolCallNames}`);
            res.write(`data: ${JSON.stringify({ 
                type: 'tool_execution', 
                tools: toolCalls.map(tc => tc.function.name) 
            })}\n\n`);

            // Exécuter les appels d'outils via MCP
            try {

                const toolResults = await mcpService.handleToolCalls(toolCalls);
                
                // Ajouter les résultats à l'historique de conversation
                conversationMessages.push(...toolResults);

                // Envoyer les résultats au client
                for (let i = 0; i < toolResults.length; i++) {
                    const result = toolResults[i];
                    const toolName = toolCalls[i]?.function.name || 'unknown';
                    
                    // Convertir le contenu en string si nécessaire
                    const contentStr = typeof result.content === 'string' 
                        ? result.content 
                        : JSON.stringify(result.content);
                    
                    const preview = contentStr.length > 100 
                        ? contentStr.substring(0, 100) + '...' 
                        : contentStr;
                    
                    res.write(`data: ${JSON.stringify({ 
                        type: 'tool_result', 
                        tool: toolName,
                        content: contentStr 
                    })}\n\n`);
                }

            } catch (toolError: any) {
                console.error('Error executing tools:', toolError);
                res.write(`data: ${JSON.stringify({ 
                    type: 'error', 
                    message: `Tool execution failed: ${toolError.message}` 
                })}\n\n`);
                break;
            }

        }

        // Vérifier si on a atteint la limite d'itérations
        if (iterationCount >= maxIterations) {
            console.warn(`Reached maximum iterations (${maxIterations})`);
            res.write(`data: ${JSON.stringify({ 
                type: 'warning', 
                message: 'Maximum tool iterations reached' 
            })}\n\n`);
        }

        // Signaler la fin de la conversation
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();

        console.log(`Chat ${uuid} completed successfully`);

    } catch (err: any) {
        console.error('Error in send_to_chatgpt:', err);
        
        // Envoyer l'erreur au client si la connexion SSE est encore active
        if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({ 
                type: 'error', 
                message: err.message 
            })}\n\n`);
            res.end();
        } else {
            // Sinon répondre avec une erreur HTTP standard
            res.status(500).json({ 
                error: true, 
                message: err.message 
            });
        }
    }

}