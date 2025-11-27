import {
  Client,
  Session,
  type Socket,
  type Match,
} from "@heroiclabs/nakama-js";
import type {
  BackendMessage,
  MatchPlayer
} from "../types/types";

type MatchCallbacks = {
  onPlayerJoined?: (player: MatchPlayer) => void;
  onGameStart?: (data: {
    players: { [userId: string]: MatchPlayer };
    currentTurn: string;
    mode: string;
    timeLimit?: number;
  }) => void;
  onMoveMade?: (data: {
    position: number;
    symbol: string;
    board: string[];
    currentTurn: string;
    timeTaken?: number;  // Server-provided time for this move
  }) => void;
  onGameOver?: (data: {
    winner?: string;
    isDraw: boolean;
    board: string[];
    reason?: 'normal' | 'forfeit' | 'timeout';
  }) => void;
  onPlayerDisconnected?: (userId: string) => void;
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

  }

  setCallbacks(callbacks: MatchCallbacks): void {
    this.callbacks = callbacks;
  }

  async findMatch(
    gameMode: "classic" | "timed" = "classic",
    timeLimit?: number
  ): Promise<string> {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }

    const payload = {
      mode: gameMode,
      ...(timeLimit && { timeLimit }),
    };

    const response = await this.client.rpc(this.session, "find_match", payload);

    const payloadStr =
      typeof response.payload === "string"
        ? response.payload
        : JSON.stringify(response.payload);
    const { matchId } = JSON.parse(payloadStr);
    await this.joinMatch(matchId);
    return matchId;
  }

  async createMatch(
    gameMode: "classic" | "timed" = "classic",
    timeLimit?: number
  ): Promise<string> {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }

    const payload = {
      mode: gameMode,
      ...(timeLimit && { timeLimit }),
    };

    const response = await this.client.rpc(this.session, "create_match", payload);

    const payloadStr =
      typeof response.payload === "string"
        ? response.payload
        : JSON.stringify(response.payload);
    const { matchId } = JSON.parse(payloadStr);
    await this.joinMatch(matchId);
    return matchId;
  }

  async joinMatch(matchId: string): Promise<void> {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }

    this.currentMatch = await this.socket.joinMatch(matchId);
  }

  async makeMove(position: number): Promise<void> {
    if (!this.socket || !this.currentMatch) {
      throw new Error("Not in a match");
    }

    // Backend expects { type: 'move', position: number }
    const moveData = JSON.stringify({
      type: 'move',
      position
    });

    await this.socket.sendMatchState(
      this.currentMatch.match_id,
      0, // op_code
      moveData
    );
  }

  async leaveMatch(): Promise<void> {
    if (!this.socket || !this.currentMatch) {
      return;
    }

    try {
      await this.socket.leaveMatch(this.currentMatch.match_id);
    } catch (error) {
      console.error('Error leaving match:', error);
    } finally {
      this.currentMatch = null;
    }
  }

  async sendForfeit(): Promise<void> {
    if (!this.socket || !this.currentMatch) {
      throw new Error("Not in a match");
    }

    // Send forfeit message to backend
    const forfeitData = JSON.stringify({
      type: 'forfeit'
    });

    await this.socket.sendMatchState(
      this.currentMatch.match_id,
      0, // op_code
      forfeitData
    );
  }

  disconnect(): void {
    if (this.socket) {
      try {
        this.socket.disconnect(true);
      } catch (error) {
        console.error('Error disconnecting socket:', error);
      }
      this.socket = null;
    }
    this.currentMatch = null;
  }

  private handleMatchData(matchData: any): void {
    try {
      // The data comes as a Uint8Array, need to decode it
      let data: BackendMessage;

      if (matchData.data instanceof Uint8Array) {
        const decoder = new TextDecoder();
        const dataStr = decoder.decode(matchData.data);
        data = JSON.parse(dataStr);
      } else if (typeof matchData.data === 'string') {
        data = JSON.parse(matchData.data);
      } else {
        data = matchData.data;
      }


      switch (data.type) {
        case 'player_joined':
          if (this.callbacks.onPlayerJoined) {
            this.callbacks.onPlayerJoined(data.player);
          }
          break;

        case 'game_start':
          if (this.callbacks.onGameStart) {
            this.callbacks.onGameStart({
              players: data.players,
              currentTurn: data.currentTurn,
              mode: data.mode,
              timeLimit: data.timeLimit,
            });
          }
          break;

        case 'move_made':
          if (this.callbacks.onMoveMade) {
            this.callbacks.onMoveMade({
              position: data.position,
              symbol: data.symbol,
              board: data.board,
              currentTurn: data.currentTurn,
            });
          }
          break;

        case 'game_over':
          if (this.callbacks.onGameOver) {
            this.callbacks.onGameOver({
              winner: data.winner,
              isDraw: data.isDraw,
              board: data.board,
            });
          }
          break;

        case 'player_disconnected':
          if (this.callbacks.onPlayerDisconnected) {
            this.callbacks.onPlayerDisconnected(data.userId);
          }
          break;
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

  getSession(): Session {
    return this.session;
  }
}
