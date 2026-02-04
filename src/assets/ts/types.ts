import { UUID } from "crypto";
import { Plan } from "./plan.js";

export interface User { 
    userId: string;
    customerId?: string;
    plan: Plan[];
};

export interface News { 
    active: boolean;
    message: string; 
    title: string;
    btn: boolean;
    href: string;
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
    content_type?: "text/plain" | "text/markdown" | "text/html" | "text/html/crypted";
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