interface Board {
  cells: ("X" | "O" | null)[][];
  currentPlayer: "X" | "O";
  winner: "X" | "O" | "Draw" | null;
  turn: number;
  timestamp: number;
  gameStatus: "ongoing" | "finished";
  perMoveTimeLimit: number;
  TimeTaken: {
    X: number;
    O: number;
  };
}

interface Player {
  id: string;
  name: string;
  score: number;
  wins: number;
  losses: number;
  draws: number;
  rank: number;
}

interface PlayerInfo {
  userId: string;
  username: string;
  sessionId: string;
}

interface GameState {
  board: ("X" | "O" | null)[][];
  currentPlayer: "X" | "O";
  winner: "X" | "O" | "Draw" | null;
  turn: number;
  timestamp: number;
  gameStatus: "ongoing" | "finished";
  perMoveTimeLimit: number;
  timeTaken: {
    X: number;
    O: number;
  };
  players: {
    X: PlayerInfo;
    O: PlayerInfo;
  };
  gameMode: "classic" | "timed";
  moveHistory: Moves[];
}
type PlayerSymbol = "X" | "O";

type MoveResult = "normal" | "timeout";

interface Moves {
  moveNo: number;
  player: PlayerSymbol;
  row: number | null;
  col: number | null;
  timeTaken: number;
  result: MoveResult;
}

// Multiplayer-specific types
interface MatchPlayer {
  userId: string;
  username: string;
  symbol: 'X' | 'O';
}

interface MultiplayerGameState {
  board: string[]; // Backend uses flat array of 9 elements
  currentTurn: string; // userId
  players: { [userId: string]: MatchPlayer };
  playerSymbols: { [userId: string]: string };
  winner: string | null;
  isDraw: boolean;
  gameStarted: boolean;
  mode: string;
  timeLimit?: number;
  moveCount: number;
}

type BackendMessageType =
  | 'player_joined'
  | 'game_start'
  | 'move_made'
  | 'game_over'
  | 'player_disconnected';

interface PlayerJoinedMessage {
  type: 'player_joined';
  player: MatchPlayer;
}

interface GameStartMessage {
  type: 'game_start';
  players: { [userId: string]: MatchPlayer };
  currentTurn: string;
  mode: string;
  timeLimit?: number;
}

interface MoveMadeMessage {
  type: 'move_made';
  position: number;
  symbol: string;
  board: string[];
  currentTurn: string;
  timeTaken?: number;  // Server-calculated time for this move
}

interface GameOverMessage {
  type: 'game_over';
  winner?: string;
  board: string[];
  isDraw: boolean;
  reason?: 'normal' | 'forfeit' | 'timeout';
}

interface PlayerDisconnectedMessage {
  type: 'player_disconnected';
  userId: string;
}

interface PlayerStats {
  score: number;
  wins: number;
  losses: number;
  draws: number;
  winStreak: number;
  winPercentage: number; // calculated from wins/(wins+losses+draws)
}

type BackendMessage =
  | PlayerJoinedMessage
  | GameStartMessage
  | MoveMadeMessage
  | GameOverMessage
  | PlayerDisconnectedMessage;

export type {
  Board,
  Player,
  GameState,
  Moves,
  MoveResult,
  PlayerSymbol,
  PlayerInfo,
  MatchPlayer,
  MultiplayerGameState,
  BackendMessage,
  BackendMessageType,
  PlayerJoinedMessage,
  GameStartMessage,
  MoveMadeMessage,
  GameOverMessage,
  PlayerDisconnectedMessage,
  PlayerStats
};
