import { Client } from "@heroiclabs/nakama-js";

// Configure Nakama client for local development
const SERVER_KEY = "defaultkey"; // Default Nakama server key
const HOST = "127.0.0.1";
const PORT = "7350";
const USE_SSL = false;

export const nkClient = new Client(SERVER_KEY, HOST, PORT, USE_SSL);

// Helper function to create or get a session
export async function authenticateDevice(deviceId: string) {
    try {
        const session = await nkClient.authenticateDevice(deviceId, true);
        console.log("Authenticated successfully:", session.user_id);
        return session;
    } catch (error) {
        console.error("Authentication failed:", error);
        throw error;
    }
}