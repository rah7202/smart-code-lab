//-----------------LOGGER TYPES---------------------------
export type Level = "debug" | "info" | "warn" | "error";

//-----------------SOCKET TYPES---------------------------

export type User = {
    socketId: string;
    username: string;
    color: string;
};

export type JoinRoomPayload = {
    RoomId: string;
};

export type RoomPayload ={
    code: string;
    language: string;
}

//-----------------JUDGE0 TYPES---------------------------

export type CompileRequest = {
    code: string;
    userLangId: number;
    input: string;
};

export type CompileResponse = {
    output: string;
    status: {
        id: number;
        description: string;
    };
    time: string;
};

//-----------------AI TYPES---------------------------

export type AIRequest = {
    prompt: string;
    roomId: string;
};

export type AIResponse = {
    success: boolean;
    data?: string;
    error?: string;
};