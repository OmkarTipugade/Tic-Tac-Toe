import { Client } from "@heroiclabs/nakama-js";
const SERVER_KEY = "defaultkey"; // Default Nakama server key
const HOST = import.meta.env.HOST;
const PORT = "7350";
const USE_SSL = false;

export const nkClient = new Client(SERVER_KEY, HOST, PORT, USE_SSL);

export async function authenticateDevice(deviceId: string) {
    try {
        const session = await nkClient.authenticateDevice(deviceId, true);
        return session;
    } catch (error) {
        console.error("Authentication failed:", error);
        throw error;
    }
}