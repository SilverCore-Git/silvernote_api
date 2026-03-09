import { UUID } from "crypto";
import { Plan } from "./plan.js";

export interface User { 
    userId: string;
    customerId?: string;
    androidToken?: string;
    plan: Plan[];
};

export interface Layout {
    all: number;
    file: number;
    db: { 
        file: string;
        value: number;
        full: boolean;
    }[]
}

export interface Note {
    uuid?: string;
    user_id: string;
    icon?: string;
    title: string;
    content: string;
    ydoc_content?: Buffer;
    content_type?: "text/plain" | "text/markdown" | "text/html" | "text/html/crypted" | "ydoc";
    tags?: string[];
    pinned?: boolean;
    created_at?: number;
    updated_at?: number;
}


export interface Tag {
    _id?: string;
    uuid: string;
    user_id?: string;
    id: number;
    active: boolean;
    name: string;
    color: string;
    created_at?: number;
    updated_at?: number;
};

export interface Layout_data {
    files: string[];
    notes_lenght: number;
    tags_lenght: number;
}

export interface Session {
    id: UUID;
    start: Date;
    end: Date;
    user: string;
    state: "open" | "close" | "error";
}