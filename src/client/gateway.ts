import { HTTPClient } from "./http";
import WebSocket from "ws" // type: ignore

export enum OpCode {
    DISPATCH = 0,
    HEARTBEAT = 1,
    IDENTIFY = 2,
    PRESENCE_UPDATE = 3,
    VOICE_STATE_UPDATE = 4,
    RESUME = 6,
    RECONNECT = 7,
    REQUEST_GUILD_MEMBERS = 8,
    INVALID_SESSION = 9,
    HELLO = 10,
    HEARTBEAT_ACK = 11
}

export enum GatewayCloseCodes {
    UNKNOWN_ERROR = 4000,
    UNKNOWN_OPCODE = 4001,
    DECODE_ERROR = 4002,
    NOT_AUTHENTICATED = 4003,
    AUTHENTICATION_FAILED = 4004,
    ALREADY_AUTHENTICATED = 4005,
    INVALID_SEQUENCE = 4007,
    RATE_LIMITED = 4008,
    SESSION_TIMED_OUT = 4009,
    INVALID_SHARD = 4010,
    SHARDING_REQUIRED = 4011,
    INVALID_API_VERSION = 4012,
    INVALID_INTENTS = 4013,
    DISALLOWED_INTENTS = 4014
}

class GatewayClient {
    private http: HTTPClient = new HTTPClient(this.token);

    constructor(private token: string) {
        this.token = token;
    }

    async connect() {
        const gatewayResponse = await this.http.get("/gateway/bot")
        const gateway = (await gatewayResponse.json()).url;
        new WebSocket(`wss://${gateway}?v=10&encoding=json`, {
            
        })
    }
}