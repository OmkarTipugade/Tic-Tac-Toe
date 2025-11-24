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

export type { Board, Player, GameState, Moves, MoveResult, PlayerSymbol, PlayerInfo };
