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



export interface Tool<TParams extends z.ZodRawShape = z.ZodRawShape> {
  name: string;
  description: string;
  params: TParams;
  handler: (
    params: z.infer<z.ZodObject<TParams>>
  ) => Promise<any>;
}

