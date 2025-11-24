import {
  Client,
  Session,
  type Socket,
  type Match,
} from "@heroiclabs/nakama-js";
import type { GameState } from "../types/types";

const OP_CODE_MAKE_MOVE = 1;
const OP_CODE_GAME_UPDATE = 2;
const OP_CODE_GAME_OVER = 3;
const OP_CODE_PLAYER_TIMEOUT = 4;

type MatchCallbacks = {
  onGameUpdate?: (gameState: GameState) => void;
  onGameOver?: (data: {
    winner: string;
    reason: string;
    gameState: GameState;
  }) => void;
  onError?: (error: string) => void;
};

export class NakamaMatchService {
  private socket: Socket | null = null;
  private currentMatch: Match | null = null;
  private callbacks: MatchCallbacks = {};
  private client: Client;
  private session: Session;

  constructor(client: Client, session: Session) {
    this.client = client;
    this.session = session;
  }

  async connect(): Promise<void> {
    if (this.socket) return;

    this.socket = this.client.createSocket(false, false);
    await this.socket.connect(this.session, false);

    // Setup message handlers
    this.socket.onmatchdata = (matchData) => {
      this.handleMatchData(matchData);
    };

    this.socket.onmatchpresence = (presence) => {
      console.log("Match presence update:", presence);
    };
  }

  setCallbacks(callbacks: MatchCallbacks): void {
    this.callbacks = callbacks;
  }

  async findMatch(gameMode: "classic" | "timed" = "classic"): Promise<string> {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }

    const response = await this.client.rpc(this.session, "find_match", {
      mode: gameMode,
    });

    const payload =
      typeof response.payload === "string"
        ? response.payload
        : JSON.stringify(response.payload);
    const { matchId } = JSON.parse(payload);
    await this.joinMatch(matchId);
    return matchId;
  }

  async createMatch(
    gameMode: "classic" | "timed" = "classic"
  ): Promise<string> {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }

    const response = await this.client.rpc(this.session, "create_match", {
      mode: gameMode,
    });

    const payload =
      typeof response.payload === "string"
        ? response.payload
        : JSON.stringify(response.payload);
    const { matchId } = JSON.parse(payload);
    await this.joinMatch(matchId);
    return matchId;
  }

  async joinMatch(matchId: string): Promise<void> {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }

    this.currentMatch = await this.socket.joinMatch(matchId);
    console.log("Joined match:", matchId);
  }

  async makeMove(row: number, col: number): Promise<void> {
    if (!this.socket || !this.currentMatch) {
      throw new Error("Not in a match");
    }

    const moveData = JSON.stringify({ row, col });
    await this.socket.sendMatchState(
      this.currentMatch.match_id,
      OP_CODE_MAKE_MOVE,
      moveData
    );
  }

  async leaveMatch(): Promise<void> {
    if (!this.socket || !this.currentMatch) return;

    await this.socket.leaveMatch(this.currentMatch.match_id);
    this.currentMatch = null;
  }

  async getPlayerStats(): Promise<{
    wins: number;
    losses: number;
    draws: number;
    score: number;
  }> {
    const response = await this.client.rpc(
      this.session,
      "get_player_stats",
      {}
    );
    const payload =
      typeof response.payload === "string"
        ? response.payload
        : JSON.stringify(response.payload);
    return JSON.parse(payload);
  }

  async getLeaderboard(limit: number = 10): Promise<any> {
    const result = await this.client.listLeaderboardRecords(
      this.session,
      "global_leaderboard",
      [],
      limit
    );
    return result;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect(true);
      this.socket = null;
    }
    this.currentMatch = null;
  }

  private handleMatchData(matchData: any): void {
    try {
      const data = JSON.parse(matchData.data);

      switch (matchData.op_code) {
        case OP_CODE_GAME_UPDATE:
          if (this.callbacks.onGameUpdate) {
            this.callbacks.onGameUpdate(data);
          }
          break;

        case OP_CODE_GAME_OVER:
          if (this.callbacks.onGameOver) {
            this.callbacks.onGameOver(data);
          }
          break;

        case OP_CODE_PLAYER_TIMEOUT:
          if (this.callbacks.onError) {
            this.callbacks.onError("Player timeout");
          }
          break;

        default:
          console.log("Unknown op code:", matchData.op_code);
      }
    } catch (error) {
      console.error("Error handling match data:", error);
      if (this.callbacks.onError) {
        this.callbacks.onError("Failed to parse match data");
      }
    }
  }

  getCurrentMatch(): Match | null {
    return this.currentMatch;
  }

  isConnected(): boolean {
    return this.socket !== null;
  }
}
