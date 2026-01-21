import { UUID } from "crypto";
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export interface Chat { 
    uuid: UUID;
    userID: string;
    messages: ChatCompletionMessageParam[];
}
