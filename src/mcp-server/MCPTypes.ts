import { z } from "zod";


export interface Resource {
    name: string;
    url: string;
    handler: (uri: URL) => Promise<ResourceResponse>;
}


export interface ResourceResponse {
    contents: ResourceContent[];
}


export interface ResourceContent {
    uri: string;
    mimeType: string;
    text?: string;
    blob?: string;
}



export interface Tool<TInput = any> {
    name: string;
    description: string;
    params: z.ZodObject<z.ZodRawShape> | z.ZodType<TInput>;
    handler: (params: TInput) => Promise<ToolResponse>;
}


export interface ToolResponse {
  content: ToolContent[];
  isError?: boolean;
}

interface ToolContent {
  type: "text" | "image" | "resource";
  text?: string;
  data?: string;
  mimeType?: string;
  resource?: string;
}