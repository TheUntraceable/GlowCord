import fs from "fs";
import { EventEmitter } from "events";

export class Bucket {
    channelId: string
    guildId: string
    promise: Promise<boolean> = Promise.resolve(true);
    // Maybe implement the other top-level resources
    constructor({channelId = null,  guildId = null}: {channelId?: string, guildId?: string} = {}) {
        this.channelId = channelId;
        this.guildId = guildId;
    }

    async wait() {
        return await this.promise;
    }

    setPromise(promise: Promise<boolean>) {
        this.promise = promise;
    }

}

export class HTTPClient extends EventEmitter {

    buckets: Map<string, Bucket> = new Map();
    private version: string
    globalPromise: Promise<boolean> = Promise.resolve(true);

    constructor(private token: string) {
        super()
        this.token = token;
        this.version = JSON.parse(fs.readFileSync("../../package.json", "utf-8")).version
    }

    async request({method, endpoint, data, channelId, guildId, attempt}: {method: string, endpoint: string, data?: any, channelId?: string, guildId?: string, attempt?: number}) {
        if(!attempt) attempt = 1;
        if(attempt == 3) return Promise.reject("Too many failed attempts");
        const bucketString = `${endpoint}:${channelId}:${guildId}`;
        const bucket = this.buckets.get(bucketString)

        if(endpoint.startsWith("/")) {
            endpoint = endpoint.slice(1);
        }

        if(endpoint.endsWith("/")) {
            endpoint = endpoint.slice(0, -1);
        }

        if(guildId || channelId && !bucket) {
            // If we have a top level resource but not cached it
            const newBucket = new Bucket({channelId, guildId});
            this.buckets.set(bucketString, newBucket);
            return await this.request({method, endpoint, data, channelId, guildId});
        }

        if(bucket) {
            await bucket.wait()   
        }

        await this.globalPromise;
        this.emit("debug", `[HTTP] ${method} https://discord.com/api/v10/${endpoint} ${data ? JSON.stringify(data) : ""}`)
        const response = await fetch(`https://discord.com/api/v10/${endpoint}`, {
            method,
            body: data,
            headers: {
                "Authorization": `Bot ${this.token}`,
                "User-Agent": `DiscordBot(https://github.com/TheUntraceable/GlowCord, ${this.version})`
            }
        })

        if(response.status === 429) {
            let body: any;

            try {
                body = await response.json();
            } catch(e) {
                body = await response.text()
            }

            let retryAfter: number;

            if(response.headers.get("Retry-After")) retryAfter = parseFloat(response.headers.get("Retry-After"))
            else if(body.retry_after) retryAfter = parseFloat(body.retry_after)

            if(body.retry_after && response.headers.get("Retry-After")) {
                retryAfter = parseFloat(body.retry_after) > parseFloat(response.headers.get("Retry-After")) ? parseFloat(body.retry_after) : parseFloat(response.headers.get("Retry-After"))
            }

            const promise = new Promise<boolean>((resolve) => {
                setTimeout(() => {
                    resolve(true);
                }, retryAfter)
            })

            bucket.setPromise(promise);

            if(body.global) {
                this.globalPromise = promise;
            }

            return await this.request({method, endpoint, data, channelId, guildId, attempt: attempt ? attempt + 1 : 1});
        }

        if(response.headers.get("x-RateLimit-Remaining") == "0") {
            const promise = new Promise<boolean>((resolve) => {
                setTimeout(() => {
                    resolve(true);
                }, parseFloat(response.headers.get("x-RateLimit-Reset-After")))
            })
            bucket.setPromise(promise);
        }

        if(!this.buckets.get(bucketString) && response.headers.get("x-RateLimit-Bucket")) {
            this.buckets.set(response.headers.get("X-RateLimit-Bucket"), new Bucket())
        }
        
        return response
    }

    async get(endpoint: string, data?: any, channelId?: string, guildId?: string) {
        return await this.request({method: "GET", endpoint, data, channelId, guildId});
    }

    async post(endpoint: string, data?: any, channelId?: string, guildId?: string) {
        return await this.request({method: "POST", endpoint, data, channelId, guildId});
    }

    async patch(endpoint: string, data?: any, channelId?: string, guildId?: string) {
        return await this.request({method: "PATCH", endpoint, data, channelId, guildId});
    }

    async delete(endpoint: string, data?: any, channelId?: string, guildId?: string) {
        return await this.request({method: "DELETE", endpoint, data, channelId, guildId});
    }

}