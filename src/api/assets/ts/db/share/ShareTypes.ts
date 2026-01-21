

export interface ShareOnLayout {
    uuid: string;
    owner_id: string;
    created_at: string;
    expires_at: string;
}

export type Layout = ShareOnLayout[];


export interface Share { 

    uuid: string;
    note_uuid: string;
    owner_id: string;

    params: {
        age: number; // age en milliseconde || -1 pour infini
        passwd?: string;
        editable: boolean;
    }

    visitor: string[]; // user ids
    
    banned: string[]; // user ids

    created_at: string;
    expires_at: string;

}
