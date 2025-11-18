import type { Request, Response } from 'express';
import { GoogleGenAI } from "@google/genai";

const AIclient = new GoogleGenAI({});

export default async function send_to_gemini
(req: Request, res: Response)
{
    
}